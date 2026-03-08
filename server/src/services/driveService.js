import crypto from "node:crypto";

export function createDriveService({ driveRepo }) {
  return {
    list(userId, relativePath = "") {
      return driveRepo.list(userId, relativePath);
    },

    createFolder(userId, parentPath, name) {
      return driveRepo.createFolder(userId, parentPath, name);
    },

    uploadFile(userId, parentPath, fileName, buffer) {
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return { error: "empty_file" };
      }
      if (buffer.length > 50 * 1024 * 1024) {
        return { error: "file_too_large" };
      }
      return driveRepo.saveFile(userId, parentPath, fileName, buffer);
    },

    rename(userId, itemPath, name) {
      return driveRepo.rename(userId, itemPath, name);
    },

    remove(userId, itemPath) {
      return driveRepo.remove(userId, itemPath);
    },

    download(userId, itemPath) {
      return driveRepo.getFile(userId, itemPath);
    },

    createShare(userId, itemPath) {
      const token = crypto.randomBytes(18).toString("base64url");
      return driveRepo.createShare(userId, itemPath, token);
    },

    downloadShared(token) {
      return driveRepo.getSharedFile(token);
    }
  };
}

