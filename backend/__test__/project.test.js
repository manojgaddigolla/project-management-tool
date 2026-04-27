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
