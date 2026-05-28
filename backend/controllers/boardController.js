const Board = require("../models/Board");
const Project = require("../models/Project");

const getBoardByProjectId = async (req, res) => {
  const { projectId } = req.params;

  const board = await Board.findOne({ project: projectId })
    .populate({
      path: "columns",
      populate: {
        path: "cards",
        model: "Card",
        populate: [
          { path: "assignedTo", select: "name avatar" },
          { path: "comments.user", select: "name avatar" },
        ],
      },
    })
    .populate({
      path: "project",
      populate: { path: "owner members", select: "name avatar email" },
    });

  if (!board) {
    return res.status(404).json({ msg: "Board not found for this project" });
  }

  res.json(board);
};

module.exports = {
  getBoardByProjectId,
};
