const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const { createColumn } = require('../controllers/columnController');

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
module.exports = router;