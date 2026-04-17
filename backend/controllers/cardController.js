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

const updateCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id; 

  try {
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ msg: 'Card not found' });
    }

    const column = await Column.findById(card.column);
    const board = await Board.findById(column.board);
    const project = await Project.findById(board.project);

    const isMember = project.members.some(member => member.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ msg: 'User is not authorized to update this card' });
    }

    if (title !== undefined) {
      card.title = title;
    }
    if (description !== undefined) {
      card.description = description;
    }

    const updatedCard = await card.save();

    res.json(updatedCard);

  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Card not found' });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const deleteCard = async (req, res) => {
  const cardId = req.params.id;
  const userId = req.user.id; 

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const card = await Card.findById(cardId).session(session);
    if (!card) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'Card not found' });
    }

    const column = await Column.findById(card.column).session(session);
    if (!column) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: 'Parent column not found' });
    }

    const board = await Board.findById(column.board).session(session);
    const project = await Project.findById(board.project).session(session);
    
    const isMember = project.members.some(member => member.toString() === userId);
    if (!isMember) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ msg: 'User is not authorized to delete this card' });
    }

    await Card.findByIdAndDelete(cardId).session(session);

    column.cards.pull(cardId);
    await column.save({ session });

    await session.commitTransaction();

    res.json({ msg: 'Card successfully deleted' });

  } catch (err) {
    await session.abortTransaction();

    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Card not found' });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    session.endSession();
  }
};

const moveCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    sourceColumnId,
    destinationColumnId,
    sourceIndex,
    destinationIndex,
  } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id; 

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const card = await Card.findById(cardId).session(session);
    if (!card) throw new Error('Card not found');

    const sourceColumn = await Column.findById(sourceColumnId).session(session);
    if (!sourceColumn) throw new Error('Source column not found');

    const destinationColumn =
      sourceColumnId === destinationColumnId
        ? sourceColumn
        : await Column.findById(destinationColumnId).session(session);
    if (!destinationColumn) throw new Error('Destination column not found');
    
    const board = await Board.findById(sourceColumn.board).session(session);
    const project = await Project.findById(board.project).session(session);
    const isMember = project.members.some(member => member.toString() === userId);
    if (!isMember) {
      throw new Error('User is not authorized to move this card');
    }

    const [movedCardId] = sourceColumn.cards.splice(sourceIndex, 1);
    
    destinationColumn.cards.splice(destinationIndex, 0, movedCardId);
    
    await sourceColumn.save({ session });
    if (sourceColumnId !== destinationColumnId) {
      await destinationColumn.save({ session });
    }

    if (sourceColumnId !== destinationColumnId) {
      card.column = destinationColumnId;
      await card.save({ session });
    }
    
    await session.commitTransaction();
    
    res.json({ msg: 'Card moved successfully' });

  } catch (err) {
    await session.abortTransaction();
    
    if (err.message.includes('not found') || err.message.includes('not authorized')) {
        return res.status(404).json({ msg: err.message });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    session.endSession();
  }
};

module.exports = {
  createCard,
  updateCard,
  deleteCard,
  moveCard
};