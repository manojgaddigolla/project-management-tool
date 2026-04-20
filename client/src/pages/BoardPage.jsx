import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getBoardByProjectId } from "../services/projectService";
import "./BoardPage.css";
import Column from "../components/kanban/Column";

const BoardPage = () => {
  const { projectId } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getBoardByProjectId(projectId);
        setBoardData(data);
      } catch (err) {
        console.error("Failed to fetch board data:", err);
        setError(
          err.msg || "Failed to load the project board. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [projectId]);

  if (loading) {
    return <div className="board-loading">Loading Board...</div>;
  }

  if (error) {
    return <div className="board-error">Error: {error}</div>;
  }

  if (!boardData) {
    return <div>Project board not found.</div>;
  }

  return (
    <div className="board-page-container">
      <h2 className="board-page-title">{boardData.project.name}</h2>

      <div className="board-canvas">
        {boardData.columns.map((column) => (
          <Column key={column._id} column={column} />
        ))}
      </div>
    </div>
  );
};

export default BoardPage;
