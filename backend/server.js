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

const app = express();
connectDB();

app.use(cors());

app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/boards", boardRoutes);

app.use("/api/columns", columnRoutes);

app.use("/api/cards", cardRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", message: "Server is healthy." });
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

 app.use((req, res, next) => {
   req.io = io;
   next(); 
 });

io.on("connection", (socket) => {
  console.log(`✅ New client connected: ${socket.id}`);

  socket.on("joinProject", (projectId) => {
    socket.join(projectId);

    console.log(`Socket ${socket.id} successfully joined room: ${projectId}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () =>
  console.log(`Server with real-time support started on port ${PORT}`),
);
