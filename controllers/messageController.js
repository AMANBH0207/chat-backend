const Message = require("../models/Message");
const Room = require("../models/Rooms");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

exports.sendMessage = async (req, res) => {
  try {
    const { roomId, text } = req.body;
    const senderId = req.user?.id;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId required",
      });
    }

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    if (req.file && req.file.buffer) {
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "auto",
              folder: "chat-app",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      if (!result) {
        return res.status(500).json({
          success: false,
          message: "File upload failed",
        });
      }

      fileUrl = result.secure_url;
      fileType = req.file.mimetype;
      fileName = req.file.originalname;
    }
    if (!text && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Message or file required",
      });
    }

    const message = await Message.create({
      roomId,
      senderId,
      text,
      fileUrl,
      fileType,
      fileName,
    });

    const populatedMessage = await message.populate(
      "senderId",
      "name email avatarUrl"
    );

    await Room.findByIdAndUpdate(roomId, {
      updatedAt: new Date(),
    });
    const io = req.app.get("io");
    io.to(roomId).emit("receive_message", populatedMessage);

    res.json({
      success: true,
      data: populatedMessage,
    });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
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