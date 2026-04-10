const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a column title'],
      trim: true,
    },

    cards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
      },
    ],

    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true, 
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model('Column', ColumnSchema);