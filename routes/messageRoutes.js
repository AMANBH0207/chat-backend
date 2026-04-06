const router = require("express").Router();
const {
  sendMessage,
  getMessages,
} = require("../controllers/messageController");
const auth = require("../middleware/authMiddleware");

router.post("/send", auth, sendMessage);
router.get("/:roomId", auth, getMessages);

module.exports = router;