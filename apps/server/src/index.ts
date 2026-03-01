import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";
import { PrismaClient, MessageType } from "@prisma/client";
import { Server } from "socket.io";
import { z } from "zod";
import { generateHostToken, generateSessionCode } from "./utils";
import { ChatPayload, JoinPayload, Participant, PlaybackPayload, SignalPayload } from "./types";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const maxVideoMb = Number(process.env.MAX_VIDEO_MB ?? 2048);
const maxVideoBytes = Math.max(10, maxVideoMb) * 1024 * 1024;

const io = new Server(server, {
  cors: {
    origin: webOrigin,
    methods: ["GET", "POST"]
  }
});

const uploadsRoot = path.resolve(process.cwd(), "uploads");
const videoDir = path.resolve(uploadsRoot, "videos");
const imageDir = path.resolve(uploadsRoot, "images");
mkdirSync(videoDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

app.use(cors({ origin: webOrigin }));
app.use(express.json({ limit: "10mb" }));
app.use("/media", express.static(uploadsRoot));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const target = file.fieldname === "video" ? videoDir : imageDir;
    cb(null, target);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = file.originalname.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const uploader = multer({
  storage,
  limits: {
    fileSize: maxVideoBytes
  }
});

const createSessionBody = z.object({
  hostName: z.string().min(2).max(32),
  title: z.string().min(1).max(120)
});

const roomParticipants = new Map<string, Map<string, Participant>>();

async function createUniqueSessionCode(): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const code = generateSessionCode();
    const existing = await prisma.session.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Failed to generate unique session code");
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/sessions", uploader.single("video"), async (req, res) => {
  try {
    const parsed = createSessionBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Video file is required" });
    }
    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({ error: "Uploaded file must be a video" });
    }

    const code = await createUniqueSessionCode();
    const hostToken = generateHostToken();
    const videoPath = `/media/videos/${req.file.filename}`;

    const session = await prisma.session.create({
      data: {
        code,
        hostToken,
        hostName: parsed.data.hostName,
        title: parsed.data.title,
        videoPath
      }
    });

    return res.status(201).json({
      code: session.code,
      hostToken: session.hostToken,
      hostName: session.hostName,
      title: session.title,
      videoPath: session.videoPath
    });
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `Video too large. Max ${maxVideoMb} MB.` });
    }
    return res.status(500).json({ error: "Failed to create session" });
  }
});

app.get("/api/sessions/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const session = await prisma.session.findUnique({
      where: { code },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    return res.json({
      code: session.code,
      title: session.title,
      hostName: session.hostName,
      videoPath: session.videoPath,
      createdAt: session.createdAt,
      messages: session.messages
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch session" });
  }
});

app.post("/api/sessions/:code/images", uploader.single("image"), async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const senderName = String(req.body.senderName ?? "").trim();
    if (!senderName) {
      return res.status(400).json({ error: "senderName is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Uploaded file must be an image" });
    }
    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const imagePath = `/media/images/${req.file.filename}`;
    return res.status(201).json({ imagePath });
  } catch (error) {
    return res.status(500).json({ error: "Image upload failed" });
  }
});

io.on("connection", (socket) => {
  socket.on("join-session", async (payload: JoinPayload, cb: (response: unknown) => void) => {
    try {
      const input = {
        code: payload.code?.toUpperCase?.() ?? "",
        name: payload.name?.trim?.() ?? "",
        hostToken: payload.hostToken
      };
      if (!input.code || !input.name) {
        cb({ ok: false, error: "Invalid join payload" });
        return;
      }
      const session = await prisma.session.findUnique({ where: { code: input.code } });
      if (!session) {
        cb({ ok: false, error: "Session not found" });
        return;
      }

      if (!roomParticipants.has(input.code)) {
        roomParticipants.set(input.code, new Map());
      }
      const room = roomParticipants.get(input.code)!;
      if (room.size >= 4) {
        cb({ ok: false, error: "Session is full (max 4 users)" });
        return;
      }

      const isHost = input.hostToken === session.hostToken;
      const participant: Participant = {
        socketId: socket.id,
        name: input.name,
        isHost
      };
      const existingParticipants = Array.from(room.values());
      room.set(socket.id, participant);
      socket.data.code = input.code;
      socket.data.isHost = isHost;
      socket.data.name = input.name;
      socket.join(input.code);

      cb({
        ok: true,
        code: session.code,
        title: session.title,
        hostName: session.hostName,
        videoPath: session.videoPath,
        participants: existingParticipants
      });

      socket.to(input.code).emit("participant-joined", participant);
    } catch (error) {
      cb({ ok: false, error: "Join failed" });
    }
  });

  socket.on("playback-control", (payload: PlaybackPayload) => {
    const code = socket.data.code as string | undefined;
    const isHost = Boolean(socket.data.isHost);
    if (!code || !isHost) {
      return;
    }
    io.to(code).emit("playback-control", {
      ...payload,
      sentAt: Date.now(),
      by: socket.id
    });
  });

  socket.on("chat-message", async (payload: ChatPayload) => {
    try {
      const code = payload.code?.toUpperCase?.() ?? "";
      if (!code || !payload.senderName) {
        return;
      }
      const session = await prisma.session.findUnique({ where: { code } });
      if (!session) {
        return;
      }
      const created = await prisma.message.create({
        data: {
          sessionId: session.id,
          senderName: payload.senderName,
          type: payload.type === "IMAGE" ? MessageType.IMAGE : MessageType.TEXT,
          content: payload.content,
          imagePath: payload.imagePath
        }
      });
      io.to(code).emit("chat-message", created);
    } catch (error) {
      // no-op
    }
  });

  socket.on("signal", (payload: SignalPayload) => {
    io.to(payload.to).emit("signal", payload);
  });

  socket.on("disconnect", () => {
    const code = socket.data.code as string | undefined;
    if (!code) {
      return;
    }
    const room = roomParticipants.get(code);
    if (!room) {
      return;
    }
    room.delete(socket.id);
    socket.to(code).emit("participant-left", { socketId: socket.id });
    if (room.size === 0) {
      roomParticipants.delete(code);
    }
  });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
