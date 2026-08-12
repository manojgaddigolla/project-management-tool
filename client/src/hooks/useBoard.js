import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  createColumn,
  deleteColumn,
  getBoardByProjectId,
  updateColumn,
  updateProject,
  moveColumn,
  updateProjectMemberRole,
} from "../services/projectService";
import { createCard, moveCard } from "../services/cardService";
import { API_ORIGIN } from "../services/config";
import useAuthStore from "../store/authStore";

export const useBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  const fetchBoardData = useCallback(async () => {
    try {
      const data = await getBoardByProjectId(projectId);
      setBoardData(data);
      setError(null);
    } catch (err) {
      setError(err?.msg || "Failed to fetch board data.");
      console.error(err);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
      await Promise.resolve();
      if (cancelled) return;

      try {
        setLoading(true);
        const data = await getBoardByProjectId(projectId);
        if (cancelled) return;
        setBoardData(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err?.msg || "Failed to fetch board data.");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBoard();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const socket = io(API_ORIGIN, {
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketId(socket.id);
    });

    socket.emit("joinProject", projectId);

    socket.on("boardUpdated", ({ board }) => {
      setBoardData(board);
    });

    socket.on("projectDeleted", () => {
      navigate("/dashboard", { replace: true });
    });

    return () => {
      socket.off("boardUpdated");
      socket.off("projectDeleted");
      socket.off("connect");
      socket.disconnect();
    };
  }, [navigate, projectId]);

  const handleCreateCard = async (columnId, cardData) => {
    await createCard({
      ...cardData,
      columnId,
      socketId: socketRef.current?.id,
    });
    await fetchBoardData();
  };

  const handleCreateColumn = async (title) => {
    if (!boardData?._id) return;

    await createColumn({
      title,
      boardId: boardData._id,
      socketId: socketRef.current?.id,
    });
    await fetchBoardData();
  };

  const handleUpdateColumn = async (columnId, title) => {
    await updateColumn(columnId, {
      title,
      socketId: socketRef.current?.id,
    });
    await fetchBoardData();
  };

  const handleDeleteColumn = async (columnId) => {
    await deleteColumn(columnId);
    await fetchBoardData();
  };

  const handleUpdateProject = async (projectData) => {
    await updateProject(projectId, {
      ...projectData,
      socketId: socketRef.current?.id,
    });
    await fetchBoardData();
  };

  const handleUpdateRole = async (userId, role) => {
    await updateProjectMemberRole(projectId, userId, role);
    await fetchBoardData();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!boardData || !over || active.id === over.id) return;

    const isColumnDrag = active.data.current?.type === "column";

    if (isColumnDrag) {
      const activeColumnId = active.id;
      const overColumnId = over.id;

      const sourceIndex = boardData.columns.findIndex(c => c._id === activeColumnId);
      const destIndex = boardData.columns.findIndex(c => c._id === overColumnId);

      if (sourceIndex === -1 || destIndex === -1 || sourceIndex === destIndex) return;

      // Optimistic update for columns
      const newBoardData = JSON.parse(JSON.stringify(boardData));
      const [movedColumn] = newBoardData.columns.splice(sourceIndex, 1);
      newBoardData.columns.splice(destIndex, 0, movedColumn);
      setBoardData(newBoardData);

      try {
        await moveColumn(projectId, {
          columnId: activeColumnId,
          sourceIndex,
          destinationIndex: destIndex,
          socketId: socketRef.current?.id,
        });
      } catch (err) {
        console.error("Failed to move column:", err);
        await fetchBoardData();
      }
      return;
    }

    // Card drag logic
    const activeCardId = active.id;
    const sourceColumnId = active.data.current?.columnId;

    // Determine destination column and index from the over target
    const overType = over.data.current?.type;
    const destColumnId =
      overType === "card" ? over.data.current.columnId : over.id;

    const sourceColumn = boardData.columns.find((c) => c._id === sourceColumnId);
    const destColumn = boardData.columns.find((c) => c._id === destColumnId);

    if (!sourceColumn || !destColumn) return;

    const sourceIndex = sourceColumn.cards.findIndex(
      (c) => c._id === activeCardId,
    );

    let destIndex;
    if (overType === "card") {
      destIndex = destColumn.cards.findIndex((c) => c._id === over.id);
      if (destIndex === -1) destIndex = destColumn.cards.length;
    } else {
      // Dropped on column droppable area (e.g. empty column)
      destIndex = destColumn.cards.length;
    }

    // Optimistic update
    const newBoardData = JSON.parse(JSON.stringify(boardData));
    const srcCol = newBoardData.columns.find((c) => c._id === sourceColumnId);
    const dstCol = newBoardData.columns.find((c) => c._id === destColumnId);
    const [movedCard] = srcCol.cards.splice(sourceIndex, 1);
    dstCol.cards.splice(destIndex, 0, movedCard);
    if (movedCard) {
      movedCard.column = destColumnId;
    }
    setBoardData(newBoardData);

    try {
      await moveCard(activeCardId, {
        sourceColumnId,
        destinationColumnId: destColumnId,
        sourceIndex,
        destinationIndex: destIndex,
        socketId: socketRef.current?.id,
      });
    } catch (err) {
      console.error("Failed to move card:", err);
      await fetchBoardData();
    }
  };

  const isOwner =
    boardData?.project?.owner?._id?.toString() === user?._id?.toString();
    
  let projectRole = "editor"; // fallback
  if (isOwner) {
    projectRole = "admin";
  } else if (boardData?.project?.roles && user?._id) {
    projectRole = boardData.project.roles[user._id] || "editor";
  }

  return {
    boardData,
    loading,
    error,
    handleDragEnd,
    handleCreateCard,
    handleCreateColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleUpdateProject,
    handleUpdateRole,
    refreshBoard: fetchBoardData,
    socketId,
    projectId,
    projectMembers: boardData?.project?.members,
    isOwner,
    projectRole,
  };
};
