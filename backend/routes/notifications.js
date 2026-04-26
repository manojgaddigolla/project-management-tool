const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const {
  getNotifications,
  markNotificationsAsRead,
} = require("../../controllers/notificationController");

router.get("/", auth, getNotifications);

router.put("/mark-read", auth, markNotificationsAsRead);

module.exports = router;
