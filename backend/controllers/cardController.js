const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Card = require("../models/Card");
const Column = require("../models/Column");
const Board = require("../models/Board");
const Project = require("../models/Project");
const User = require("../models/User");
const createActivityLog = require("../utils/activityLogger");
const createNotification = require("../utils/notificationManager");

const getPopulatedBoard = (projectId) => {
  return Board.findOne({ project: projectId })
    .populate({
      path: "columns",
      populate: {
        path: "cards",
        model: "Card",
        populate: [
          { path: "assignedTo", select: "name avatar" },
          { path: "comments.user", select: "name avatar" },
        ],
      },
    })
    .populate({
      path: "project",
      populate: { path: "owner members", select: "name avatar email" },
    });
};

const assertProjectMemberForCard = async (cardId, userId) => {
  if (!mongoose.isValidObjectId(cardId)) {
    return { error: { status: 404, msg: "Card not found" } };
  }

  const card = await Card.findById(cardId);
  if (!card) {
    return { error: { status: 404, msg: "Card not found" } };
  }

  const column = await Column.findById(card.column);
  if (!column) {
    return { error: { status: 404, msg: "Parent column not found" } };
  }

  const board = await Board.findById(column.board);
  if (!board) {
    return { error: { status: 404, msg: "Board not found" } };
  }

  const project = await Project.findById(board.project);
  if (!project) {
    return { error: { status: 404, msg: "Project not found" } };
  }

  const isMember = project.members.some(
    (member) => member.toString() === userId,
  );

  if (!isMember) {
    return {
      error: { status: 403, msg: "User is not a member of this project" },
    };
  }

  return { card, column, board, project };
};

const createCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, columnId, priority, dueDate, socketId } =
    req.body;
  const userId = req.user.id;

  try {
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ msg: "Column not found" });
    }

    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ msg: "Board not found" });
    }

    const project = await Project.findById(board.project);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ msg: "User is not a member of this project" });
    }

    const newCard = new Card({
      title,
      description,
      priority,
      dueDate,
      column: columnId,
    });
    const card = await newCard.save();

    column.cards.push(card._id);
    await column.save();

    const user = await User.findById(userId);
    await createActivityLog(
      project._id,
      userId,
      `${user.name} created card '${card.title}' in '${column.title}'`,
      card._id,
    );

    const updatedBoard = await getPopulatedBoard(project._id);
    req.io?.to(project._id.toString()).emit("boardUpdated", {
      board: updatedBoard,
      originatorSocketId: socketId,
    });

    res.status(201).json(card);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Invalid ID format" });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const updateCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, priority, dueDate, checklist } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;

  try {
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ msg: "Card not found" });
    }

    const column = await Column.findById(card.column);
    const board = await Board.findById(column.board);
    const project = await Project.findById(board.project);

    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ msg: "User is not authorized to update this card" });
    }

    if (title !== undefined) {
      card.title = title;
    }
    if (description !== undefined) {
      card.description = description;
    }
    if (priority !== undefined) {
      card.priority = priority;
    }
    if (dueDate !== undefined) {
      card.dueDate = dueDate || undefined;
    }
    if (checklist !== undefined) {
      card.checklist = checklist
        .filter((item) => item.text && item.text.trim())
        .map((item) => ({
          text: item.text.trim(),
          completed: Boolean(item.completed),
        }));
    }

    const updatedCard = await card.save();

    res.json(updatedCard);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Card not found" });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const deleteCard = async (req, res) => {
  const cardId = req.params.id;
  const userId = req.user.id;

  try {
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ msg: "Card not found" });
    }

    const column = await Column.findById(card.column);
    if (!column) {
      return res.status(404).json({ msg: "Parent column not found" });
    }

    const board = await Board.findById(column.board);
    const project = await Project.findById(board.project);

    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ msg: "User is not authorized to delete this card" });
    }

    await Card.findByIdAndDelete(cardId);

    column.cards.pull(cardId);
    await column.save();

    res.json({ msg: "Card successfully deleted" });
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Card not found" });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const moveCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { io } = req;
  const {
    sourceColumnId,
    destinationColumnId,
    sourceIndex,
    destinationIndex,
    socketId,
  } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;

  try {
    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ msg: "Card not found" });

    const sourceColumn = await Column.findById(sourceColumnId);
    if (!sourceColumn) {
      return res.status(404).json({ msg: "Source column not found" });
    }

    const destinationColumn =
      sourceColumnId === destinationColumnId
        ? sourceColumn
        : await Column.findById(destinationColumnId);
    if (!destinationColumn) {
      return res.status(404).json({ msg: "Destination column not found" });
    }

    if (sourceColumn.board.toString() !== destinationColumn.board.toString()) {
      return res
        .status(400)
        .json({ msg: "Columns must belong to the same board" });
    }

    if (card.column.toString() !== sourceColumnId) {
      return res.status(400).json({ msg: "Card is not in the source column" });
    }

    const board = await Board.findById(sourceColumn.board);
    const project = await Project.findById(board.project);
    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ msg: "User is not authorized to move this card" });
    }

    const fromColumnName = sourceColumn.title;
    const toColumnName = destinationColumn.title;
    const projectId = board.project.toString();

    const actualSourceIndex = sourceColumn.cards.findIndex(
      (id) => id.toString() === cardId,
    );

    if (actualSourceIndex === -1) {
      return res
        .status(400)
        .json({ msg: "Card is missing from the source column" });
    }

    if (Number(sourceIndex) !== actualSourceIndex) {
      return res
        .status(409)
        .json({ msg: "Board state changed. Please refresh and try again." });
    }

    const normalizedDestinationIndex = Math.max(
      0,
      Math.min(Number(destinationIndex), destinationColumn.cards.length),
    );

    const [movedCardId] = sourceColumn.cards.splice(actualSourceIndex, 1);

    const insertIndex =
      sourceColumnId === destinationColumnId &&
      normalizedDestinationIndex > actualSourceIndex
        ? normalizedDestinationIndex - 1
        : normalizedDestinationIndex;

    destinationColumn.cards.splice(insertIndex, 0, movedCardId);

    await sourceColumn.save();
    if (sourceColumnId !== destinationColumnId) {
      await destinationColumn.save();
      card.column = destinationColumnId;
      await card.save();
    }

    const updatedBoard = await getPopulatedBoard(projectId);

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io?.to(projectId).emit("boardUpdated", payload);

    const user = await User.findById(userId);
    const actionText = `${user.name} moved card '${card.title}' from '${fromColumnName}' to '${toColumnName}'`;
    await createActivityLog(projectId, userId, actionText, cardId);

    res.json(updatedBoard);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { io } = req;
  const { cardId } = req.params;
  const { text, socketId } = req.body;

  try {
    const context = await assertProjectMemberForCard(cardId, req.user.id);
    if (context.error) {
      return res.status(context.error.status).json({ msg: context.error.msg });
    }

    const { card, board } = context;
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const newComment = {
      user: req.user.id,
      text: text,
      name: user.name,
      avatar: user.avatar,
    };

    card.comments.unshift(newComment);

    await card.save();

    const projectId = board.project.toString();

    const actionText = `${user.name} commented on card '${card.title}'`;
    await createActivityLog(projectId, req.user.id, actionText, cardId);

    const updatedBoard = await getPopulatedBoard(projectId);

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io?.to(projectId).emit("boardUpdated", payload);

    res.json(card.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const assignUser = async (req, res) => {
  const { io } = req;
  const { cardId } = req.params;
  const { assignedTo = [], socketId } = req.body;

  try {
    const context = await assertProjectMemberForCard(cardId, req.user.id);
    if (context.error) {
      return res.status(context.error.status).json({ msg: context.error.msg });
    }

    const { card, board, project } = context;
    const assigner = await User.findById(req.user.id);
    if (!assigner) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!Array.isArray(assignedTo)) {
      return res.status(400).json({ msg: "assignedTo must be an array" });
    }

    const hasInvalidId = assignedTo.some((id) => !mongoose.isValidObjectId(id));
    if (hasInvalidId) {
      return res.status(400).json({ msg: "Assignees must be valid users" });
    }

    const oldAssignees = card.assignedTo.map((id) => id.toString());

    const memberIds = project.members.map((member) => member.toString());
    const invalidAssignee = assignedTo.find(
      (id) => !memberIds.includes(id.toString()),
    );
    if (invalidAssignee) {
      return res.status(400).json({ msg: "Assignees must be project members" });
    }

    const assignedUsers = await User.find({ _id: { $in: assignedTo } }).select(
      "name",
    );
    const assignedNames = assignedUsers.map((u) => u.name).join(", ");

    const actionText = assignedNames
      ? `${assigner.name} assigned ${assignedNames} to card '${card.title}'`
      : `${assigner.name} unassigned all users from card '${card.title}'`;

    const updatedCard = await Card.findByIdAndUpdate(
      cardId,
      { assignedTo: assignedTo },
      { new: true },
    );

    if (!updatedCard) {
      return res.status(404).json({ msg: "Card not found" });
    }

    const projectId = board.project.toString();

    await createActivityLog(projectId, req.user.id, actionText, cardId);

    const updatedBoard = await getPopulatedBoard(projectId);

    // Notify newly assigned users
    const newlyAssignedIds = (assignedTo || []).filter(
      (id) => !oldAssignees.includes(id.toString()),
    );

    for (const assigneeId of newlyAssignedIds) {
      if (assigneeId.toString() !== req.user.id) {
        const message = `${assigner.name} assigned you to the card '${card.title}'`;
        const link = `/project/${projectId}/board?card=${cardId}`;
        await createNotification(io, assigneeId, message, projectId, link);
      }
    }

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io?.to(projectId).emit("boardUpdated", payload);

    res.json(updatedCard);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  assignUser,
};
