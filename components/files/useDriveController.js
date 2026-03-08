"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSession } from "@/components/auth/AppSession";

function pathParts(path) {
  const clean = String(path || "").replace(/^\/+|\/+$/g, "");
  if (!clean) return [];
  return clean.split("/").filter(Boolean);
}

export function useDriveController() {
  const { services } = useAppSession();
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingPath, setRenamingPath] = useState("");
  const [renamingName, setRenamingName] = useState("");
  const [error, setError] = useState("");
  const [copiedPath, setCopiedPath] = useState("");

  const breadcrumbs = useMemo(() => {
    const parts = pathParts(currentPath);
    return [{ name: "My Drive", path: "" }].concat(
      parts.map((name, idx) => ({ name, path: parts.slice(0, idx + 1).join("/") }))
    );
  }, [currentPath]);

  const load = useCallback(
    async (path = currentPath) => {
      setLoading(true);
      setError("");
      try {
        const data = await services.driveService.list(path);
        setCurrentPath(data.path || "");
        setItems(data.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [currentPath, services.driveService]
  );

  useEffect(() => {
    load("").catch(() => {});
  }, [load]);

  const openFolder = useCallback(
    (item) => {
      if (item.type !== "folder") return;
      load(item.path).catch(() => {});
    },
    [load]
  );

  const goTo = useCallback(
    (path) => {
      load(path).catch(() => {});
    },
    [load]
  );

  const createFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await services.driveService.createFolder(currentPath, name);
      setNewFolderName("");
      await load(currentPath);
    } catch (err) {
      setError(err.message);
    }
  }, [currentPath, load, newFolderName, services.driveService]);

  const uploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      setLoading(true);
      setError("");
      try {
        for (const file of files) {
          await services.driveService.upload(currentPath, file);
        }
        await load(currentPath);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [currentPath, load, services.driveService]
  );

  const startRename = useCallback((item) => {
    setRenamingPath(item.path);
    setRenamingName(item.name);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingPath("");
    setRenamingName("");
  }, []);

  const saveRename = useCallback(async () => {
    if (!renamingPath || !renamingName.trim()) return;
    try {
      await services.driveService.rename(renamingPath, renamingName.trim());
      cancelRename();
      await load(currentPath);
    } catch (err) {
      setError(err.message);
    }
  }, [cancelRename, currentPath, load, renamingName, renamingPath, services.driveService]);

  const removeItem = useCallback(
    async (item) => {
      const confirmed = window.confirm(`Delete "${item.name}"?`);
      if (!confirmed) return;
      try {
        await services.driveService.remove(item.path);
        await load(currentPath);
      } catch (err) {
        setError(err.message);
      }
    },
    [currentPath, load, services.driveService]
  );

  const downloadItem = useCallback(
    async (item) => {
      try {
        await services.driveService.download(item.path);
      } catch (err) {
        setError(err.message);
      }
    },
    [services.driveService]
  );

  const shareItem = useCallback(
    async (item) => {
      try {
        const data = await services.driveService.createShare(item.path);
        await navigator.clipboard.writeText(data.url);
        setCopiedPath(item.path);
        setTimeout(() => setCopiedPath(""), 2000);
      } catch (err) {
        setError(err.message);
      }
    },
    [services.driveService]
  );

  return {
    currentPath,
    items,
    loading,
    newFolderName,
    setNewFolderName,
    renamingPath,
    renamingName,
    setRenamingName,
    error,
    copiedPath,
    breadcrumbs,
    load,
    openFolder,
    goTo,
    createFolder,
    uploadFiles,
    startRename,
    cancelRename,
    saveRename,
    removeItem,
    downloadItem,
    shareItem
  };
}

