const Board = require("../models/Board");
const Project = require("../models/Project");
const { getPopulatedBoard } = require("../utils/boardUtils");

const getBoardByProjectId = async (req, res) => {
  const { projectId } = req.params;

  const board = await getPopulatedBoard(projectId);

  if (!board) {
    return res.status(404).json({ msg: "Board not found for this project" });
  }

  res.json(board);
};

const moveColumn = async (req, res) => {
  const { projectId } = req.params;
  const { columnId, sourceIndex, destinationIndex } = req.body;

  if (sourceIndex === destinationIndex) {
    return res.json({ msg: "No movement required" });
  }

  const board = await Board.findOne({ project: projectId });

  if (!board) {
    return res.status(404).json({ msg: "Board not found for this project" });
  }

  const actualSourceIndex = board.columns.findIndex(
    (id) => id.toString() === columnId
  );

  if (actualSourceIndex === -1) {
    return res.status(400).json({ msg: "Column is missing from the board" });
  }

  if (Number(sourceIndex) !== actualSourceIndex) {
    return res.status(409).json({ msg: "Board state changed. Please refresh and try again." });
  }

  const normalizedDestinationIndex = Math.max(
    0,
    Math.min(Number(destinationIndex), board.columns.length)
  );

  const [movedColumnId] = board.columns.splice(actualSourceIndex, 1);
  board.columns.splice(normalizedDestinationIndex, 0, movedColumnId);

  await board.save();

  const updatedBoard = await getPopulatedBoard(projectId);
  res.json(updatedBoard);
};

module.exports = {
  getBoardByProjectId,
  moveColumn,
};
