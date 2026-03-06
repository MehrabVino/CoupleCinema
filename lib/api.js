"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export function tokenGet() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("chat_token");
}

export function tokenSet(token) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("chat_token", token);
}

export function tokenClear() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("chat_token");
}

async function request(path, options = {}) {
  const token = tokenGet();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export const authRegister = (email, username, password) =>
  request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) });

export const authLogin = (email, password) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const authConfirmEmail = (email, code) =>
  request("/api/auth/confirm-email", { method: "POST", body: JSON.stringify({ email, code }) });
export const authResendConfirm = (email) =>
  request("/api/auth/resend-confirm", { method: "POST", body: JSON.stringify({ email }) });
export const authForgotPassword = (email) =>
  request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
export const authResetPassword = (email, code, password) =>
  request("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, password }) });

export const fetchMe = () => request("/api/me");
export const updateMyProfile = (payload) =>
  request("/api/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
export const fetchChats = () => request("/api/chats");
export const createChat = (name, type = "group", publicId = "") =>
  request("/api/chats", { method: "POST", body: JSON.stringify({ name, type, publicId }) });
export const searchUsers = (q) => request(`/api/users/search?q=${encodeURIComponent(q)}`);
export const startPrivateChat = (query) =>
  request("/api/chats/pv/start", { method: "POST", body: JSON.stringify({ query }) });
export const joinChatByPublicId = (publicId) =>
  request("/api/chats/join-public", {
    method: "POST",
    body: JSON.stringify({ publicId })
  });
export const updateChatPublicId = (chatId, publicId) =>
  request(`/api/chats/${chatId}/public-id`, {
    method: "PATCH",
    body: JSON.stringify({ publicId })
  });
export const updateChatName = (chatId, name) =>
  request(`/api/chats/${chatId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name })
  });
export const fetchChatMembers = (chatId) => request(`/api/chats/${chatId}/members`);
export const updateChatMemberAccess = (chatId, memberId, access) =>
  request(`/api/chats/${chatId}/members/${memberId}/access`, {
    method: "PATCH",
    body: JSON.stringify({ access })
  });
export const fetchMessages = (chatId) => request(`/api/chats/${chatId}/messages?limit=80`);
