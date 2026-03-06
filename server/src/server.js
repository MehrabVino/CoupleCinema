import dotenv from "dotenv";
import path from "node:path";
import fastifyModule from "fastify";
import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import { z } from "zod";
import { sendEmail } from "./mailer.js";
import {
  createChat,
  createUser,
  createPasswordReset,
  confirmEmailCode,
  deleteMessage,
  getChat,
  getChatByPublicId,
  getMessage,
  getMessages,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  joinChat,
  listChatMembers,
  listUserChats,
  refreshVerifyCode,
  resetPasswordWithCode,
  searchUsers,
  saveMessage,
  startPrivateChat,
  toggleReaction,
  updateMemberAccess,
  updateChatName,
  updateChatPublicId,
  updateUserProfile,
  updateMessage,
  userCanWrite,
  userInChat
} from "./db.js";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const app = fastifyModule({ logger: false });
const io = new Server(app.server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000"
  }
});

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000"
});

await app.register(jwtPlugin, {
  secret: process.env.JWT_SECRET || "dev-secret-change-me"
});

app.decorate("auth", async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

const authBody = z.object({
  email: z.string().email().toLowerCase().refine((v) => v.endsWith("@gmail.com"), {
    message: "Only Gmail addresses are allowed"
  }),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128)
});

app.get("/api/health", async () => ({ ok: true }));

app.post("/api/auth/register", async (req, reply) => {
  const parsed = authBody.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "Invalid input" });
  }

  const { email, username, password } = parsed.data;
  if (!email.endsWith("@gmail.com")) {
    return reply.code(400).send({ error: "Only Gmail addresses are allowed" });
  }
  if (getUserByEmail(email)) {
    return reply.code(409).send({ error: "Email exists" });
  }
  if (getUserByUsername(username)) {
    return reply.code(409).send({ error: "Username exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser(email, username, passwordHash);
  await sendEmail({
    to: user.email,
    subject: "Confirm your account",
    text: `Your verification code is: ${user.verify_code}. It expires in 15 minutes.`
  });
  return reply.code(201).send({
    ok: true,
    requiresEmailConfirmation: true,
    email: user.email
  });
});

app.post("/api/auth/login", async (req, reply) => {
  const parsed = z
    .object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(6).max(128)
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "Invalid input" });
  }

  const { email, password } = parsed.data;
  const user = getUserByEmail(email);
  if (!user) return reply.code(401).send({ error: "Invalid credentials" });
  if (!user.email_verified) return reply.code(403).send({ error: "Please confirm your email first" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

  const token = app.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "7d" });
  return { user: { id: user.id, username: user.username, public_id: user.public_id }, token };
});

app.post("/api/auth/confirm-email", async (req, reply) => {
  const parsed = z
    .object({
      email: z.string().email().toLowerCase(),
      code: z.string().min(4).max(10)
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid input" });
  const result = confirmEmailCode(parsed.data.email, parsed.data.code);
  if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
  if (result.error === "invalid_code") return reply.code(400).send({ error: "Invalid code" });
  if (result.error === "code_expired") return reply.code(400).send({ error: "Code expired" });
  return { ok: true };
});

app.post("/api/auth/resend-confirm", async (req, reply) => {
  const parsed = z
    .object({ email: z.string().email().toLowerCase() })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid email" });
  const user = refreshVerifyCode(parsed.data.email);
  if (!user) return reply.code(404).send({ error: "User not found" });
  await sendEmail({
    to: user.email,
    subject: "Confirm your account",
    text: `Your verification code is: ${user.verify_code}. It expires in 15 minutes.`
  });
  return { ok: true };
});

app.post("/api/auth/forgot-password", async (req, reply) => {
  const parsed = z
    .object({ email: z.string().email().toLowerCase() })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid email" });
  const user = createPasswordReset(parsed.data.email);
  if (!user) return { ok: true };
  await sendEmail({
    to: user.email,
    subject: "Password reset code",
    text: `Your password reset code is: ${user.reset_code}. It expires in 15 minutes.`
  });
  return { ok: true };
});

app.post("/api/auth/reset-password", async (req, reply) => {
  const parsed = z
    .object({
      email: z.string().email().toLowerCase(),
      code: z.string().min(4).max(10),
      password: z.string().min(6).max(128)
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid input" });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const result = resetPasswordWithCode(parsed.data.email, parsed.data.code, passwordHash);
  if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
  if (result.error === "invalid_code") return reply.code(400).send({ error: "Invalid code" });
  if (result.error === "code_expired") return reply.code(400).send({ error: "Code expired" });
  return { ok: true };
});

app.get("/api/me", { preHandler: app.auth }, async (req, reply) => {
  const user = getUserById(req.user.sub);
  if (!user) return reply.code(404).send({ error: "User not found" });
  return { user };
});

app.patch("/api/me/profile", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
      publicId: z.string().min(3).max(40).optional()
    })
    .refine((data) => data.username || data.publicId, { message: "No profile fields provided" })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid profile data" });

  const result = updateUserProfile(req.user.sub, parsed.data);
  if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
  if (result.error === "username_exists") return reply.code(409).send({ error: "Username exists" });
  if (result.error) return reply.code(400).send({ error: "Could not update profile" });

  const token = app.jwt.sign({ sub: result.user.id, username: result.user.username }, { expiresIn: "7d" });
  return { user: result.user, token };
});

app.get("/api/chats", { preHandler: app.auth }, async (req) => {
  return { chats: listUserChats(req.user.sub) };
});

app.get("/api/users/search", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({ q: z.string().min(1).max(120) })
    .safeParse(req.query);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid query" });
  return { users: searchUsers(parsed.data.q, req.user.sub) };
});

