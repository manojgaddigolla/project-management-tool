const { validationResult } = require('express-validator');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Project = require('../models/Project'); 

const getPopulatedBoard = (projectId) => {
  return Board.findOne({ project: projectId })
    .populate({
      path: 'columns',
      populate: {
        path: 'cards',
        model: 'Card',
        populate: [
          { path: 'assignedTo', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' },
        ],
      },
    })
    .populate({
      path: 'project',
      populate: { path: 'owner members', select: 'name avatar email' },
    });
};

const createColumn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, boardId, socketId } = req.body;
  const userId = req.user.id; 

  try {
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ msg: 'Board not found' });
    }

    const project = await Project.findById(board.project);
    if (!project) {
        return res.status(404).json({ msg: 'Associated project not found' });
    }

    const isMember = project.members.some(member => member.toString() === userId);
    if (!isMember) {
        return res.status(403).json({ msg: 'Authorization denied' });
    }

    const newColumn = new Column({
      title,
      board: boardId,
    });
    const column = await newColumn.save();

    board.columns.push(column._id);
    await board.save();

    const updatedBoard = await getPopulatedBoard(board.project);
    req.io?.to(board.project.toString()).emit('boardUpdated', {
      board: updatedBoard,
      originatorSocketId: socketId,
    });

    res.status(201).json(column);

  } catch (err) {
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Board not found' });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  createColumn,
};
