import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "chat.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  public_id TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_code TEXT,
  verify_expires_at TEXT,
  reset_code TEXT,
  reset_expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'group',
  public_id TEXT UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'full',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);
`);

function ensureColumn(table, column, ddl) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn("messages", "edited_at", "edited_at TEXT");
ensureColumn("messages", "deleted_at", "deleted_at TEXT");
ensureColumn("users", "email", "email TEXT");
ensureColumn("chats", "type", "type TEXT NOT NULL DEFAULT 'group'");
ensureColumn("chats", "public_id", "public_id TEXT");
ensureColumn("users", "public_id", "public_id TEXT");
ensureColumn("users", "email_verified", "email_verified INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "verify_code", "verify_code TEXT");
ensureColumn("users", "verify_expires_at", "verify_expires_at TEXT");
ensureColumn("users", "reset_code", "reset_code TEXT");
ensureColumn("users", "reset_expires_at", "reset_expires_at TEXT");
ensureColumn("chat_members", "access_level", "access_level TEXT NOT NULL DEFAULT 'full'");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_public_id ON chats(public_id)");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id)");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)");

const userInsert = db.prepare(
  "INSERT INTO users (id, email, username, public_id, password_hash, email_verified, verify_code, verify_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
const userByName = db.prepare(
  "SELECT id, email, username, public_id, password_hash, email_verified, verify_code, verify_expires_at, reset_code, reset_expires_at FROM users WHERE username = ?"
);
const userByEmail = db.prepare(
  "SELECT id, email, username, public_id, password_hash, email_verified, verify_code, verify_expires_at, reset_code, reset_expires_at FROM users WHERE email = ?"
);
const userByPublicId = db.prepare(
  "SELECT id, email, username, public_id, email_verified FROM users WHERE public_id = ?"
);
const userById = db.prepare("SELECT id, email, username, public_id, email_verified FROM users WHERE id = ?");
const userByAnyIdentifier = db.prepare(`
  SELECT id, email, username, public_id, email_verified
  FROM users
  WHERE id = ? OR public_id = ? OR email = ?
  LIMIT 1
`);
const userPublicIdExists = db.prepare(
  "SELECT id FROM users WHERE public_id = ? AND (? IS NULL OR id != ?)"
);
const userNameUpdate = db.prepare("UPDATE users SET username = ? WHERE id = ?");
const userPublicIdUpdate = db.prepare("UPDATE users SET public_id = ? WHERE id = ?");
const userVerifyCodeUpdate = db.prepare(
  "UPDATE users SET verify_code = ?, verify_expires_at = ? WHERE id = ?"
);
const userVerifyConfirm = db.prepare(
  "UPDATE users SET email_verified = 1, verify_code = NULL, verify_expires_at = NULL WHERE id = ?"
);
const userResetCodeUpdate = db.prepare(
  "UPDATE users SET reset_code = ?, reset_expires_at = ? WHERE id = ?"
);
const userPasswordReset = db.prepare(
  "UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires_at = NULL WHERE id = ?"
);
const usersMissingPublicId = db.prepare(
  "SELECT id, username FROM users WHERE public_id IS NULL OR TRIM(public_id) = ''"
);
const usersSearch = db.prepare(`
  SELECT id, email, username, public_id
  FROM users
  WHERE (email LIKE ? OR public_id LIKE ? OR username LIKE ?)
    AND id != ?
  ORDER BY username ASC
  LIMIT 10
`);
const chatInsert = db.prepare(
  "INSERT INTO chats (id, name, type, public_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);
const addMember = db.prepare(
  "INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)"
);
const isMember = db.prepare(
  "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?"
);
const chatById = db.prepare("SELECT id, name, type, public_id, created_by FROM chats WHERE id = ?");
const chatByPublicId = db.prepare(
  "SELECT id, name, type, public_id, created_by FROM chats WHERE public_id = ?"
);
const chatPublicIdExists = db.prepare(
  "SELECT id FROM chats WHERE public_id = ? AND (? IS NULL OR id != ?)"
);
const chatPublicIdUpdate = db.prepare("UPDATE chats SET public_id = ? WHERE id = ?");
const chatNameUpdate = db.prepare("UPDATE chats SET name = ? WHERE id = ?");
const chatsMissingPublicId = db.prepare(
  "SELECT id, name FROM chats WHERE public_id IS NULL OR TRIM(public_id) = ''"
);
const chatsByUser = db.prepare(`
  SELECT c.id, c.name, c.type, c.public_id, c.created_by, c.created_at
  FROM chats c
  JOIN chat_members cm ON cm.chat_id = c.id
  WHERE cm.user_id = ?
  ORDER BY c.name ASC
