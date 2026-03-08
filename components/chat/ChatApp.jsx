"use client";

import { useEffect, useRef } from "react";
import { useChatController } from "@/components/chat/useChatController";

const REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{1F602}", "\u{1F44F}", "\u{1F389}"];

function UiIcon({ name }) {
  const common = {
    className: "ui-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (name === "moon") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg {...common}>
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-6A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
    );
  }
  if (name === "bookmark") {
    return (
      <svg {...common}>
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  if (name === "bookmark-fill") {
    return (
      <svg viewBox="0 0 24 24" className="ui-icon fill-icon" aria-hidden="true">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }
  if (name === "send") {
    return (
      <svg {...common}>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    );
  }
  if (name === "paperclip") {
    return (
      <svg {...common}>
        <path d="M21.4 11.1l-8.5 8.5a6 6 0 1 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
      </svg>
    );
  }
  if (name === "smile") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function getAvatarLabel(name) {
  const source = (name || "?").trim();
  return source.charAt(0).toUpperCase();
}

function parseAttachment(content) {
  const marker = "__ATTACHMENT__";
  const text = String(content || "");
  if (!text.startsWith(marker)) return null;
  try {
    const data = JSON.parse(text.slice(marker.length));
    if (!data?.dataUrl || !data?.fileName) return null;
    return data;
  } catch {
    return null;
  }
}

export default function ChatApp() {
  const fileInputRef = useRef(null);
  const roomHeadActionsRef = useRef(null);
  const quickEmojis = [
    "\u{1F642}",
    "\u{1F60A}",
    "\u{1F60E}",
    "\u{1F970}",
    "\u{1F44D}",
    "\u{1F44E}",
    "\u{1F44F}",
    "\u{270C}\u{FE0F}",
    "\u{1F44C}",
    "\u{1F64C}",
    "\u{2764}\u{FE0F}",
    "\u{1F49B}",
    "\u{1F499}",
    "\u{1F525}",
    "\u{1F389}",
    "\u{1F680}",
    "\u{1F31F}",
    "\u{2728}",
    "\u{1F600}",
    "\u{1F602}",
    "\u{1F923}",
    "\u{1F609}",
    "\u{1F60D}",
    "\u{1F618}",
    "\u{1F914}",
    "\u{1F62E}",
    "\u{1F62D}",
    "\u{1F621}",
    "\u{1F97A}",
    "\u{1F4AF}"
  ];
  const {
    user,
    activeChatId,
    setActiveChatId,
    activeTypeTab,
    setActiveTypeTab,
    newChatType,
    setNewChatType,
    selectedMessageId,
    setSelectedMessageId,
    unreadByChat,
    draft,
    setDraft,
    attachment,
    emojiPanelOpen,
    setEmojiPanelOpen,
    typing,
    onlineCount,
    newChatName,
    setNewChatName,
    newPublicId,
    setNewPublicId,
    pvQuery,
    setPvQuery,
    pvResults,
    joinPublicId,
    setJoinPublicId,
    chatFilter,
    setChatFilter,
    messageFilter,
    setMessageFilter,
    editingId,
    editingText,
    setEditingText,
    editingChatName,
    setEditingChatName,
    editingPublicId,
    setEditingPublicId,
    manageOpen,
    setManageOpen,
    profileOpen,
    setProfileOpen,
    savedOnly,
    setSavedOnly,
    savedMessageIds,
    memberMenu,
    setMemberMenu,
    isMobile,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    error,
    socketRef,
    endRef,
    messagesRef,
    autoScrollRef,
    activeChat,
    isOwner,
    activeMembers,
    canWrite,
    canSend,
    filteredChats,
    filteredMessages,
    addChat,
    onJoinByPublicId,
    onSearchPvUsers,
    onStartPrivateChat,
    onSavePublicId,
    onSaveChatName,
    toggleSavedMessage,
    sendMessage,
    pickAttachment,
    clearAttachment,
    addEmojiToDraft,
    startEdit,
    cancelEdit,
    saveEdit,
    removeMessage,
    toggleReaction
  } = useChatController();

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;

      if (manageOpen && !target.closest(".manage-flyout") && !target.closest(".fab-add")) {
        setManageOpen(false);
      }

      if (
        profileOpen &&
        !target.closest(".profile-panel") &&
        !roomHeadActionsRef.current?.contains(target)
      ) {
        setProfileOpen(false);
      }

      if (emojiPanelOpen && !target.closest("footer")) {
        setEmojiPanelOpen(false);
      }

      if (memberMenu?.member && !target.closest(".member-menu")) {
        setMemberMenu(null);
      }
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setManageOpen(false);
      setProfileOpen(false);
      setEmojiPanelOpen(false);
      setMemberMenu(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiPanelOpen, manageOpen, memberMenu, profileOpen, setEmojiPanelOpen, setManageOpen, setMemberMenu, setProfileOpen]);

  if (!user) return null;

  return (
    <div className="chat-shell">
      {isMobile && mobileSidebarOpen ? (
        <button className="overlay" type="button" aria-label="Close chats panel" onClick={() => setMobileSidebarOpen(false)} />
      ) : null}
      <aside className={mobileSidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-user">
            <small>Hello,</small>
            <h2>{user.username}</h2>
          </div>
          {isMobile ? (
            <button className="icon-btn close-sidebar" type="button" onClick={() => setMobileSidebarOpen(false)}>
              Close
            </button>
          ) : null}
        </div>

        <div className="sidebar-actions">
          <div className="chat-tabs">
            <button className={activeTypeTab === "all" ? "tab active" : "tab"} onClick={() => setActiveTypeTab("all")}>
              All
            </button>
            <button className={activeTypeTab === "pv" ? "tab active" : "tab"} onClick={() => setActiveTypeTab("pv")}>
              PV
            </button>
            <button
              className={activeTypeTab === "group" ? "tab active" : "tab"}
              onClick={() => setActiveTypeTab("group")}
            >
              Groups
            </button>
            <button
              className={activeTypeTab === "channel" ? "tab active" : "tab"}
              onClick={() => setActiveTypeTab("channel")}
            >
              Channels
            </button>
          </div>

          <input
            className="search"
            placeholder="Search chats"
            value={chatFilter}
            onChange={(e) => setChatFilter(e.target.value)}
          />
        </div>

        <div className="chat-panel">
          <div className="chat-panel-head">Recent Chats</div>
          <div className="chat-list">
            <button
              className={savedOnly ? "chat active saved-chat" : "chat saved-chat"}
              onClick={() => {
                setSavedOnly((prev) => !prev);
                setProfileOpen(false);
                if (isMobile) setMobileSidebarOpen(false);
              }}
            >
              <span className="chat-avatar">S</span>
              <span className="chat-meta">
                <span className="chat-title">Saved Messages</span>
                <small>{savedMessageIds.length} saved</small>
              </span>
            </button>
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                className={chat.id === activeChatId ? "chat active" : "chat"}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setSavedOnly(false);
                  setProfileOpen(false);
                  setManageOpen(false);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
              >
                <span className="chat-avatar">{getAvatarLabel(chat.name)}</span>
                <span className="chat-meta">
                  <span className="chat-title">
                    {chat.type === "channel" ? "# " : ""}
                    {chat.name}
                  </span>
                  <small>@{chat.public_id || chat.id}</small>
                </span>
                {!!unreadByChat[chat.id] ? <span className="badge">{unreadByChat[chat.id]}</span> : null}
              </button>
            ))}
          </div>
          {manageOpen ? (
            <div className="manage-flyout">
              <div className="stack-card">
                <div className="type-toggle">
                  <button className={newChatType === "pv" ? "tab active" : "tab"} type="button" onClick={() => setNewChatType("pv")}>
                    PV
                  </button>
                  <button
                    className={newChatType === "group" ? "tab active" : "tab"}
                    type="button"
                    onClick={() => setNewChatType("group")}
                  >
                    Group
                  </button>
                  <button
                    className={newChatType === "channel" ? "tab active" : "tab"}
                    type="button"
                    onClick={() => setNewChatType("channel")}
                  >
                    Channel
                  </button>
                </div>
                {newChatType === "pv" ? (
                  <>
                    <input
                      placeholder="Find user"
                      value={pvQuery}
                      onChange={(e) => setPvQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onSearchPvUsers()}
                    />
                    <button className="button" onClick={onSearchPvUsers}>
                      Search User
                    </button>
                    <div className="members-list">
                      {pvResults.map((u) => (
                        <button key={u.id} className="chat" onClick={() => onStartPrivateChat(u.email || u.public_id || u.id)}>
                          <span className="chat-avatar">{getAvatarLabel(u.username)}</span>
                          <span className="chat-meta">
                            <span className="chat-title">{u.username}</span>
                            <small>{u.email || `@${u.public_id || u.id}`}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      placeholder="Name"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChat()}
                    />
                    <input
                      placeholder="Public ID (optional)"
                      value={newPublicId}
                      onChange={(e) => setNewPublicId(e.target.value)}
                    />
                    <button className="button" onClick={addChat}>
                      Create
                    </button>
                  </>
                )}
              </div>
              <div className="stack-card">
                <input
                  placeholder="Join by ID"
                  value={joinPublicId}
                  onChange={(e) => setJoinPublicId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onJoinByPublicId()}
                />
                <button className="button ghost" onClick={onJoinByPublicId}>
                  Join
                </button>
              </div>
            </div>
          ) : null}
          <button className="fab-add" type="button" onClick={() => setManageOpen((prev) => !prev)} aria-label="Create or join chat">
            +
          </button>
        </div>
      </aside>

      <main className="room">
        <header>
          <div className="room-head-main">
            {isMobile ? (
              <button className="menu-btn" type="button" onClick={() => setMobileSidebarOpen(true)}>
                Chats
              </button>
            ) : null}
            <h3 className="room-title">
              {activeChat?.type === "channel" ? "# " : ""}
              {activeChat?.name || "Choose a chat"}
            </h3>
            <small>{onlineCount} online</small>
          </div>
          <div className="room-head-actions" ref={roomHeadActionsRef}>
            <button
              className="icon-btn round icon-badge"
              type="button"
              onClick={() => {
                setProfileOpen((prev) => !prev);
              }}
              disabled={!activeChat}
              title={profileOpen ? "Close Chat Profile" : "Open Chat Profile"}
              aria-label={profileOpen ? "Close Chat Profile" : "Open Chat Profile"}
            >
              <UiIcon name="chat" />
            </button>
          </div>
          <input
            className="search"
            placeholder="Search messages"
            value={messageFilter}
            onChange={(e) => setMessageFilter(e.target.value)}
          />
        </header>

        {activeChat && profileOpen ? (
          <section className="profile-panel">
            <div className="profile-head">
              <h4>Chat Profile</h4>
              <span className="chip">{activeChat.type.toUpperCase()}</span>
            </div>
            <div className="profile-grid">
              <div className="profile-row">
                <span className="label">Chat ID</span>
                <code>{activeChat.id}</code>
              </div>
              <div className="profile-row">
                <span className="label">Public ID</span>
                <code>@{activeChat.public_id || activeChat.id}</code>
              </div>
              <div className="profile-row">
                <span className="label">Members</span>
                <strong>{activeMembers.length}</strong>
              </div>
            </div>

            {isOwner ? (
              <div className="profile-edit">
                <label className="label" htmlFor="chat-name-input">
                  Change Name
                </label>
                <div className="id-editor">
                  <input
                    id="chat-name-input"
                    value={editingChatName}
                    onChange={(e) => setEditingChatName(e.target.value)}
                    placeholder="Chat name"
                  />
                  <button className="button" onClick={onSaveChatName}>
                    Save Name
                  </button>
                </div>
                <label className="label" htmlFor="chat-public-id-input">
                  Change Public ID
                </label>
                <div className="id-editor">
                  <input
                    id="chat-public-id-input"
                    value={editingPublicId}
                    onChange={(e) => setEditingPublicId(e.target.value)}
                    placeholder="Public ID"
                  />
                  <button className="button" onClick={onSavePublicId}>
                    Save ID
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-note">Only the owner can change this chat name.</div>
            )}

            <div className="profile-members">
              {activeChat.id !== "general" ? (
                <>
                  <div className="members-head">Members</div>
                  <div className="members-list">
                    {activeMembers.map((member) => (
                      <div
                        className="member-row"
                        key={member.user_id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMemberMenu({
                            x: e.clientX,
                            y: e.clientY,
                            member
                          });
                        }}
                      >
                        <div className="member-meta">
                          <strong>{member.username}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          className="messages"
          ref={messagesRef}
          onClick={() => setSelectedMessageId("")}
          onScroll={(e) => {
            const el = e.currentTarget;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            autoScrollRef.current = nearBottom;
          }}
        >
          {filteredMessages.map((m) => {
            const attachmentData = parseAttachment(m.content);
            const mine = m.user_id === user.id;
            const isEditing = editingId === m.id;
            const isSelected = selectedMessageId === m.id;
            const isSaved = savedMessageIds.includes(m.id);
            const reactionEntries = Object.entries(m.reactions || {}).filter(([, count]) => count > 0);

            return (
              <article
                key={m.id}
                className={mine ? `msg mine ${isSelected ? "selected" : ""}` : `msg ${isSelected ? "selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMessageId(m.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedMessageId(m.id);
                }}
              >
                <div className="msg-head">
                  <b>{m.username}</b>
                  <div className="msg-actions">
                    {isSelected ? (
                      <>
                        <button
                          className={isSaved ? "icon-btn picked icon-only" : "icon-btn icon-only"}
                          onClick={() => toggleSavedMessage(m.id)}
                          title={isSaved ? "Unsave message" : "Save message"}
                        >
                          {isSaved ? <UiIcon name="bookmark-fill" /> : <UiIcon name="bookmark" />}
                        </button>
                        {mine && canWrite && !attachmentData ? (
                          <>
                            <button className="icon-btn icon-only" onClick={() => startEdit(m)} title="Edit message">
                              <UiIcon name="edit" />
                            </button>
                            <button className="icon-btn danger icon-only" onClick={() => removeMessage(m)} title="Delete message">
                              <UiIcon name="trash" />
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="editor">
                    <input value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                    <button className="icon-btn icon-only" onClick={saveEdit} title="Save edit">
                      <UiIcon name="check" />
                    </button>
                    <button className="icon-btn icon-only" onClick={cancelEdit} title="Cancel edit">
                      <UiIcon name="close" />
                    </button>
                  </div>
                ) : attachmentData ? (
                  <div className="attachment-box">
                    {String(attachmentData.mime || "").startsWith("image/") ? (
                      <img src={attachmentData.dataUrl} alt={attachmentData.fileName} className="msg-image" />
                    ) : String(attachmentData.mime || "").startsWith("video/") ? (
                      <video src={attachmentData.dataUrl} controls className="msg-video" />
                    ) : (
                      <a href={attachmentData.dataUrl} download={attachmentData.fileName} className="button ghost">
                        Download {attachmentData.fileName}
                      </a>
                    )}
                    {attachmentData.caption ? <p>{attachmentData.caption}</p> : null}
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}

                {reactionEntries.length > 0 ? (
                  <div className="reactions-summary">
                    {reactionEntries.map(([emoji, count]) => {
                      const picked = (m.my_reactions || []).includes(emoji);
                      return (
                        <button
                          key={`${m.id}_${emoji}`}
                          className={picked ? "reaction picked" : "reaction"}
                          onClick={() => toggleReaction(m, emoji)}
                        >
                          {emoji} {count}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {isSelected ? (
                  <div className="reaction-picker">
                    {REACTIONS.map((emoji) => {
                      const picked = (m.my_reactions || []).includes(emoji);
                      return (
                        <button
                          key={`${m.id}_pick_${emoji}`}
                          className={picked ? "reaction picked" : "reaction"}
                          onClick={() => toggleReaction(m, emoji)}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <time>
                  {new Date(m.created_at).toLocaleTimeString()}
                  {m.edited_at ? " | edited" : ""}
                </time>
              </article>
            );
          })}
          <div ref={endRef} />
        </section>

        <footer>
          <div className="typing">{typing.length ? `${typing.join(", ")} typing...` : "\u00A0"}</div>
          {attachment ? (
            <div className="attachment-chip">
              <span>{attachment.name}</span>
              <button className="icon-btn icon-only" onClick={clearAttachment} title="Remove attachment">
                <UiIcon name="close" />
              </button>
            </div>
          ) : null}
          {emojiPanelOpen ? (
            <div className="reaction-picker">
              {quickEmojis.map((emoji) => (
                <button key={`compose_${emoji}`} className="reaction" type="button" onClick={() => addEmojiToDraft(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
          <div className="composer">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => {
                pickAttachment(e.target.files?.[0]).catch(() => {});
                e.target.value = "";
              }}
            />
            <button className="button ghost" type="button" onClick={() => fileInputRef.current?.click()} disabled={!canSend}>
              <UiIcon name="paperclip" />
            </button>
            <button className="button ghost" type="button" onClick={() => setEmojiPanelOpen((prev) => !prev)} disabled={!canSend}>
              <UiIcon name="smile" />
            </button>
            <input
              value={draft}
              disabled={!canSend}
              onChange={(e) => {
                setDraft(e.target.value);
                if (!canSend) return;
                socketRef.current?.emit("typing:set", {
                  chatId: activeChatId,
                  isTyping: e.target.value.trim().length > 0
                });
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                savedOnly
                  ? "Read only"
                  : canWrite
                    ? "Message"
                    : "Read only"
              }
            />
            <button className="button" onClick={sendMessage} disabled={!canSend} title="Send message">
              <UiIcon name="send" />
            </button>
          </div>
        </footer>
      </main>
      {memberMenu?.member ? (
        <>
          <button className="overlay member-menu-overlay" onClick={() => setMemberMenu(null)} aria-label="Close member menu" />
          <div className="member-menu" style={{ left: memberMenu.x, top: memberMenu.y }}>
            <button className="button" onClick={() => onStartPrivateChat(memberMenu.member.user_id)}>
              Send Direct Message
            </button>
          </div>
        </>
      ) : null}
      {error ? <div className="toast">{error}</div> : null}
    </div>
  );
}
