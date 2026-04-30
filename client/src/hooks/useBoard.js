import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { createColumn, getBoardByProjectId } from "../services/projectService";
import { createCard, moveCard } from "../services/cardService";
import { API_ORIGIN } from "../services/config";
import useAuthStore from "../store/authStore";

export const useBoard = () => {
  const { projectId } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBoardByProjectId(projectId);
      setBoardData(data);
      setError(null);
    } catch (err) {
      setError(err?.msg || "Failed to fetch board data.");
      console.error(err);
    } finally {
      setLoading(false);
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

    return () => {
      socket.off("boardUpdated");
      socket.off("connect");
      socket.disconnect();
    };
  }, [projectId]);

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!boardData || !over || active.id === over.id) return;

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

  return {
    boardData,
    loading,
    error,
    handleDragEnd,
    handleCreateCard,
    handleCreateColumn,
    refreshBoard: fetchBoardData,
    socketId,
    projectId,
    projectMembers: boardData?.project?.members,
    isOwner,
  };
};
