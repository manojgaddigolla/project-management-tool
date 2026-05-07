require("dotenv").config();

const connectDB = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const boardRoutes = require("./routes/boards");
const columnRoutes = require("./routes/columns");
const cardRoutes = require("./routes/cards");
const Project = require("./models/Project");
const { securityHeaders, sanitizeRequest } = require("./middleware/security");
const jwt = require("jsonwebtoken");

const app = express();

if (process.env.NODE_ENV !== "test") {
  connectDB();
}

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(sanitizeRequest);

// General API rate limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many requests, please try again later." },
});

// Stricter limiter for auth endpoints to mitigate brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many authentication attempts, please try again later." },
});

const httpServer = http.createServer(app);

let io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

// Attach io to every request so route handlers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/users", authLimiter, userRoutes);

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/projects", apiLimiter, projectRoutes);

app.use("/api/boards", apiLimiter, boardRoutes);

app.use("/api/columns", apiLimiter, columnRoutes);

app.use("/api/cards", apiLimiter, cardRoutes);

app.use("/api/notifications", apiLimiter, require("./routes/notifications"));

app.use("/api/activities", apiLimiter, require("./routes/activities"));

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
      socket.userId = userId;
      socket.join(userId);
      console.log(
        `User ${userId} with socket ${socket.id} joined their private room.`,
      );
    }
  } catch (err) {
    console.log("Socket connection not authenticated.");
  }

  socket.on("joinProject", async (projectId) => {
    try {
      if (!mongoose.isValidObjectId(projectId) || !socket.userId) {
        return;
      }

      const project = await Project.findOne({
        _id: projectId,
        members: socket.userId,
      });

      if (!project) {
        return;
      }

      socket.join(projectId);
      console.log(`Socket ${socket.id} successfully joined room: ${projectId}`);
    } catch (err) {
      console.log("Socket failed to join project room.");
    }
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
