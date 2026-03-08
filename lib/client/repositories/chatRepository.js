"use client";

export function createChatRepository(http) {
  return {
    list() {
      return http.request("/api/chats");
    },
    create(name, type = "group", publicId = "") {
      return http.request("/api/chats", {
        method: "POST",
        body: JSON.stringify({ name, type, publicId })
      });
    },
    startPrivate(query) {
      return http.request("/api/chats/pv/start", {
        method: "POST",
        body: JSON.stringify({ query })
      });
    },
    joinByPublicId(publicId) {
      return http.request("/api/chats/join-public", {
        method: "POST",
        body: JSON.stringify({ publicId })
      });
    },
    updatePublicId(chatId, publicId) {
      return http.request(`/api/chats/${chatId}/public-id`, {
        method: "PATCH",
        body: JSON.stringify({ publicId })
      });
    },
    updateName(chatId, name) {
      return http.request(`/api/chats/${chatId}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });
    },
    members(chatId) {
      return http.request(`/api/chats/${chatId}/members`);
    },
    messages(chatId, limit = 80) {
      return http.request(`/api/chats/${chatId}/messages?limit=${limit}`);
    }
  };
}

