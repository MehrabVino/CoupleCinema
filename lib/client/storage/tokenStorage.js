"use client";

const TOKEN_KEY = "chat_token";

export function createTokenStorage(storage = typeof window !== "undefined" ? window.localStorage : null) {
  return {
    get() {
      return storage?.getItem(TOKEN_KEY) || "";
    },
    set(token) {
      if (!storage) return;
      storage.setItem(TOKEN_KEY, token);
    },
    clear() {
      if (!storage) return;
      storage.removeItem(TOKEN_KEY);
    }
  };
}

