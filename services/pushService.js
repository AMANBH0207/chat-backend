const webpush = require("web-push");
const User = require("../models/User");

// Initialize web-push with VAPID keys from environment variables
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.sendNotificationToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return; // User has no subscriptions
    }

    const subscriptions = user.pushSubscriptions;
    const invalidEndpoints = [];

    // Send push notification to all stored subscriptions for this user
    const notifications = subscriptions.map((sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      return webpush.sendNotification(subscription, JSON.stringify(payload)).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log("Subscription expired, marking for removal");
          invalidEndpoints.push(sub.endpoint);
        } else {
          console.error("Error sending push notification:", err);
        }
      });
    });

    await Promise.all(notifications);

    // Clean up invalid subscriptions
    if (invalidEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: { endpoint: { $in: invalidEndpoints } },
        },
      });
    }
  } catch (error) {
    console.error("Error in pushService.sendNotificationToUser:", error);
  }
};
