"use client";

import { useRef } from "react";
import { useDriveController } from "./useDriveController";

function formatSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function iconForType(type) {
  return type === "folder" ? "\u{1F4C1}" : "\u{1F4C4}";
}

export default function FilesApp() {
  const fileRef = useRef(null);
  const {
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
    goTo,
    openFolder,
    createFolder,
    uploadFiles,
    startRename,
    cancelRename,
    saveRename,
    removeItem,
    downloadItem,
    shareItem
  } = useDriveController();

  return (
    <main className="drive-shell">
      <section className="drive-app">
        <header className="drive-head">
          <div>
            <p className="eyebrow">Together Space Drive</p>
            <h1>My Files</h1>
          </div>
          <div className="row">
            <button className="button ghost" type="button" onClick={() => fileRef.current?.click()}>
              Upload
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              uploadFiles(e.target.files).catch(() => {});
              e.target.value = "";
            }}
          />
        </header>

        <section className="drive-toolbar">
          <div className="drive-breadcrumbs">
            {breadcrumbs.map((crumb, idx) => (
              <button key={crumb.path || "root"} type="button" onClick={() => goTo(crumb.path)}>
                {idx === 0 ? "Root" : crumb.name}
              </button>
            ))}
          </div>
          <div className="drive-actions">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
            />
            <button className="button" type="button" onClick={createFolder}>
              New Folder
            </button>
          </div>
        </section>

        <section className="drive-table-wrap">
          <table className="drive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.path}>
                  <td>
                    {renamingPath === item.path ? (
                      <div className="drive-inline">
                        <input
                          value={renamingName}
                          onChange={(e) => setRenamingName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveRename()}
                        />
                        <button className="button ghost" type="button" onClick={saveRename}>
                          Save
                        </button>
                        <button className="button ghost" type="button" onClick={cancelRename}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="drive-name"
                        type="button"
                        onClick={() => (item.type === "folder" ? openFolder(item) : downloadItem(item))}
                      >
                        <span>{iconForType(item.type)}</span>
                        <span>{item.name}</span>
                      </button>
                    )}
                  </td>
                  <td>{item.type === "folder" ? "-" : formatSize(item.size)}</td>
                  <td>{new Date(item.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="drive-row-actions">
                      <button className="button ghost" type="button" onClick={() => startRename(item)}>
                        Rename
                      </button>
                      {item.type === "file" ? (
                        <>
                          <button className="button ghost" type="button" onClick={() => downloadItem(item)}>
                            Download
                          </button>
                          <button className="button ghost" type="button" onClick={() => shareItem(item)}>
                            {copiedPath === item.path ? "Copied" : "Share"}
                          </button>
                        </>
                      ) : null}
                      <button className="button ghost" type="button" onClick={() => removeItem(item)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={4} className="drive-empty">
                    {loading ? "Loading..." : "Folder is empty"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {error ? <div className="toast">{error}</div> : null}
      </section>
    </main>
  );
}
