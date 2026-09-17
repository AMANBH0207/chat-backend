const Message = require("../models/Message");
const Room = require("../models/Rooms");
const pushService = require("../services/pushService");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    /**
     * JOIN ROOM
     * send { roomId, userId }
     */
    socket.on("join_room", ({ roomId, userId }) => {
      socket.join(roomId);

      // Private room for this user
      socket.join(`user_${userId}`);

      socket.currentRoom = roomId;
      socket.userId = userId;
    });

    /**
     * SEND MESSAGE
     */
    socket.on("send_message", async (data) => {
      try {
        const {
          roomId,
          text,
          senderId,
          fileType,
          fileUrl,
          fileName,
        } = data;

        // Text OR file required
        if (!roomId || !senderId || (!text && !fileUrl)) return;

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
        io.to(roomId).emit(
          "receive_message",
          populatedMessage
        );

        /**
         * Sidebar latest message
         */
        io.emit("sidebar_last_message", {
          roomId,
          lastMessage: text,
          createdAt: populatedMessage.createdAt,
          senderId,
          fileUrl,
          fileName,
          fileType,
        });

        /**
         * AUTO READ RECEIPT
         */
        const socketsInRoom =
          await io.in(roomId).fetchSockets();

        const otherUserViewing = socketsInRoom.some(
          (s) =>
            s.userId?.toString() !== senderId.toString() &&
            s.currentRoom === roomId
        );

        if (otherUserViewing) {
          await Message.findByIdAndUpdate(message._id, {
            isReadByUser: true,
          });

          io.to(roomId).emit("messages_read", {
            roomId,
          });
        } else {
          // Send push notification
          const room = await Room.findById(roomId);

          if (room) {
            const receivers = room.members.filter(
              (m) =>
                m.toString() !== senderId.toString()
            );

            for (const receiverId of receivers) {
              pushService.sendNotificationToUser(
                receiverId,
                {
                  title: `New message from ${populatedMessage.senderId.name}`,
                  body: text,
                  data: {
                    roomId,
                    url: `/chat/${roomId}`,
                  },
                }
              );
            }
          }
        }
      } catch (err) {
        console.error("Socket Error:", err);
      }
    });

    /**
     * TYPING START
     */
    socket.on(
      "typing_start",
      ({ roomId, userId }) => {
        socket.to(roomId).emit(
          "user_typing",
          {
            roomId,
            userId,
          }
        );
      }
    );

    /**
     * TYPING STOP
     */
    socket.on(
      "typing_stop",
      ({ roomId, userId }) => {
        socket.to(roomId).emit(
          "user_stop_typing",
          {
            roomId,
            userId,
          }
        );
      }
    );

    /**
     * READ RECEIPT
     */
    socket.on(
      "mark_as_read",
      async ({ roomId, userId }) => {
        try {
          const result =
            await Message.updateMany(
              {
                roomId,
                senderId: { $ne: userId },
                isReadByUser: false,
              },
              {
                $set: {
                  isReadByUser: true,
                },
              }
            );

          if (result.modifiedCount > 0) {
            socket
              .to(roomId)
              .emit("messages_read", {
                roomId,
              });
          }
        } catch (error) {
          console.error(
            "Read receipt error:",
            error
          );
        }
      }
    );

    /**
     * =====================================================
     * AUDIO / VIDEO CALL SIGNALING
     * =====================================================
     */

    /**
     * CALL USER
     *
     * Caller -> Receiver
     */
    socket.on(
      "call_user",
      ({
        roomId,
        callerId,
        receiverId,
        callType,
      }) => {
        console.log(
          `Call ${callType}:`,
          callerId,
          "->",
          receiverId
        );

        io.to(`user_${receiverId}`).emit(
          "incoming_call",
          {
            roomId,
            callerId,
            receiverId,
            callType,
          }
        );
      }
    );

    /**
     * ACCEPT CALL
     *
     * Receiver -> Caller
     */
    socket.on(
      "accept_call",
      ({
        roomId,
        callerId,
        receiverId,
      }) => {
        console.log(
          "Call accepted:",
          callerId,
          "<-",
          receiverId
        );

        io.to(`user_${callerId}`).emit(
          "call_accepted",
          {
            roomId,
            callerId,
            receiverId,
          }
        );
      }
    );

    /**
     * REJECT CALL
     *
     * Receiver -> Caller
     */
    socket.on(
      "reject_call",
      ({
        roomId,
        callerId,
        receiverId,
      }) => {
        console.log(
          "Call rejected:",
          callerId,
          "<-",
          receiverId
        );

        io.to(`user_${callerId}`).emit(
          "call_rejected",
          {
            roomId,
            callerId,
            receiverId,
          }
        );
      }
    );

    /**
     * =====================================================
     * WEBRTC OFFER
     * =====================================================
     *
     * Caller -> Receiver
     */
    socket.on(
      "webrtc_offer",
      ({
        roomId,
        offer,
        receiverId,
      }) => {
        console.log(
          "WebRTC offer:",
          receiverId
        );

        io.to(`user_${receiverId}`).emit(
          "webrtc_offer",
          {
            roomId,
            offer,
          }
        );
      }
    );

    /**
     * =====================================================
     * WEBRTC ANSWER
     * =====================================================
     *
     * Receiver -> Caller
     */
    socket.on(
      "webrtc_answer",
      ({
        roomId,
        answer,
        callerId,
      }) => {
        console.log(
          "WebRTC answer:",
          callerId
        );

        io.to(`user_${callerId}`).emit(
          "webrtc_answer",
          {
            roomId,
            answer,
          }
        );
      }
    );

    /**
     * =====================================================
     * ICE CANDIDATE
     * =====================================================
     */
    socket.on(
      "ice_candidate",
      ({
        roomId,
        candidate,
        targetUserId,
      }) => {
        console.log(
          "ICE candidate ->",
          targetUserId
        );

        io.to(`user_${targetUserId}`).emit(
          "ice_candidate",
          {
            roomId,
            candidate,
          }
        );
      }
    );

    /**
     * =====================================================
     * END CALL
     * =====================================================
     */
    socket.on(
      "end_call",
      ({
        roomId,
        targetUserId,
      }) => {
        console.log(
          "Call ended:",
          roomId
        );

        io.to(`user_${targetUserId}`).emit(
          "call_ended",
          {
            roomId,
          }
        );
      }
    );

    /**
     * SIDEBAR REFRESH
     */
    socket.on(
      "refresh_sidebar",
      ({ roomId }) => {
        io.emit("sidebar_refresh", {
          roomId,
        });
      }
    );

    /**
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log(
        "User disconnected:",
        socket.id
      );
    });
  });
};