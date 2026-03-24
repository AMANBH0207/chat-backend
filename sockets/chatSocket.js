const Message = require("../models/Message");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("send_message", async (data) => {
      try {
        const message = await Message.create(data);

        io.to(data.roomId).emit("receive_message", message);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};