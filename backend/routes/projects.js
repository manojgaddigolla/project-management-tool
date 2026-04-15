const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const auth = require("../middleware/auth");
const { createProject } = require("../controllers/projectController");

router.post(
  "/",
  [auth, [check("name", "Project name is required").not().isEmpty()]],
  createProject,
);

// router.get('/', (req, res) => {
//   res.send('Project routes are ready!');
// });

module.exports = router;
