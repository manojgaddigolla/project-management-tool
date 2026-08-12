const fs = require("fs");
const path = require("path");
const {
  validationResult
} = require("express-validator");
const mongoose = require("mongoose");
const Card = require("../models/Card");
const Column = require("../models/Column");
const Board = require("../models/Board");
const Project = require("../models/Project");
const User = require("../models/User");
const createActivityLog = require("../utils/activityLogger");
const createNotification = require("../utils/notificationManager");
const {
  getPopulatedBoard
} = require("../utils/boardUtils");
const normalizeDueDate = dueDate => {
  if (!dueDate) return undefined;
  const parsed = new Date(dueDate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const canModify = (project, userId) => {
  if (project.owner.toString() === userId) return true;
  const role = project.roles && project.roles.get(userId);
  return role !== "viewer";
};
const assertProjectMemberForCard = async (cardId, userId) => {
  if (!mongoose.isValidObjectId(cardId)) {
    return {
      error: {
        status: 404,
        msg: "Card not found"
      }
    };
  }
  const card = await Card.findById(cardId);
  if (!card) {
    return {
      error: {
        status: 404,
        msg: "Card not found"
      }
    };
  }
  const column = await Column.findById(card.column);
  if (!column) {
    return {
      error: {
        status: 404,
        msg: "Parent column not found"
      }
    };
  }
  const board = await Board.findById(column.board);
  if (!board) {
    return {
      error: {
        status: 404,
        msg: "Board not found"
      }
    };
  }
  const project = await Project.findById(board.project);
  if (!project) {
    return {
      error: {
        status: 404,
        msg: "Project not found"
      }
    };
  }
  const isMember = project.members.some(member => member.toString() === userId);
  if (!isMember) {
    return {
      error: {
        status: 403,
        msg: "User is not a member of this project"
      }
    };
  }
  return {
    card,
    column,
    board,
    project
  };
};
const createCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    title,
    description,
    columnId,
    priority,
    dueDate,
    labels,
    socketId
  } = req.body;
  const userId = req.user.id;
  const column = await Column.findById(columnId);
  if (!column) {
    return res.status(404).json({
      msg: "Column not found"
    });
  }
  const board = await Board.findById(column.board);
  if (!board) {
    return res.status(404).json({
      msg: "Board not found"
    });
  }
  const project = await Project.findById(board.project);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  const isMember = project.members.some(member => member.toString() === userId);
  if (!isMember) {
    return res.status(403).json({
      msg: "User is not a member of this project"
    });
  }
  if (!canModify(project, userId)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }
  const newCard = new Card({
    title,
    description,
    priority,
    dueDate: normalizeDueDate(dueDate),
    labels: labels || [],
    column: columnId
  });
  const card = await newCard.save();
  column.cards.push(card._id);
  await column.save();
  const user = await User.findById(userId);
  await createActivityLog(project._id, userId, `${user.name} created card '${card.title}' in '${column.title}'`, card._id);
  const updatedBoard = await getPopulatedBoard(project._id);
  req.io?.to(project._id.toString()).emit("boardUpdated", {
    board: updatedBoard,
    originatorSocketId: socketId
  });
  res.status(201).json(card);
};
const updateCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    title,
    description,
    priority,
    dueDate,
    checklist,
    labels,
    socketId
  } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;
  const card = await Card.findById(cardId);
  if (!card) {
    return res.status(404).json({
      msg: "Card not found"
    });
  }
  const column = await Column.findById(card.column);
  if (!column) {
    return res.status(404).json({
      msg: "Parent column not found"
    });
  }
  const board = await Board.findById(column.board);
  if (!board) {
    return res.status(404).json({
      msg: "Board not found"
    });
  }
  const project = await Project.findById(board.project);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  const isMember = project.members.some(member => member.toString() === userId);
  if (!isMember) {
    return res.status(403).json({
      msg: "User is not authorized to update this card"
    });
  }
  if (!canModify(project, userId)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
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
    card.dueDate = normalizeDueDate(dueDate);
  }
  if (checklist !== undefined) {
    card.checklist = checklist.filter(item => item.text && item.text.trim()).map(item => ({
      text: item.text.trim(),
      completed: Boolean(item.completed)
    }));
  }
  if (labels !== undefined) {
    card.labels = labels;
  }
  const updatedCard = await card.save();
  const user = await User.findById(userId);
  await createActivityLog(project._id, userId, `${user.name} updated card '${card.title}'.`, card._id);
  const updatedBoard = await getPopulatedBoard(project._id);
  req.io?.to(project._id.toString()).emit("boardUpdated", {
    board: updatedBoard,
    originatorSocketId: socketId
  });
  res.json(updatedCard);
};
const deleteCard = async (req, res) => {
  const cardId = req.params.id;
  const userId = req.user.id;
  const card = await Card.findById(cardId);
  if (!card) {
    return res.status(404).json({
      msg: "Card not found"
    });
  }
  const column = await Column.findById(card.column);
  if (!column) {
    return res.status(404).json({
      msg: "Parent column not found"
    });
  }
  const board = await Board.findById(column.board);
  if (!board) {
    return res.status(404).json({
      msg: "Board not found"
    });
  }
  const project = await Project.findById(board.project);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  const isMember = project.members.some(member => member.toString() === userId);
  if (!isMember) {
    return res.status(403).json({
      msg: "User is not authorized to delete this card"
    });
  }
  if (!canModify(project, userId)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }
  await Card.findByIdAndDelete(cardId);
  column.cards.pull(cardId);
  await column.save();
  const user = await User.findById(userId);
  await createActivityLog(project._id, userId, `${user.name} deleted card '${card.title}'.`);
  const updatedBoard = await getPopulatedBoard(project._id);
  req.io?.to(project._id.toString()).emit("boardUpdated", {
    board: updatedBoard
  });
  res.json({
    msg: "Card successfully deleted"
  });
};
const moveCard = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    io
  } = req;
  const {
    sourceColumnId,
    destinationColumnId,
    sourceIndex,
    destinationIndex,
    socketId
  } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;
  const card = await Card.findById(cardId);
  if (!card) return res.status(404).json({
    msg: "Card not found"
  });
  const sourceColumn = await Column.findById(sourceColumnId);
  if (!sourceColumn) {
    return res.status(404).json({
      msg: "Source column not found"
    });
  }
  const destinationColumn = sourceColumnId === destinationColumnId ? sourceColumn : await Column.findById(destinationColumnId);
  if (!destinationColumn) {
    return res.status(404).json({
      msg: "Destination column not found"
    });
  }
  if (sourceColumn.board.toString() !== destinationColumn.board.toString()) {
    return res.status(400).json({
      msg: "Columns must belong to the same board"
    });
  }
  if (card.column.toString() !== sourceColumnId) {
    return res.status(400).json({
      msg: "Card is not in the source column"
    });
  }
  const board = await Board.findById(sourceColumn.board);
  const project = await Project.findById(board.project);
  const isMember = project.members.some(member => member.toString() === userId);
  if (!isMember) {
    return res.status(403).json({
      msg: "User is not authorized to move this card"
    });
  }
  if (!canModify(project, userId)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }
  const fromColumnName = sourceColumn.title;
  const toColumnName = destinationColumn.title;
  const projectId = board.project.toString();
  const actualSourceIndex = sourceColumn.cards.findIndex(id => id.toString() === cardId);
  if (actualSourceIndex === -1) {
    return res.status(400).json({
      msg: "Card is missing from the source column"
    });
  }
  if (Number(sourceIndex) !== actualSourceIndex) {
    return res.status(409).json({
      msg: "Board state changed. Please refresh and try again."
    });
  }
  const normalizedDestinationIndex = Math.max(0, Math.min(Number(destinationIndex), destinationColumn.cards.length));
  const [movedCardId] = sourceColumn.cards.splice(actualSourceIndex, 1);

  // In dnd-kit style arrayMove, the destination index doesn't require a -1 adjustment 
  // after splice because the splice natively shifts elements.
  destinationColumn.cards.splice(normalizedDestinationIndex, 0, movedCardId);
  await sourceColumn.save();
  if (sourceColumnId !== destinationColumnId) {
    await destinationColumn.save();
    card.column = destinationColumnId;
    await card.save();
  }
  const updatedBoard = await getPopulatedBoard(projectId);
  const payload = {
    board: updatedBoard,
    originatorSocketId: socketId
  };
  io?.to(projectId).emit("boardUpdated", payload);
  const user = await User.findById(userId);
  const actionText = `${user.name} moved card '${card.title}' from '${fromColumnName}' to '${toColumnName}'`;
  await createActivityLog(projectId, userId, actionText, cardId);
  res.json(updatedBoard);
};
const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    io
  } = req;
  const {
    cardId
  } = req.params;
  const {
    text,
    socketId
  } = req.body;
  const context = await assertProjectMemberForCard(cardId, req.user.id);
  if (context.error) {
    return res.status(context.error.status).json({
      msg: context.error.msg
    });
  }
  const {
    card,
    board,
    project
  } = context;
  if (!canModify(project, req.user.id)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({
      msg: "User not found"
    });
  }
  const newComment = {
    user: req.user.id,
    text: text,
    name: user.name,
    avatar: user.avatar
  };
  card.comments.unshift(newComment);
  await card.save();
  const projectId = board.project.toString();
  const actionText = `${user.name} commented on card '${card.title}'`;
  await createActivityLog(projectId, req.user.id, actionText, cardId);
  const updatedBoard = await getPopulatedBoard(projectId);
  const payload = {
    board: updatedBoard,
    originatorSocketId: socketId
  };
  io?.to(projectId).emit("boardUpdated", payload);
  res.json(card.comments);
};
const assignUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    io
  } = req;
  const {
    cardId
  } = req.params;
  const {
    assignedTo = [],
    socketId
  } = req.body;
  const context = await assertProjectMemberForCard(cardId, req.user.id);
  if (context.error) {
    return res.status(context.error.status).json({
      msg: context.error.msg
    });
  }
  const {
    card,
    board,
    project
  } = context;
  if (!canModify(project, req.user.id)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }
  const assigner = await User.findById(req.user.id);
  if (!assigner) {
    return res.status(404).json({
      msg: "User not found"
    });
  }
  if (!Array.isArray(assignedTo)) {
    return res.status(400).json({
      msg: "assignedTo must be an array"
    });
  }
  const uniqueAssigneeIds = [...new Set(assignedTo.map(id => id.toString()))];
  const hasInvalidId = uniqueAssigneeIds.some(id => !mongoose.isValidObjectId(id));
  if (hasInvalidId) {
    return res.status(400).json({
      msg: "Assignees must be valid users"
    });
  }
  const oldAssignees = card.assignedTo.map(id => id.toString());
  const memberIds = project.members.map(member => member.toString());
  const invalidAssignee = uniqueAssigneeIds.find(id => !memberIds.includes(id.toString()));
  if (invalidAssignee) {
    return res.status(400).json({
      msg: "Assignees must be project members"
    });
  }
  const assignedUsers = await User.find({
    _id: {
      $in: uniqueAssigneeIds
    }
  }).select("name");
  const assignedNames = assignedUsers.map(u => u.name).join(", ");
  const actionText = assignedNames ? `${assigner.name} assigned ${assignedNames} to card '${card.title}'` : `${assigner.name} unassigned all users from card '${card.title}'`;
  const updatedCard = await Card.findByIdAndUpdate(cardId, {
    assignedTo: uniqueAssigneeIds
  }, {
    returnDocument: "after"
  });
  if (!updatedCard) {
    return res.status(404).json({
      msg: "Card not found"
    });
  }
  const projectId = board.project.toString();
  await createActivityLog(projectId, req.user.id, actionText, cardId);
  const updatedBoard = await getPopulatedBoard(projectId);

  // Notify newly assigned users
  const newlyAssignedIds = uniqueAssigneeIds.filter(id => !oldAssignees.includes(id.toString()));
  for (const assigneeId of newlyAssignedIds) {
    if (assigneeId.toString() !== req.user.id) {
      const message = `${assigner.name} assigned you to the card '${card.title}'`;
      const link = `/project/${projectId}?card=${cardId}`;
      await createNotification(io, assigneeId, message, projectId, link);
    }
  }
  const payload = {
    board: updatedBoard,
    originatorSocketId: socketId
  };
  io?.to(projectId).emit("boardUpdated", payload);
  res.json(updatedCard);
};
const generateSubtasks = async (req, res) => {
  const {
    cardId
  } = req.params;
  const {
    socketId
  } = req.body;
  const card = await Card.findById(cardId);
  if (!card) {
    return res.status(404).json({
      msg: "Card not found"
    });
  }
  const column = await Column.findById(card.column);
  if (!column) return res.status(404).json({
    msg: "Column not found"
  });
  const board = await Board.findById(column.board);
  if (!board) return res.status(404).json({
    msg: "Board not found"
  });
  const project = await Project.findById(board.project);
  if (!project) return res.status(404).json({
    msg: "Project not found"
  });
  if (project.owner.toString() !== req.user.id && !project.members.some(m => m.toString() === req.user.id)) {
    return res.status(403).json({
      msg: "Not authorized"
    });
  }
  if (!canModify(project, req.user.id)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }

  // Smart AI Mock Logic: Analyze title and description to generate contextual subtasks
  const textToAnalyze = (card.title + " " + (card.description || "")).toLowerCase();
  let generatedTasks = [];
  if (textToAnalyze.includes("api") || textToAnalyze.includes("backend") || textToAnalyze.includes("endpoint") || textToAnalyze.includes("server")) {
    generatedTasks = ["Design API schema and request/response payload", "Implement backend controller and route logic", "Add input validation middleware", "Write unit tests for API endpoints", "Update API documentation"];
  } else if (textToAnalyze.includes("ui") || textToAnalyze.includes("frontend") || textToAnalyze.includes("design") || textToAnalyze.includes("component") || textToAnalyze.includes("page")) {
    generatedTasks = ["Review UI design mockups", "Implement responsive React components", "Apply CSS styling and design tokens", "Add loading states and error boundaries", "Verify cross-browser compatibility"];
  } else if (textToAnalyze.includes("bug") || textToAnalyze.includes("fix") || textToAnalyze.includes("issue") || textToAnalyze.includes("error")) {
    generatedTasks = ["Reproduce the reported issue locally", "Identify root cause in the codebase", "Implement code fix", "Add regression test to prevent recurrence", "Deploy fix to staging for verification"];
  } else if (textToAnalyze.includes("database") || textToAnalyze.includes("schema") || textToAnalyze.includes("model")) {
    generatedTasks = ["Draft database schema modifications", "Update Mongoose models to reflect changes", "Create database migration scripts", "Verify query performance and indexing"];
  } else {
    generatedTasks = [`Review requirements for: ${card.title}`, "Draft implementation strategy", "Execute core development tasks", "Perform QA testing", "Submit Pull Request for peer review"];
  }

  // Filter out duplicates that already exist in the card's checklist
  const existingTaskTexts = new Set(card.checklist.map(item => item.text.toLowerCase().trim()));
  const finalChecklist = generatedTasks.filter(task => !existingTaskTexts.has(task.toLowerCase().trim())).map(text => ({
    text,
    completed: false
  }));
  if (finalChecklist.length === 0) {
    return res.status(400).json({
      msg: "No new relevant subtasks could be generated or all tasks already exist."
    });
  }
  const updatedCard = await Card.findByIdAndUpdate(cardId, {
    $push: {
      checklist: {
        $each: finalChecklist
      }
    }
  }, {
    new: true,
    returnDocument: "after"
  });
  const actionText = `AI Assistant generated ${finalChecklist.length} subtasks for '${card.title}'`;
  const projectId = board.project.toString();
  await createActivityLog(projectId, req.user.id, actionText, cardId);
  const updatedBoard = await getPopulatedBoard(projectId);
  const io = req.app.get("io");
  if (io) {
    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId
    };
    io.to(projectId).emit("boardUpdated", payload);
  }
  res.json(updatedCard);
};
const addAttachment = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No file uploaded" });
  }

  const { cardId } = req.params;
  const context = await assertProjectMemberForCard(cardId, req.user.id);
  if (context.error) {
    // If error, we should delete the uploaded file to prevent orphan files
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete orphan file:", err);
    });
    return res.status(context.error.status).json({ msg: context.error.msg });
  }

  const { card, board, project } = context;
  if (!canModify(project, req.user.id)) {
    fs.unlink(req.file.path, () => {});
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }

  const newAttachment = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };

  card.attachments.push(newAttachment);
  await card.save();

  const user = await User.findById(req.user.id);
  const actionText = `${user.name} attached file '${req.file.originalname}' to card '${card.title}'`;
  const projectId = board.project.toString();
  await createActivityLog(projectId, req.user.id, actionText, cardId);

  const updatedBoard = await getPopulatedBoard(projectId);
  const io = req.app.get("io") || req.io;
  if (io) {
    io.to(projectId).emit("boardUpdated", { board: updatedBoard });
  }

  res.status(201).json(card.attachments);
};

