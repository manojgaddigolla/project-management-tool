const {
  validationResult
} = require("express-validator");
const Project = require("../models/Project");
const User = require('../models/User');
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const Activity = require("../models/Activity");
const Notification = require("../models/Notification");
const createActivityLog = require('../utils/activityLogger');
const createNotification = require('../utils/notificationManager');
const {
  getPopulatedBoard
} = require('../utils/boardUtils');
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  let project;
  let board;
  const {
    name,
    description
  } = req.body;
  const newProject = new Project({
    name,
    description,
    owner: req.user.id,
    members: [req.user.id],
    roles: { [req.user.id]: "admin" }
  });
  project = await newProject.save();
  const newBoard = new Board({
    project: project._id
  });
  board = await newBoard.save();
  const defaultColumns = [{
    title: "To-Do",
    board: board._id,
    cards: []
  }, {
    title: "In Progress",
    board: board._id,
    cards: []
  }, {
    title: "Done",
    board: board._id,
    cards: []
  }];
  const columns = await Column.insertMany(defaultColumns);
  board.columns = columns.map(col => col._id);
  await board.save();
  res.status(201).json(project);
};
const getProjects = async (req, res) => {
  const userId = req.user.id;
  const projects = await Project.find({
    $or: [{
      owner: userId
    }, {
      members: userId
    }]
  }).populate("owner", "name email avatar").sort({
    updatedAt: -1
  });
  res.json(projects);
};
const getProjectById = async (req, res) => {
  res.json(req.project);
};
const getProjectAnalytics = async (req, res) => {
  const projectId = req.params.id;
  const project = await Project.findById(projectId).populate("members", "name avatar email");
  const board = await Board.findOne({
    project: projectId
  }).populate({
    path: "columns",
    populate: {
      path: "cards",
      model: "Card",
      populate: {
        path: "assignedTo",
        select: "name avatar email"
      }
    }
  });
  if (!board) {
    return res.status(404).json({
      msg: "Board not found"
    });
  }
  const activities = await Activity.find({
    project: projectId
  }).sort({
    createdAt: -1
  }).limit(25).populate("user", "name avatar");
  const columns = board.columns || [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const twoWeeksFromToday = new Date(startOfToday);
  twoWeeksFromToday.setDate(twoWeeksFromToday.getDate() + 14);
  const getValidDueDate = card => {
    if (!card.dueDate) return null;
    const dueDate = new Date(card.dueDate);
    return Number.isNaN(dueDate.getTime()) ? null : dueDate;
  };
  const cards = columns.flatMap(column => (column.cards || []).map(card => ({
    card,
    columnTitle: column.title
  })));
  const doneColumnNames = ["done", "complete", "completed", "shipped"];
  const isDoneCard = ({
    columnTitle
  }) => doneColumnNames.some(name => columnTitle.toLowerCase().includes(name));
  const totalTasks = cards.length;
  const completedTasks = cards.filter(isDoneCard).length;
  const openTasks = totalTasks - completedTasks;
  const overdueTasks = cards.filter(({
    card,
    columnTitle
  }) => {
    const dueDate = getValidDueDate(card);
    return dueDate && dueDate < startOfToday && !doneColumnNames.some(name => columnTitle.toLowerCase().includes(name));
  }).length;
  const priorityOrder = ["urgent", "high", "medium", "low"];
  const byPriority = priorityOrder.map(priority => ({
    label: priority,
    value: cards.filter(({
      card
    }) => card.priority === priority).length
  }));
  const byStatus = columns.map(column => ({
    label: column.title,
    value: column.cards.length
  }));
  const memberLoadMap = new Map();
  project.members.forEach(member => {
    const id = member._id.toString();
    memberLoadMap.set(id, {
      userId: id,
      name: member.name,
      avatar: member.avatar,
      email: member.email,
      openTasks: 0,
      completedTasks: 0,
      overdueTasks: 0
    });
  });
  cards.forEach(entry => {
    const assignees = entry.card.assignedTo || [];
    const dueDate = getValidDueDate(entry.card);
    const isOverdue = dueDate && dueDate < startOfToday && !isDoneCard(entry);
    if (assignees.length === 0) {
      const current = memberLoadMap.get("unassigned") || {
        userId: "unassigned",
        name: "Unassigned",
        avatar: "",
        email: "",
        openTasks: 0,
        completedTasks: 0,
        overdueTasks: 0
      };
      if (isDoneCard(entry)) current.completedTasks += 1;else current.openTasks += 1;
      if (isOverdue) current.overdueTasks += 1;
      memberLoadMap.set("unassigned", current);
      return;
    }
    assignees.forEach(user => {
      const id = user._id.toString();
      const current = memberLoadMap.get(id) || {
        userId: id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        openTasks: 0,
        completedTasks: 0,
        overdueTasks: 0
      };
      current.name = user.name;
      current.avatar = user.avatar;
      current.email = user.email;
      if (isDoneCard(entry)) current.completedTasks += 1;else current.openTasks += 1;
      if (isOverdue) current.overdueTasks += 1;
      memberLoadMap.set(id, current);
    });
  });
  const openDatedTasks = cards.map(entry => ({
    ...entry,
    dueDate: getValidDueDate(entry.card)
  })).filter(entry => entry.dueDate).filter(entry => !isDoneCard(entry)).sort((a, b) => a.dueDate - b.dueDate);
  const formatDeadlineTask = ({
    card,
    columnTitle,
    dueDate
  }) => ({
    id: card._id,
    title: card.title,
    dueDate,
    priority: card.priority,
    status: columnTitle,
    isOverdue: dueDate < startOfToday,
    isDueToday: dueDate.toDateString() === startOfToday.toDateString()
  });
  const overdueTaskList = openDatedTasks.filter(entry => entry.dueDate < startOfToday).slice(0, 6).map(formatDeadlineTask);
  const dueSoonTasks = openDatedTasks.filter(entry => entry.dueDate >= startOfToday && entry.dueDate <= twoWeeksFromToday).slice(0, 8).map(formatDeadlineTask);
  const completionRate = totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0;

  const days = req.query.days ? parseInt(req.query.days, 10) : 14;
  const tasksOverTime = [];
  const completedCardsList = cards.filter(isDoneCard).map(entry => entry.card);
  
  // Sort completed cards by update date
  completedCardsList.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    targetDate.setDate(targetDate.getDate() - i);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find cards updated (completed) before or during this day
    const completedUpToDay = completedCardsList.filter(
      card => new Date(card.updatedAt) < nextDate
    ).length;

    tasksOverTime.push({
      date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: completedUpToDay,
    });
  }

  res.json({
    summary: {
      totalTasks,
      completedTasks,
      openTasks,
      overdueTasks,
      completionRate,
      activityCount: await Activity.countDocuments({
        project: projectId
      })
    },
    byStatus,
    byPriority,
    memberLoad: Array.from(memberLoadMap.values()).map(member => ({
      ...member,
      totalTasks: member.openTasks + member.completedTasks
    })),
    dueSoonTasks,
    overdueTaskList,
    tasksOverTime, // <-- Added here
    recentActivity: activities
  });
};
const updateProject = async (req, res) => {
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
    id
  } = req.params;
  const {
    name,
    description,
    isArchived,
    socketId
  } = req.body;
  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  if (project.owner.toString() !== req.user.id) {
    return res.status(403).json({
      msg: "Only the owner can update this project"
    });
  }
  if (name !== undefined) {
    project.name = name;
  }
  if (description !== undefined) {
    project.description = description;
  }
  if (isArchived !== undefined) {
    project.isArchived = isArchived;
  }
  await project.save();
  const user = await User.findById(req.user.id);
  await createActivityLog(id, req.user.id, `${user.name} updated project details.`);
  const updatedBoard = await getPopulatedBoard(id);
  io?.to(id).emit("boardUpdated", {
    board: updatedBoard,
    originatorSocketId: socketId
  });
  res.json(project);
};
const deleteProject = async (req, res) => {
  const {
    id
  } = req.params;
  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  if (project.owner.toString() !== req.user.id) {
    return res.status(403).json({
      msg: "Only the owner can delete this project"
    });
  }
  const boards = await Board.find({
    project: id
  });
  const boardIds = boards.map(board => board._id);
  const columns = await Column.find({
    board: {
      $in: boardIds
    }
  });
  const columnIds = columns.map(column => column._id);
  await Card.deleteMany({
    column: {
      $in: columnIds
    }
  });
  await Column.deleteMany({
    board: {
      $in: boardIds
    }
  });
  await Board.deleteMany({
    project: id
  });
  await Activity.deleteMany({
    project: id
  });
  await Notification.deleteMany({
    project: id
  });
  await Project.findByIdAndDelete(id);
  req.io?.to(id).emit("projectDeleted", {
    projectId: id
  });
  res.json({
    msg: "Project successfully deleted"
  });
};
const inviteUserToProject = async (req, res) => {
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
    projectId
  } = req.params;
  const {
    email
  } = req.body;
  const userToInvite = await User.findOne({
    email
  }).select('-password');
  if (!userToInvite) {
    return res.status(404).json({
      msg: 'User not found'
    });
  }
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      msg: 'Project not found'
    });
  }
  if (project.owner.toString() !== req.user.id) {
    return res.status(401).json({
      msg: 'User not authorized'
    });
  }
  const isAlreadyOwner = project.owner.toString() === userToInvite._id.toString();
  const isAlreadyMember = project.members.some(memberId => memberId.toString() === userToInvite._id.toString());
  if (isAlreadyOwner || isAlreadyMember) {
    return res.status(400).json({
      msg: 'User is already in the project'
    });
  }
  project.members.push(userToInvite._id);
  project.roles.set(userToInvite._id.toString(), req.body.role || "editor");
  await project.save();
  const inviter = await User.findById(req.user.id);
  const actionText = `${inviter.name} invited ${userToInvite.name} (${userToInvite.email}) to the project.`;
  await createActivityLog(projectId, req.user.id, actionText);
  const updatedBoard = await Board.findOne({
    project: projectId
  }).populate({
    path: 'columns',
    populate: {
      path: 'cards',
      model: 'Card',
      populate: {
        path: 'comments.user assignedTo',
        select: 'name avatar'
      }
    }
  }).populate({
    path: 'project',
    populate: {
      path: 'owner members',
      select: 'name avatar email'
    }
  });
  const payload = {
    board: updatedBoard,
    originatorSocketId: req.body.socketId
  };
  io.to(projectId).emit('boardUpdated', payload);
  const populatedProject = await project.populate('members', ['name', 'avatar', 'email']);
  await createNotification(io, userToInvite._id, `${inviter.name} added you to ${project.name}`, projectId, `/project/${projectId}`);
  res.json(populatedProject);
};
const removeProjectMember = async (req, res) => {
  const {
    io
  } = req;
  const {
    projectId,
    userId
  } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      msg: "Project not found"
    });
  }
  if (project.owner.toString() !== req.user.id) {
    return res.status(403).json({
      msg: "Only the owner can remove members"
    });
  }
  if (project.owner.toString() === userId) {
    return res.status(400).json({
      msg: "Project owner cannot be removed"
    });
  }
  const isMember = project.members.some(memberId => memberId.toString() === userId);
  if (!isMember) {
    return res.status(404).json({
      msg: "Member not found in project"
    });
  }
  project.members = project.members.filter(memberId => memberId.toString() !== userId);
  await project.save();
  const board = await Board.findOne({
    project: projectId
  }).populate("columns");
  const columnIds = board.columns.map(column => column._id);
  await Card.updateMany({
    column: {
      $in: columnIds
    }
  }, {
    $pull: {
      assignedTo: userId
    }
  });
  const remover = await User.findById(req.user.id);
  const removedUser = await User.findById(userId);
  await createActivityLog(projectId, req.user.id, `${remover.name} removed ${removedUser.name} from the project.`);
  await createNotification(io, userId, `${remover.name} removed you from ${project.name}`, projectId, "/dashboard");
  const updatedBoard = await getPopulatedBoard(projectId);
  io?.to(projectId).emit("boardUpdated", {
    board: updatedBoard
  });
  res.json(updatedBoard.project);
};

const updateMemberRole = async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ msg: "Project not found" });
  
  const isOwner = project.owner.toString() === req.user.id;
  const isCallerAdmin = project.roles.get(req.user.id) === "admin";
  
  if (!isOwner && !isCallerAdmin) {
    return res.status(403).json({ msg: "Only admins can manage roles" });
  }
  
  if (project.owner.toString() === userId) {
    return res.status(400).json({ msg: "Cannot change the owner's role" });
  }
  
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ msg: "Invalid role" });
  }

  if (!project.members.some(id => id.toString() === userId)) {
    return res.status(404).json({ msg: "Member not found" });
  }

  project.roles.set(userId, role);
  await project.save();
  
  const updatedBoard = await getPopulatedBoard(projectId);
  req.io?.to(projectId).emit("boardUpdated", { board: updatedBoard });
  res.json(updatedBoard.project);
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  getProjectAnalytics,
  updateProject,
  deleteProject,
  inviteUserToProject,
  removeProjectMember,
  updateMemberRole
};