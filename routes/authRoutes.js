const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { loginUser, registerUser } = require("../controllers/authController"); 
router.post("/login", loginUser);
router.post("/register", registerUser);



module.exports = router;