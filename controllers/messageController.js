const messageService = require("../services/messageService");

const Message = require("../models/Message");
const Room = require("../models/Rooms");

exports.sendMessage = async (req, res) => {
  try {
    const { roomId, text } = req.body;
    const senderId = req.user.id;

    if (!roomId || !text) {
      return res.status(400).json({
        success: false,
        message: "roomId and text required",
      });
    }

    const message = await Message.create({
      roomId,
      senderId,
      text,
    });

    await Room.findByIdAndUpdate(roomId, {
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId required",
      });
    }

    const messages = await Message.find({ roomId })
      .populate("senderId", "name email avatarUrl")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};