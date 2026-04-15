const { validationResult } = require("express-validator");
const Project = require("../models/Project");

const createProject = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  try {
    const newProject = new Project({
      name,
      description,
      owner: req.user.id,
    });

    const project = await newProject.save();

    res.status(201).json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  createProject,
};
