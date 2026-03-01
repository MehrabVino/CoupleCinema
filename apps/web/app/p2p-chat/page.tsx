"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Peer, { DataConnection } from "peerjs";

type WireMessage = {
  kind: "chat";
  senderName: string;
  text: string;
};

type WirePayload = {
  v: 1;
  roomId: string;
  from: string;
  id: string;
  ts: number;
  iv: string;
  data: string;
};

type ChatMessage = {
  id: string;
  senderName: string;
  text: string;
  ts: number;
  from: string;
};

const HISTORY_PREFIX = "p2p-chat-history:";
const PEER_HOST = "0.peerjs.com";
const PEER_PORT = 443;
const PEER_PATH = "/";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(data: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateRoomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function generateRoomKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export default function P2PChatPage() {
  const [hostName, setHostName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [role, setRole] = useState<"none" | "host" | "guest">("none");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const historyRef = useRef<WirePayload[]>([]);
  const keyCacheRef = useRef<{ key: CryptoKey | null; source: string }>({ key: null, source: "" });
  const historyLoadedRef = useRef(false);

  const hasJoined = useMemo(() => role !== "none" && roomId.length > 0, [role, roomId]);
  const displayName = role === "host" ? hostName : joinName;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) {
      return;
    }
    const params = new URLSearchParams(hash);
    const hashRoom = params.get("room");
    const hashKey = params.get("key");
    if (hashRoom) {
      setRoomId(hashRoom.toUpperCase());
    }
    if (hashKey) {
      setRoomKey(hashKey);
    }
  }, []);

  useEffect(() => {
    if (!hasJoined || !roomId || !roomKey || historyLoadedRef.current) {
      return;
    }
    const raw = localStorage.getItem(`${HISTORY_PREFIX}${roomId}`);
    if (!raw) {
      historyLoadedRef.current = true;
      return;
    }
    try {
      const stored = JSON.parse(raw) as WirePayload[];
      historyRef.current = stored;
      void Promise.all(
        stored.map(async (payload) => {
          const decrypted = await decryptPayload(payload);
          if (!decrypted) {
            return null;
          }
          return {
            id: payload.id,
            senderName: decrypted.senderName,
            text: decrypted.text,
            ts: payload.ts,
            from: payload.from
          };
        })
      ).then((items) => {
        const next = items.filter(Boolean) as ChatMessage[];
        setMessages(next);
        historyLoadedRef.current = true;
      });
    } catch {
      historyLoadedRef.current = true;
    }
  }, [hasJoined, roomId, roomKey]);

  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((conn) => conn.close());
      peerRef.current?.destroy();
    };
  }, []);

  async function getKey() {
    if (keyCacheRef.current.key && keyCacheRef.current.source === roomKey) {
      return keyCacheRef.current.key;
    }
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(roomKey));
    const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
    keyCacheRef.current = { key, source: roomKey };
    return key;
  }

  async function encryptMessage(message: WireMessage) {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(JSON.stringify(message));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(ciphertext))
    };
  }

  async function decryptPayload(payload: WirePayload) {
    try {
      const key = await getKey();
      const iv = base64ToBytes(payload.iv);
      const data = base64ToBytes(payload.data);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
      return JSON.parse(decoder.decode(decrypted)) as WireMessage;
    } catch {
      return null;
    }
  }

  function persistHistory(next: WirePayload[]) {
    historyRef.current = next.slice(-200);
    localStorage.setItem(`${HISTORY_PREFIX}${roomId}`, JSON.stringify(historyRef.current));
  }

  function attachConnection(conn: DataConnection, isHost: boolean) {
    connectionsRef.current.set(conn.peer, conn);
    setConnectedPeers(Array.from(connectionsRef.current.keys()));

    conn.on("data", async (data) => {
      if (!data || typeof data !== "string") {
        return;
      }
      let payload: WirePayload | null = null;
      try {
        payload = JSON.parse(data) as WirePayload;
      } catch {
        return;
      }
      if (!payload || payload.roomId !== roomId) {
        return;
      }
      const decrypted = await decryptPayload(payload);
      if (!decrypted || decrypted.kind !== "chat") {
        return;
      }
      const message: ChatMessage = {
        id: payload.id,
        senderName: decrypted.senderName,
        text: decrypted.text,
        ts: payload.ts,
        from: payload.from
      };
      setMessages((prev) => [...prev, message]);
      persistHistory([...historyRef.current, payload]);

      if (isHost) {
        broadcastPayload(payload, payload.from);
      }
    });

    conn.on("close", () => {
      connectionsRef.current.delete(conn.peer);
      setConnectedPeers(Array.from(connectionsRef.current.keys()));
    });
  }

  function broadcastPayload(payload: WirePayload, exceptPeer?: string) {
    connectionsRef.current.forEach((conn, peerId) => {
      if (exceptPeer && peerId === exceptPeer) {
        return;
      }
      if (conn.open) {
        conn.send(JSON.stringify(payload));
      }
    });
  }

  function createPeer(peerId?: string) {
    const peer = new Peer(peerId ?? undefined, {
      host: PEER_HOST,
      port: PEER_PORT,
      path: PEER_PATH,
      secure: true
    });
    peerRef.current = peer;
    peer.on("open", () => {
      setStatus("Connected to relay");
      setError("");
    });
    peer.on("error", (err) => {
      setStatus("Error");
      setError(err.message);
    });
    return peer;
  }

  function updateShareLink(id: string, key: string) {
    const params = new URLSearchParams();
    params.set("room", id);
    params.set("key", key);
    window.history.replaceState(null, "", `#${params.toString()}`);
  }

  async function handleCreateRoom(e: FormEvent) {
    e.preventDefault();
    if (!hostName.trim()) {
      setError("Enter your name.");
      return;
    }
    setError("");
    const newRoomId = generateRoomId();
    const newRoomKey = generateRoomKey();
    setRoomId(newRoomId);
    setRoomKey(newRoomKey);
    setRole("host");
    setMessages([]);
    setConnectedPeers([]);
    historyLoadedRef.current = false;
    updateShareLink(newRoomId, newRoomKey);

    const hostPeerId = `cc-${newRoomId.toLowerCase()}`;
    setStatus("Connecting to relay...");
    const peer = createPeer(hostPeerId);
    peer.on("connection", (conn) => {
      attachConnection(conn, true);
    });
  }

  async function handleJoinRoom(e: FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!roomId || !roomKey) {
      setError("Room ID and key are required.");
      return;
    }
    setError("");
    setRole("guest");
    setMessages([]);
    setConnectedPeers([]);
    historyLoadedRef.current = false;
    updateShareLink(roomId, roomKey);

    setStatus("Connecting to relay...");
    const peer = createPeer();
    peer.on("open", () => {
      const hostPeerId = `cc-${roomId.toLowerCase()}`;
      const conn = peer.connect(hostPeerId, { reliable: true });
      conn.on("open", () => {
        attachConnection(conn, false);
        setStatus("Connected to host");
      });
    });
  }

  async function sendMessage() {
    if (!chatInput.trim() || !roomId || !roomKey) {
      return;
    }
    const text = chatInput.trim();
    setChatInput("");

    const encrypted = await encryptMessage({ kind: "chat", senderName: displayName || "Guest", text });
    const payload: WirePayload = {
      v: 1,
      roomId,
      from: peerRef.current?.id ?? "local",
      id: crypto.randomUUID(),
      ts: Date.now(),
      iv: encrypted.iv,
      data: encrypted.data
    };

    const message: ChatMessage = {
      id: payload.id,
      senderName: displayName || "Guest",
      text,
      ts: payload.ts,
      from: payload.from
    };

    setMessages((prev) => [...prev, message]);
    persistHistory([...historyRef.current, payload]);

    if (role === "host") {
      broadcastPayload(payload);
    } else {
      const conn = connectionsRef.current.values().next().value as DataConnection | undefined;
      if (conn?.open) {
        conn.send(JSON.stringify(payload));
      }
    }
  }

  async function copyShareLink() {
    const link = `${window.location.origin}${window.location.pathname}#room=${roomId}&key=${roomKey}`;
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Invite link copied.");
    } catch {
      setStatus("Copy failed. You can copy from the address bar.");
    }
  }

  return (
    <main className="p2p-page">
      <header className="p2p-hero">
        <div>
          <p className="p2p-kicker">CoupleCinema Labs</p>
          <h1 className="p2p-title">P2P Encrypted Chat Room</h1>
          <p className="p2p-subtitle">
            Simple, Telegram-like chat that keeps working even if your main server is down.
            Messages use end-to-end AES-GCM encryption and are stored locally in your browser.
          </p>
        </div>
        <div className="p2p-pill">Relay: PeerJS public server</div>
      </header>

      {!hasJoined && (
        <section className="p2p-grid">
          <form className="p2p-card p2p-form" onSubmit={handleCreateRoom}>
            <h2>Create Room</h2>
            <label className="p2p-field">
              Your name
              <input value={hostName} onChange={(e) => setHostName(e.target.value)} required />
            </label>
            <button className="p2p-btn" type="submit">Create Secure Room</button>
            <p className="p2p-note">We generate a room ID and encryption key for you.</p>
          </form>

          <form className="p2p-card p2p-form" onSubmit={handleJoinRoom}>
            <h2>Join Room</h2>
            <label className="p2p-field">
              Your name
              <input value={joinName} onChange={(e) => setJoinName(e.target.value)} required />
            </label>
            <label className="p2p-field">
              Room ID
              <input value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} required />
            </label>
            <label className="p2p-field">
              Room key
              <input value={roomKey} onChange={(e) => setRoomKey(e.target.value)} required />
            </label>
            <button className="p2p-btn secondary" type="submit">Join Encrypted Room</button>
            <p className="p2p-note">Paste the invite link or the ID + key.</p>
          </form>
        </section>
      )}

      {hasJoined && (
        <section className="p2p-room">
          <div className="p2p-card p2p-chat-card">
            <div className="p2p-row">
              <div>
                <strong>Room {roomId}</strong>
                <p className="p2p-meta">Role: {role} · Status: {status}</p>
              </div>
              <button className="p2p-btn tertiary" type="button" onClick={copyShareLink}>Copy Invite Link</button>
            </div>

            <div className="p2p-chat">
              {messages.length === 0 && <p className="p2p-muted">No messages yet. Say hi.</p>}
              {messages.map((msg) => (
                <div className={`p2p-message ${msg.from === peerRef.current?.id ? "mine" : ""}`} key={msg.id}>
                  <div className="p2p-message-header">
                    <strong>{msg.senderName}</strong>
                    <span>{new Date(msg.ts).toLocaleTimeString()}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <div className="p2p-row">
              <input
                className="p2p-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message"
              />
              <button className="p2p-btn" type="button" onClick={sendMessage}>Send</button>
            </div>
          </div>

          <aside className="p2p-card p2p-side">
            <h3>Encryption</h3>
            <p className="p2p-meta">AES-GCM 256-bit · Local history</p>
            <div className="p2p-divider" />
            <h3>Participants</h3>
            <p className="p2p-meta">You: {displayName || "Anonymous"}</p>
            {connectedPeers.length === 0 && <p className="p2p-muted">No peers connected yet.</p>}
            {connectedPeers.map((peerId) => (
              <div key={peerId} className="p2p-meta">{peerId}</div>
            ))}
            <div className="p2p-divider" />
            <p className="p2p-muted">
              This room uses a public relay for signaling. If the relay is down,
              peers cannot connect.
            </p>
          </aside>
        </section>
      )}

      {error && <section className="p2p-card p2p-error">{error}</section>}
    </main>
  );
}
