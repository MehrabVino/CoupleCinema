"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSession } from "@/components/auth/AppSession";

function randomRoomCode() {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}-${part()}`;
}

export function useCinemaController() {
  const { services, user } = useAppSession();
  const [roomInput, setRoomInput] = useState(randomRoomCode());
  const [roomId, setRoomId] = useState("");
  const [joining, setJoining] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDraft, setVideoDraft] = useState("");
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [localVideoName, setLocalVideoName] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const suppressSyncRef = useRef(false);
  const localObjectUrlRef = useRef("");
  const localVoiceStreamRef = useRef(null);
  const voicePeersRef = useRef(new Map());
  const remoteVoiceStreamsRef = useRef(new Map());

  const participantCount = useMemo(() => participants.length + (inRoom ? 1 : 0), [inRoom, participants.length]);
  const remoteVoiceParticipants = useMemo(
    () =>
      participants
        .filter((p) => p.audioEnabled && remoteVoiceStreamsRef.current.get(p.peerId))
        .map((p) => ({ ...p, stream: remoteVoiceStreamsRef.current.get(p.peerId) })),
    [participants]
  );

  const cleanupVoicePeer = useCallback((peerId) => {
    const pc = voicePeersRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      voicePeersRef.current.delete(peerId);
    }
    remoteVoiceStreamsRef.current.delete(peerId);
  }, []);

  const sendVoiceSignal = useCallback((toPeerId, data) => {
    socketRef.current?.emit("cinema:signal", { toPeerId, data });
  }, []);

  const createVoicePeer = useCallback(
    (peerId) => {
      if (voicePeersRef.current.has(peerId)) return voicePeersRef.current.get(peerId);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
      });
      voicePeersRef.current.set(peerId, pc);

      const localVoice = localVoiceStreamRef.current;
      if (localVoice) {
        for (const track of localVoice.getTracks()) {
          pc.addTrack(track, localVoice);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendVoiceSignal(peerId, { type: "candidate", candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return;
        remoteVoiceStreamsRef.current.set(peerId, stream);
        setParticipants((prev) => [...prev]);
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          cleanupVoicePeer(peerId);
          setParticipants((prev) => [...prev]);
        }
      };

      return pc;
    },
    [cleanupVoicePeer, sendVoiceSignal]
  );

  const handleVoiceSignal = useCallback(
    async ({ fromPeerId, data }) => {
      if (!fromPeerId || !data) return;
      const pc = createVoicePeer(fromPeerId);

      if (data.type === "offer") {
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendVoiceSignal(fromPeerId, { type: "answer", sdp: pc.localDescription });
        return;
      }

      if (data.type === "answer") {
        await pc.setRemoteDescription(data.sdp);
        return;
      }

      if (data.type === "candidate" && data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {}
      }
    },
    [createVoicePeer, sendVoiceSignal]
  );

  const applyRemoteState = useCallback((state) => {
    const video = videoRef.current;
    if (!video || !state) return;

    suppressSyncRef.current = true;
    if (typeof state.videoUrl === "string" && state.videoUrl !== videoUrl) {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = "";
        setLocalVideoName("");
      }
      setVideoUrl(state.videoUrl);
      setVideoDraft(state.videoUrl);
    }

    if (typeof state.currentTime === "number" && Number.isFinite(state.currentTime)) {
      if (Math.abs((video.currentTime || 0) - state.currentTime) > 1.2) {
        video.currentTime = state.currentTime;
      }
    }

    if (typeof state.paused === "boolean") {
      if (state.paused && !video.paused) video.pause();
      if (!state.paused && video.paused) video.play().catch(() => {});
    }

    setTimeout(() => {
      suppressSyncRef.current = false;
    }, 80);
  }, [videoUrl]);

  const emitState = useCallback((overrides = {}) => {
    const video = videoRef.current;
    if (!video || suppressSyncRef.current) return;
    socketRef.current?.emit("cinema:state:set", {
      videoUrl,
      paused: video.paused,
      currentTime: video.currentTime || 0,
      ...overrides
    });
  }, [videoUrl]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("cinema:leave");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setInRoom(false);
    setRoomId("");
    setParticipants([]);
    setMessages([]);
    setJoining(false);
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = "";
    }
    const localVoice = localVoiceStreamRef.current;
    if (localVoice) {
      localVoice.getTracks().forEach((track) => track.stop());
    }
    localVoiceStreamRef.current = null;
    for (const peerId of voicePeersRef.current.keys()) {
      cleanupVoicePeer(peerId);
    }
    voicePeersRef.current.clear();
    remoteVoiceStreamsRef.current.clear();
    setVoiceEnabled(false);
    setLocalVideoName("");
  }, [cleanupVoicePeer]);

  const joinRoom = useCallback(() => {
    if (joining || inRoom) return;
    const desired = String(roomInput || "").trim();
    if (!desired) {
      setError("Enter a room code");
      return;
    }
    setError("");
    setJoining(true);

    const socket = services.socketAdapter.connect(services.sessionService.token());
    socketRef.current = socket;

    socket.on("cinema:error", (payload) => {
      if (payload?.error === "room_full") setError("Room is full (max 8 users).");
      else setError("Could not join cinema room.");
    });

    socket.on("cinema:user-joined", ({ participant }) => {
      if (!participant?.peerId) return;
      setParticipants((prev) => {
        if (prev.some((p) => p.peerId === participant.peerId)) return prev;
        return [...prev, participant];
      });
      if (voiceEnabled) {
        const peerId = participant.peerId;
        Promise.resolve()
          .then(async () => {
            const pc = createVoicePeer(peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendVoiceSignal(peerId, { type: "offer", sdp: pc.localDescription });
          })
          .catch(() => {});
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_join_${participant.peerId}_${Date.now()}`,
          content: `${participant.username} joined the room`,
          username: "System",
          createdAt: new Date().toISOString(),
          system: true
        }
      ]);
    });

    socket.on("cinema:user-left", ({ peerId }) => {
      setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
      cleanupVoicePeer(peerId);
    });

    socket.on("cinema:user-updated", ({ participant }) => {
      if (!participant?.peerId) return;
      setParticipants((prev) => prev.map((p) => (p.peerId === participant.peerId ? { ...p, ...participant } : p)));
    });

    socket.on("cinema:state:update", ({ state }) => {
      applyRemoteState(state);
    });

    socket.on("cinema:chat:new", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("cinema:signal", (payload) => {
      handleVoiceSignal(payload).catch(() => {});
    });

    socket.emit("cinema:join", { roomId: desired }, (response) => {
      if (!response?.ok) {
        setError(response?.error === "room_full" ? "Room is full (max 8 users)." : "Cannot join room");
        leaveRoom();
        return;
      }
      setJoining(false);
      setInRoom(true);
      setRoomId(response.roomId);
      setParticipants(response.participants || []);
      applyRemoteState(response.state || {});
    });
  }, [
    applyRemoteState,
    cleanupVoicePeer,
    createVoicePeer,
    handleVoiceSignal,
    inRoom,
    joining,
    leaveRoom,
    roomInput,
    sendVoiceSignal,
    services.sessionService,
    services.socketAdapter,
    voiceEnabled
  ]);

  const sendChat = useCallback(() => {
    const text = chatDraft.trim();
    if (!text) return;
    socketRef.current?.emit("cinema:chat:send", { content: text });
    setChatDraft("");
  }, [chatDraft]);

  const loadVideo = useCallback(() => {
    const nextUrl = videoDraft.trim();
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = "";
      setLocalVideoName("");
    }
    setVideoUrl(nextUrl);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.pause();
    }
    socketRef.current?.emit("cinema:state:set", {
      videoUrl: nextUrl,
      paused: true,
      currentTime: 0
    });
  }, [videoDraft]);

  const loadLocalVideo = useCallback((file) => {
    if (!file) return;
    const mime = String(file.type || "");
    if (!mime.startsWith("video/")) {
      setError("Please choose a video file");
      return;
    }
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    localObjectUrlRef.current = objectUrl;
    setLocalVideoName(file.name);
    setVideoUrl(objectUrl);
    setVideoDraft("");
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.pause();
    }
  }, []);

  const copyRoomId = useCallback(async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
    } catch {}
  }, [roomId]);

  const toggleVoice = useCallback(async () => {
    if (!inRoom) return;

    if (!voiceEnabled) {
      try {
        let stream = localVoiceStreamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localVoiceStreamRef.current = stream;
        }
        for (const track of stream.getAudioTracks()) {
          track.enabled = true;
        }
        setVoiceEnabled(true);
        socketRef.current?.emit("cinema:voice-state", { audioEnabled: true });

        for (const p of participants) {
          const pc = createVoicePeer(p.peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendVoiceSignal(p.peerId, { type: "offer", sdp: pc.localDescription });
        }
      } catch {
        setError("Microphone permission denied or unavailable.");
      }
      return;
    }

    const localVoice = localVoiceStreamRef.current;
    if (localVoice) {
      const nextEnabled = !localVoice.getAudioTracks().every((track) => track.enabled === false);
      for (const track of localVoice.getAudioTracks()) {
        track.enabled = !nextEnabled;
      }
      const nowEnabled = localVoice.getAudioTracks().some((track) => track.enabled);
      setVoiceEnabled(nowEnabled);
      socketRef.current?.emit("cinema:voice-state", { audioEnabled: nowEnabled });
      if (!nowEnabled) {
        for (const peerId of voicePeersRef.current.keys()) {
          cleanupVoicePeer(peerId);
        }
        voicePeersRef.current.clear();
        remoteVoiceStreamsRef.current.clear();
      }
    }
  }, [cleanupVoicePeer, createVoicePeer, inRoom, participants, sendVoiceSignal, voiceEnabled]);

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    user,
    roomInput,
    setRoomInput,
    roomId,
    joining,
    inRoom,
    videoUrl,
    videoDraft,
    setVideoDraft,
    participants,
    participantCount,
    remoteVoiceParticipants,
    messages,
    chatDraft,
    setChatDraft,
    localVideoName,
    error,
    videoRef,
    joinRoom,
    leaveRoom,
    emitState,
    loadVideo,
    loadLocalVideo,
    sendChat,
    copyRoomId,
    voiceEnabled,
    toggleVoice
  };
}
