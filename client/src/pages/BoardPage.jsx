import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import {
  inviteUserToProject,
  removeProjectMember,
} from "../services/projectService";
import { useBoard } from "../hooks/useBoard";
import useAuthStore from "../store/authStore";
import { useConfirm } from "../context/useConfirm";
import Column from "../components/kanban/Column";
import { CardPreview } from "../components/kanban/Card";
import CardModal from "../components/kanban/CardModal";
import ActivityFeed from "../components/kanban/ActivityFeed";
import BoardSkeleton from "../components/kanban/BoardSkeleton";
import ProjectAnalytics from "../components/analytics/ProjectAnalytics";
import { PREDEFINED_LABELS } from "../utils/constants";
import "./BoardPage.css";

const BoardPage = () => {
  const {
    boardData,
    loading,
    error,
    handleDragEnd,
    handleCreateCard,
    handleCreateColumn,
    handleUpdateColumn,
    handleDeleteColumn,
    handleUpdateProject,
    refreshBoard,
    socketId,
    projectId,
    projectMembers,
    isOwner,
    projectRole,
    handleUpdateRole,
  } = useBoard();

  const isAdmin = projectRole === "admin";
  const isViewer = projectRole === "viewer";

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const [isActivityFeedVisible, setActivityFeedVisible] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeColumnId, setActiveColumnId] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    priority: "all",
    label: "all",
    assignee: "all",
    overdueOnly: false,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    const cardId = searchParams.get("card");
    if (cardId && !selectedCardId && !loading && boardData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCardId(cardId);
    }
  }, [searchParams, loading, boardData, selectedCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );
  const currentUser = useAuthStore((state) => state.user);
  const confirm = useConfirm();

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

  const activeColumn = useMemo(() => {
    if (!activeColumnId || !boardData?.columns) return null;
    return boardData.columns.find((col) => col._id === activeColumnId) || null;
  }, [activeColumnId, boardData]);

  const isFiltering =
    filters.query.trim() ||
    filters.priority !== "all" ||
    filters.label !== "all" ||
    filters.assignee !== "all" ||
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
        const matchesLabel =
          filters.label === "all" || (card.labels && card.labels.includes(filters.label));
        const matchesAssignee =
          filters.assignee === "all" || (card.assignedTo && card.assignedTo.some(user => user._id === filters.assignee));
        const isOverdue =
          card.dueDate &&
          new Date(card.dueDate) < new Date() &&
          !doneColumnIds.includes(column._id);

        return (
          matchesQuery &&
          matchesPriority &&
          matchesLabel &&
          matchesAssignee &&
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
    if (searchParams.has("card")) {
      searchParams.delete("card");
      setSearchParams(searchParams);
    }
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
        role: inviteRole,
        socketId: socketId,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("editor");
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

  const handleProjectUpdate = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name").trim();
    const description = formData.get("description").trim();

    if (!name) {
      toast.warn("Project name is required.");
      return;
    }

    try {
      await handleUpdateProject({ name, description });
      toast.success("Project updated");
    } catch (err) {
      toast.error(err.msg || "Could not update project.");
    }
  };

  const handleRemoveMember = async (member) => {
    const shouldRemove = await confirm({
      title: `Remove ${member.name}?`,
      message:
        "They will lose project access and will be removed from task assignments.",
      confirmText: "Remove Member",
      tone: "danger",
    });
    if (!shouldRemove) return;

    try {
      await removeProjectMember(projectId, member._id);
      await refreshBoard();
      toast.success(`${member.name} removed`);
    } catch (err) {
      toast.error(err.msg || "Could not remove member.");
    }
  };

  const onChangeRole = async (member, newRole) => {
    try {
      await handleUpdateRole(member._id, newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.msg || "Could not update role.");
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
    setFilters({ query: "", priority: "all", label: "all", assignee: "all", overdueOnly: false });
  };

  const handleDragStart = ({ active }) => {
    if (active.data.current?.type === "column") {
      setActiveColumnId(active.id);
      return;
    }
    setActiveCardId(active.id);
  };

  const handleBoardDragEnd = async (event) => {
    await handleDragEnd(event);
    setActiveCardId(null);
    setActiveColumnId(null);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
    setActiveColumnId(null);
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
          {isAdmin && (
            <form onSubmit={handleInviteSubmit} className="invite-form">
              <input
                type="email"
                className="invite-input"
                placeholder="Invite user by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <select 
                className="invite-input"
                style={{ width: "90px" }}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
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
          <button
            className="board-action-button"
            onClick={() => setAnalyticsOpen((open) => !open)}
          >
            {isAnalyticsOpen ? (
              <>Hide Analytics <i className="fa-solid fa-chevron-up" style={{ marginLeft: "6px" }}></i></>
            ) : (
              <>Analytics <i className="fa-solid fa-chevron-down" style={{ marginLeft: "6px" }}></i></>
            )}
          </button>
          <button
            className="board-action-button"
            onClick={() => setSummaryOpen((open) => !open)}
          >
            {isSummaryOpen ? (
              <>Hide Summary <i className="fa-solid fa-chevron-up" style={{ marginLeft: "6px" }}></i></>
            ) : (
              <>Show Summary <i className="fa-solid fa-chevron-down" style={{ marginLeft: "6px" }}></i></>
            )}
          </button>
          {isAdmin && (
            <button
              className="board-action-button"
              onClick={() => setSettingsOpen((open) => !open)}
            >
              {isSettingsOpen ? (
                <>Hide Info <i className="fa-solid fa-chevron-up" style={{ marginLeft: "6px" }}></i></>
              ) : (
                <>Info <i className="fa-solid fa-chevron-down" style={{ marginLeft: "6px" }}></i></>
              )}
            </button>
          )}
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

      {isSummaryOpen && (
        <section className="project-settings-panel" style={{ display: 'block' }}>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, color: "var(--text-h)", fontSize: "1.2rem" }}>Project Summary</h2>
            <button 
              className="board-action-button" 
              onClick={() => setSummaryOpen(false)}
              style={{ border: "none", background: "transparent", padding: "4px 8px", boxShadow: "none" }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div style={{ background: "#f4f5f7", color: "#44546f", border: "1px solid #dfe1e6", padding: "16px", borderRadius: "var(--radius-sm)", overflowX: "auto" }}>
            <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.95rem", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {boardData.project?.name} project summary
              {"\n"}Total tasks: {boardStats.totalCards}
              {"\n"}Completed: {boardStats.completedCards}
              {"\n"}Overdue: {boardStats.overdueCards}
              {"\n"}
              {boardData.columns.map((column) => `\n${column.title}: ${column.cards.length} task(s)`)}
            </pre>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button className="board-action-button" onClick={handleCopySummary} style={{ background: "var(--brand)", color: "#fff", border: "none" }}>
              <i className="fa-solid fa-copy" style={{ marginRight: "6px" }}></i> Copy
            </button>
            <button className="board-action-button" onClick={() => {
              if (navigator.share) {
                const text = `${boardData.project?.name} project summary\nTotal tasks: ${boardStats.totalCards}\nCompleted: ${boardStats.completedCards}\nOverdue: ${boardStats.overdueCards}\n\n${boardData.columns.map((column) => `${column.title}: ${column.cards.length} task(s)`).join('\n')}`;
                navigator.share({
                  title: `${boardData.project?.name} Summary`,
                  text: text,
                }).catch(console.error);
              } else {
                toast.info("Sharing is not supported on this browser.");
              }
            }}>
              <i className="fa-solid fa-share-nodes" style={{ marginRight: "6px" }}></i> Share
            </button>
            <button className="board-action-button" onClick={() => {
              const text = `${boardData.project?.name} project summary\nTotal tasks: ${boardStats.totalCards}\nCompleted: ${boardStats.completedCards}\nOverdue: ${boardStats.overdueCards}\n\n${boardData.columns.map((column) => `${column.title}: ${column.cards.length} task(s)`).join('\n')}`;
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${(boardData.project?.name || "Project").replace(/\s+/g, '_')}_Summary.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}>
              <i className="fa-solid fa-download" style={{ marginRight: "6px" }}></i> Download
            </button>
          </div>
        </section>
      )}

      {isSettingsOpen && isAdmin && (
        <section className="project-settings-panel">
          <form onSubmit={handleProjectUpdate} className="project-settings-form">
            <div>
              <label>Project name</label>
              <input
                name="name"
                defaultValue={boardData.project?.name}
                required
              />
            </div>
            <div>
              <label>Description</label>
              <input
                name="description"
                defaultValue={boardData.project?.description || ""}
              />
            </div>
            <button type="submit">Save Project</button>
          </form>

          <div className="team-panel">
            <div className="team-panel-header">
              <h2>Team</h2>
              <p>{projectMembers?.length || 0} members collaborating</p>
            </div>
            <div className="team-list">
              {projectMembers?.map((member) => {
                const isProjectOwner =
                  boardData.project?.owner?._id === member._id;
                const isCurrentUser = currentUser?._id === member._id;
                const memberRole = isProjectOwner ? "Owner" : (boardData.project?.roles?.[member._id] || "editor");

                return (
                  <div key={member._id} className="team-member">
                    <div className="team-avatar">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} />
                      ) : (
                        member.name?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <strong>{member.name}</strong>
                      <p>{member.email}</p>
                    </div>
                    
                    {isProjectOwner ? (
                      <span>Owner</span>
                    ) : (
                      <select 
                        value={memberRole} 
                        onChange={(e) => onChangeRole(member, e.target.value)}
                        disabled={!isAdmin || isCurrentUser}
                        style={{ border: "1px solid #ccc", padding: "4px", borderRadius: "4px", fontSize: "0.85rem", textTransform: "capitalize" }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}

                    {!isProjectOwner && !isCurrentUser && isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {isAnalyticsOpen && (
        <ProjectAnalytics
          projectId={projectId}
          refreshKey={`${boardStats.totalCards}-${boardStats.completedCards}-${boardStats.overdueCards}`}
        />
      )}

      {!isViewer && (
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
      )}

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
        <select
          name="label"
          value={filters.label}
          onChange={handleFilterChange}
        >
          <option value="all">All labels</option>
          {PREDEFINED_LABELS.map(label => (
            <option key={label.text} value={label.text}>{label.text}</option>
          ))}
        </select>
        <select
          name="assignee"
          value={filters.assignee}
          onChange={handleFilterChange}
        >
          <option value="all">All assignees</option>
          {projectMembers?.map(member => (
            <option key={member._id} value={member._id}>{member.name}</option>
          ))}
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
        <SortableContext
          items={visibleColumns.map((c) => c._id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="board-columns-container">
            {visibleColumns.map((column) => (
              <Column
                key={column._id}
                column={column}
                onCardClick={handleOpenModal}
                onCreateCard={handleCreateCard}
                onRenameColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
                dragDisabled={Boolean(isFiltering || isViewer)}
                isViewer={isViewer}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeCard ? (
            <div className="drag-overlay-card">
              <CardPreview card={activeCard} />
            </div>
          ) : activeColumn ? (
            <div className="drag-overlay-column">
              <Column
                column={activeColumn}
                onCardClick={() => {}}
                onCreateCard={() => {}}
                onRenameColumn={() => {}}
                onDeleteColumn={() => {}}
                dragDisabled={true}
                isViewer={isViewer}
              />
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
        isViewer={isViewer}
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
