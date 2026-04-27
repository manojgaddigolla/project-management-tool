import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  getBoardByProjectId,
  inviteUserToProject,
} from "../services/projectService";
import { moveCard } from "../services/cardService";
import { DragDropContext } from "react-beautiful-dnd";
import "./BoardPage.css";
import Column from "../components/kanban/Column";
import CardModal from "../components/kanban/CardModal";
import { useAuth } from "../context/AuthContext";
import ActivityFeed from "../components/kanban/ActivityFeed";
import BoardSkeleton from "../components/kanban/BoardSkeleton";

const BoardPage = () => {
  const { projectId } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const { user: authUser } = useAuth();
  const [isActivityFeedVisible, setActivityFeedVisible] = useState(false);

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
    socketRef.current = io("http://localhost:5000", {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    socketRef.current.emit("joinProject", projectId);

    socketRef.current.on("boardUpdated", (payload) => {
      const { board, originatorSocketId } = payload;

      if (originatorSocketId === socketRef.current.id) {
        return;
      }

      console.log(
        "Received a valid board update from another user. Updating state.",
      );
      setBoardData(board);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("boardUpdated");
        console.log("Disconnecting socket...");
        socketRef.current.disconnect();
      }
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

      (async () => {
        try {
          const socketId = socketRef.current ? socketRef.current.id : null;
          await moveCard(draggableId, {
            fromColumnId: source.droppableId,
            toColumnId: destination.droppableId,
            fromIndex: source.index,
            toIndex: destination.index,
            socketId: socketId,
          });
        } catch (err) {
          console.error("Failed to move card on the server:", err);
        }
      })();
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

  const handleOpenModal = (card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const isOwner = boardData?.project?.owner === authUser?._id;

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.warn("Please enter a valid email.");
      return;
    }
    try {
      await inviteUserToProject(projectId, {
        email: inviteEmail,
        socketId: socketRef.current?.id,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      console.error('Invite failed:', err);
    }
  };

  if (loading) {
    return <BoardSkeleton />;
  }

  if (error) {
    return <div className="board-error">Error: {error}</div>;
  }

  if (!boardData) {
    return <div>Project board not found.</div>;
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <h1 className="board-title">{boardData.project?.name} Board</h1>
        <div className="board-actions">
          {isOwner && (
            <form onSubmit={handleInviteSubmit} className="invite-form">
              <input
                type="email"
                className="invite-input"
                placeholder="Invite user by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <button type="submit" className="invite-button">
                Invite
              </button>
            </form>
          )}

          <button
            className="board-action-button"
            onClick={() => setActivityFeedVisible(true)}
          >
            <i className="fas fa-history"></i> Activity
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns-container">
          {boardData.columns.map((column) => (
            <Column
              key={column._id}
              column={column}
              onCardClick={handleOpenModal}
            />
          ))}
        </div>
      </DragDropContext>

      <CardModal
        show={selectedCard !== null}
        onClose={handleCloseModal}
        card={selectedCard}
        socketId={socketRef.current?.id}
        projectMembers={boardData?.project?.members}
      />

      <ActivityFeed
        projectId={projectId}
        isVisible={isActivityFeedVisible}
        onClose={() => setActivityFeedVisible(false)}
      />
    </div>
  );
};

export default BoardPage;
