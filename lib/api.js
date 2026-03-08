"use client";

import { getClientServices } from "@/lib/client/factories/createClientServices";

function services() {
  return getClientServices();
}

export function tokenGet() {
  return services().tokenStorage.get();
}

export function tokenSet(token) {
  services().tokenStorage.set(token);
}

export function tokenClear() {
  services().tokenStorage.clear();
}

export const authRegister = (email, username, password) =>
  services().sessionService.register(email, username, password);
export const authLogin = async (email, password) => {
  const user = await services().sessionService.login(email, password);
  return { user, token: services().sessionService.token() };
};
export const authConfirmEmail = (email, code) => services().sessionService.confirm(email, code);

export const fetchMe = async () => ({ user: await services().sessionService.restore() });
export const updateMyProfile = async (payload) => ({
  user: await services().sessionService.updateProfile(payload),
  token: services().sessionService.token()
});
export const fetchChats = () => services().chatService.listChats();
export const createChat = (name, type = "group", publicId = "") =>
  services().chatService.createChat(name, type, publicId);
export const searchUsers = (q) => services().chatService.searchUsers(q);
export const startPrivateChat = (query) => services().chatService.startPrivateChat(query);
export const joinChatByPublicId = (publicId) => services().chatService.joinByPublicId(publicId);
export const updateChatPublicId = (chatId, publicId) =>
  services().chatService.updateChatPublicId(chatId, publicId);
export const updateChatName = (chatId, name) => services().chatService.updateChatName(chatId, name);
export const fetchChatMembers = (chatId) => services().chatService.fetchMembers(chatId);
export const fetchMessages = (chatId) => services().chatService.fetchMessages(chatId, 80);

