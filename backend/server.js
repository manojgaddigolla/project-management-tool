require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const projectRoutes = require("./routes/projects");
app.use("/api/projects", projectRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", message: "Server is healthy." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
