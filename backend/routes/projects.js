const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const auth = require("../middleware/auth");
const { checkProjectMember } = require('../middleware/projectAuth');
const {
  createProject,
  getProjects,
  getProjectById
} = require("../controllers/projectController");

router.post(
  "/",
  [auth, [check("name", "Project name is required").not().isEmpty()]],
  createProject,
);

router.get("/", auth, getProjects);

router.get('/:id', [auth, checkProjectMember], getProjectById);

module.exports = router;
