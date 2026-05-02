const User = require("../models/User");

exports.searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};
    const users = await User.find(keyword)
    //   .find({ _id: { $ne: req.user.id } })
      .select("-password")
      .limit(10);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

exports.subscribeToPush = async (req, res, next) => {
  try {
    const subscription = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Invalid subscription object" });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
    );

    await User.updateOne(
      { _id: userId },
      { $push: { pushSubscriptions: subscription } }
    );

    res.status(201).json({ success: true, message: "Subscribed to push notifications" });
  } catch (err) {
    next(err);
  }
};

exports.unsubscribeFromPush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: "Endpoint is required" });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    res.status(200).json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (err) {
    next(err);
  }
};