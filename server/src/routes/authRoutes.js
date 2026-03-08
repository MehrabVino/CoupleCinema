export async function authRoutes(app, controllers) {
  app.post("/auth/register", controllers.auth.register);
  app.post("/auth/login", controllers.auth.login);
  app.post("/auth/confirm-email", controllers.auth.confirmEmail);
  app.post("/auth/resend-confirm", controllers.auth.resendConfirm);
  app.post("/auth/forgot-password", controllers.auth.forgotPassword);
  app.post("/auth/reset-password", controllers.auth.resetPassword);
}
