const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { checkProjectMember } = require('../middleware/projectAuth');
const { getBoardByProjectId } = require('../controllers/boardController');

router.get("/:projectId", [auth, checkProjectMember], getBoardByProjectId);

module.exports = router;
