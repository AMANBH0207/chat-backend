const router = require("express").Router();

const {
  loginUser,
  registerUser,
  getMe,
  logoutUser,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logoutUser);
module.exports = router;