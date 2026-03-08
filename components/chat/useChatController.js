"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSession } from "@/components/auth/AppSession";

export function useChatController() {
  const { user, logout: sessionLogout, services } = useAppSession();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState("all");
  const [newChatType, setNewChatType] = useState("group");
  const [messagesByChat, setMessagesByChat] = useState({});
  const [membersByChat, setMembersByChat] = useState({});
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [unreadByChat, setUnreadByChat] = useState({});
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
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
  const [editingChatName, setEditingChatName] = useState("");
  const [editingPublicId, setEditingPublicId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    setSavedOnly(false);
    setSavedMessageIds([]);
  }

  async function loadChat(chatId) {
    const data = await services.chatService.fetchMessages(chatId, 80);
    setMessagesByChat((prev) => ({ ...prev, [chatId]: data.messages }));
  }

  async function loadMembers(chatId) {
    const data = await services.chatService.fetchMembers(chatId);
    setMembersByChat((prev) => ({ ...prev, [chatId]: data.members }));
  }

  async function addChat() {
    const name = newChatName.trim();
    if (!name) return;
    try {
      const result = await services.chatService.createChat(name, newChatType, newPublicId.trim());
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
      const joined = await services.chatService.joinByPublicId(target);
      const allChats = (await services.chatService.listChats()).chats;
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
      const data = await services.chatService.searchUsers(q);
      setPvResults(data.users || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onStartPrivateChat(queryValue) {
    const query = String(queryValue || "").trim();
    if (!query) return;
    try {
      const result = await services.chatService.startPrivateChat(query);
      const allChats = (await services.chatService.listChats()).chats;
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
      const result = await services.chatService.updateChatPublicId(activeChatId, target);
      setChats((prev) => prev.map((chat) => (chat.id === result.chat.id ? { ...chat, ...result.chat } : chat)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSaveChatName() {
    const target = editingChatName.trim();
    if (!target || !activeChatId || !isOwner) return;
    try {
      const result = await services.chatService.updateChatName(activeChatId, target);
      setChats((prev) => prev.map((chat) => (chat.id === result.chat.id ? { ...chat, ...result.chat } : chat)));
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleSavedMessage(messageId) {
    setSavedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  }

  function sendMessage() {
    const text = draft.trim();
    if (!activeChatId || !socketRef.current || !canSend) return;
    if (!text && !attachment) return;

    let content = text;
    if (attachment) {
      content = `__ATTACHMENT__${JSON.stringify({
        fileName: attachment.name,
        mime: attachment.mime,
        dataUrl: attachment.dataUrl,
        caption: text
      })}`;
    }

    socketRef.current.emit("message:send", { chatId: activeChatId, content });
    socketRef.current.emit("typing:set", { chatId: activeChatId, isTyping: false });
    setDraft("");
    setAttachment(null);
    setEmojiPanelOpen(false);
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

  function addEmojiToDraft(emoji) {
    setDraft((prev) => `${prev}${emoji}`);
  }

  function clearAttachment() {
    setAttachment(null);
  }

  async function pickAttachment(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Attachment max size is 4MB");
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      setAttachment({
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl
      });
    } catch (err) {
      setError(err.message || "Attachment failed");
    }
  }

  useEffect(() => {
    if (!user) return;
    services.chatService
      .listChats()
      .then((data) => {
        const list = data.chats || [];
        setChats(list);
        setActiveChatId((prev) => prev || list[0]?.id || "");
      })
      .catch((err) => setError(err.message));
  }, [services, user]);

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
    if (!user || !services.sessionService.token()) return;
    const socket = services.socketAdapter.connect(services.sessionService.token());
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
  }, [user, activeChatId, chats, services]);

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
    setAttachment(null);
    setEmojiPanelOpen(false);
  }, [activeChatId, user]);

  useEffect(() => {
    if (!activeChat) return;
    setEditingChatName(activeChat.name || "");
    setEditingPublicId(activeChat.public_id || "");
    setMemberMenu(null);
  }, [activeChat]);

  useEffect(() => {
    if (!user) return;
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

  return {
    user,
    chats,
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
    activeMessages,
    activeMembers,
    canWrite,
    canSend,
    filteredChats,
    filteredMessages,
    logout,
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
  };
}
