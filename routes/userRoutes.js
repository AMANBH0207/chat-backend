const router = require("express").Router();
const { searchUsers, subscribeToPush, unsubscribeFromPush } = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");


router.get("/search", protect , searchUsers);
router.post("/subscribe", protect, subscribeToPush);
router.post("/unsubscribe", protect, unsubscribeFromPush);

module.exports = router;