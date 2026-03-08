"use client";

import { createSocketAdapter } from "../adapters/socketAdapter";
import { createHttpClient } from "../http/httpClient";
import { createAuthRepository } from "../repositories/authRepository";
import { createChatRepository } from "../repositories/chatRepository";
import { createDriveRepository } from "../repositories/driveRepository";
import { createUserRepository } from "../repositories/userRepository";
import { createChatService } from "../services/chatService";
import { createDriveService } from "../services/driveService";
import { createSessionService } from "../services/sessionService";
import { createTokenStorage } from "../storage/tokenStorage";

let singleton = null;

export function createClientServices() {
  const tokenStorage = createTokenStorage();
  const http = createHttpClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "",
    tokenProvider: tokenStorage
  });
  const authRepository = createAuthRepository(http);
  const userRepository = createUserRepository(http);
  const chatRepository = createChatRepository(http);
  const driveRepository = createDriveRepository(http, tokenStorage);

  return {
    tokenStorage,
    sessionService: createSessionService({
      authRepository,
      userRepository,
      tokenStorage
    }),
    chatService: createChatService({
      chatRepository,
      userRepository
    }),
    driveService: createDriveService({
      driveRepository
    }),
    socketAdapter: createSocketAdapter()
  };
}

export function getClientServices() {
  if (!singleton) singleton = createClientServices();
  return singleton;
}
