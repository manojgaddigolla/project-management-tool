const { validationResult } = require("express-validator");
const Card = require("../models/Card");
const Column = require("../models/Column");
const Board = require("../models/Board");
const Project = require("../models/Project");
const createActivityLog = require("../utils/activityLogger");
const createNotification = require("../utils/notificationManager");

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
      column: columnId,
    });
    const card = await newCard.save();

    column.cards.push(card._id);
    await column.save();

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

  const { title, description } = req.body;
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

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const card = await Card.findById(cardId).session(session);
    if (!card) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Card not found" });
    }

    const column = await Column.findById(card.column).session(session);
    if (!column) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Parent column not found" });
    }

    const board = await Board.findById(column.board).session(session);
    const project = await Project.findById(board.project).session(session);

    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ msg: "User is not authorized to delete this card" });
    }

    await Card.findByIdAndDelete(cardId).session(session);

    column.cards.pull(cardId);
    await column.save({ session });

    await session.commitTransaction();

    res.json({ msg: "Card successfully deleted" });
  } catch (err) {
    await session.abortTransaction();

    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Card not found" });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    session.endSession();
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

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const card = await Card.findById(cardId).session(session);
    if (!card) throw new Error("Card not found");

    const sourceColumn = await Column.findById(sourceColumnId).session(session);
    if (!sourceColumn) throw new Error("Source column not found");

    const destinationColumn =
      sourceColumnId === destinationColumnId
        ? sourceColumn
        : await Column.findById(destinationColumnId).session(session);
    if (!destinationColumn) throw new Error("Destination column not found");

    const board = await Board.findById(sourceColumn.board).session(session);
    const project = await Project.findById(board.project).session(session);
    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );
    if (!isMember) {
      throw new Error("User is not authorized to move this card");
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

    const anyColumn = await Column.findById(toColumnId).populate({
      path: "board",
      select: "project",
    });
    const projectId = anyColumn.board.project.toString();

    const updatedBoard = await Board.findOne({ project: projectId }).populate({
      path: "columns",
      populate: {
        path: "cards",
        model: "Card",
      },
    });

    io.to(projectId).emit("boardUpdated", updatedBoard);

    if (socketId) {
      io.to(projectId).except(socketId).emit("boardUpdated", updatedBoard);
    } else {
      io.to(projectId).emit("boardUpdated", updatedBoard);
    }

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io.to(projectId).emit("boardUpdated", payload);

    const user = await User.findById(req.user.id);
    const actionText = `${user.name} moved card '${card.title}' from '${fromColumnName}' to '${toColumnName}'`;
    const columnForProject =
      await Column.findById(toColumnId).populate("board");
    const projectId = columnForProject.board.project;

    await createActivityLog(projectId, req.user.id, actionText, cardId);

    res.json(updatedBoard);
  } catch (err) {
    await session.abortTransaction();

    if (
      err.message.includes("not found") ||
      err.message.includes("not authorized")
    ) {
      return res.status(404).json({ msg: err.message });
    }
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    session.endSession();
  }
};

const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { io } = req;
  const { cardId } = req.params;
  const { text } = req.body;

  try {
    const card = await Card.findById(cardId);
    const user = await User.findById(req.user.id).select("-password");

    if (!card) {
      return res.status(404).json({ msg: "Card not found" });
    }
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

    const actionText = `${user.name} commented on card '${card.title}'`;
    const column = await Column.findById(card.column).populate("board");
    const projectId = column.board.project;
    await createActivityLog(projectId, req.user.id, actionText, cardId);

    const column = await Column.findById(card.column).populate({
      path: "board",
      select: "project",
    });
    const projectId = column.board.project.toString();

    const updatedBoard = await Board.findOne({ project: projectId })
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

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io.to(projectId).emit("boardUpdated", payload);

    res.json(card.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const assignUser = async (req, res) => {
  const { io } = req;
  const { cardId } = req.params;
  const { assignedTo, socketId } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ msg: "Card not found" });
    }
    const oldAssignees = card.assignedTo.map((id) => id.toString());
    const assignedUsers = await User.find({ _id: { $in: assignedTo } }).select(
      "name",
    );
    const assignedNames = assignedUsers.map((u) => u.name).join(", ");

    const actionText = assignedNames
      ? `${user.name} assigned ${assignedNames} to card '${card.title}'`
      : `${user.name} unassigned all users from card '${card.title}'`;

    const column = await Column.findById(card.column).populate("board");
    const projectId = column.board.project;
    await createActivityLog(projectId, req.user.id, actionText, cardId);

    const card = await Card.findByIdAndUpdate(
      cardId,
      { assignedTo: assignedTo },
      { new: true },
    );

    if (!card) {
      return res.status(404).json({ msg: "Card not found" });
    }

    const column = await Column.findById(card.column).populate({
      path: "board",
      select: "project",
    });
    const projectId = column.board.project.toString();

    const updatedBoard = await Board.findOne({ project: projectId })
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

    const assigner = await User.findById(req.user.id);
    const newlyAssigned = updatedCard.assignedTo.filter(
      (user) => !oldAssignees.includes(user._id.toString()),
    );

    const column = await Column.findById(updatedCard.column).populate("board");
    const projectId = column.board.project;

    for (const user of newlyAssigned) {
      if (user._id.toString() !== req.user.id) {
        const message = `${assigner.name} assigned you to the card '${updatedCard.title}'`;
        const link = `/project/${projectId}/board?card=${updatedCard._id}`;
        await createNotification(io, user._id, message, projectId, link);
      }
    }

    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId,
    };

    io.to(projectId).emit("boardUpdated", payload);

    res.json(card);
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