`);
const ownerMembership = db.prepare(
  "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? AND role = 'owner'"
);
const memberAccessByChatUser = db.prepare(
  "SELECT role, access_level FROM chat_members WHERE chat_id = ? AND user_id = ?"
);
const memberByChatUser = db.prepare(`
  SELECT cm.user_id, u.username, cm.role, cm.access_level, cm.joined_at
  FROM chat_members cm
  JOIN users u ON u.id = cm.user_id
  WHERE cm.chat_id = ? AND cm.user_id = ?
`);
const membersByChat = db.prepare(`
  SELECT cm.user_id, u.username, cm.role, cm.access_level, cm.joined_at
  FROM chat_members cm
  JOIN users u ON u.id = cm.user_id
  WHERE cm.chat_id = ?
  ORDER BY CASE cm.role WHEN 'owner' THEN 0 ELSE 1 END, u.username ASC
`);
const memberAccessUpdate = db.prepare(
  "UPDATE chat_members SET access_level = ? WHERE chat_id = ? AND user_id = ?"
);
const pvChatByPair = db.prepare(`
  SELECT c.id, c.name, c.type, c.public_id, c.created_by, c.created_at
  FROM chats c
  JOIN chat_members a ON a.chat_id = c.id AND a.user_id = ?
  JOIN chat_members b ON b.chat_id = c.id AND b.user_id = ?
  WHERE c.type = 'pv'
  LIMIT 1
`);
const messageInsert = db.prepare(
  "INSERT INTO messages (id, chat_id, user_id, content, created_at, edited_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL, NULL)"
);
const messageById = db.prepare(`
  SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at, m.edited_at, m.deleted_at, u.username
  FROM messages m
  JOIN users u ON u.id = m.user_id
  WHERE m.id = ?
`);
const messageOwnerById = db.prepare("SELECT id, chat_id, user_id, deleted_at FROM messages WHERE id = ?");
const messageUpdate = db.prepare(
  "UPDATE messages SET content = ?, edited_at = ? WHERE id = ?"
);
const messageDelete = db.prepare("DELETE FROM messages WHERE id = ?");
const messageReactionsDeleteByMessage = db.prepare("DELETE FROM message_reactions WHERE message_id = ?");
const messagesByChat = db.prepare(`
  SELECT m.id, m.chat_id, m.user_id, u.username, m.content, m.created_at, m.edited_at, m.deleted_at
  FROM messages m
  JOIN users u ON u.id = m.user_id
  WHERE m.chat_id = ? AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT ?
`);
const messageReactionsByIds = db.prepare(`
  SELECT r.message_id, r.emoji, COUNT(*) AS count
  FROM message_reactions r
  WHERE r.message_id IN (SELECT value FROM json_each(?))
  GROUP BY r.message_id, r.emoji
`);
const messageMyReactionsByIds = db.prepare(`
  SELECT r.message_id, r.emoji
  FROM message_reactions r
  WHERE r.user_id = ? AND r.message_id IN (SELECT value FROM json_each(?))
`);
const reactionExists = db.prepare(
  "SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?"
);
const reactionInsert = db.prepare(
  "INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)"
);
const reactionDelete = db.prepare(
  "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?"
);
const messageReactionsByMessage = db.prepare(`
  SELECT emoji, COUNT(*) AS count
  FROM message_reactions
  WHERE message_id = ?
  GROUP BY emoji
`);
const messageMyReactions = db.prepare(`
  SELECT emoji
  FROM message_reactions
  WHERE message_id = ? AND user_id = ?
