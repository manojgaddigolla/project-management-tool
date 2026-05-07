import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./Card.css";

export const CardPreview = ({ card, className = "" }) => {
  const checklistTotal = card.checklist?.length || 0;
  const checklistDone =
    card.checklist?.filter((item) => item.completed).length || 0;
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div className={`kanban-card-content ${className}`}>
      <div className="kanban-card-topline">
        <span className={`priority-pill priority-${card.priority || "medium"}`}>
          {card.priority || "medium"}
        </span>
        {card.dueDate && (
          <span className={`due-pill ${isOverdue ? "overdue" : ""}`}>
            {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="kanban-card-title">{card.title}</p>
      <div className="kanban-card-meta">
        {checklistTotal > 0 && (
          <span>
            {checklistDone}/{checklistTotal} checklist
          </span>
        )}
        {card.comments?.length > 0 && (
          <span>{card.comments.length} comments</span>
        )}
        {card.assignedTo?.length > 0 && (
          <span>{card.assignedTo.length} assigned</span>
        )}
      </div>
    </div>
  );
};

const Card = ({ card, columnId, onClick, dragDisabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: { type: "card", columnId },
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
      className={`kanban-card ${isDragging ? "dragging" : ""} ${
        dragDisabled ? "drag-disabled" : ""
      }`}
      onClick={onClick}
    >
      <CardPreview card={card} />
    </div>
  );
};

export default React.memo(Card);
