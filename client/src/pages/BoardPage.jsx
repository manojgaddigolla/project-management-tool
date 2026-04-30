import React, { useMemo, useState } from "react";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { toast } from "react-toastify";
import { inviteUserToProject } from "../services/projectService";
import { useBoard } from "../hooks/useBoard";
import Column from "../components/kanban/Column";
import CardModal from "../components/kanban/CardModal";
import ActivityFeed from "../components/kanban/ActivityFeed";
import BoardSkeleton from "../components/kanban/BoardSkeleton";
import "./BoardPage.css";

const BoardPage = () => {
  const {
    boardData,
    loading,
    error,
    handleDragEnd,
    handleCreateCard,
    handleCreateColumn,
    refreshBoard,
    socketId,
    projectId,
    projectMembers,
    isOwner,
  } = useBoard();

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isActivityFeedVisible, setActivityFeedVisible] = useState(false);

  const boardStats = useMemo(() => {
    const columns = boardData?.columns || [];
    const cards = columns.flatMap((column) => column.cards || []);
    const completedCards =
      columns
        .find((column) => column.title.toLowerCase().includes("done"))
        ?.cards?.length || 0;
    const overdueCards = cards.filter((card) => {
      if (!card.dueDate) return false;
      return (
        new Date(card.dueDate) < new Date() &&
        !columns
          .find((column) => column.cards?.some((item) => item._id === card._id))
          ?.title.toLowerCase()
          .includes("done")
      );
    }).length;

    return {
      totalCards: cards.length,
      completedCards,
      overdueCards,
      members: boardData?.project?.members?.length || 0,
    };
  }, [boardData]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId || !boardData?.columns) {
      return null;
    }

    return (
      boardData.columns
        .flatMap((column) => column.cards)
        .find((card) => card._id === selectedCardId) || null
    );
  }, [boardData, selectedCardId]);

  const handleOpenModal = (card) => {
    setSelectedCardId(card._id);
  };

  const handleCloseModal = () => {
    setSelectedCardId(null);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.warn("Please enter a valid email.");
      return;
    }
    try {
      await inviteUserToProject(projectId, {
        email: inviteEmail,
        socketId: socketId,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      console.error("Invite failed:", err);
      toast.error("Failed to send invitation.");
    }
  };

  const handleAddColumn = async (event) => {
    event.preventDefault();

    if (!newColumnTitle.trim()) {
      return;
    }

    try {
      setIsAddingColumn(true);
      await handleCreateColumn(newColumnTitle.trim());
      setNewColumnTitle("");
      toast.success("Column added");
    } catch (err) {
      console.error("Column creation failed:", err);
      toast.error(err.msg || "Failed to add column.");
    } finally {
      setIsAddingColumn(false);
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
        <div>
          <p className="board-eyebrow">Workspace</p>
          <h1 className="board-title">{boardData.project?.name}</h1>
          {boardData.project?.description && (
            <p className="board-description">{boardData.project.description}</p>
          )}
        </div>
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

      <div className="board-metrics" aria-label="Board summary">
        <div className="board-metric">
          <span>{boardStats.totalCards}</span>
          <p>Total tasks</p>
        </div>
        <div className="board-metric">
          <span>{boardStats.completedCards}</span>
          <p>Completed</p>
        </div>
        <div className="board-metric">
          <span>{boardStats.overdueCards}</span>
          <p>Overdue</p>
        </div>
        <div className="board-metric">
          <span>{boardStats.members}</span>
          <p>Members</p>
        </div>
      </div>

      <form className="add-column-form" onSubmit={handleAddColumn}>
        <input
          type="text"
          value={newColumnTitle}
          onChange={(event) => setNewColumnTitle(event.target.value)}
          placeholder="Add a workflow column"
          disabled={isAddingColumn}
        />
        <button
          type="submit"
          disabled={!newColumnTitle.trim() || isAddingColumn}
        >
          {isAddingColumn ? "Adding..." : "Add Column"}
        </button>
      </form>

      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <div className="board-columns-container">
          {boardData.columns.map((column) => (
            <Column
              key={column._id}
              column={column}
              onCardClick={handleOpenModal}
              onCreateCard={handleCreateCard}
            />
          ))}
        </div>
      </DndContext>

      <CardModal
        show={selectedCardId !== null}
        onClose={handleCloseModal}
        card={selectedCard}
        socketId={socketId}
        projectMembers={projectMembers}
        onChanged={refreshBoard}
        onDeleted={handleCloseModal}
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
