const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("send_message", async (data) => {
      try {
        const { roomId, text, senderId } = data;

        if (!roomId || !text || !senderId) return;

        const message = await Message.create({
          roomId,
          text,
          senderId,
        });

        const populatedMessage = await message.populate(
          "senderId",
          "name email avatarUrl"
        );
        io.to(roomId).emit("receive_message", populatedMessage);
      } catch (err) {
        console.error("Socket Error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};