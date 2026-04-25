const Activity = require("../models/Activity");

const createActivityLog = async (
  projectId,
  userId,
  actionText,
  cardId = null,
) => {
  try {
    const activity = new Activity({
      project: projectId,
      user: userId,
      actionText: actionText,
    });

    if (cardId) {
      activity.card = cardId;
    }

    await activity.save();
  } catch (err) {
    console.error("Error creating activity log:", err.message);
  }
};

module.exports = createActivityLog;
