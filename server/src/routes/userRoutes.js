export async function userRoutes(app, controllers) {
  app.get("/me", { preHandler: app.auth }, controllers.user.getMe);
  app.patch("/me/profile", { preHandler: app.auth }, controllers.user.updateProfile);
  app.get("/users/search", { preHandler: app.auth }, controllers.user.search);
}
