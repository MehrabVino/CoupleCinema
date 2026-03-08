import dotenv from "dotenv";
import path from "node:path";

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
  loaded = true;
}

export function getEnv() {
  loadEnv();
  return {
    port: Number(process.env.PORT || 4000),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me"
  };
}