const deleteAttachment = async (req, res) => {
  const { cardId, attachmentId } = req.params;
  const context = await assertProjectMemberForCard(cardId, req.user.id);
  
  if (context.error) {
    return res.status(context.error.status).json({ msg: context.error.msg });
  }

  const { card, board, project } = context;
  if (!canModify(project, req.user.id)) {
    return res.status(403).json({ msg: "Viewers cannot perform this action" });
  }

  const attachment = card.attachments.id(attachmentId);
  if (!attachment) {
    return res.status(404).json({ msg: "Attachment not found" });
  }

  // Delete file from disk
  const filePath = path.join(__dirname, "..", "uploads", attachment.filename);
  fs.unlink(filePath, (err) => {
    if (err) console.error("Failed to delete file from disk:", err);
  });

  attachment.deleteOne();
  await card.save();

  const user = await User.findById(req.user.id);
  const actionText = `${user.name} removed attachment '${attachment.originalName}' from card '${card.title}'`;
  const projectId = board.project.toString();
  await createActivityLog(projectId, req.user.id, actionText, cardId);

  const updatedBoard = await getPopulatedBoard(projectId);
  const io = req.app.get("io") || req.io;
  if (io) {
    io.to(projectId).emit("boardUpdated", { board: updatedBoard });
  }

  res.json({ msg: "Attachment deleted", attachments: card.attachments });
};

module.exports = {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  assignUser,
  generateSubtasks,
  addAttachment,
  deleteAttachment
};