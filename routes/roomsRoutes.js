const { getOrCreateRoom, getMyRooms } = require("../controllers/roomsController");
const router = require("express").Router();
const protect = require("../middleware/authMiddleware");

router.post("/join-room", protect , getOrCreateRoom);
router.get("/my-rooms", protect , getMyRooms);

module.exports = router;