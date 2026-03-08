export function createChatService({ chats, notifier }) {
  return {
    listByUser(userId) {
      return chats.listByUser(userId);
    },

    startPrivate(actorId, query) {
      const result = chats.startPrivate(actorId, query);
      if (result.error) return result;
      notifier.notifyChatAdded(result.target.id, result.chat);
      return result;
    },

    create(name, actorId, type, publicId) {
      return chats.create(name, actorId, type, publicId);
    },

    joinById(chatId, userId) {
      const chat = chats.findById(chatId);
      if (!chat) return { error: "not_found" };
      chats.join(chat.id, userId);
      return { ok: true, chat };
    },

    joinByPublicId(publicId, userId) {
      const chat = chats.findByPublicId(publicId);
      if (!chat) return { error: "not_found" };
      chats.join(chat.id, userId);
      return { ok: true, chat };
    },

    updatePublicId(chatId, userId, publicId) {
      return chats.updatePublicId(chatId, userId, publicId);
    },

    rename(chatId, userId, name) {
      return chats.updateName(chatId, userId, name);
    },

    listMembers(chatId, userId) {
      if (!chats.isMember(chatId, userId)) return { error: "forbidden" };
      return { members: chats.members(chatId) };
    },

    updateMemberAccess(chatId, actorId, memberId, access) {
      const chat = chats.findById(chatId);
      if (!chat) return { error: "not_found" };
      if (chat.type === "pv") return { error: "pv_access_not_allowed" };

      const member = chats.updateMemberAccess(chatId, actorId, memberId, access);
      if (!member) return { error: "forbidden" };
      notifier.notifyMemberAccessUpdated(chatId, member);
      return { member };
    },

    listMessages(chatId, userId, limit) {
      if (!chats.isMember(chatId, userId)) return { error: "forbidden" };
      return { messages: chats.messages(chatId, limit, userId) };
    }
  };
}