app.post("/api/chats/pv/start", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({ query: z.string().min(1).max(120) })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid target" });
  const result = startPrivateChat(req.user.sub, parsed.data.query);
  if (result.error === "target_not_found") return reply.code(404).send({ error: "User not found" });
  io.to(`user:${result.target.id}`).emit("chat:added", { chat: result.chat });
  return { chat: result.chat, target: result.target };
});

app.post("/api/chats", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      name: z.string().min(2).max(64),
      type: z.enum(["group", "channel", "pv"]).default("group"),
      publicId: z.string().min(3).max(40).optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid chat name" });
  try {
    const chat = createChat(
      parsed.data.name.trim(),
      req.user.sub,
      parsed.data.type,
      parsed.data.publicId || ""
    );
    return reply.code(201).send({ chat });
  } catch {
    return reply.code(409).send({ error: "Chat name exists" });
  }
});

app.post("/api/chats/:chatId/join", { preHandler: app.auth }, async (req, reply) => {
  const chat = getChat(req.params.chatId);
  if (!chat) return reply.code(404).send({ error: "Chat not found" });
  joinChat(chat.id, req.user.sub);
  return { ok: true, chat };
});

app.post("/api/chats/public/:publicId/join", { preHandler: app.auth }, async (req, reply) => {
  const chat = getChatByPublicId(req.params.publicId);
  if (!chat) return reply.code(404).send({ error: "Chat not found" });
  joinChat(chat.id, req.user.sub);
  return { ok: true, chat };
});

app.post("/api/chats/join-public", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      publicId: z.string().min(1).max(80)
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid public ID" });
  const normalized = parsed.data.publicId.trim().replace(/^@+/, "");
  if (!normalized) return reply.code(400).send({ error: "Invalid public ID" });
  const chat = getChatByPublicId(normalized);
  if (!chat) return reply.code(404).send({ error: "Chat not found" });
  joinChat(chat.id, req.user.sub);
  return { ok: true, chat };
});

app.patch("/api/chats/:chatId/public-id", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      publicId: z.string().min(3).max(40)
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid public ID" });
  const chat = updateChatPublicId(req.params.chatId, req.user.sub, parsed.data.publicId);
  if (!chat) return reply.code(403).send({ error: "Only owner can change chat ID" });
  return { chat };
});

app.patch("/api/chats/:chatId/name", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      name: z.string().min(2).max(64)
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid chat name" });
  const chat = updateChatName(req.params.chatId, req.user.sub, parsed.data.name);
  if (!chat) return reply.code(403).send({ error: "Only owner can change chat name" });
  return { chat };
});

app.get("/api/chats/:chatId/members", { preHandler: app.auth }, async (req, reply) => {
  const { chatId } = req.params;
  if (!userInChat(chatId, req.user.sub)) return reply.code(403).send({ error: "Forbidden" });
  return { members: listChatMembers(chatId) };
});

