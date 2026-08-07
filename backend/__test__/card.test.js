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

const setupTestEnvironment = async () => {
  const owner = await new User({
    name: "Owner",
    email: "owner@test.com",
    clerkId: "mock_clerk_owner",
  }).save();
  
  const member = await new User({
    name: "Member",
    email: "member@test.com",
    clerkId: "mock_clerk_member",
  }).save();

  const outsider = await new User({
    name: "Outsider",
    email: "outsider@test.com",
    clerkId: "mock_clerk_outsider",
  }).save();

  const ownerToken = "mock_clerk_owner";
  const memberToken = "mock_clerk_member";
  const outsiderToken = "mock_clerk_outsider";

  const project = await new Project({
    name: "Test Project",
    owner: owner._id,
    members: [owner._id, member._id],
  }).save();

  const board = await new Board({ project: project._id }).save();
  
  const column1 = await new Column({
    title: "To Do",
    board: board._id,
    cards: [],
  }).save();
  
  const column2 = await new Column({
    title: "In Progress",
    board: board._id,
    cards: [],
  }).save();

  board.columns.push(column1._id, column2._id);
  await board.save();

  return { owner, member, outsider, ownerToken, memberToken, outsiderToken, project, board, column1, column2 };
};

describe("Card Controller - moveCard", () => {
  it("should return 409 Conflict if sourceIndex does not match the actual index (State mismatch)", async () => {
    const env = await setupTestEnvironment();
    
    const card = await new Card({ title: "Card 1", column: env.column1._id }).save();
    env.column1.cards.push(card._id);
    await env.column1.save();

    const movePayload = {
      sourceColumnId: env.column1._id.toString(),
      destinationColumnId: env.column2._id.toString(),
      sourceIndex: 1, // Wrong index, actual is 0
      destinationIndex: 0
    };

    const response = await request(app)
      .put(`/api/cards/move/${card._id}`)
      .set("Authorization", `Bearer ${env.ownerToken}`)
      .send(movePayload);

    expect(response.statusCode).toBe(409);
    expect(response.body.msg).toBe("Board state changed. Please refresh and try again.");
  });

  it("should successfully move a card within the same column and adjust indices correctly", async () => {
    const env = await setupTestEnvironment();
    
    const card1 = await new Card({ title: "Card 1", column: env.column1._id }).save();
    const card2 = await new Card({ title: "Card 2", column: env.column1._id }).save();
    
    env.column1.cards.push(card1._id, card2._id);
    await env.column1.save();

    const movePayload = {
      sourceColumnId: env.column1._id.toString(),
      destinationColumnId: env.column1._id.toString(),
      sourceIndex: 0, // Card 1 original index
      destinationIndex: 1 // Move below Card 2
    };

    const response = await request(app)
      .put(`/api/cards/move/${card1._id}`)
      .set("Authorization", `Bearer ${env.ownerToken}`)
      .send(movePayload);

    expect(response.statusCode).toBe(200);

    const updatedColumn = await Column.findById(env.column1._id);
    expect(updatedColumn.cards[0].toString()).toBe(card2._id.toString());
    expect(updatedColumn.cards[1].toString()).toBe(card1._id.toString());
  });

  it("should return 403 Forbidden if an outsider tries to move a card", async () => {
    const env = await setupTestEnvironment();
    const card = await new Card({ title: "Card", column: env.column1._id }).save();
    env.column1.cards.push(card._id);
    await env.column1.save();

    const movePayload = {
      sourceColumnId: env.column1._id.toString(),
      destinationColumnId: env.column2._id.toString(),
      sourceIndex: 0,
      destinationIndex: 0
    };

    const response = await request(app)
      .put(`/api/cards/move/${card._id}`)
      .set("Authorization", `Bearer ${env.outsiderToken}`)
      .send(movePayload);

    expect(response.statusCode).toBe(403);
    expect(response.body.msg).toBe("User is not authorized to move this card");
  });
  
  it("should validate that columns belong to the same board", async () => {
    const env = await setupTestEnvironment();
    const card = await new Card({ title: "Card", column: env.column1._id }).save();
    env.column1.cards.push(card._id);
    await env.column1.save();
    
    // Create another isolated board and column
    const project2 = await new Project({ name: "Project 2", owner: env.owner._id, members: [env.owner._id] }).save();
    const board2 = await new Board({ project: project2._id }).save();
    const externalColumn = await new Column({ title: "Ext Column", board: board2._id, cards: [] }).save();
    board2.columns.push(externalColumn._id);
    await board2.save();

    const movePayload = {
      sourceColumnId: env.column1._id.toString(),
      destinationColumnId: externalColumn._id.toString(),
      sourceIndex: 0,
      destinationIndex: 0
    };

    const response = await request(app)
      .put(`/api/cards/move/${card._id}`)
      .set("Authorization", `Bearer ${env.ownerToken}`)
      .send(movePayload);

    expect(response.statusCode).toBe(400);
    expect(response.body.msg).toBe("Columns must belong to the same board");
  });
});

describe("Card Controller - assignUser", () => {
  it("should successfully assign a project member to a card and preserve uniqueness", async () => {
    const env = await setupTestEnvironment();
    const card = await new Card({ title: "Card", column: env.column1._id }).save();
    env.column1.cards.push(card._id);
    await env.column1.save();

    const assignPayload = {
      // Intentionally sending duplicate member ID
      assignedTo: [env.member._id.toString(), env.owner._id.toString(), env.member._id.toString()]
    };

    const response = await request(app)
      .put(`/api/cards/${card._id}/assign`)
      .set("Authorization", `Bearer ${env.ownerToken}`)
      .send(assignPayload);

    expect(response.statusCode).toBe(200);
    expect(response.body.assignedTo.length).toBe(2);
  });

  it("should return 400 Bad Request when trying to assign a non-project member", async () => {
    const env = await setupTestEnvironment();
    const card = await new Card({ title: "Card", column: env.column1._id }).save();
    env.column1.cards.push(card._id);
    await env.column1.save();

    const assignPayload = {
      assignedTo: [env.outsider._id.toString()]
    };

    const response = await request(app)
      .put(`/api/cards/${card._id}/assign`)
      .set("Authorization", `Bearer ${env.ownerToken}`)
      .send(assignPayload);

    expect(response.statusCode).toBe(400);
    expect(response.body.msg).toBe("Assignees must be project members");
  });
});
