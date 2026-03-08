import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";

export async function registerCorePlugins(app, env) {
  await app.register(cors, {
    origin: env.clientOrigin
  });

  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer" },
    function octetParser(req, body, done) {
      done(null, body);
    }
  );

  await app.register(jwtPlugin, {
    secret: env.jwtSecret
  });

  app.decorate("auth", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });
}
