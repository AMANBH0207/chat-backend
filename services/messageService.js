const Message = require("../models/Message");

exports.createMessage = async (data) => {
  const message = await Message.create(data);

  return await message.populate("sender", "name email");
};

exports.getMessages = async (conversationId) => {
  return await Message.find({ conversationId })
    .populate("sender", "name email")
    .sort({ createdAt: 1 });
};