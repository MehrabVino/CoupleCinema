import { z } from "zod";

export const authBodySchema = z.object({
  email: z.string().email().toLowerCase().refine((v) => v.endsWith("@gmail.com"), {
    message: "Only Gmail addresses are allowed"
  }),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128)
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(128)
});

export const confirmEmailSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().min(4).max(10)
});

export const emailSchema = z.object({
  email: z.string().email().toLowerCase()
});

export const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().min(4).max(10),
  password: z.string().min(6).max(128)
});

export const updateProfileSchema = z
  .object({
    username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    publicId: z.string().min(3).max(40).optional()
  })
  .refine((data) => data.username || data.publicId, { message: "No profile fields provided" });

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(120)
});

export const startPrivateChatSchema = z.object({
  query: z.string().min(1).max(120)
});

export const createChatSchema = z.object({
  name: z.string().min(2).max(64),
  type: z.enum(["group", "channel", "pv"]).default("group"),
  publicId: z.string().min(3).max(40).optional()
});

export const joinPublicChatSchema = z.object({
  publicId: z.string().min(1).max(80)
});

export const updateChatPublicIdSchema = z.object({
  publicId: z.string().min(3).max(40)
});

export const updateChatNameSchema = z.object({
  name: z.string().min(2).max(64)
});

export const updateMemberAccessSchema = z.object({
  access: z.enum(["full", "read-only"])
});
