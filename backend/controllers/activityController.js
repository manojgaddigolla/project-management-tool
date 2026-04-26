const Activity = require("../models/Activity");
const Project = require("../models/Project");

exports.getActivitiesForProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user.id,
    );
    const isOwner = project.owner.toString() === req.user.id;

    if (!isMember && !isOwner) {
      return res
        .status(401)
        .json({ msg: "User not authorized to view this project" });
    }

    const activities = await Activity.find({ project: projectId })
      .sort({ createdAt: -1 })
      .populate("user", ["name", "avatar"]);

    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
