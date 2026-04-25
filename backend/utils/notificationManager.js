const Notification = require("../models/Notification");

const createNotification = async (io, userId, message, projectId, link) => {
  try {
    const notification = new Notification({
      user: userId,
      message,
      project: projectId,
      link,
    });

    const savedNotification = await notification.save();

    io.to(userId.toString()).emit("newNotification", savedNotification);
  } catch (err) {
    console.error("Error creating notification:", err.message);
  }
};

module.exports = createNotification;
