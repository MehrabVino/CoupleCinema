"use client";

export function createDriveService({ driveRepository }) {
  return {
    list(path = "") {
      return driveRepository.list(path);
    },
    createFolder(parentPath, name) {
      return driveRepository.createFolder(parentPath, name);
    },
    upload(parentPath, file) {
      return driveRepository.upload(parentPath, file);
    },
    rename(itemPath, name) {
      return driveRepository.rename(itemPath, name);
    },
    remove(itemPath) {
      return driveRepository.remove(itemPath);
    },
    createShare(itemPath) {
      return driveRepository.createShare(itemPath);
    },
    async download(itemPath) {
      const { blob, fileName } = await driveRepository.download(itemPath);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { ok: true };
    }
  };
}

