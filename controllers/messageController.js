const messageService = require("../services/messageService");

exports.sendMessage = async (req, res, next) => {
  try {
    const messageData = {
      ...req.body,
      sender: req.user.id,
    };

    const message = await messageService.createMessage(messageData);

    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await messageService.getMessages(req.params.id);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};