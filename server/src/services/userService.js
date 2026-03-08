export function createUserService({ users, tokenSigner }) {
  return {
    getMe(userId) {
      return users.findById(userId);
    },

    updateProfile(userId, payload) {
      const result = users.updateProfile(userId, payload);
      if (result.error || !result.user) return result;

      const token = tokenSigner.sign({ sub: result.user.id, username: result.user.username });
      return { user: result.user, token };
    },

    search(query, actorId) {
      return users.search(query, actorId);
    }
  };
}

