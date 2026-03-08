import {
  authBodySchema,
  confirmEmailSchema,
  emailSchema,
  loginSchema,
  resetPasswordSchema
} from "../validators/schemas.js";
import { parseOrReply } from "../utils/validation.js";

export function createAuthController({ authService }) {
  return {
    register: async (req, reply) => {
      const body = parseOrReply(authBodySchema, req.body, reply);
      if (!body) return;

      const result = await authService.register(body);
      if (result.error === "email_exists") return reply.code(409).send({ error: "Email exists" });
      if (result.error === "username_exists") return reply.code(409).send({ error: "Username exists" });
      return reply.code(201).send(result);
    },

    login: async (req, reply) => {
      const body = parseOrReply(loginSchema, req.body, reply);
      if (!body) return;

      const result = await authService.login(body);
      if (result.error === "invalid_credentials") {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      if (result.error === "email_not_confirmed") {
        return reply.code(403).send({ error: "Please confirm your email first" });
      }
      return result;
    },

    confirmEmail: async (req, reply) => {
      const body = parseOrReply(confirmEmailSchema, req.body, reply);
      if (!body) return;

      const result = authService.confirmEmail(body);
      if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
      if (result.error === "invalid_code") return reply.code(400).send({ error: "Invalid code" });
      if (result.error === "code_expired") return reply.code(400).send({ error: "Code expired" });
      return { ok: true };
    },

    resendConfirm: async (req, reply) => {
      const body = parseOrReply(emailSchema, req.body, reply, "Invalid email");
      if (!body) return;

      const result = await authService.resendConfirm(body);
      if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
      return { ok: true };
    },

    forgotPassword: async (req, reply) => {
      const body = parseOrReply(emailSchema, req.body, reply, "Invalid email");
      if (!body) return;
      return authService.forgotPassword(body);
    },

    resetPassword: async (req, reply) => {
      const body = parseOrReply(resetPasswordSchema, req.body, reply);
      if (!body) return;

      const result = await authService.resetPassword(body);
      if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
      if (result.error === "invalid_code") return reply.code(400).send({ error: "Invalid code" });
      if (result.error === "code_expired") return reply.code(400).send({ error: "Code expired" });
      return { ok: true };
    }
  };
}

