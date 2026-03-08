export function parseOrReply(schema, value, reply, errorMessage = "Invalid input") {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.code(400).send({ error: errorMessage });
    return null;
  }
  return parsed.data;
}

