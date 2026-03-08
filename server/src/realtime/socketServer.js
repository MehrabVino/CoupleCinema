import { Server } from "socket.io";
import { createCinemaRoomManager } from "./cinemaRoomManager.js";
import { createMeetRoomManager } from "./meetRoomManager.js";

export function createSocketServer(app, clientOrigin, realtimeService) {
  const io = new Server(app.server, {
    cors: {
      origin: clientOrigin
    }
  });

  const onlineUsers = new Map();
  const meetRooms = createMeetRoomManager({ maxUsersPerRoom: 8 });
  const cinemaRooms = createCinemaRoomManager({ maxUsersPerRoom: 8 });

  function emitPresence() {
    io.emit("presence:update", { onlineUsers: Array.from(onlineUsers.keys()) });
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = app.jwt.verify(token);
      socket.user = { id: payload.sub, username: payload.username };
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    const count = onlineUsers.get(socket.user.id) || 0;
    onlineUsers.set(socket.user.id, count + 1);
    emitPresence();

    socket.on("chat:join", ({ chatId }) => {
      if (realtimeService.canJoinChat(chatId, socket.user.id)) socket.join(chatId);
    });

    socket.on("typing:set", ({ chatId, isTyping }) => {
      if (!realtimeService.canBroadcastTyping(chatId, socket.user.id)) return;
      socket.to(chatId).emit("typing:update", {
        chatId,
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: Boolean(isTyping)
      });
    });

    socket.on("message:send", ({ chatId, content }) => {
      const message = realtimeService.sendMessage(chatId, socket.user.id, content);
      if (!message) return;
      io.to(chatId).emit("message:new", message);
    });

    socket.on("message:edit", ({ messageId, content }) => {
      const updated = realtimeService.editMessage(messageId, socket.user.id, content);
      if (!updated) return;
      io.to(updated.chat_id).emit("message:updated", {
        ...updated,
        reactions: {},
        my_reactions: []
      });
    });

    socket.on("message:delete", ({ messageId }) => {
      const deleted = realtimeService.deleteMessage(messageId, socket.user.id);
      if (!deleted) return;
      io.to(deleted.chat_id).emit("message:deleted", {
        id: deleted.id,
        chat_id: deleted.chat_id
      });
    });

    socket.on("reaction:toggle", ({ messageId, emoji, chatId }) => {
      const data = realtimeService.toggleReaction(messageId, socket.user.id, emoji, chatId);
      if (!data) return;
      io.to(chatId).emit("reaction:updated", data);
    });

    socket.on("meet:join", ({ roomId } = {}, ack) => {
      const joined = meetRooms.joinRoom(socket, roomId);
      if (joined.error) {
        if (typeof ack === "function") ack({ ok: false, error: joined.error });
        socket.emit("meet:error", { error: joined.error });
        return;
      }

      socket.join(`meet:${joined.roomId}`);
      if (typeof ack === "function") {
        ack({
          ok: true,
          roomId: joined.roomId,
          self: joined.participant,
          participants: joined.participants
        });
      }

      socket.to(`meet:${joined.roomId}`).emit("meet:user-joined", {
        participant: joined.participant
      });
    });

    socket.on("meet:leave", () => {
      const left = meetRooms.leaveRoom(socket);
      if (!left) return;
      socket.leave(`meet:${left.roomId}`);
      socket.to(`meet:${left.roomId}`).emit("meet:user-left", {
        peerId: socket.id,
        userId: socket.user.id
      });
    });

    socket.on("meet:media-state", (payload = {}) => {
      const updated = meetRooms.setMediaState(socket, payload);
      if (!updated) return;
      socket.to(`meet:${updated.roomId}`).emit("meet:user-updated", {
        participant: updated.participant
      });
    });

    socket.on("meet:signal", ({ toPeerId, data } = {}) => {
      const roomId = meetRooms.getSocketRoomId(socket.id);
      if (!roomId || !toPeerId || !data) return;
      io.to(toPeerId).emit("meet:signal", {
        fromPeerId: socket.id,
        fromUserId: socket.user.id,
        fromUsername: socket.user.username,
        data
      });
    });

    socket.on("meet:emoji", ({ emoji } = {}) => {
      const roomId = meetRooms.getSocketRoomId(socket.id);
      const value = String(emoji || "").trim().slice(0, 8);
      if (!roomId || !value) return;
      io.to(`meet:${roomId}`).emit("meet:emoji", {
        emoji: value,
        userId: socket.user.id,
        username: socket.user.username,
        id: `${socket.user.id}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
      });
    });

    socket.on("cinema:join", ({ roomId } = {}, ack) => {
      const joined = cinemaRooms.join(socket, roomId);
      if (joined.error) {
        if (typeof ack === "function") ack({ ok: false, error: joined.error });
        socket.emit("cinema:error", { error: joined.error });
        return;
      }

      socket.join(`cinema:${joined.roomId}`);
      if (typeof ack === "function") {
        ack({
          ok: true,
          roomId: joined.roomId,
          self: joined.participant,
          participants: joined.participants,
          state: joined.state
        });
      }

      socket.to(`cinema:${joined.roomId}`).emit("cinema:user-joined", {
        participant: joined.participant
      });
    });

    socket.on("cinema:leave", () => {
      const left = cinemaRooms.leave(socket);
      if (!left) return;
      socket.leave(`cinema:${left.roomId}`);
      socket.to(`cinema:${left.roomId}`).emit("cinema:user-left", {
        peerId: socket.id,
        userId: socket.user.id
      });
    });

    socket.on("cinema:state:set", (payload = {}) => {
      const updated = cinemaRooms.updateState(socket, payload);
      if (!updated) return;
      socket.to(`cinema:${updated.roomId}`).emit("cinema:state:update", {
        state: updated.state,
        actor: {
          userId: socket.user.id,
          username: socket.user.username
        }
      });
    });

    socket.on("cinema:chat:send", ({ content } = {}) => {
      const roomId = cinemaRooms.roomIdBySocket(socket.id);
      const text = String(content || "").trim().slice(0, 1200);
      if (!roomId || !text) return;
      const message = {
        id: `${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        content: text,
        userId: socket.user.id,
        username: socket.user.username,
        createdAt: new Date().toISOString()
      };
      io.to(`cinema:${roomId}`).emit("cinema:chat:new", message);
    });

    socket.on("cinema:voice-state", (payload = {}) => {
      const updated = cinemaRooms.setVoiceState(socket, payload);
      if (!updated) return;
      socket.to(`cinema:${updated.roomId}`).emit("cinema:user-updated", {
        participant: updated.participant
      });
    });

    socket.on("cinema:signal", ({ toPeerId, data } = {}) => {
      const roomId = cinemaRooms.roomIdBySocket(socket.id);
      if (!roomId || !toPeerId || !data) return;
      if (!cinemaRooms.isParticipantInRoom(roomId, toPeerId)) return;
      io.to(toPeerId).emit("cinema:signal", {
        fromPeerId: socket.id,
        fromUserId: socket.user.id,
        fromUsername: socket.user.username,
        data
      });
    });

    socket.on("disconnect", () => {
      const cinemaLeft = cinemaRooms.leave(socket);
      if (cinemaLeft) {
        socket.to(`cinema:${cinemaLeft.roomId}`).emit("cinema:user-left", {
          peerId: socket.id,
          userId: socket.user.id
        });
      }

      const left = meetRooms.leaveRoom(socket);
      if (left) {
        socket.to(`meet:${left.roomId}`).emit("meet:user-left", {
          peerId: socket.id,
          userId: socket.user.id
        });
      }

      const current = onlineUsers.get(socket.user.id) || 1;
      if (current <= 1) onlineUsers.delete(socket.user.id);
      else onlineUsers.set(socket.user.id, current - 1);
      emitPresence();
    });
  });

  return io;
}
