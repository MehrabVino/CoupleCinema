import { searchUsersSchema, updateProfileSchema } from "../validators/schemas.js";
import { parseOrReply } from "../utils/validation.js";

export function createUserController({ userService }) {
  return {
    getMe: async (req, reply) => {
      const user = userService.getMe(req.user.sub);
      if (!user) return reply.code(404).send({ error: "User not found" });
      return { user };
    },

    updateProfile: async (req, reply) => {
      const body = parseOrReply(updateProfileSchema, req.body, reply, "Invalid profile data");
      if (!body) return;

      const result = userService.updateProfile(req.user.sub, body);
      if (result.error === "not_found") return reply.code(404).send({ error: "User not found" });
      if (result.error === "username_exists") return reply.code(409).send({ error: "Username exists" });
      if (result.error) return reply.code(400).send({ error: "Could not update profile" });
      return result;
    },

    search: async (req, reply) => {
      const query = parseOrReply(searchUsersSchema, req.query, reply, "Invalid query");
      if (!query) return;
      return { users: userService.search(query.q, req.user.sub) };
    }
  };
}

