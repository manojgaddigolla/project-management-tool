import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { getBoardByProjectId } from "../services/projectService";
import { moveCard } from "../services/cardService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const useBoard = () => {
  const { projectId } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBoardByProjectId(projectId);
      setBoardData(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch board data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  useEffect(() => {
    socketRef.current = io(API_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current.emit("joinProject", projectId);

    socketRef.current.on("boardUpdated", ({ board, originatorSocketId }) => {
      if (socketRef.current.id !== originatorSocketId) {
        setBoardData(board);
      }
    });

    return () => {
      socketRef.current.off("boardUpdated");
      socketRef.current.disconnect();
    };
  }, [projectId]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    const newBoardData = { ...boardData };
    const sourceColumn = newBoardData.columns.find(
      (c) => c._id === source.droppableId,
    );
    const destColumn = newBoardData.columns.find(
      (c) => c._id === destination.droppableId,
    );
    const [movedCard] = sourceColumn.cards.splice(source.index, 1);
    destColumn.cards.splice(destination.index, 0, movedCard);
    setBoardData(newBoardData);

    try {
      await moveCard(draggableId, {
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        fromIndex: source.index,
        toIndex: destination.index,
        socketId: socketRef.current.id,
      });
    } catch (err) {
      console.error("Failed to move card:", err);
      fetchBoardData();
    }
  };

  return {
    boardData,
    loading,
    error,
    handleDragEnd,
    socketId: socketRef.current?.id,
    projectMembers: boardData?.project?.members,
    isOwner:
      boardData?.project?.owner ===
      JSON.parse(atob(localStorage.getItem("token").split(".")[1])).user.id, 
  };
};
