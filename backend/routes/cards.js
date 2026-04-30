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
} = require("../controllers/cardController");

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

router.put("/:cardId/assign", auth, assignUser);

module.exports = router;
