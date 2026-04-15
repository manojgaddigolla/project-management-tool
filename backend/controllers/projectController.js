const { validationResult } = require("express-validator");
const Project = require("../models/Project");
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

module.exports = {
  createProject,
  getProjects,
  getProjectById,
};
