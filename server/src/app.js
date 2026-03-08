import bcrypt from "bcryptjs";
import fastifyModule from "fastify";
import { createNotifierAdapter } from "./adapters/notifierAdapter.js";
import { getEnv } from "./config/env.js";
import { createAuthController } from "./controllers/authController.js";
import { createChatController } from "./controllers/chatController.js";
import { createDriveController } from "./controllers/driveController.js";
import { createUserController } from "./controllers/userController.js";
import { sendEmail } from "./mailer.js";
import { registerCorePlugins } from "./plugins/registerCorePlugins.js";
import { createChatRepository } from "./repositories/chatRepository.js";
import { createMessageRepository } from "./repositories/messageRepository.js";
import { createUserRepository } from "./repositories/userRepository.js";
import { createDriveRepository } from "./repositories/driveRepository.js";
import { createSocketServer } from "./realtime/socketServer.js";
import { registerRoutes } from "./routes/registerRoutes.js";
import { createAuthService } from "./services/authService.js";
import { createChatService } from "./services/chatService.js";
import { createDriveService } from "./services/driveService.js";
import { createRealtimeService } from "./services/realtimeService.js";
import { createUserService } from "./services/userService.js";

function createTokenSigner(app) {
  return {
    sign(payload) {
      return app.jwt.sign(payload, { expiresIn: "7d" });
    }
  };
}

function createPasswordHasher() {
  return {
    hash(value) {
      return bcrypt.hash(value, 10);
    },
    compare(value, hash) {
      return bcrypt.compare(value, hash);
    }
  };
}

function createMailer() {
  return {
    send(message) {
      return sendEmail(message);
    }
  };
}

export async function createApp() {
  const env = getEnv();
  const app = fastifyModule({ logger: false, bodyLimit: 55 * 1024 * 1024 });

  await registerCorePlugins(app, env);

  const repositories = {
    users: createUserRepository(),
    chats: createChatRepository(),
    messages: createMessageRepository(),
    drive: createDriveRepository()
  };

  const tokenSigner = createTokenSigner(app);
  const passwordHasher = createPasswordHasher();
  const mailer = createMailer();

  const realtimeService = createRealtimeService({
    chats: repositories.chats,
    messages: repositories.messages
  });

  app.decorate("io", null);
  app.io = createSocketServer(app, env.clientOrigin, realtimeService);
  const notifier = createNotifierAdapter(app.io);

  const services = {
    auth: createAuthService({
      users: repositories.users,
      mailer,
      passwordHasher,
      tokenSigner
    }),
    user: createUserService({
      users: repositories.users,
      tokenSigner
    }),
    chat: createChatService({
      chats: repositories.chats,
      notifier
    }),
    drive: createDriveService({
      driveRepo: repositories.drive
    })
  };

  const controllers = {
    auth: createAuthController({ authService: services.auth }),
    user: createUserController({ userService: services.user }),
    chat: createChatController({ chatService: services.chat }),
    drive: createDriveController({ driveService: services.drive, env })
  };

  await registerRoutes(app, controllers);
  return { app, env };
}