`);

function ensureDefaultChat() {
  const existing = chatById.get("general");
  if (existing) return;
  const systemUser = userById.get("system");
  if (!systemUser) {
    userInsert.run("system", "system@local", "system", "system", "disabled", 1, null, null, new Date().toISOString());
  }
  const now = new Date().toISOString();
  chatInsert.run("general", "General", "channel", "general", "system", now);
  addMember.run("general", "system", "owner", now);
}

ensureDefaultChat();

function normalizePublicId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function reservePublicId(base, excludeChatId = null) {
  const safeBase = normalizePublicId(base) || "chat";
  let candidate = safeBase;
  let attempts = 0;
  while (chatPublicIdExists.get(candidate, excludeChatId, excludeChatId)) {
    attempts += 1;
    candidate = `${safeBase}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (attempts > 50) {
      candidate = `${safeBase}-${nanoid(6).toLowerCase()}`;
      if (!chatPublicIdExists.get(candidate, excludeChatId, excludeChatId)) break;
    }
  }
  return candidate;
}

function reserveUserPublicId(base, excludeUserId = null) {
  const safeBase = normalizePublicId(base) || "user";
  let candidate = safeBase;
  let attempts = 0;
  while (userPublicIdExists.get(candidate, excludeUserId, excludeUserId)) {
    attempts += 1;
    candidate = `${safeBase}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (attempts > 50) {
      candidate = `${safeBase}-${nanoid(6).toLowerCase()}`;
      if (!userPublicIdExists.get(candidate, excludeUserId, excludeUserId)) break;
    }
  }
  return candidate;
}

function ensureExistingChatPublicIds() {
  const rows = chatsMissingPublicId.all();
  for (const row of rows) {
    const pid = reservePublicId(row.name || "chat", row.id);
    chatPublicIdUpdate.run(pid, row.id);
  }
}

ensureExistingChatPublicIds();

function ensureExistingUserPublicIds() {
  const rows = usersMissingPublicId.all();
  for (const row of rows) {
    const pid = reserveUserPublicId(row.username || "user", row.id);
    userPublicIdUpdate.run(pid, row.id);
  }
}

ensureExistingUserPublicIds();

function code6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createUser(email, username, passwordHash) {
  const id = nanoid(16);
  const now = new Date().toISOString();
  const publicId = reserveUserPublicId(username, id);
  const verifyCode = code6();
  const verifyExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  userInsert.run(id, email.toLowerCase(), username, publicId, passwordHash, 0, verifyCode, verifyExpiresAt, now);
  addMember.run("general", id, "member", now);
  return { id, email: email.toLowerCase(), username, public_id: publicId, verify_code: verifyCode, verify_expires_at: verifyExpiresAt };
}

export function getUserByUsername(username) {
  return userByName.get(username);
}

export function getUserByEmail(email) {
  return userByEmail.get(String(email || "").toLowerCase());
}

export function getUserById(id) {
  return userById.get(id);
}

export function findUserByIdentifier(identifier, actorId = "") {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/^@+/, "");
  const row = userByAnyIdentifier.get(raw, normalized, normalized);
  if (!row || row.id === actorId) return null;
  return row;
}

export function searchUsers(query, actorId) {
  const q = `%${String(query || "").trim()}%`;
  if (q === "%%") return [];
  return usersSearch.all(q, q, q, actorId);
}

export function listUserChats(userId) {
  return chatsByUser.all(userId);
}

export function createChat(name, createdBy, type = "group", requestedPublicId = "") {
  const id = nanoid(16);
  const now = new Date().toISOString();
  const publicId = reservePublicId(requestedPublicId || name);
  chatInsert.run(id, name, type, publicId, createdBy, now);
  addMember.run(id, createdBy, "owner", now);
  return { id, name, type, public_id: publicId, created_by: createdBy, created_at: now };
}

export function joinChat(chatId, userId) {
  addMember.run(chatId, userId, "member", new Date().toISOString());
}

export function startPrivateChat(actorId, targetIdentifier) {
  const target = findUserByIdentifier(targetIdentifier, actorId);
  if (!target) return { error: "target_not_found" };
  const existing = pvChatByPair.get(actorId, target.id);
  if (existing) return { chat: existing, target };
  const now = new Date().toISOString();
  const id = nanoid(16);
  const pair = [actorId, target.id].sort().join("-");
  const name = `pv-${pair}`;
  const publicId = reservePublicId(`${target.public_id || target.username}-${pair.slice(0, 6)}`);
  chatInsert.run(id, name, "pv", publicId, actorId, now);
  addMember.run(id, actorId, "owner", now);
  addMember.run(id, target.id, "member", now);
  return { chat: getChat(id), target };
}

export function getChat(chatId) {
  return chatById.get(chatId);
}

export function getChatByPublicId(publicId) {
  return chatByPublicId.get(normalizePublicId(publicId));
}

export function userInChat(chatId, userId) {
  return Boolean(isMember.get(chatId, userId));
}

export function userIsOwner(chatId, userId) {
  return Boolean(ownerMembership.get(chatId, userId));
}

export function userCanWrite(chatId, userId) {
  const membership = memberAccessByChatUser.get(chatId, userId);
  if (!membership) return false;
  return membership.role === "owner" || membership.access_level !== "read-only";
}

export function listChatMembers(chatId) {
  return membersByChat.all(chatId);
}

export function updateMemberAccess(chatId, actorId, memberId, nextAccess) {
  const allowed = new Set(["full", "read-only"]);
  if (!allowed.has(nextAccess)) return null;
  if (!userIsOwner(chatId, actorId)) return null;
  const target = memberAccessByChatUser.get(chatId, memberId);
  if (!target || target.role === "owner") return null;
  memberAccessUpdate.run(nextAccess, chatId, memberId);
  return memberByChatUser.get(chatId, memberId) || null;
}

export function updateChatPublicId(chatId, userId, requestedPublicId) {
  if (!userIsOwner(chatId, userId)) return null;
  const nextPublicId = reservePublicId(requestedPublicId, chatId);
  chatPublicIdUpdate.run(nextPublicId, chatId);
  return getChat(chatId);
}

export function updateChatName(chatId, userId, requestedName) {
  if (!userIsOwner(chatId, userId)) return null;
  const nextName = String(requestedName || "").trim().slice(0, 64);
  if (!nextName || nextName.length < 2) return null;
  try {
    chatNameUpdate.run(nextName, chatId);
    return getChat(chatId);
  } catch {
    return null;
  }
}

export function updateUserProfile(userId, payload) {
  const current = userById.get(userId);
  if (!current) return { error: "not_found" };

  const nextUsername =
    typeof payload.username === "string" && payload.username.trim()
      ? payload.username.trim()
      : current.username;
  if (nextUsername !== current.username && userByName.get(nextUsername)) {
    return { error: "username_exists" };
  }

  let nextPublicId = current.public_id;
  if (typeof payload.publicId === "string" && payload.publicId.trim()) {
    nextPublicId = reserveUserPublicId(payload.publicId, userId);
  }
  if (!nextPublicId) {
    nextPublicId = reserveUserPublicId(nextUsername, userId);
  }

  try {
    if (nextUsername !== current.username) userNameUpdate.run(nextUsername, userId);
    if (nextPublicId !== current.public_id) userPublicIdUpdate.run(nextPublicId, userId);
    return { user: userById.get(userId) };
  } catch {
    return { error: "invalid" };
  }
}

export function refreshVerifyCode(email) {
  const user = getUserByEmail(email);
  if (!user) return null;
  const verifyCode = code6();
  const verifyExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  userVerifyCodeUpdate.run(verifyCode, verifyExpiresAt, user.id);
  return { ...userByEmail.get(String(email || "").toLowerCase()), verify_code: verifyCode, verify_expires_at: verifyExpiresAt };
}

export function confirmEmailCode(email, code) {
  const user = getUserByEmail(email);
  if (!user) return { error: "not_found" };
  if (user.email_verified) return { user };
  if (!user.verify_code || !user.verify_expires_at) return { error: "invalid_code" };
  if (String(user.verify_code) !== String(code || "").trim()) return { error: "invalid_code" };
  if (new Date(user.verify_expires_at).getTime() < Date.now()) return { error: "code_expired" };
  userVerifyConfirm.run(user.id);
  return { user: userById.get(user.id) };
}

export function createPasswordReset(email) {
  const user = getUserByEmail(email);
  if (!user) return null;
  const resetCode = code6();
  const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  userResetCodeUpdate.run(resetCode, resetExpiresAt, user.id);
  return { ...user, reset_code: resetCode, reset_expires_at: resetExpiresAt };
}

export function resetPasswordWithCode(email, code, passwordHash) {
  const user = getUserByEmail(email);
  if (!user) return { error: "not_found" };
  if (!user.reset_code || !user.reset_expires_at) return { error: "invalid_code" };
  if (String(user.reset_code) !== String(code || "").trim()) return { error: "invalid_code" };
  if (new Date(user.reset_expires_at).getTime() < Date.now()) return { error: "code_expired" };
  userPasswordReset.run(passwordHash, user.id);
  return { user: userById.get(user.id) };
}

export function saveMessage(chatId, userId, content) {
  const id = nanoid(20);
  const createdAt = new Date().toISOString();
  messageInsert.run(id, chatId, userId, content, createdAt);
  const sender = getUserById(userId);
  return {
    id,
    chat_id: chatId,
    user_id: userId,
    username: sender?.username || "unknown",
    content,
    created_at: createdAt,
    edited_at: null,
    deleted_at: null,
    reactions: {},
    my_reactions: []
  };
}

function hydrateReactions(messages, viewerId) {
  if (!messages.length) return messages;
  const ids = JSON.stringify(messages.map((m) => m.id));
  const grouped = new Map();
  const mine = new Map();

  for (const row of messageReactionsByIds.all(ids)) {
    if (!grouped.has(row.message_id)) grouped.set(row.message_id, {});
    grouped.get(row.message_id)[row.emoji] = row.count;
  }
  if (viewerId) {
    for (const row of messageMyReactionsByIds.all(viewerId, ids)) {
      if (!mine.has(row.message_id)) mine.set(row.message_id, []);
      mine.get(row.message_id).push(row.emoji);
    }
  }

  return messages.map((m) => ({
    ...m,
    reactions: grouped.get(m.id) || {},
    my_reactions: mine.get(m.id) || []
  }));
}

export function getMessages(chatId, limit = 50, viewerId = null) {
  const base = messagesByChat.all(chatId, Math.min(Math.max(limit, 1), 100)).reverse();
  return hydrateReactions(base, viewerId);
}

export function getMessage(messageId, viewerId = null) {
  const row = messageById.get(messageId);
  if (!row) return null;
  return hydrateReactions([row], viewerId)[0];
}

export function updateMessage(messageId, userId, content) {
  const row = messageOwnerById.get(messageId);
  if (!row || row.user_id !== userId || row.deleted_at) return null;
  const editedAt = new Date().toISOString();
  messageUpdate.run(content, editedAt, messageId);
  return messageById.get(messageId);
}

export function deleteMessage(messageId, userId) {
  const row = messageOwnerById.get(messageId);
  if (!row || row.user_id !== userId || row.deleted_at) return null;
  messageReactionsDeleteByMessage.run(messageId);
  messageDelete.run(messageId);
  return { id: row.id, chat_id: row.chat_id, user_id: row.user_id };
}

export function toggleReaction(messageId, userId, emoji) {
  if (reactionExists.get(messageId, userId, emoji)) {
    reactionDelete.run(messageId, userId, emoji);
  } else {
    reactionInsert.run(messageId, userId, emoji, new Date().toISOString());
  }
  const reactions = {};
  for (const row of messageReactionsByMessage.all(messageId)) {
    reactions[row.emoji] = row.count;
  }
  const myReactions = messageMyReactions.all(messageId, userId).map((r) => r.emoji);
  return { message_id: messageId, reactions, my_reactions: myReactions };
}
