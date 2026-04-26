const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const {
  getActivitiesForProject,
} = require("../../controllers/activityController");

router.get("/:projectId", auth, getActivitiesForProject);

module.exports = router;
