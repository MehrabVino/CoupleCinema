import { createApp } from "./app.js";

const { app, env } = await createApp();
await app.listen({ port: env.port, host: "0.0.0.0" });
// eslint-disable-next-line no-console
console.log(`Server running at http://localhost:${env.port}`);

