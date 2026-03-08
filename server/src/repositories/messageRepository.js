import { deleteMessage, getMessage, saveMessage, toggleReaction, updateMessage } from "../db.js";

export function createMessageRepository() {
  return {
    getById: (messageId, viewerId) => getMessage(messageId, viewerId),
    create: (chatId, userId, content) => saveMessage(chatId, userId, content),
    update: (messageId, userId, content) => updateMessage(messageId, userId, content),
    remove: (messageId, userId) => deleteMessage(messageId, userId),
    toggleReaction: (messageId, userId, emoji) => toggleReaction(messageId, userId, emoji)
  };
}

