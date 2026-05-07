const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const User = require("../models/User");
const Project = require("../models/Project");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Card = require("../models/Card");
const app = require("../server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe("POST /api/projects - Project Creation", () => {
  it("should return 401 Unauthorized if no token is provided", async () => {
    const response = await request(app).post("/api/projects").send({
      name: "My Test Project",
      description: "A project created during testing.",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should create a new project if a valid token is provided", async () => {
    const user = await new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    }).save();

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    const token = loginRes.body.token;

    const projectData = {
      name: "My Authorized Project",
      description: "This should succeed.",
    };

    const response = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send(projectData);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.name).toBe(projectData.name);

    const savedProject = await Project.findById(response.body._id);
    expect(savedProject).not.toBeNull();
    expect(savedProject.owner.toString()).toBe(user._id.toString());
  });
});

describe("PUT /api/cards/move/:id - Card Movement", () => {
  let token, userId, fromColumn, toColumn, cardToMove;

  beforeEach(async () => {
    const user = await new User({
      name: "Card Mover",
      email: "mover@test.com",
      password: "password",
    }).save();
    userId = user._id;
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "mover@test.com", password: "password" });
    token = loginRes.body.token;

    const project = await new Project({
      name: "Move Test Project",
      owner: userId,
      members: [userId],
    }).save();
    const board = await new Board({ project: project._id }).save();
    fromColumn = await new Column({
      title: "To Do",
      board: board._id,
      cards: [],
    }).save();
    toColumn = await new Column({
      title: "In Progress",
      board: board._id,
      cards: [],
    }).save();
    board.columns.push(fromColumn._id, toColumn._id);
    await board.save();

    cardToMove = await new Card({
      title: "Test Card",
      column: fromColumn._id,
    }).save();
    fromColumn.cards.push(cardToMove._id);
    await fromColumn.save();
  });

  it("should move a card from one column to another and update db state", async () => {
    const movePayload = {
      sourceColumnId: fromColumn._id,
      destinationColumnId: toColumn._id,
      sourceIndex: 0,
      destinationIndex: 0,
    };

    const response = await request(app)
      .put(`/api/cards/move/${cardToMove._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(movePayload);

    expect(response.statusCode).toBe(200);

    const updatedFromColumn = await Column.findById(fromColumn._id);
    const updatedToColumn = await Column.findById(toColumn._id);
    const updatedCard = await Card.findById(cardToMove._id);

    expect(updatedFromColumn.cards).toHaveLength(0);

    expect(updatedToColumn.cards).toHaveLength(1);
    expect(updatedToColumn.cards[0].toString()).toBe(cardToMove._id.toString());

    expect(updatedCard.column.toString()).toBe(toColumn._id.toString());
  });
});

describe("Assignments and project analytics", () => {
  let token, owner, teammate, outsider, project, todoColumn, doneColumn;

  beforeEach(async () => {
    owner = await new User({
      name: "Analytics Owner",
      email: "owner@test.com",
      password: "password",
    }).save();
    teammate = await new User({
      name: "Delivery Teammate",
      email: "teammate@test.com",
      password: "password",
    }).save();
    outsider = await new User({
      name: "Outside User",
      email: "outsider@test.com",
      password: "password",
    }).save();

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "owner@test.com", password: "password" });
    token = loginRes.body.token;

    project = await new Project({
      name: "Analytics Project",
      owner: owner._id,
      members: [owner._id, teammate._id],
    }).save();
    const board = await new Board({ project: project._id }).save();
    todoColumn = await new Column({
      title: "To Do",
      board: board._id,
      cards: [],
    }).save();
    doneColumn = await new Column({
      title: "Done",
      board: board._id,
      cards: [],
    }).save();
    board.columns.push(todoColumn._id, doneColumn._id);
    await board.save();
  });

  const addCardToColumn = async (column, cardData) => {
    const card = await new Card({
      column: column._id,
      ...cardData,
    }).save();
    column.cards.push(card._id);
    await column.save();
    return card;
  };

  it("should save unique assignees and reject non-project members", async () => {
    const card = await addCardToColumn(todoColumn, {
      title: "Assignment candidate",
    });

    const response = await request(app)
      .put(`/api/cards/${card._id}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ assignedTo: [teammate._id, teammate._id] });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignedTo).toHaveLength(1);
    expect(response.body.assignedTo[0].toString()).toBe(
      teammate._id.toString(),
    );

    const invalidResponse = await request(app)
      .put(`/api/cards/${card._id}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ assignedTo: [outsider._id] });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.body.msg).toBe("Assignees must be project members");
  });

  it("should report workload, overdue tasks and upcoming deadlines logically", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await addCardToColumn(todoColumn, {
      title: "Overdue assigned task",
      dueDate: yesterday,
      priority: "high",
      assignedTo: [teammate._id],
    });
    await addCardToColumn(todoColumn, {
      title: "Upcoming unassigned task",
      dueDate: tomorrow,
      priority: "medium",
    });
    await addCardToColumn(todoColumn, {
      title: "Upcoming assigned task",
      dueDate: nextWeek,
      priority: "urgent",
      assignedTo: [teammate._id],
    });
    await addCardToColumn(doneColumn, {
      title: "Completed old task",
      dueDate: yesterday,
      assignedTo: [owner._id],
    });

    const response = await request(app)
      .get(`/api/projects/${project._id}/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.summary.totalTasks).toBe(4);
    expect(response.body.summary.completedTasks).toBe(1);
    expect(response.body.summary.overdueTasks).toBe(1);
    expect(response.body.overdueTaskList.map((task) => task.title)).toEqual([
      "Overdue assigned task",
    ]);
    expect(response.body.dueSoonTasks.map((task) => task.title)).toEqual([
      "Upcoming unassigned task",
      "Upcoming assigned task",
    ]);

    const teammateLoad = response.body.memberLoad.find(
      (member) => member.userId === teammate._id.toString(),
    );
    const ownerLoad = response.body.memberLoad.find(
      (member) => member.userId === owner._id.toString(),
    );
    const unassignedLoad = response.body.memberLoad.find(
      (member) => member.userId === "unassigned",
    );

    expect(teammateLoad.openTasks).toBe(2);
    expect(teammateLoad.overdueTasks).toBe(1);
    expect(ownerLoad.completedTasks).toBe(1);
    expect(unassignedLoad.openTasks).toBe(1);
  });
});
