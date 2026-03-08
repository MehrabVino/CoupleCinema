import { authRoutes } from "./authRoutes.js";
import { chatRoutes } from "./chatRoutes.js";
import { driveRoutes } from "./driveRoutes.js";
import { healthRoutes } from "./healthRoutes.js";
import { userRoutes } from "./userRoutes.js";

export async function registerRoutes(app, controllers) {
  await app.register(async function apiRoutes(api) {
    await healthRoutes(api);
    await authRoutes(api, controllers);
    await userRoutes(api, controllers);
    await chatRoutes(api, controllers);
    await driveRoutes(api, controllers);
  }, { prefix: "/api" });
}
