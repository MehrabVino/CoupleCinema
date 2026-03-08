"use client";

import { io } from "socket.io-client";

export function createSocketAdapter({ socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined } = {}) {
  return {
    connect(token) {
      return io(socketUrl, {
        transports: ["websocket"],
        auth: { token }
      });
    }
  };
}

