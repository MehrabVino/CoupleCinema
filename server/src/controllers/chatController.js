import {
  createChatSchema,
  joinPublicChatSchema,
  startPrivateChatSchema,
  updateChatNameSchema,
  updateChatPublicIdSchema,
  updateMemberAccessSchema
} from "../validators/schemas.js";
import { parseOrReply } from "../utils/validation.js";

export function createChatController({ chatService }) {
  return {
    list: async (req) => ({ chats: chatService.listByUser(req.user.sub) }),

    startPv: async (req, reply) => {
      const body = parseOrReply(startPrivateChatSchema, req.body, reply, "Invalid target");
      if (!body) return;

      const result = chatService.startPrivate(req.user.sub, body.query);
      if (result.error === "target_not_found") return reply.code(404).send({ error: "User not found" });
      return { chat: result.chat, target: result.target };
    },

    create: async (req, reply) => {
      const body = parseOrReply(createChatSchema, req.body, reply, "Invalid chat name");
      if (!body) return;

      try {
        const chat = chatService.create(body.name.trim(), req.user.sub, body.type, body.publicId || "");
        return reply.code(201).send({ chat });
      } catch {
        return reply.code(409).send({ error: "Chat name exists" });
      }
    },

    joinById: async (req, reply) => {
      const result = chatService.joinById(req.params.chatId, req.user.sub);
      if (result.error === "not_found") return reply.code(404).send({ error: "Chat not found" });
      return result;
    },

    joinByPublicIdPath: async (req, reply) => {
      const result = chatService.joinByPublicId(req.params.publicId, req.user.sub);
      if (result.error === "not_found") return reply.code(404).send({ error: "Chat not found" });
      return result;
    },

    joinByPublicIdBody: async (req, reply) => {
      const body = parseOrReply(joinPublicChatSchema, req.body, reply, "Invalid public ID");
      if (!body) return;

      const normalized = body.publicId.trim().replace(/^@+/, "");
      if (!normalized) return reply.code(400).send({ error: "Invalid public ID" });
      const result = chatService.joinByPublicId(normalized, req.user.sub);
      if (result.error === "not_found") return reply.code(404).send({ error: "Chat not found" });
      return result;
    },

    updatePublicId: async (req, reply) => {
      const body = parseOrReply(updateChatPublicIdSchema, req.body, reply, "Invalid public ID");
      if (!body) return;

      const chat = chatService.updatePublicId(req.params.chatId, req.user.sub, body.publicId);
      if (!chat) return reply.code(403).send({ error: "Only owner can change chat ID" });
      return { chat };
    },

    rename: async (req, reply) => {
      const body = parseOrReply(updateChatNameSchema, req.body, reply, "Invalid chat name");
      if (!body) return;

      const chat = chatService.rename(req.params.chatId, req.user.sub, body.name);
      if (!chat) return reply.code(403).send({ error: "Only owner can change chat name" });
      return { chat };
    },

    members: async (req, reply) => {
      const result = chatService.listMembers(req.params.chatId, req.user.sub);
      if (result.error === "forbidden") return reply.code(403).send({ error: "Forbidden" });
      return result;
    },

    updateAccess: async (req, reply) => {
      const body = parseOrReply(updateMemberAccessSchema, req.body, reply, "Invalid access value");
      if (!body) return;

      const result = chatService.updateMemberAccess(
        req.params.chatId,
        req.user.sub,
        req.params.memberId,
        body.access
      );
      if (result.error === "not_found") return reply.code(404).send({ error: "Chat not found" });
      if (result.error === "pv_access_not_allowed") {
        return reply.code(400).send({ error: "PV member access cannot be changed" });
      }
      if (result.error === "forbidden") {
        return reply.code(403).send({ error: "Only owner can change member access" });
      }
      return result;
    },

    messages: async (req, reply) => {
      const result = chatService.listMessages(req.params.chatId, req.user.sub, Number(req.query.limit || 70));
      if (result.error === "forbidden") return reply.code(403).send({ error: "Forbidden" });
      return result;
    }
  };
}

