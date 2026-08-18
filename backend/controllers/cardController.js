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
const { GoogleGenAI } = require("@google/genai");

let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.warn("GoogleGenAI init failed (cardController)");
}
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
  const { io } = req;
  const {
    sourceColumnId,
    destinationColumnId,
    sourceIndex,
    destinationIndex,
    socketId
  } = req.body;
  const cardId = req.params.id;
  const userId = req.user.id;

  const session = await mongoose.startSession();

  try {
    let projectId;
    let fromColumnName;
    let toColumnName;
    let cardTitle;

    await session.withTransaction(async () => {
      const card = await Card.findById(cardId).session(session);
      if (!card) throw { status: 404, msg: "Card not found" };

      const sourceColumn = await Column.findById(sourceColumnId).session(session);
      if (!sourceColumn) throw { status: 404, msg: "Source column not found" };

      const destinationColumn = sourceColumnId === destinationColumnId 
        ? sourceColumn 
        : await Column.findById(destinationColumnId).session(session);
      if (!destinationColumn) throw { status: 404, msg: "Destination column not found" };

      if (sourceColumn.board.toString() !== destinationColumn.board.toString()) {
        throw { status: 400, msg: "Columns must belong to the same board" };
      }
      if (card.column.toString() !== sourceColumnId) {
        throw { status: 400, msg: "Card is not in the source column" };
      }

      const board = await Board.findById(sourceColumn.board).session(session);
      const project = await Project.findById(board.project).session(session);

      const isMember = project.members.some(member => member.toString() === userId);
      if (!isMember) throw { status: 403, msg: "User is not authorized to move this card" };
      if (!canModify(project, userId)) throw { status: 403, msg: "Viewers cannot perform this action" };

      fromColumnName = sourceColumn.title;
      toColumnName = destinationColumn.title;
      projectId = board.project.toString();
      cardTitle = card.title;

      const actualSourceIndex = sourceColumn.cards.findIndex(id => id.toString() === cardId);
      if (actualSourceIndex === -1) {
        throw { status: 400, msg: "Card is missing from the source column" };
      }
      if (Number(sourceIndex) !== actualSourceIndex) {
        throw { status: 409, msg: "Board state changed. Please refresh and try again." };
      }

      const normalizedDestinationIndex = Math.max(0, Math.min(Number(destinationIndex), destinationColumn.cards.length));
      const [movedCardId] = sourceColumn.cards.splice(actualSourceIndex, 1);

      destinationColumn.cards.splice(normalizedDestinationIndex, 0, movedCardId);
      await sourceColumn.save({ session });
      
      if (sourceColumnId !== destinationColumnId) {
        await destinationColumn.save({ session });
        card.column = destinationColumnId;
        await card.save({ session });
      }
    });

    session.endSession();

    // Side effects (sockets, activity logs) execute only after transaction succeeds
    const updatedBoard = await getPopulatedBoard(projectId);
    const payload = {
      board: updatedBoard,
      originatorSocketId: socketId
    };
    io?.to(projectId).emit("boardUpdated", payload);
    
    const user = await User.findById(userId);
    const actionText = `${user.name} moved card '${cardTitle}' from '${fromColumnName}' to '${toColumnName}'`;
    await createActivityLog(projectId, userId, actionText, cardId);
    
    return res.json(updatedBoard);

  } catch (error) {
    session.endSession();
    // Handle specific application errors we threw manually
    if (error && error.status && error.msg) {
      return res.status(error.status).json({ msg: error.msg });
    }
    console.error("Move Card Transaction Error:", error);
    return res.status(500).json({ msg: "Server error during card move" });
  }
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

  // Smart AI Logic using Google Gemini
  let generatedTasks = [];
  if (!ai) {
    return res.status(500).json({ msg: "AI provider is not configured. Missing GEMINI_API_KEY." });
  }

  try {
    const prompt = `
You are a senior technical project manager. 
Your job is to take a task and break it down into a checklist of small, actionable sub-tasks.
Only output a raw JSON array of strings representing the sub-tasks. Do not output any markdown formatting, backticks, or explanation.

Task Title: ${card.title}
Task Description: ${card.description || "No description provided."}

Output format example:
["Setup database schema", "Create API endpoint", "Write unit tests"]
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let rawText = response.text.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```/g, '').trim();
    }

    generatedTasks = JSON.parse(rawText);
    if (!Array.isArray(generatedTasks)) {
      throw new Error("Output was not an array");
    }
  } catch (err) {
    console.error("Gemini AI Breakdown Error:", err);
    return res.status(500).json({ msg: "AI failed to generate a valid checklist." });
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