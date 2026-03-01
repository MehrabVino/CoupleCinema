import crypto from "crypto";

export function generateSessionCode(length = 6): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

export function generateHostToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

