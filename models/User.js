const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  avatarPromptAccepted: Boolean,
  avatarUrl:String,
  pushSubscriptions: [
    {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema, "users");