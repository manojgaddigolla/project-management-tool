import React, { useState } from "react";
import { toast } from "react-toastify";
import Card from "./Card";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useConfirm } from "../../context/useConfirm";
import "./Column.css";

const Column = ({
  column,
  onCardClick,
  onCreateCard,
  onRenameColumn,
  onDeleteColumn,
  dragDisabled = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const confirm = useConfirm();

  const { setNodeRef } = useDroppable({
    id: column._id,
    data: { type: "column" },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setIsAdding(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await onCreateCard(column._id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate,
      });
      resetForm();
      toast.success("Card created");
    } catch (err) {
      toast.error(err.msg || "Could not create card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameSubmit = async (event) => {
    event.preventDefault();

    if (!columnTitle.trim() || columnTitle.trim() === column.title) {
      setColumnTitle(column.title);
      setIsEditingTitle(false);
      return;
    }

    try {
      await onRenameColumn(column._id, columnTitle.trim());
      toast.success("Column renamed");
      setIsEditingTitle(false);
    } catch (err) {
      toast.error(err.msg || "Could not rename column.");
    }
  };

  const handleDeleteColumn = async () => {
    if (column.cards.length > 0) {
      toast.warn("Move or delete all cards before deleting this column.");
      return;
    }

    const shouldDelete = await confirm({
      title: `Delete "${column.title}"?`,
      message: "Empty columns can be deleted safely. This action cannot be undone.",
      confirmText: "Delete Column",
      tone: "danger",
    });
    if (!shouldDelete) return;

    try {
      await onDeleteColumn(column._id);
      toast.success("Column deleted");
    } catch (err) {
      toast.error(err.msg || "Could not delete column.");
    }
  };

  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        {isEditingTitle ? (
          <form className="column-title-form" onSubmit={handleRenameSubmit}>
            <input
              value={columnTitle}
              onChange={(event) => setColumnTitle(event.target.value)}
              autoFocus
            />
            <button type="submit">Save</button>
            <button
              type="button"
              onClick={() => {
                setColumnTitle(column.title);
                setIsEditingTitle(false);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <h3 className="kanban-column-title">{column.title}</h3>
        )}
        <span>{column.cards.length}</span>
      </div>
      {!isEditingTitle && (
        <div className="column-actions">
          <button type="button" onClick={() => setIsEditingTitle(true)}>
            Rename
          </button>
          <button type="button" onClick={handleDeleteColumn}>
            Delete
          </button>
        </div>
      )}

      <SortableContext
        items={column.cards.map((c) => c._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="kanban-card-list"
          ref={setNodeRef}
        >
          {column.cards.map((card) => (
            <Card
              key={card._id}
              card={card}
              columnId={column._id}
              onClick={() => onCardClick(card)}
              dragDisabled={dragDisabled}
            />
          ))}
        </div>
      </SortableContext>

      {isAdding ? (
        <form className="add-card-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="add-card-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Card title"
            disabled={isSaving}
            autoFocus
          />
          <textarea
            className="add-card-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            disabled={isSaving}
          />
          <div className="add-card-row">
            <select
              className="add-card-select"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={isSaving}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent priority</option>
            </select>
            <input
              type="date"
              className="add-card-input"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="add-card-actions">
            <button type="submit" disabled={!title.trim() || isSaving}>
              {isSaving ? "Adding..." : "Add"}
            </button>
            <button type="button" onClick={resetForm} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="add-card-button" onClick={() => setIsAdding(true)}>
          + Add card
        </button>
      )}
    </div>
  );
};

export default Column;
