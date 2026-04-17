const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const { createCard,updateCard,deleteCard,moveCard } = require('../controllers/cardController');

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

router.put(
  '/:id',
  [
    auth, 
    check('id', 'Card ID is required').isMongoId(), 
    [ 
      check('title', 'Title must be a string').optional().isString(),
      check('description', 'Description must be a string').optional().isString(),
    ],
  ],
  updateCard 
);

router.delete(
  '/:id',
  [
    auth, 
    check('id', 'Card ID is required').isMongoId(), 
  ],
  deleteCard 
);

router.put(
  '/move/:id',
  [
    auth,
    check('id', 'Card ID is required').isMongoId(),
    [
      check('sourceColumnId', 'Source Column ID is required').isMongoId(),
      check('destinationColumnId', 'Destination Column ID is required').isMongoId(),
      check('sourceIndex', 'Source index is required').isNumeric(),
      check('destinationIndex', 'Destination index is required').isNumeric(),
    ],
  ],
  moveCard
);
module.exports = router;