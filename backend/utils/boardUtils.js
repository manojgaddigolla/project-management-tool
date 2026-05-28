const Board = require("../models/Board");

const getPopulatedBoard = (projectId) => {
  return Board.findOne({ project: projectId })
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
};

module.exports = { getPopulatedBoard };
