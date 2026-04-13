const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { loginUser, registerUser, getMe } = require("../controllers/authController"); 
const authMiddleware = require("../middleware/authMiddleware");
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/me", authMiddleware, getMe);


module.exports = router;