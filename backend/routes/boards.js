const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { checkProjectMember } = require('../middleware/projectAuth');
const { getBoardByProjectId, moveColumn } = require('../controllers/boardController');

router.get("/:projectId", [auth, checkProjectMember], getBoardByProjectId);
router.put("/:projectId/columns/move", [auth, checkProjectMember], moveColumn);

module.exports = router;
