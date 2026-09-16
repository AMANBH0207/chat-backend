const Room = require("../models/Rooms");
const mongoose = require("mongoose");
const Message = require("../models/Message");


exports.getOrCreateRoom = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;

  try {
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId required",
      });
    }

    let members = [
      new mongoose.Types.ObjectId(senderId),
      new mongoose.Types.ObjectId(receiverId),
    ];

    members = members.sort((a, b) => a.toString().localeCompare(b.toString()));

    let room = await Room.findOne({ members });

    if (!room) {
      room = await Room.create({ members });
    }

    room = await room.populate("members", "-password -__v");

    res.json({
      success: true,
      data: room,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      members: userId,
    })
      .populate("members", "-password -__v")
      .sort({ updatedAt: -1 });

    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        const otherUser = room.members.find(
          (m) => m._id.toString() !== userId.toString()
        );

        if (!otherUser) return null;

        // Get latest message for this room
        const lastMessage = await Message.findOne({
          roomId: room._id,
        })
          .sort({ createdAt: -1 })
          .select("text createdAt senderId");

        return {
          _id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          avatarUrl: otherUser.avatarUrl,
          room_id: room._id,

          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      data: formattedRooms.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};