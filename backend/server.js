require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const boardRoutes = require("./routes/boards");
const columnRoutes = require("./routes/columns");
const cardRoutes = require("./routes/cards");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/boards", boardRoutes);

app.use("/api/columns",columnRoutes)

app.use("/api/cards", cardRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", message: "Server is healthy." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
