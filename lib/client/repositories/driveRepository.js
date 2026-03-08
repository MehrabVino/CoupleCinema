"use client";

export function createDriveRepository(http, tokenStorage) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  return {
    list(path = "") {
      return http.request(`/api/drive/items?path=${encodeURIComponent(path)}`);
    },
    createFolder(parentPath, name) {
      return http.request("/api/drive/folders", {
        method: "POST",
        body: JSON.stringify({ parentPath, name })
      });
    },
    rename(itemPath, name) {
      return http.request("/api/drive/items/rename", {
        method: "PATCH",
        body: JSON.stringify({ itemPath, name })
      });
    },
    remove(itemPath) {
      return http.request("/api/drive/items", {
        method: "DELETE",
        body: JSON.stringify({ itemPath })
      });
    },
    createShare(itemPath) {
      return http.request("/api/drive/share", {
        method: "POST",
        body: JSON.stringify({ itemPath })
      });
    },
    async upload(parentPath, file) {
      const token = tokenStorage.get();
      const res = await fetch(
        `${baseUrl}/api/drive/upload?path=${encodeURIComponent(parentPath || "")}`,
        {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/octet-stream",
            "x-file-name": file.name
          },
          body: await file.arrayBuffer()
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json;
    },
    async download(itemPath) {
      const token = tokenStorage.get();
      const res = await fetch(`${baseUrl}/api/drive/download?path=${encodeURIComponent(itemPath)}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ""
        }
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Download failed");
      }
      const blob = await res.blob();
      const match = /filename="?([^"]+)"?/i.exec(res.headers.get("content-disposition") || "");
      const fileName = match?.[1] || "download";
      return { blob, fileName };
    }
  };
}
