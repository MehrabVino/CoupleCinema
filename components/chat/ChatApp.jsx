"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChat,
  fetchChatMembers,
  fetchChats,
  fetchMessages,
  joinChatByPublicId,
  searchUsers,
  startPrivateChat,
  tokenGet,
  tokenSet,
  updateMyProfile,
  updateChatName,
  updateChatPublicId
} from "@/lib/api";
import { socketCreate } from "@/lib/socket";
import { useAppSession } from "@/components/auth/AppSession";

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

export default function ChatApp() {
  const { user, setUser: setSessionUser, logout: sessionLogout } = useAppSession();
  const [darkMode, setDarkMode] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState("all");
  const [newChatType, setNewChatType] = useState("group");
  const [messagesByChat, setMessagesByChat] = useState({});
  const [membersByChat, setMembersByChat] = useState({});
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [unreadByChat, setUnreadByChat] = useState({});
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [newChatName, setNewChatName] = useState("");
  const [newPublicId, setNewPublicId] = useState("");
  const [pvQuery, setPvQuery] = useState("");
  const [pvResults, setPvResults] = useState([]);
  const [joinPublicId, setJoinPublicId] = useState("");
  const [chatFilter, setChatFilter] = useState("");
  const [messageFilter, setMessageFilter] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserPublicId, setEditingUserPublicId] = useState("");
  const [editingChatName, setEditingChatName] = useState("");
  const [editingPublicId, setEditingPublicId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState([]);
  const [memberMenu, setMemberMenu] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const messagesRef = useRef(null);
  const autoScrollRef = useRef(true);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [chats, activeChatId]
  );
  const isOwner = Boolean(activeChat && user && activeChat.created_by === user.id);
  const activeMessages = useMemo(() => messagesByChat[activeChatId] || [], [messagesByChat, activeChatId]);
  const activeMembers = useMemo(() => membersByChat[activeChatId] || [], [membersByChat, activeChatId]);
  const myMembership = useMemo(
    () => activeMembers.find((member) => member.user_id === user?.id) || null,
    [activeMembers, user]
  );
  const canWrite = !myMembership || myMembership.role === "owner" || myMembership.access_level !== "read-only";
  const canSend = canWrite && !savedOnly;

  const filteredChats = useMemo(() => {
    const q = chatFilter.trim().toLowerCase();
    let base = chats;
    if (activeTypeTab !== "all") base = base.filter((c) => c.type === activeTypeTab);
    if (!q) return base;
    return base.filter(
      (chat) =>
        chat.name.toLowerCase().includes(q) ||
        (chat.public_id || "").toLowerCase().includes(q) ||
        chat.id.includes(q)
    );
  }, [chatFilter, chats, activeTypeTab]);

  const filteredMessages = useMemo(() => {
    const q = messageFilter.trim().toLowerCase();
    const visibleMessages = activeMessages.filter((m) => !m.deleted_at);
    const base = savedOnly ? visibleMessages.filter((m) => savedMessageIds.includes(m.id)) : visibleMessages;
    if (!q) return base;
    return base.filter(
      (m) => (m.content || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q)
    );
  }, [messageFilter, activeMessages, savedOnly, savedMessageIds]);

  function logout() {
    socketRef.current?.disconnect();
    sessionLogout();
    setChats([]);
    setActiveChatId("");
    setMessagesByChat({});
    setMembersByChat({});
    setUnreadByChat({});
    setTyping([]);
    setManageOpen(false);
    setProfileOpen(false);
    setUserProfileOpen(false);
    setSavedOnly(false);
    setSavedMessageIds([]);
  }

  async function loadChat(chatId) {
    const data = await fetchMessages(chatId);
    setMessagesByChat((prev) => ({ ...prev, [chatId]: data.messages }));
  }

  async function loadMembers(chatId) {
    const data = await fetchChatMembers(chatId);
    setMembersByChat((prev) => ({ ...prev, [chatId]: data.members }));
  }

  async function addChat() {
    const name = newChatName.trim();
    if (!name) return;
    try {
      const result = await createChat(name, newChatType, newPublicId.trim());
      setChats((prev) => [...prev, result.chat]);
      setNewChatName("");
      setNewPublicId("");
      setActiveChatId(result.chat.id);
      setManageOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onJoinByPublicId() {
    const target = joinPublicId.trim().replace(/^@+/, "");
    if (!target) return;
    try {
      const joined = await joinChatByPublicId(target);
      const allChats = (await fetchChats()).chats;
      setChats(allChats);
      setActiveChatId(joined.chat.id);
      setJoinPublicId("");
      setManageOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSearchPvUsers() {
    const q = pvQuery.trim();
    if (!q) return;
    try {
      const data = await searchUsers(q);
      setPvResults(data.users || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onStartPrivateChat(queryValue) {
    const query = String(queryValue || "").trim();
    if (!query) return;
    try {
      const result = await startPrivateChat(query);
      const allChats = (await fetchChats()).chats;
      setChats(allChats);
      setActiveChatId(result.chat.id);
      setPvQuery("");
      setPvResults([]);
      setManageOpen(false);
      setMemberMenu(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSavePublicId() {
    const target = editingPublicId.trim();
    if (!target || !activeChatId || !isOwner) return;
    try {
      const result = await updateChatPublicId(activeChatId, target);
      setChats((prev) => prev.map((chat) => (chat.id === result.chat.id ? { ...chat, ...result.chat } : chat)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSaveChatName() {
    const target = editingChatName.trim();
    if (!target || !activeChatId || !isOwner) return;
    try {
      const result = await updateChatName(activeChatId, target);
      setChats((prev) => prev.map((chat) => (chat.id === result.chat.id ? { ...chat, ...result.chat } : chat)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSaveUserProfile() {
    const nextUsername = editingUserName.trim();
    const nextPublicId = editingUserPublicId.trim();
    if (!nextUsername && !nextPublicId) return;
    try {
      const result = await updateMyProfile({
        username: nextUsername || undefined,
        publicId: nextPublicId || undefined
      });
      if (result.token) tokenSet(result.token);
      setSessionUser(result.user);
      setEditingUserName(result.user.username || "");
      setEditingUserPublicId(result.user.public_id || "");
      setUserProfileOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleSavedMessage(messageId) {
    setSavedMessageIds((prev) => (prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]));
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text || !activeChatId || !socketRef.current || !canSend) return;
    socketRef.current.emit("message:send", { chatId: activeChatId, content: text });
    socketRef.current.emit("typing:set", { chatId: activeChatId, isTyping: false });
    setDraft("");
  }

  function startEdit(message) {
    if (message.user_id !== user.id || message.deleted_at || !canWrite) return;
    setEditingId(message.id);
    setEditingText(message.content);
  }

  function cancelEdit() {
    setEditingId("");
    setEditingText("");
  }

  function saveEdit() {
    const content = editingText.trim();
    if (!content || !editingId || !socketRef.current || !canWrite) return;
    socketRef.current.emit("message:edit", { messageId: editingId, content });
    cancelEdit();
  }

  function removeMessage(message) {
    if (message.user_id !== user.id || message.deleted_at || !socketRef.current || !canWrite) return;
    socketRef.current.emit("message:delete", { messageId: message.id });
  }

  function toggleReaction(message, emoji) {
    if (!socketRef.current || message.deleted_at || !canWrite) return;
    socketRef.current.emit("reaction:toggle", { messageId: message.id, emoji, chatId: activeChatId });
  }

  useEffect(() => {
    if (!user) return;
    fetchChats()
      .then((data) => {
        const list = data.chats || [];
        setChats(list);
        setActiveChatId((prev) => prev || list[0]?.id || "");
      })
      .catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("chat_dark_mode");
      setDarkMode(saved === "1");
    } catch {
      setDarkMode(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("chat_dark_mode", darkMode ? "1" : "0");
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user || !tokenGet()) return;
    const socket = socketCreate(tokenGet());
    socketRef.current = socket;

    socket.on("connect", () => {
      chats.forEach((c) => socket.emit("chat:join", { chatId: c.id }));
    });

    socket.on("message:new", (msg) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [msg.chat_id]: [...(prev[msg.chat_id] || []), msg]
      }));
      if (msg.chat_id !== activeChatId) {
        setUnreadByChat((prev) => ({ ...prev, [msg.chat_id]: (prev[msg.chat_id] || 0) + 1 }));
      }
    });

    socket.on("message:updated", (msg) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [msg.chat_id]: (prev[msg.chat_id] || []).map((item) =>
          item.id === msg.id ? { ...item, content: msg.content, edited_at: msg.edited_at } : item
        )
      }));
    });

    socket.on("message:deleted", (msg) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [msg.chat_id]: (prev[msg.chat_id] || []).filter((item) => item.id !== msg.id)
      }));
      setSavedMessageIds((prev) => prev.filter((id) => id !== msg.id));
      setSelectedMessageId((prev) => (prev === msg.id ? "" : prev));
      setEditingId((prev) => (prev === msg.id ? "" : prev));
      setEditingText("");
    });

    socket.on("reaction:updated", (payload) => {
      setMessagesByChat((prev) => {
        const next = { ...prev };
        for (const chatId of Object.keys(next)) {
          next[chatId] = (next[chatId] || []).map((item) =>
            item.id === payload.message_id
              ? { ...item, reactions: payload.reactions, my_reactions: payload.my_reactions }
              : item
          );
        }
        return next;
      });
    });

    socket.on("typing:update", (event) => {
      if (event.chatId !== activeChatId) return;
      setTyping((prev) =>
        event.isTyping ? [...new Set([...prev, event.username])] : prev.filter((x) => x !== event.username)
      );
    });

    socket.on("presence:update", ({ onlineUsers }) => setOnlineCount(onlineUsers.length));

    socket.on("chat:added", ({ chat }) => {
      if (!chat?.id) return;
      setChats((prev) => {
        if (prev.some((item) => item.id === chat.id)) return prev;
        return [...prev, chat];
      });
      socket.emit("chat:join", { chatId: chat.id });
    });

    socket.on("member:access-updated", ({ chatId, member }) => {
      setMembersByChat((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((item) => (item.user_id === member.user_id ? member : item))
      }));
    });

    return () => socket.disconnect();
  }, [user, activeChatId, chats]);

  useEffect(() => {
    if (!socketRef.current) return;
    chats.forEach((c) => socketRef.current.emit("chat:join", { chatId: c.id }));
  }, [chats]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    loadChat(activeChatId).catch((err) => setError(err.message));
    loadMembers(activeChatId).catch((err) => setError(err.message));
    socketRef.current?.emit("chat:join", { chatId: activeChatId });
    setTyping([]);
    setSelectedMessageId("");
    setUnreadByChat((prev) => ({ ...prev, [activeChatId]: 0 }));
  }, [activeChatId, user]);

  useEffect(() => {
    if (!activeChat) return;
    setEditingChatName(activeChat.name || "");
    setEditingPublicId(activeChat.public_id || "");
    setMemberMenu(null);
  }, [activeChat]);

  useEffect(() => {
    if (!user) return;
    setEditingUserName(user.username || "");
    setEditingUserPublicId(user.public_id || "");
    const key = `saved_messages_${user.id}`;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedMessageIds(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch {
      setSavedMessageIds([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const key = `saved_messages_${user.id}`;
    window.localStorage.setItem(key, JSON.stringify(savedMessageIds));
  }, [savedMessageIds, user]);

  useEffect(() => {
    if (!autoScrollRef.current) return;
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeMessages]);

  if (!user) return null;

  return (
    <div className={darkMode ? "chat-shell dark" : "chat-shell"}>
      <Link className="hub-back" href="/">
        Home
      </Link>
      {isMobile && mobileSidebarOpen ? (
        <button className="overlay" type="button" aria-label="Close chats panel" onClick={() => setMobileSidebarOpen(false)} />
      ) : null}
      <aside className={mobileSidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <button
            className="brand-user profile-trigger"
            type="button"
            onClick={() => {
              setUserProfileOpen((prev) => !prev);
              setProfileOpen(false);
            }}
          >
            <small>Hello,</small>
            <h2>{user.username}</h2>
          </button>
          <div className="brand-controls">
            <button
              className={userProfileOpen ? "button icon-badge" : "button ghost icon-badge"}
              onClick={() => {
                setUserProfileOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              title={userProfileOpen ? "Close My Profile" : "My Profile"}
              aria-label={userProfileOpen ? "Close My Profile" : "My Profile"}
            >
              <UiIcon name="user" />
            </button>
            <button
              className={darkMode ? "button icon-badge" : "button ghost icon-badge"}
              onClick={() => setDarkMode((prev) => !prev)}
              title={darkMode ? "Light Mode" : "Dark Mode"}
              aria-label={darkMode ? "Light Mode" : "Dark Mode"}
            >
              <UiIcon name={darkMode ? "sun" : "moon"} />
            </button>
            <button className="button ghost logout-btn icon-badge" onClick={logout} title="Logout" aria-label="Logout">
              <UiIcon name="logout" />
            </button>
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
            placeholder="Search by name or ID..."
            value={chatFilter}
            onChange={(e) => setChatFilter(e.target.value)}
          />
        </div>

        {userProfileOpen ? (
          <section className="profile-panel sidebar-profile">
            <div className="profile-head">
              <h4>My Profile</h4>
              <span className="chip">USER</span>
            </div>
            <div className="profile-grid">
              <div className="profile-row">
                <span className="label">User ID</span>
                <code>{user.id}</code>
              </div>
              <div className="profile-row">
                <span className="label">Public ID</span>
                <code>@{user.public_id || "not-set"}</code>
              </div>
              <div className="profile-row">
                <span className="label">Saved Messages</span>
                <strong>{savedMessageIds.length}</strong>
              </div>
            </div>
            <div className="profile-edit">
              <label className="label" htmlFor="user-name-input">
                Change Username
              </label>
              <div className="id-editor">
                <input
                  id="user-name-input"
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                  placeholder="new username"
                />
              </div>
            </div>
            <div className="profile-edit">
              <label className="label" htmlFor="user-public-id-input">
                Change Public ID
              </label>
              <div className="id-editor">
                <input
                  id="user-public-id-input"
                  value={editingUserPublicId}
                  onChange={(e) => setEditingUserPublicId(e.target.value)}
                  placeholder="new public id"
                />
                <button className="button" onClick={onSaveUserProfile}>
                  Save Profile
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="chat-panel">
          <div className="chat-panel-head">Recent Chats</div>
          <div className="chat-list">
            <button
              className={savedOnly ? "chat active saved-chat" : "chat saved-chat"}
              onClick={() => {
                setSavedOnly((prev) => !prev);
                setUserProfileOpen(false);
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
                  setUserProfileOpen(false);
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
                      placeholder="Search user by email or public ID"
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
                      placeholder="new name"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChat()}
                    />
                    <input
                      placeholder="custom public id (optional)"
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
                  placeholder="join by public id (example: my-group)"
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
          <div className="room-head-actions">
            <button
              className="icon-btn round icon-badge"
              type="button"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setUserProfileOpen(false);
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
            placeholder="Search messages..."
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
                    placeholder="new chat name"
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
                    placeholder="new public id"
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
                        {mine && canWrite ? (
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
          <div className="composer">
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
              placeholder={savedOnly ? "Saved messages view is read-only" : canWrite ? "Write a message" : "Read-only access"}
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
