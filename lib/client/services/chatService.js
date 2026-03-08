"use client";

export function createChatService({ chatRepository, userRepository }) {
  return {
    listChats() {
      return chatRepository.list();
    },
    fetchMessages(chatId, limit) {
      return chatRepository.messages(chatId, limit);
    },
    fetchMembers(chatId) {
      return chatRepository.members(chatId);
    },
    createChat(name, type, publicId) {
      return chatRepository.create(name, type, publicId);
    },
    joinByPublicId(publicId) {
      return chatRepository.joinByPublicId(publicId);
    },
    searchUsers(query) {
      return userRepository.search(query);
    },
    startPrivateChat(query) {
      return chatRepository.startPrivate(query);
    },
    updateChatPublicId(chatId, publicId) {
      return chatRepository.updatePublicId(chatId, publicId);
    },
    updateChatName(chatId, name) {
      return chatRepository.updateName(chatId, name);
    }
  };
}

