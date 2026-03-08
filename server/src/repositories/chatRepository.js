import {
  createChat,
  getChat,
  getChatByPublicId,
  getMessages,
  joinChat,
  listChatMembers,
  listUserChats,
  startPrivateChat,
  updateChatName,
  updateChatPublicId,
  updateMemberAccess,
  userCanWrite,
  userInChat
} from "../db.js";

export function createChatRepository() {
  return {
    listByUser: (userId) => listUserChats(userId),
    startPrivate: (actorId, targetIdentifier) => startPrivateChat(actorId, targetIdentifier),
    create: (name, createdBy, type, publicId) => createChat(name, createdBy, type, publicId),
    findById: (chatId) => getChat(chatId),
    findByPublicId: (publicId) => getChatByPublicId(publicId),
    join: (chatId, userId) => joinChat(chatId, userId),
    isMember: (chatId, userId) => userInChat(chatId, userId),
    canWrite: (chatId, userId) => userCanWrite(chatId, userId),
    members: (chatId) => listChatMembers(chatId),
    updatePublicId: (chatId, userId, publicId) => updateChatPublicId(chatId, userId, publicId),
    updateName: (chatId, userId, name) => updateChatName(chatId, userId, name),
    updateMemberAccess: (chatId, actorId, memberId, access) =>
      updateMemberAccess(chatId, actorId, memberId, access),
    messages: (chatId, limit, viewerId) => getMessages(chatId, limit, viewerId)
  };
}

