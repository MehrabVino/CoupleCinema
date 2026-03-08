import fs from "node:fs";
import { z } from "zod";
import { parseOrReply } from "../utils/validation.js";

const listQuerySchema = z.object({
  path: z.string().max(600).optional()
});

const folderSchema = z.object({
  parentPath: z.string().max(600).optional().default(""),
  name: z.string().min(1).max(180)
});

const renameSchema = z.object({
  itemPath: z.string().min(1).max(600),
  name: z.string().min(1).max(180)
});

const removeSchema = z.object({
  itemPath: z.string().min(1).max(600)
});

const shareSchema = z.object({
  itemPath: z.string().min(1).max(600)
});

function contentTypeForName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

export function createDriveController({ driveService, env }) {
  return {
    list: async (req, reply) => {
      const query = parseOrReply(listQuerySchema, req.query, reply, "Invalid path");
      if (!query) return;
      const result = driveService.list(req.user.sub, query.path || "");
      if (result.error === "not_found") return reply.code(404).send({ error: "Folder not found" });
      if (result.error === "not_folder") return reply.code(400).send({ error: "Path must be a folder" });
      return result;
    },

    createFolder: async (req, reply) => {
      const body = parseOrReply(folderSchema, req.body, reply, "Invalid folder payload");
      if (!body) return;
      const result = driveService.createFolder(req.user.sub, body.parentPath, body.name);
      if (result.error === "invalid_name") return reply.code(400).send({ error: "Invalid folder name" });
      if (result.error === "not_found") return reply.code(404).send({ error: "Parent folder not found" });
      if (result.error === "exists") return reply.code(409).send({ error: "Folder already exists" });
      return { ok: true };
    },

    upload: async (req, reply) => {
      const parentPath = String(req.query?.path || "");
      const fileName = String(req.headers["x-file-name"] || "").trim();
      if (!fileName) return reply.code(400).send({ error: "Missing x-file-name header" });
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer)) return reply.code(400).send({ error: "Invalid file body" });
      const result = driveService.uploadFile(req.user.sub, parentPath, fileName, buffer);
      if (result.error === "empty_file") return reply.code(400).send({ error: "File is empty" });
      if (result.error === "file_too_large") return reply.code(413).send({ error: "File too large (max 50MB)" });
      if (result.error === "invalid_name") return reply.code(400).send({ error: "Invalid file name" });
      if (result.error === "not_found") return reply.code(404).send({ error: "Target folder not found" });
      if (result.error === "exists") return reply.code(409).send({ error: "File already exists" });
      return { ok: true, path: result.path };
    },

    rename: async (req, reply) => {
      const body = parseOrReply(renameSchema, req.body, reply, "Invalid rename payload");
      if (!body) return;
      const result = driveService.rename(req.user.sub, body.itemPath, body.name);
      if (result.error === "invalid_name") return reply.code(400).send({ error: "Invalid name" });
      if (result.error === "not_found") return reply.code(404).send({ error: "Item not found" });
      if (result.error === "exists") return reply.code(409).send({ error: "Name already exists in this folder" });
      return { ok: true };
    },

    remove: async (req, reply) => {
      const body = parseOrReply(removeSchema, req.body, reply, "Invalid delete payload");
      if (!body) return;
      const result = driveService.remove(req.user.sub, body.itemPath);
      if (result.error === "not_found") return reply.code(404).send({ error: "Item not found" });
      return { ok: true };
    },

    download: async (req, reply) => {
      const itemPath = String(req.query?.path || "");
      if (!itemPath) return reply.code(400).send({ error: "Missing path" });
      const result = driveService.download(req.user.sub, itemPath);
      if (result.error === "not_found") return reply.code(404).send({ error: "File not found" });
      if (result.error === "not_file") return reply.code(400).send({ error: "Only files can be downloaded" });
      reply.header("Content-Type", contentTypeForName(result.fileName));
      reply.header("Content-Disposition", `attachment; filename="${result.fileName}"`);
      return reply.send(fs.createReadStream(result.fullPath));
    },

    createShare: async (req, reply) => {
      const body = parseOrReply(shareSchema, req.body, reply, "Invalid share payload");
      if (!body) return;
      const result = driveService.createShare(req.user.sub, body.itemPath);
      if (result.error === "not_found") return reply.code(404).send({ error: "File not found" });
      if (result.error === "not_file") return reply.code(400).send({ error: "Only files can be shared" });
      const base = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${env.port || 4000}`;
      return {
        ok: true,
        token: result.token,
        url: `${base}/api/drive/shared/${result.token}`
      };
    },

    downloadShared: async (req, reply) => {
      const token = String(req.params?.token || "");
      if (!token) return reply.code(400).send({ error: "Missing token" });
      const result = driveService.downloadShared(token);
      if (result.error === "not_found") return reply.code(404).send({ error: "Shared file not found" });
      if (result.error === "not_file") return reply.code(400).send({ error: "Shared target is not a file" });
      reply.header("Content-Type", contentTypeForName(result.fileName));
      reply.header("Content-Disposition", `attachment; filename="${result.fileName}"`);
      return reply.send(fs.createReadStream(result.fullPath));
    }
  };
}
