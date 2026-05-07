const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const {
  createColumn,
  updateColumn,
  deleteColumn,
} = require('../controllers/columnController');

router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('boardId', 'Board ID is required').not().isEmpty(),
    ],
  ],
  createColumn
);

router.put(
  '/:id',
  [
    auth,
    [
      check('id', 'Column ID is required').isMongoId(),
      check('title', 'Title is required').not().isEmpty(),
    ],
  ],
  updateColumn
);

router.delete(
  '/:id',
  [auth, check('id', 'Column ID is required').isMongoId()],
  deleteColumn
);

module.exports = router;
