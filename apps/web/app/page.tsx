"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Participant = {
  socketId: string;
  name: string;
  isHost: boolean;
};

type ChatMessage = {
  id?: string;
  senderName: string;
  type: "TEXT" | "IMAGE";
  content?: string | null;
  imagePath?: string | null;
  createdAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:localhost:3478",
      username: "demo",
      credential: "demo123"
    }
  ]
};

export default function Home() {
  const [hostName, setHostName] = useState("");
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const suppressEmitRef = useRef(false);

  const hasJoined = useMemo(() => roomCode.length > 0, [roomCode]);

  function socket(): Socket {
    if (socketRef.current) {
      return socketRef.current;
    }
    const instance = io(WS_URL, { transports: ["websocket"] });
    instance.on("participant-joined", (p: Participant) => {
      setParticipants((prev) => [...prev, p]);
    });
    instance.on("participant-left", ({ socketId }: { socketId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      const pc = peerRef.current.get(socketId);
      pc?.close();
      peerRef.current.delete(socketId);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });
    instance.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    instance.on("playback-control", (payload: { currentTime: number; isPlaying: boolean; by: string }) => {
      if (!videoRef.current || payload.by === instance.id) {
        return;
      }
      suppressEmitRef.current = true;
      const diff = Math.abs(videoRef.current.currentTime - payload.currentTime);
      if (diff > 0.7) {
        videoRef.current.currentTime = payload.currentTime;
      }
      if (payload.isPlaying) {
        void videoRef.current.play().catch(() => undefined);
      } else {
        videoRef.current.pause();
      }
      setTimeout(() => {
        suppressEmitRef.current = false;
      }, 200);
    });
    instance.on("signal", async ({ from, data }: { from: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
      const pc = getOrCreatePeer(from);
      if ("type" in data && data.type === "offer") {
        await pc.setRemoteDescription(data);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        instance.emit("signal", { to: from, from: instance.id, data: answer });
      } else if ("type" in data && data.type === "answer") {
        await pc.setRemoteDescription(data);
      } else if ("candidate" in data) {
        await pc.addIceCandidate(data);
      }
    });
    socketRef.current = instance;
    return instance;
  }

  function getOrCreatePeer(peerSocketId: string): RTCPeerConnection {
    const existing = peerRef.current.get(peerSocketId);
    if (existing) {
      return existing;
    }
    const pc = new RTCPeerConnection(rtcConfig);
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerSocketId]: event.streams[0] }));
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) {
        return;
      }
      socketRef.current.emit("signal", {
        to: peerSocketId,
        from: socketRef.current.id,
        data: event.candidate
      });
    };
    peerRef.current.set(peerSocketId, pc);
    return pc;
  }

  async function ensureLocalMedia() {
    if (localStream) {
      return localStream;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }

  async function connectToSession(code: string, name: string, creatorHostToken?: string) {
    const s = socket();
    const joined = await new Promise<any>((resolve) => {
      s.emit("join-session", { code, name, hostToken: creatorHostToken }, (response: unknown) => resolve(response));
    });
    if (!joined?.ok) {
      setError(joined?.error ?? "Join failed");
      return;
    }

    const detailRes = await fetch(`${API_URL}/api/sessions/${code.toUpperCase()}`);
    if (!detailRes.ok) {
      setError("Failed to load session");
      return;
    }
    const detail = await detailRes.json();

    setRoomCode(detail.code);
    setSessionTitle(detail.title);
    setVideoPath(detail.videoPath);
    setMessages(detail.messages ?? []);
    setParticipants(joined.participants ?? []);
    setIsHost(Boolean(creatorHostToken));
    setError("");

    const stream = await ensureLocalMedia();
    joined.participants?.forEach(async (p: Participant) => {
      const pc = getOrCreatePeer(p.socketId);
      stream.getTracks().forEach((track) => {
        const already = pc.getSenders().some((sender) => sender.track?.id === track.id);
        if (!already) {
          pc.addTrack(track, stream);
        }
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit("signal", { to: p.socketId, from: s.id, data: offer });
    });
  }

  async function createSession(e: FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      setError("Select a video file first");
      return;
    }
    const form = new FormData();
    form.append("hostName", hostName);
    form.append("title", title);
    form.append("video", videoFile);

    const res = await fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      body: form
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Failed to create session");
      return;
    }

    setHostToken(data.hostToken);
    setJoinCode(data.code);
    await connectToSession(data.code, hostName, data.hostToken);
  }

  async function joinSession(e: FormEvent) {
    e.preventDefault();
    await connectToSession(joinCode, joinName);
  }

  function emitPlayback(source: "play" | "pause" | "seek") {
    if (!isHost || !socketRef.current || !videoRef.current || suppressEmitRef.current) {
      return;
    }
    socketRef.current.emit("playback-control", {
      code: roomCode,
      currentTime: videoRef.current.currentTime,
      isPlaying: !videoRef.current.paused,
      source
    });
  }

  function sendTextMessage() {
    if (!socketRef.current || !chatInput.trim()) {
      return;
    }
    const senderName = isHost ? hostName : joinName;
    socketRef.current.emit("chat-message", {
      code: roomCode,
      senderName,
      type: "TEXT",
      content: chatInput.trim()
    });
    setChatInput("");
  }

  async function sendImageMessage(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) {
      return;
    }
    const file = e.target.files[0];
    const senderName = isHost ? hostName : joinName;
    const form = new FormData();
    form.append("image", file);
    form.append("senderName", senderName);
    const res = await fetch(`${API_URL}/api/sessions/${roomCode}/images`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Image upload failed");
      return;
    }
    socketRef.current?.emit("chat-message", {
      code: roomCode,
      senderName,
      type: "IMAGE",
      imagePath: data.imagePath
    });
  }

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      peerRef.current.forEach((pc) => pc.close());
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  return (
    <main className="page">
      <div className="shell">
        <section className="panel">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>P2P Chat (Server-Down Friendly)</strong>
              <div className="tiny">Try the encrypted peer-to-peer chat without the backend.</div>
            </div>
            <a className="btn secondary" href="/p2p-chat">Open P2P Chat</a>
          </div>
        </section>
        <section className="panel">
          <h1 className="title">CoupleCinema</h1>
          <p className="subtitle">Create or join a private room (2 to 4 people), then watch a synced video with live camera and chat.</p>
        </section>

        {!hasJoined && (
          <section className="grid two">
            <form className="panel grid" onSubmit={createSession}>
              <h2>Create Session</h2>
              <label className="field">
                Host name
                <input value={hostName} onChange={(e) => setHostName(e.target.value)} required />
              </label>
              <label className="field">
                Session title
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label className="field">
                Video file
                <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} required />
              </label>
              <button className="btn" type="submit">Create + Join</button>
            </form>

            <form className="panel grid" onSubmit={joinSession}>
              <h2>Join Session</h2>
              <label className="field">
                Your name
                <input value={joinName} onChange={(e) => setJoinName(e.target.value)} required />
              </label>
              <label className="field">
                Session code
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required />
              </label>
              <button className="btn secondary" type="submit">Join</button>
            </form>
          </section>
        )}

        {hasJoined && (
          <section className="room">
            <div className="panel grid">
              <div className="row">
                <strong>{sessionTitle}</strong>
                <span className="tiny">Code: {roomCode}</span>
                <span className="tiny">Host token: {hostToken ? "active" : "none"}</span>
              </div>
              <video
                ref={videoRef}
                className="video"
                src={`${API_URL}${videoPath}`}
                controls
                onPlay={() => emitPlayback("play")}
                onPause={() => emitPlayback("pause")}
                onSeeked={() => emitPlayback("seek")}
              />
              <span className="tiny">Playback controls are host-only. Participants receive synced updates.</span>
              <div className="panel">
                <h3>Live Video</h3>
                <div className="remote-grid">
                  <video ref={localVideoRef} autoPlay muted playsInline className="remote-video" />
                  {Object.entries(remoteStreams).map(([id, stream]) => (
                    <RemoteVideo key={id} stream={stream} />
                  ))}
                </div>
              </div>
            </div>

            <div className="panel grid">
              <h3>Participants ({participants.length + 1}/4)</h3>
              <div className="tiny">
                {(isHost ? hostName : joinName) || "You"} (you)
              </div>
              {participants.map((p) => (
                <div key={p.socketId} className="tiny">
                  {p.name} {p.isHost ? "(host)" : ""}
                </div>
              ))}
              <h3>Chat</h3>
              <div className="chat-list">
                {messages.map((m, idx) => (
                  <div className="message" key={m.id ?? `${m.senderName}_${idx}`}>
                    <strong>{m.senderName}</strong>
                    {m.type === "TEXT" ? <div>{m.content}</div> : <img src={`${API_URL}${m.imagePath}`} alt="Shared" className="video" />}
                  </div>
                ))}
              </div>
              <div className="row">
                <input
                  style={{ flex: 1, minWidth: 0 }}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Write a message"
                />
                <button className="btn" type="button" onClick={sendTextMessage}>Send</button>
              </div>
              <label className="field">
                Share image
                <input type="file" accept="image/*" onChange={sendImageMessage} />
              </label>
            </div>
          </section>
        )}

        {error && <section className="panel">{error}</section>}
      </div>
    </main>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={ref} autoPlay playsInline className="remote-video" />;
}
