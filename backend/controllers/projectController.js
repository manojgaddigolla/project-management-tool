const { validationResult } = require("express-validator");
const Project = require("../models/Project");
const User = require('../models/User');
const Board = require("../models/Board");
const Column = require("../models/Column");
const mongoose = require("mongoose");

const createProject = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { name, description } = req.body;
    const newProject = new Project({
      name,
      description,
      owner: req.user.id,
      members: [req.user.id],
    });

    const project = await newProject.save({ session });

    const newBoard = new Board({
      project: project._id,
    });
    const board = await newBoard.save({ session });

    const defaultColumns = [
      { title: "To-Do", board: board._id, cards: [] },
      { title: "In Progress", board: board._id, cards: [] },
      { title: "Done", board: board._id, cards: [] },
    ];
    const columns = await Column.insertMany(defaultColumns, { session });

    board.columns = columns.map((col) => col._id);
    await board.save({ session });

    await session.commitTransaction();

    res.status(201).json(project);
  } catch (err) {
    await session.abortTransaction();
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    session.endSession();
  }
};

const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const getProjectById = async (req, res) => {
  try {
    res.json(req.project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const inviteUserToProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { io } = req;
  const { projectId } = req.params;
  const { email } = req.body;

  try {
    const userToInvite = await User.findOne({ email }).select('-password');
    if (!userToInvite) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const isAlreadyOwner = project.owner.toString() === userToInvite._id.toString();
    const isAlreadyMember = project.members.some(
      (memberId) => memberId.toString() === userToInvite._id.toString()
    );

    if (isAlreadyOwner || isAlreadyMember) {
      return res.status(400).json({ msg: 'User is already in the project' });
    }

    project.members.push(userToInvite._id);

    await project.save();
   
    const updatedBoard = await Board.findOne({ project: projectId }).populate({
        path: 'columns',
        populate: { path: 'cards', model: 'Card', populate: { path: 'comments.user assignedTo', select: 'name avatar' } },
    }).populate({
        path: 'project',
        populate: { path: 'owner members', select: 'name avatar email' }
    });

    const payload = {
        board: updatedBoard,
        originatorSocketId: req.body.socketId,
    };
    io.to(projectId).emit('boardUpdated', payload);

    const populatedProject = await project.populate('members', ['name', 'avatar', 'email']);
    res.json(populatedProject);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  inviteUserToProject
};
