const Project = require("../models/Project");

const checkProjectMember = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id || req.params.projectId;

    if (!projectId) {
      return res
        .status(400)
        .json({ msg: "Project ID is missing from request parameters" });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isMember = project.members.some(
      (member) => member.toString() === userId,
    );

    if (!isMember) {
      return res.status(404).json({ msg: "Project not found" });
    }

    req.project = project;

    next();
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }
    console.error("Error in project membership check middleware:", err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = { checkProjectMember };
