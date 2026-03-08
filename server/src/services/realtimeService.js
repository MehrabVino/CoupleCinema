const ALLOWED_REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{1F602}", "\u{1F44F}", "\u{1F389}"];
const MAX_MESSAGE_LENGTH = 8 * 1024 * 1024;

export function createRealtimeService({ chats, messages }) {
  return {
    canJoinChat(chatId, userId) {
      return Boolean(chatId && chats.isMember(chatId, userId));
    },

    canBroadcastTyping(chatId, userId) {
      return Boolean(chatId && chats.isMember(chatId, userId) && chats.canWrite(chatId, userId));
    },

    sendMessage(chatId, userId, content) {
      const text = String(content || "").trim();
      if (!chatId || !text || text.length > MAX_MESSAGE_LENGTH) return null;
      if (!chats.isMember(chatId, userId) || !chats.canWrite(chatId, userId)) return null;
      return messages.create(chatId, userId, text);
    },

    editMessage(messageId, userId, content) {
      const text = String(content || "").trim();
      if (!messageId || !text || text.length > MAX_MESSAGE_LENGTH) return null;
      const existing = messages.getById(messageId, userId);
      if (!existing || !chats.canWrite(existing.chat_id, userId)) return null;
      const updated = messages.update(messageId, userId, text);
      if (!updated || !chats.isMember(updated.chat_id, userId)) return null;
      return updated;
    },

    deleteMessage(messageId, userId) {
      if (!messageId) return null;
      const existing = messages.getById(messageId, userId);
      if (!existing || !chats.canWrite(existing.chat_id, userId)) return null;
      const deleted = messages.remove(messageId, userId);
      if (!deleted || !chats.isMember(deleted.chat_id, userId)) return null;
      return deleted;
    },

    toggleReaction(messageId, userId, emoji, chatId) {
      if (!messageId || !chatId || !emoji) return null;
      if (!chats.isMember(chatId, userId) || !chats.canWrite(chatId, userId)) return null;
      if (!ALLOWED_REACTIONS.includes(emoji)) return null;
      const message = messages.getById(messageId, userId);
      if (!message || message.chat_id !== chatId || message.deleted_at) return null;
      return messages.toggleReaction(messageId, userId, emoji);
    }
  };
}
