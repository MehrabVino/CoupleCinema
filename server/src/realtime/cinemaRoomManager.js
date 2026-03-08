function safeRoomId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

function safeVideoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.slice(0, 2000);
}

export function createCinemaRoomManager({ maxUsersPerRoom = 8 } = {}) {
  const rooms = new Map();
  const socketToRoom = new Map();

  function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: new Map(),
        state: {
          videoUrl: "",
          paused: true,
          currentTime: 0,
          updatedAt: new Date().toISOString()
        }
      });
    }
    return rooms.get(roomId);
  }

  function join(socket, roomId) {
    const id = safeRoomId(roomId);
    if (!id) return { error: "invalid_room" };

    leave(socket);
    const room = getOrCreateRoom(id);
    if (room.participants.size >= maxUsersPerRoom) return { error: "room_full" };

    const participant = {
      peerId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
      audioEnabled: false
    };
    room.participants.set(socket.id, participant);
    socketToRoom.set(socket.id, id);

    return {
      roomId: id,
      participant,
      participants: Array.from(room.participants.values()).filter((p) => p.peerId !== socket.id),
      state: room.state
    };
  }

  function leave(socket) {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return null;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomId);
    if (!room) return null;
    room.participants.delete(socket.id);
    if (room.participants.size === 0) rooms.delete(roomId);
    return { roomId };
  }

  function roomIdBySocket(socketId) {
    return socketToRoom.get(socketId) || "";
  }

  function setVoiceState(socket, input = {}) {
    const roomId = roomIdBySocket(socket.id);
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(socket.id);
    if (!participant) return null;

    if (typeof input.audioEnabled === "boolean") {
      participant.audioEnabled = input.audioEnabled;
    }

    room.participants.set(socket.id, participant);
    return { roomId, participant };
  }

  function isParticipantInRoom(roomId, peerId) {
    if (!roomId || !peerId) return false;
    const room = rooms.get(roomId);
    if (!room) return false;
    return room.participants.has(peerId);
  }

  function updateState(socket, input) {
    const roomId = roomIdBySocket(socket.id);
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) return null;

    const next = { ...room.state };
    if (typeof input.paused === "boolean") next.paused = input.paused;
    if (typeof input.currentTime === "number" && Number.isFinite(input.currentTime)) {
      next.currentTime = Math.max(0, Number(input.currentTime));
    }
    if (typeof input.videoUrl === "string") {
      next.videoUrl = safeVideoUrl(input.videoUrl);
      if (!next.videoUrl) next.currentTime = 0;
    }
    next.updatedAt = new Date().toISOString();
    room.state = next;
    return { roomId, state: next };
  }

  return {
    join,
    leave,
    roomIdBySocket,
    updateState,
    setVoiceState,
    isParticipantInRoom
  };
}
