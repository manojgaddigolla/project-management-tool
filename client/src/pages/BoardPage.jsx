import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { getBoardByProjectId } from "../services/projectService";
import { DragDropContext } from "react-beautiful-dnd";
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

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.emit("joinProject", projectId);

    socket.on("boardUpdated", (updatedBoard) => {
      console.log("Board update received from server:", updatedBoard);
      setBoardData(updatedBoard);
    });

    return () => {
      socket.off('boardUpdated');
      console.log("Disconnecting socket...");
      socket.disconnect();
    };
  }, [projectId]);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = boardData.columns.find(
      (col) => col._id === source.droppableId,
    );

    if (startColumn && destination.droppableId === source.droppableId) {
      const newCards = Array.from(startColumn.cards);

      const [reorderedCard] = newCards.splice(source.index, 1);

      newCards.splice(destination.index, 0, reorderedCard);

      const newColumn = {
        ...startColumn,
        cards: newCards,
      };

      const newBoardData = {
        ...boardData,
        columns: boardData.columns.map((col) =>
          col._id === newColumn._id ? newColumn : col,
        ),
      };

      setBoardData(newBoardData);
      return;
    }

    const finishColumn = boardData.columns.find(
      (col) => col._id === destination.droppableId,
    );

    if (startColumn && finishColumn) {
      const startCards = Array.from(startColumn.cards);
      const finishCards = Array.from(finishColumn.cards);

      const [movedCard] = startCards.splice(source.index, 1);

      finishCards.splice(destination.index, 0, movedCard);

      const newStartColumn = {
        ...startColumn,
        cards: startCards,
      };

      const newFinishColumn = {
        ...finishColumn,
        cards: finishCards,
      };

      const newBoardData = {
        ...boardData,
        columns: boardData.columns.map((col) => {
          if (col._id === newStartColumn._id) {
            return newStartColumn;
          }
          if (col._id === newFinishColumn._id) {
            return newFinishColumn;
          }
          return col;
        }),
      };

      setBoardData(newBoardData);
    }
  };

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
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="board-page-container">
        <h2 className="board-page-title">{boardData.project.name}</h2>

        <div className="board-canvas">
          {boardData.columns.map((column) => (
            <Column key={column._id} column={column} />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default BoardPage;
