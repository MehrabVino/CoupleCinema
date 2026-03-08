export function createNotifierAdapter(io) {
  return {
    notifyChatAdded(userId, chat) {
      io.to(`user:${userId}`).emit("chat:added", { chat });
    },
    notifyMemberAccessUpdated(chatId, member) {
      io.to(chatId).emit("member:access-updated", { chatId, member });
    }
  };
}

