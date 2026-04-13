const router = require("express").Router();
const {
  sendMessage,
  getMessages,
} = require("../controllers/messageController");
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");

router.post("/send", auth, upload.single("file"), sendMessage);
router.get("/:roomId", auth, getMessages);

module.exports = router;