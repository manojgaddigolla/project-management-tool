const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const auth = require("../middleware/auth");
const { checkProjectMember } = require("../middleware/projectAuth");
const {
  createProject,
  getProjects,
  getProjectById,
  getProjectAnalytics,
  updateProject,
  deleteProject,
  inviteUserToProject,
  removeProjectMember,
} = require("../controllers/projectController");

router.post(
  "/",
  [auth, [check("name", "Project name is required").not().isEmpty()]],
  createProject,
);

router.post(
  "/:projectId/invite",
  [auth, [check("email", "Please include a valid email").isEmail()]],
  inviteUserToProject,
);

router.get("/", auth, getProjects);

router.get("/:id/analytics", [auth, checkProjectMember], getProjectAnalytics);

router.put(
  "/:id",
  [
    auth,
    [
      check("name", "Project name is required").optional().not().isEmpty(),
      check("description", "Description must be a string").optional().isString(),
    ],
  ],
  updateProject,
);

router.delete("/:id", auth, deleteProject);

router.delete("/:projectId/members/:userId", auth, removeProjectMember);

router.get("/:id", [auth, checkProjectMember], getProjectById);

module.exports = router;
