import React, { useState } from "react";
import Card from "./Card";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import "./Column.css";

const Column = ({ column, onCardClick, onCreateCard }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="kanban-column">
      <h3 className="kanban-column-title">{column.title}</h3>

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
