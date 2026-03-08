"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSession } from "@/components/auth/AppSession";

function randomRoomCode() {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}-${part()}`;
}

export function useMeetController() {
  const { user, services } = useAppSession();
  const [roomInput, setRoomInput] = useState(randomRoomCode());
  const [roomId, setRoomId] = useState("");
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState({});
  const [localPreviewStream, setLocalPreviewStream] = useState(null);
  const [selectedPeerId, setSelectedPeerId] = useState("local");
  const [error, setError] = useState("");
  const [emojiBursts, setEmojiBursts] = useState([]);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());

  const remoteParticipants = useMemo(
    () =>
      Object.values(participants)
        .filter((p) => p.peerId !== "local")
        .map((p) => ({
          ...p,
          stream: remoteStreamsRef.current.get(p.peerId) || null
        })),
    [participants]
  );

  const selectedParticipant = useMemo(() => {
    if (selectedPeerId === "local") {
      return {
        peerId: "local",
        username: `${user?.username || "Me"} (You)`,
        audioEnabled,
        videoEnabled,
        stream: localStreamRef.current
      };
    }
    const remote = participants[selectedPeerId];
    if (!remote) return null;
    return {
      ...remote,
      stream: remoteStreamsRef.current.get(selectedPeerId) || null
    };
  }, [audioEnabled, participants, selectedPeerId, user?.username, videoEnabled]);

  const cleanupPeer = useCallback((peerId) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      peersRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const sendSignal = useCallback((toPeerId, data) => {
    socketRef.current?.emit("meet:signal", { toPeerId, data });
  }, []);

  const createPeerConnection = useCallback(
    (peerId) => {
      if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
      });
      peersRef.current.set(peerId, pc);

      const localStream = localStreamRef.current;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, { type: "candidate", candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return;
        remoteStreamsRef.current.set(peerId, stream);
        setParticipants((prev) => {
          const existing = prev[peerId] || { peerId, username: "Guest", audioEnabled: true, videoEnabled: true };
          return {
            ...prev,
            [peerId]: existing
          };
        });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          cleanupPeer(peerId);
        }
      };

      return pc;
    },
    [cleanupPeer, sendSignal]
  );

  const handleSignal = useCallback(
    async ({ fromPeerId, fromUsername, data }) => {
      if (!fromPeerId || !data) return;
      const pc = createPeerConnection(fromPeerId);

      setParticipants((prev) => ({
        ...prev,
        [fromPeerId]: {
          peerId: fromPeerId,
          username: prev[fromPeerId]?.username || fromUsername || "Guest",
          audioEnabled: prev[fromPeerId]?.audioEnabled ?? true,
          videoEnabled: prev[fromPeerId]?.videoEnabled ?? true
        }
      }));

      if (data.type === "offer") {
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromPeerId, { type: "answer", sdp: pc.localDescription });
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
    [createPeerConnection, sendSignal]
  );

  const leaveMeeting = useCallback(() => {
    socketRef.current?.emit("meet:leave");
    socketRef.current?.disconnect();
    socketRef.current = null;

    for (const peerId of peersRef.current.keys()) {
      cleanupPeer(peerId);
    }
    peersRef.current.clear();
    remoteStreamsRef.current.clear();

    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current = null;
    setLocalPreviewStream(null);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setParticipants({});
    setEmojiBursts([]);
    setInCall(false);
    setRoomId("");
    setSelectedPeerId("local");
    setConnecting(false);
  }, [cleanupPeer]);

  const joinMeeting = useCallback(async () => {
    if (!user || connecting || inCall) return;
    const nextRoom = String(roomInput || "").trim().toLowerCase();
    if (!nextRoom) {
      setError("Enter a valid room code");
      return;
    }

    setError("");
    setConnecting(true);

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 }
        }
      });
      localStreamRef.current = stream;
      setLocalPreviewStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = services.socketAdapter.connect(services.sessionService.token());
      socketRef.current = socket;

      socket.on("meet:error", (payload) => {
        const msg = payload?.error === "room_full" ? "Room is full (max 8 users)." : "Meeting error";
        setError(msg);
      });

      socket.on("meet:user-joined", async ({ participant }) => {
        if (!participant?.peerId) return;
        setParticipants((prev) => ({
          ...prev,
          [participant.peerId]: participant
        }));
        const pc = createPeerConnection(participant.peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(participant.peerId, { type: "offer", sdp: pc.localDescription });
      });

      socket.on("meet:user-left", ({ peerId }) => {
        if (!peerId) return;
        cleanupPeer(peerId);
      });

      socket.on("meet:user-updated", ({ participant }) => {
        if (!participant?.peerId) return;
        setParticipants((prev) => ({
          ...prev,
          [participant.peerId]: {
            ...prev[participant.peerId],
            ...participant
          }
        }));
      });

      socket.on("meet:signal", (payload) => {
        handleSignal(payload).catch(() => {});
      });

      socket.on("meet:emoji", (payload) => {
        if (!payload?.emoji) return;
        const item = {
          id: payload.id || `${Date.now()}_${Math.random()}`,
          emoji: payload.emoji,
          username: payload.username || "Guest"
        };
        setEmojiBursts((prev) => [...prev, item]);
        setTimeout(() => {
          setEmojiBursts((prev) => prev.filter((x) => x.id !== item.id));
        }, 2200);
      });

      socket.emit("meet:join", { roomId: nextRoom }, async (response) => {
        if (!response?.ok) {
          setError(response?.error === "room_full" ? "Room is full (max 8 users)." : "Cannot join room");
          leaveMeeting();
          return;
        }

        setRoomId(response.roomId);
        setInCall(true);
        setParticipants(
          Object.fromEntries((response.participants || []).map((p) => [p.peerId, p]))
        );

        for (const participant of response.participants || []) {
          const pc = createPeerConnection(participant.peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(participant.peerId, { type: "offer", sdp: pc.localDescription });
        }
      });
    } catch {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalPreviewStream(null);
      setError("Camera/microphone permission denied or unavailable.");
    } finally {
      setConnecting(false);
    }
  }, [
    cleanupPeer,
    connecting,
    createPeerConnection,
    handleSignal,
    inCall,
    leaveMeeting,
    roomInput,
    sendSignal,
    services.sessionService,
    services.socketAdapter,
    user
  ]);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !audioEnabled;
    for (const track of stream.getAudioTracks()) {
      track.enabled = next;
    }
    setAudioEnabled(next);
    socketRef.current?.emit("meet:media-state", {
      audioEnabled: next
    });
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !videoEnabled;
    for (const track of stream.getVideoTracks()) {
      track.enabled = next;
    }
    setVideoEnabled(next);
    socketRef.current?.emit("meet:media-state", {
      videoEnabled: next
    });
  }, [videoEnabled]);

  const copyRoomId = useCallback(async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
    } catch {}
  }, [roomId]);

  const sendEmoji = useCallback((emoji) => {
    if (!inCall) return;
    socketRef.current?.emit("meet:emoji", { emoji });
  }, [inCall]);

  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, [leaveMeeting]);

  return {
    user,
    roomInput,
    setRoomInput,
    roomId,
    inCall,
    connecting,
    audioEnabled,
    videoEnabled,
    participants,
    remoteParticipants,
    selectedPeerId,
    setSelectedPeerId,
    selectedParticipant,
    error,
    emojiBursts,
    localVideoRef,
    localPreviewStream,
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    copyRoomId,
    sendEmoji
  };
}
