import {
  createPasswordReset,
  createUser,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  refreshVerifyCode,
  confirmEmailCode,
  resetPasswordWithCode,
  searchUsers,
  updateUserProfile
} from "../db.js";

export function createUserRepository() {
  return {
    findById: (id) => getUserById(id),
    findByEmail: (email) => getUserByEmail(email),
    findByUsername: (username) => getUserByUsername(username),
    search: (query, actorId) => searchUsers(query, actorId),
    create: (email, username, passwordHash) => createUser(email, username, passwordHash),
    updateProfile: (userId, payload) => updateUserProfile(userId, payload),
    refreshVerifyCode: (email) => refreshVerifyCode(email),
    confirmEmailCode: (email, code) => confirmEmailCode(email, code),
    createPasswordReset: (email) => createPasswordReset(email),
    resetPasswordWithCode: (email, code, passwordHash) => resetPasswordWithCode(email, code, passwordHash)
  };
}

