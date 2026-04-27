require("dotenv").config();

const connectDB = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const boardRoutes = require("./routes/boards");
const columnRoutes = require("./routes/columns");
const cardRoutes = require("./routes/cards");
const jwt = require("jsonwebtoken");

const app = express();

if (process.env.NODE_ENV !== "test") {
  connectDB();
}

app.use(cors());

app.use(express.json());

const httpServer = http.createServer(app);

let io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Attach io to every request so route handlers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/boards", boardRoutes);

app.use("/api/columns", columnRoutes);

app.use("/api/cards", cardRoutes);

app.use("/api/notifications", require("./routes/notifications"));

app.use("/api/activities", require("./routes/activities"));

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", message: "Server is healthy." });
});

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  try {
    const token = socket.handshake.auth.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user.id;
      socket.join(userId);
      console.log(
        `User ${userId} with socket ${socket.id} joined their private room.`,
      );
    }
  } catch (err) {
    console.log("Socket connection not authenticated.");
  }

  socket.on("joinProject", (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} successfully joined room: ${projectId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () =>
    console.log(`Server with real-time support started on port ${PORT}`),
  );
}

module.exports = app;