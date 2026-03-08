"use client";

export function createAuthRepository(http) {
  return {
    register(email, username, password) {
      return http.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password })
      });
    },
    login(email, password) {
      return http.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
    },
    confirmEmail(email, code) {
      return http.request("/api/auth/confirm-email", {
        method: "POST",
        body: JSON.stringify({ email, code })
      });
    }
  };
}

