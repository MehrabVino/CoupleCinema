import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const driveRoot = path.resolve(__dirname, "..", "..", "data", "drive");
const shareStorePath = path.resolve(__dirname, "..", "..", "data", "drive-shares.json");

function ensureDriveRoot() {
  fs.mkdirSync(driveRoot, { recursive: true });
}

function sanitizePath(input) {
  const raw = String(input || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!raw) return "";
  const parts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[<>:"|?*\x00-\x1F]/g, "_"));
  return parts.join("/");
}

function safeBaseName(name) {
  const value = String(name || "").trim().replace(/[\\/]/g, "_");
  return value.replace(/[<>:"|?*\x00-\x1F]/g, "_").slice(0, 180);
}

function userRoot(userId) {
  ensureDriveRoot();
  const id = String(userId || "").trim();
  const root = path.join(driveRoot, id);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function resolveUserPath(userId, relativePath = "") {
  const root = userRoot(userId);
  const cleaned = sanitizePath(relativePath);
  const full = path.resolve(root, cleaned);
  if (!full.startsWith(root)) {
    throw new Error("invalid_path");
  }
  return { root, full, relativePath: cleaned };
}

function listDirectory(fullPath) {
  const rows = fs.readdirSync(fullPath, { withFileTypes: true });
  return rows
    .map((entry) => {
      const absolute = path.join(fullPath, entry.name);
      const stat = fs.statSync(absolute);
      return {
        name: entry.name,
        type: entry.isDirectory() ? "folder" : "file",
        size: entry.isDirectory() ? 0 : stat.size,
        updatedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function readShares() {
  try {
    const raw = fs.readFileSync(shareStorePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeShares(data) {
  fs.writeFileSync(shareStorePath, JSON.stringify(data, null, 2), "utf8");
}

export function createDriveRepository() {
  return {
    list(userId, relativePath = "") {
      const target = resolveUserPath(userId, relativePath);
      if (!fs.existsSync(target.full)) {
        return { error: "not_found" };
      }
      const stat = fs.statSync(target.full);
      if (!stat.isDirectory()) return { error: "not_folder" };
      const parentPath = target.relativePath.includes("/")
        ? target.relativePath.split("/").slice(0, -1).join("/")
        : "";
      return {
        path: target.relativePath,
        parentPath,
        items: listDirectory(target.full).map((item) => ({
          ...item,
          path: [target.relativePath, item.name].filter(Boolean).join("/")
        }))
      };
    },

    createFolder(userId, parentPath, name) {
      const safeName = safeBaseName(name);
      if (!safeName) return { error: "invalid_name" };
      const target = resolveUserPath(userId, parentPath);
      if (!fs.existsSync(target.full) || !fs.statSync(target.full).isDirectory()) {
        return { error: "not_found" };
      }
      const folderPath = path.join(target.full, safeName);
      if (fs.existsSync(folderPath)) return { error: "exists" };
      fs.mkdirSync(folderPath, { recursive: true });
      return { ok: true };
    },

    saveFile(userId, parentPath, fileName, buffer) {
      const safeName = safeBaseName(fileName);
      if (!safeName) return { error: "invalid_name" };
      const target = resolveUserPath(userId, parentPath);
      if (!fs.existsSync(target.full) || !fs.statSync(target.full).isDirectory()) {
        return { error: "not_found" };
      }

      const parsed = path.parse(safeName);
      let candidate = safeName;
      let attempt = 1;
      while (fs.existsSync(path.join(target.full, candidate))) {
        candidate = `${parsed.name} (${attempt})${parsed.ext}`;
        attempt += 1;
        if (attempt > 999) {
          return { error: "exists" };
        }
      }

      const fullPath = path.join(target.full, candidate);
      fs.writeFileSync(fullPath, buffer);
      return { ok: true, path: [target.relativePath, candidate].filter(Boolean).join("/") };
    },

    rename(userId, itemPath, nextName) {
      const safeName = safeBaseName(nextName);
      if (!safeName) return { error: "invalid_name" };
      const target = resolveUserPath(userId, itemPath);
      if (!fs.existsSync(target.full)) return { error: "not_found" };

      const parent = path.dirname(target.full);
      const nextFull = path.join(parent, safeName);
      if (fs.existsSync(nextFull)) return { error: "exists" };
      fs.renameSync(target.full, nextFull);
      return { ok: true };
    },

    remove(userId, itemPath) {
      const target = resolveUserPath(userId, itemPath);
      if (!fs.existsSync(target.full)) return { error: "not_found" };
      fs.rmSync(target.full, { recursive: true, force: true });
      return { ok: true };
    },

    getFile(userId, itemPath) {
      const target = resolveUserPath(userId, itemPath);
      if (!fs.existsSync(target.full)) return { error: "not_found" };
      const stat = fs.statSync(target.full);
      if (!stat.isFile()) return { error: "not_file" };
      return { fullPath: target.full, fileName: path.basename(target.full), size: stat.size };
    },

    createShare(userId, itemPath, token) {
      const file = this.getFile(userId, itemPath);
      if (file.error) return file;
      const shares = readShares();
      shares[token] = {
        userId: String(userId),
        itemPath: sanitizePath(itemPath),
        createdAt: new Date().toISOString()
      };
      writeShares(shares);
      return { token };
    },

    getSharedFile(token) {
      const shares = readShares();
      const row = shares[String(token || "").trim()];
      if (!row) return { error: "not_found" };
      return this.getFile(row.userId, row.itemPath);
    }
  };
}

