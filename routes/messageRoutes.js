const router = require("express").Router();
const {
  sendMessage,
  getMessages,
} = require("../controllers/messageController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, sendMessage);
router.get("/:id", auth, getMessages);

module.exports = router;

module.exports = router;