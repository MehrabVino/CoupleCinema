"use client";

export function createSessionService({ authRepository, userRepository, tokenStorage }) {
  return {
    async restore() {
      const token = tokenStorage.get();
      if (!token) return null;
      try {
        const me = await userRepository.me();
        return me.user;
      } catch {
        tokenStorage.clear();
        return null;
      }
    },
    async login(email, password) {
      const data = await authRepository.login(email, password);
      tokenStorage.set(data.token);
      return data.user;
    },
    register(email, username, password) {
      return authRepository.register(email, username, password);
    },
    confirm(email, code) {
      return authRepository.confirmEmail(email, code);
    },
    logout() {
      tokenStorage.clear();
    },
    token() {
      return tokenStorage.get();
    },
    async updateProfile(payload) {
      const data = await userRepository.updateProfile(payload);
      if (data.token) tokenStorage.set(data.token);
      return data.user;
    }
  };
}

