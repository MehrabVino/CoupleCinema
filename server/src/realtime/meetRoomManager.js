export function createMeetRoomManager({ maxUsersPerRoom = 8 } = {}) {
  const rooms = new Map();
  const socketToRoom = new Map();

  function getRoom(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: new Map()
      });
    }
    return rooms.get(roomId);
  }

  function joinRoom(socket, roomId) {
    const cleanRoomId = String(roomId || "").trim().toLowerCase();
    if (!cleanRoomId) return { error: "invalid_room" };

    leaveRoom(socket);

    const room = getRoom(cleanRoomId);
    if (room.participants.size >= maxUsersPerRoom) return { error: "room_full" };

    const participant = {
      peerId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
      audioEnabled: true,
      videoEnabled: true
    };

    room.participants.set(socket.id, participant);
    socketToRoom.set(socket.id, cleanRoomId);
    return {
      roomId: cleanRoomId,
      participant,
      participants: Array.from(room.participants.values()).filter((item) => item.peerId !== socket.id)
    };
  }

  function leaveRoom(socket) {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return null;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(socket.id) || null;
    room.participants.delete(socket.id);
    if (room.participants.size === 0) rooms.delete(roomId);

    return { roomId, participant };
  }

  function getSocketRoomId(socketId) {
    return socketToRoom.get(socketId) || "";
  }

  function setMediaState(socket, state) {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) return null;
    const participant = room.participants.get(socket.id);
    if (!participant) return null;

    if (typeof state.audioEnabled === "boolean") participant.audioEnabled = state.audioEnabled;
    if (typeof state.videoEnabled === "boolean") participant.videoEnabled = state.videoEnabled;
    return { roomId, participant: { ...participant } };
  }

  return {
    joinRoom,
    leaveRoom,
    getSocketRoomId,
    setMediaState
  };
}

