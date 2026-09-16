const Message = require("../models/Message");
const Room = require("../models/Rooms");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const pushService = require("../services/pushService");

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

    const room = await Room.findByIdAndUpdate(
      roomId,
      {
        updatedAt: new Date(),
      },
      { new: true }
    );

    const io = req.app.get("io");

    /**
     * Chat area
     */
    io.to(roomId).emit("receive_message", populatedMessage);

    /**
     * Sidebar latest message
     */
    io.emit("sidebar_last_message", {
      roomId,
      lastMessage: text || "",
      createdAt: populatedMessage.createdAt,
      senderId,
      fileType,
      fileName,
      fileUrl,
    });

    // Push notification logic
    if (room) {
      const socketsInRoom = await io.in(roomId).fetchSockets();

      const otherUserViewing = socketsInRoom.some(
        (s) =>
          s.userId?.toString() !== senderId.toString() &&
          s.currentRoom === roomId
      );

      if (!otherUserViewing) {
        const receivers = room.members.filter(
          (m) => m.toString() !== senderId.toString()
        );

        for (const receiverId of receivers) {
          pushService.sendNotificationToUser(receiverId, {
            title: `New message from ${populatedMessage.senderId.name}`,
            body:
              text ||
              (fileType?.startsWith("image/")
                ? "Sent an image"
                : fileUrl
                ? "Sent a file"
                : "New message"),
            data: {
              roomId,
              url: `/chat/${roomId}`,
            },
          });
        }
      }
    }

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
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const { before } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId required",
      });
    }

    const query = { roomId };

    // Cursor: fetch messages older than the current oldest message
    if (before) {
      query.createdAt = {
        $lt: new Date(before),
      };
    }

    // Fetch one extra message to determine whether more exist
    const messages = await Message.find(query)
      .populate("senderId", "name email avatarUrl")
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    // Backend fetched newest → oldest.
    // Frontend wants oldest → newest.
    messages.reverse();

    res.json({
      success: true,
      data: messages,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};