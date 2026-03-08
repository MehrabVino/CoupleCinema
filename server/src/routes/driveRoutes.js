export async function driveRoutes(app, controllers) {
  app.get("/drive/items", { preHandler: app.auth }, controllers.drive.list);
  app.post("/drive/folders", { preHandler: app.auth }, controllers.drive.createFolder);
  app.post("/drive/upload", { preHandler: app.auth }, controllers.drive.upload);
  app.patch("/drive/items/rename", { preHandler: app.auth }, controllers.drive.rename);
  app.delete("/drive/items", { preHandler: app.auth }, controllers.drive.remove);
  app.get("/drive/download", { preHandler: app.auth }, controllers.drive.download);
  app.post("/drive/share", { preHandler: app.auth }, controllers.drive.createShare);
  app.get("/drive/shared/:token", controllers.drive.downloadShared);
}