app.patch("/api/chats/:chatId/members/:memberId/access", { preHandler: app.auth }, async (req, reply) => {
  const parsed = z
    .object({
      access: z.enum(["full", "read-only"])
    })
    .safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: "Invalid access value" });
  const chat = getChat(req.params.chatId);
  if (!chat) return reply.code(404).send({ error: "Chat not found" });
  if (chat.type === "pv") return reply.code(400).send({ error: "PV member access cannot be changed" });
  const member = updateMemberAccess(req.params.chatId, req.user.sub, req.params.memberId, parsed.data.access);
  if (!member) return reply.code(403).send({ error: "Only owner can change member access" });
  io.to(req.params.chatId).emit("member:access-updated", { chatId: req.params.chatId, member });
  return { member };
});

app.get("/api/chats/:chatId/messages", { preHandler: app.auth }, async (req, reply) => {
  const { chatId } = req.params;
  if (!userInChat(chatId, req.user.sub)) return reply.code(403).send({ error: "Forbidden" });
  return { messages: getMessages(chatId, Number(req.query.limit || 70), req.user.sub) };
});

const onlineUsers = new Map();

function emitPresence() {
  io.emit("presence:update", { onlineUsers: Array.from(onlineUsers.keys()) });
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = app.jwt.verify(token);
    socket.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  const count = onlineUsers.get(socket.user.id) || 0;
  onlineUsers.set(socket.user.id, count + 1);
  emitPresence();

  socket.on("chat:join", ({ chatId }) => {
    if (chatId && userInChat(chatId, socket.user.id)) socket.join(chatId);
  });

  socket.on("typing:set", ({ chatId, isTyping }) => {
    if (!chatId || !userInChat(chatId, socket.user.id) || !userCanWrite(chatId, socket.user.id)) return;
    socket.to(chatId).emit("typing:update", {
      chatId,
      userId: socket.user.id,
      username: socket.user.username,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("message:send", ({ chatId, content }) => {
    const text = String(content || "").trim();
    if (
      !chatId ||
      !text ||
      text.length > 2000 ||
      !userInChat(chatId, socket.user.id) ||
      !userCanWrite(chatId, socket.user.id)
    ) {
      return;
    }
    const message = saveMessage(chatId, socket.user.id, text);
    io.to(chatId).emit("message:new", message);
  });

  socket.on("message:edit", ({ messageId, content }) => {
    const text = String(content || "").trim();
    if (!messageId || !text || text.length > 2000) return;
    const existing = getMessage(messageId, socket.user.id);
    if (!existing || !userCanWrite(existing.chat_id, socket.user.id)) return;
    const updated = updateMessage(messageId, socket.user.id, text);
    if (!updated || !userInChat(updated.chat_id, socket.user.id)) return;
    io.to(updated.chat_id).emit("message:updated", {
      ...updated,
      reactions: {},
      my_reactions: []
    });
  });

  socket.on("message:delete", ({ messageId }) => {
    if (!messageId) return;
    const existing = getMessage(messageId, socket.user.id);
    if (!existing || !userCanWrite(existing.chat_id, socket.user.id)) return;
    const deleted = deleteMessage(messageId, socket.user.id);
    if (!deleted || !userInChat(deleted.chat_id, socket.user.id)) return;
    io.to(deleted.chat_id).emit("message:deleted", {
      id: deleted.id,
      chat_id: deleted.chat_id
    });
  });

  socket.on("reaction:toggle", ({ messageId, emoji, chatId }) => {
    if (
      !messageId ||
      !chatId ||
      !emoji ||
      !userInChat(chatId, socket.user.id) ||
      !userCanWrite(chatId, socket.user.id)
    ) {
      return;
    }
    const allowed = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{1F602}", "\u{1F44F}", "\u{1F389}"];
    if (!allowed.includes(emoji)) return;
    const message = getMessage(messageId, socket.user.id);
    if (!message || message.chat_id !== chatId || message.deleted_at) return;
    const data = toggleReaction(messageId, socket.user.id, emoji);
    io.to(chatId).emit("reaction:updated", data);
  });

  socket.on("disconnect", () => {
    const current = onlineUsers.get(socket.user.id) || 1;
    if (current <= 1) onlineUsers.delete(socket.user.id);
    else onlineUsers.set(socket.user.id, current - 1);
    emitPresence();
  });
});

const PORT = Number(process.env.PORT || 4000);
await app.listen({ port: PORT, host: "0.0.0.0" });
// eslint-disable-next-line no-console
console.log(`Server running at http://localhost:${PORT}`);
