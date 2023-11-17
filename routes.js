const express = require("express");
const router = express.Router();
const { verifyUser } = require("./middleware/verifyUser");
const controllers = require("./controllers");

router.post("/login", controllers.loginController);

router.get("/employees", verifyUser, controllers.getAllEmployeesList);

router.get(
  "/employeeDetails/:id",
  verifyUser,
  controllers.getEmployeeDetails
);

router.get("/documents/:folder", verifyUser, controllers.getEmployeeDocs);

router.get(
  "/download/:folder/:filename",
  verifyUser,
  controllers.downloadDoc
);

router.post("/forgot-password", controllers.forgotPassword);

router.post("/reset-password", controllers.resetPassword);

router.post("/change-password", controllers.changePassword);

router.get("/logout", controllers.logoutController);

module.exports = { router };
