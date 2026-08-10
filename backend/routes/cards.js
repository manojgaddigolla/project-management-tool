const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const auth = require("../middleware/auth");
const {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  assignUser,
  generateSubtasks,
  addAttachment,
  deleteAttachment,
} = require("../controllers/cardController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/",
  [
    auth,
    [
      check("title", "Title is required").not().isEmpty(),
      check("columnId", "Column ID is required").isMongoId(),
      check("priority", "Priority is invalid")
        .optional()
        .isIn(["low", "medium", "high", "urgent"]),
      check("dueDate", "Due date must be a valid date")
        .optional({ checkFalsy: true })
        .isISO8601(),
    ],
  ],
  createCard,
);

router.put(
  "/:id",
  [
    auth,
    check("id", "Card ID is required").isMongoId(),
    [
      check("title", "Title must be a string").optional().isString(),
      check("description", "Description must be a string")
        .optional()
        .isString(),
      check("priority", "Priority is invalid")
        .optional()
        .isIn(["low", "medium", "high", "urgent"]),
      check("dueDate", "Due date must be a valid date")
        .optional({ checkFalsy: true })
        .isISO8601(),
      check("checklist", "Checklist must be an array").optional().isArray(),
    ],
  ],
  updateCard,
);

router.delete(
  "/:id",
  [auth, check("id", "Card ID is required").isMongoId()],
  deleteCard,
);

router.put(
  "/move/:id",
  [
    auth,
    check("id", "Card ID is required").isMongoId(),
    [
      check("sourceColumnId", "Source Column ID is required").isMongoId(),
      check(
        "destinationColumnId",
        "Destination Column ID is required",
      ).isMongoId(),
      check("sourceIndex", "Source index is required").isNumeric(),
      check("destinationIndex", "Destination index is required").isNumeric(),
    ],
  ],
  moveCard,
);

router.post(
  "/:cardId/comments",
  [auth, [check("text", "Comment text is required").not().isEmpty()]],
  addComment,
);

router.put(
  "/:cardId/assign",
  [
    auth,
    check("cardId", "Card ID is required").isMongoId(),
    check("assignedTo", "Assignees must be an array").optional().isArray(),
    check("assignedTo.*", "Assignees must be valid users")
      .optional()
      .isMongoId(),
  ],
  assignUser,
);

router.post(
  "/:cardId/ai-subtasks",
  [auth, check("cardId", "Card ID is required").isMongoId()],
  generateSubtasks,
);

router.post(
  "/:cardId/attachments",
  [auth, upload.single("file")],
  addAttachment,
);

router.delete(
  "/:cardId/attachments/:attachmentId",
  auth,
  deleteAttachment,
);

module.exports = router;
