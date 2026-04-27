const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    /**
     * JOIN ROOM
     * send { roomId, userId }
     */
    socket.on("join_room", ({ roomId, userId }) => {
      socket.join(roomId);

      socket.currentRoom = roomId;
      socket.userId = userId;
    });

    /**
     * SEND MESSAGE
     */
    socket.on("send_message", async (data) => {
      try {
        const { roomId, text, senderId } = data;

        if (!roomId || !text || !senderId) return;

        const message = await Message.create({
          roomId,
          text,
          senderId,
          isReadByUser: false,
        });

        const populatedMessage = await message.populate(
          "senderId",
          "name email avatarUrl"
        );

        /**
         * Chat area messages
         */
        io.to(roomId).emit("receive_message", populatedMessage);

        /**
         * Sidebar latest message
         */
        io.to(roomId).emit("sidebar_last_message", {
          roomId,
          lastMessage: text,
          createdAt: populatedMessage.createdAt,
          senderId,
        });

        /**
         * AUTO READ RECEIPT
         * if receiver already viewing this room
         */
        const socketsInRoom = await io.in(roomId).fetchSockets();

        const otherUserViewing = socketsInRoom.some(
          (s) =>
            s.userId?.toString() !== senderId.toString() &&
            s.currentRoom === roomId
        );

        if (otherUserViewing) {
          await Message.findByIdAndUpdate(message._id, {
            isReadByUser: true,
          });

          socket.to(roomId).emit("messages_read", {
            roomId,
          });
        }
      } catch (err) {
        console.error("Socket Error:", err);
      }
    });

    /**
     * TYPING START
     */
    socket.on("typing_start", ({ roomId, userId }) => {
      socket.to(roomId).emit("user_typing", {
        roomId,
        userId,
      });
    });

    /**
     * TYPING STOP
     */
    socket.on("typing_stop", ({ roomId, userId }) => {
      socket.to(roomId).emit("user_stop_typing", {
        roomId,
        userId,
      });
    });

    /**
     * READ RECEIPT
     * when user manually opens room later
     */
    socket.on("mark_as_read", async ({ roomId, userId }) => {
      try {
        const result = await Message.updateMany(
          {
            roomId,
            senderId: { $ne: userId },
            isReadByUser: false,
          },
          {
            $set: { isReadByUser: true },
          }
        );

        if (result.modifiedCount > 0) {
          socket.to(roomId).emit("messages_read", {
            roomId,
          });
        }
      } catch (error) {
        console.error("Read receipt error:", error);
      }
    });

    /**
     * SIDEBAR REFRESH
     */
    socket.on("refresh_sidebar", ({ roomId }) => {
      io.emit("sidebar_refresh", { roomId });
    });

    /**
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};