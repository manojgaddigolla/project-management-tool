const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const { createCard } = require('../controllers/cardController');

router.post(
  '/',
  [
    auth, 
    [
      check('title', 'Title is required').not().isEmpty(),
      check('columnId', 'Column ID is required').isMongoId(), 
    ],
  ],
  createCard
);

module.exports = router;