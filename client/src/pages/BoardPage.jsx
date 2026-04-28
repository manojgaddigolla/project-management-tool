import React, { useState } from "react";
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
    socketId,
    projectId,
    projectMembers,
    isOwner,
  } = useBoard();

  const [selectedCard, setSelectedCard] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isActivityFeedVisible, setActivityFeedVisible] = useState(false);

  const handleOpenModal = (card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
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

      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <div className="board-columns-container">
          {boardData.columns.map((column) => (
            <Column
              key={column._id}
              column={column}
              onCardClick={handleOpenModal}
            />
          ))}
        </div>
      </DndContext>

      <CardModal
        show={selectedCard !== null}
        onClose={handleCloseModal}
        card={selectedCard}
        socketId={socketId}
        projectMembers={projectMembers}
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
