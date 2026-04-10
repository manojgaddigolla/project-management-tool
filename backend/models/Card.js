const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a card title'],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Column',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Card', CardSchema);