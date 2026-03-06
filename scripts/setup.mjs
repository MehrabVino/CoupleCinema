import fs from "node:fs";

if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists");
}

console.log("Next: npm install");
console.log("Then: npm run dev");

