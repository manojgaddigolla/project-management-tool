import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "react-toastify";
import { inviteUserToProject } from "../services/projectService";
import { useBoard } from "../hooks/useBoard";
import Column from "../components/kanban/Column";
import { CardPreview } from "../components/kanban/Card";
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
  const [activeCardId, setActiveCardId] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    priority: "all",
    overdueOnly: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

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

  const activeCard = useMemo(() => {
    if (!activeCardId || !boardData?.columns) return null;

    return (
      boardData.columns
        .flatMap((column) => column.cards)
        .find((card) => card._id === activeCardId) || null
    );
  }, [activeCardId, boardData]);

  const isFiltering =
    filters.query.trim() ||
    filters.priority !== "all" ||
    filters.overdueOnly;

  const visibleColumns = useMemo(() => {
    if (!boardData?.columns) return [];

    const query = filters.query.trim().toLowerCase();
    const doneColumnIds = boardData.columns
      .filter((column) => column.title.toLowerCase().includes("done"))
      .map((column) => column._id);

    return boardData.columns.map((column) => {
      const cards = column.cards.filter((card) => {
        const matchesQuery =
          !query ||
          [card.title, card.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query));
        const matchesPriority =
          filters.priority === "all" || card.priority === filters.priority;
        const isOverdue =
          card.dueDate &&
          new Date(card.dueDate) < new Date() &&
          !doneColumnIds.includes(column._id);

        return (
          matchesQuery &&
          matchesPriority &&
          (!filters.overdueOnly || isOverdue)
        );
      });

      return { ...column, cards };
    });
  }, [boardData, filters]);

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

  const handleCopySummary = async () => {
    const lines = [
      `${boardData.project?.name} project summary`,
      `Total tasks: ${boardStats.totalCards}`,
      `Completed: ${boardStats.completedCards}`,
      `Overdue: ${boardStats.overdueCards}`,
      "",
      ...boardData.columns.map(
        (column) => `${column.title}: ${column.cards.length} task(s)`,
      ),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Project summary copied");
    } catch {
      toast.error("Could not copy summary.");
    }
  };

  const handleFilterChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const clearFilters = () => {
    setFilters({ query: "", priority: "all", overdueOnly: false });
  };

  const handleDragStart = ({ active }) => {
    setActiveCardId(active.id);
  };

  const handleBoardDragEnd = async (event) => {
    await handleDragEnd(event);
    setActiveCardId(null);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
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
            Activity
          </button>
          <button className="board-action-button" onClick={handleCopySummary}>
            Copy Summary
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

      <div className="board-toolbar">
        <input
          type="search"
          name="query"
          value={filters.query}
          onChange={handleFilterChange}
          placeholder="Search tasks"
        />
        <select
          name="priority"
          value={filters.priority}
          onChange={handleFilterChange}
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="overdue-toggle">
          <input
            type="checkbox"
            name="overdueOnly"
            checked={filters.overdueOnly}
            onChange={handleFilterChange}
          />
          Overdue only
        </label>
        {isFiltering && (
          <button type="button" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {isFiltering && (
        <p className="filter-hint">
          Drag-and-drop is paused while filters are active to protect task
          ordering.
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleBoardDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={closestCorners}
      >
        <div className="board-columns-container">
          {visibleColumns.map((column) => (
            <Column
              key={column._id}
              column={column}
              onCardClick={handleOpenModal}
              onCreateCard={handleCreateCard}
              dragDisabled={Boolean(isFiltering)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="drag-overlay-card">
              <CardPreview card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
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
