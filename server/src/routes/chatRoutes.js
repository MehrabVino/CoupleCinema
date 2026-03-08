export async function chatRoutes(app, controllers) {
  app.get("/chats", { preHandler: app.auth }, controllers.chat.list);
  app.post("/chats/pv/start", { preHandler: app.auth }, controllers.chat.startPv);
  app.post("/chats", { preHandler: app.auth }, controllers.chat.create);
  app.post("/chats/:chatId/join", { preHandler: app.auth }, controllers.chat.joinById);
  app.post("/chats/public/:publicId/join", { preHandler: app.auth }, controllers.chat.joinByPublicIdPath);
  app.post("/chats/join-public", { preHandler: app.auth }, controllers.chat.joinByPublicIdBody);
  app.patch("/chats/:chatId/public-id", { preHandler: app.auth }, controllers.chat.updatePublicId);
  app.patch("/chats/:chatId/name", { preHandler: app.auth }, controllers.chat.rename);
  app.get("/chats/:chatId/members", { preHandler: app.auth }, controllers.chat.members);
  app.patch(
    "/chats/:chatId/members/:memberId/access",
    { preHandler: app.auth },
    controllers.chat.updateAccess
  );
  app.get("/chats/:chatId/messages", { preHandler: app.auth }, controllers.chat.messages);
}
