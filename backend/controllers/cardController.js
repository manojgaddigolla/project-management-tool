const { validationResult } = require('express-validator');
const Card = require('../models/Card');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Project = require('../models/Project');

const createCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, columnId } = req.body;
  const userId = req.user.id; 

  try {

    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ msg: 'Column not found' });
    }

    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ msg: 'Board not found' });
    }

    const project = await Project.findById(board.project);
    if (!project) {
        return res.status(404).json({ msg: 'Project not found' });
    }

    const isMember = project.members.some(member => member.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ msg: 'User is not a member of this project' });
    }

    const newCard = new Card({
      title,
      description,
      column: columnId,
    });
    const card = await newCard.save();

    column.cards.push(card._id);
    await column.save();

    res.status(201).json(card);

  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Invalid ID format' });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  createCard,
};