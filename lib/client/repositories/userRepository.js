"use client";

export function createUserRepository(http) {
  return {
    me() {
      return http.request("/api/me");
    },
    updateProfile(payload) {
      return http.request("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    search(query) {
      return http.request(`/api/users/search?q=${encodeURIComponent(query)}`);
    }
  };
}

