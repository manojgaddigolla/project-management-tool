import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PREDEFINED_LABELS } from "../../utils/constants";
import "./Card.css";

export const CardPreview = ({ card, className = "" }) => {
  const checklistTotal = card.checklist?.length || 0;
  const checklistDone =
    card.checklist?.filter((item) => item.completed).length || 0;
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div className={`kanban-card-content ${className}`}>
      {card.labels?.length > 0 && (
        <div className="kanban-card-labels">
          {card.labels.map((labelText) => {
            const labelDef = PREDEFINED_LABELS.find(l => l.text === labelText);
            const color = labelDef ? labelDef.color : "#9aa0a6";
            return (
              <span 
                key={labelText} 
                className="kanban-card-label" 
                style={{ backgroundColor: color }}
              >
                {labelText}
              </span>
            );
          })}
        </div>
      )}
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
        {card.attachments?.length > 0 && (
          <span><span style={{ fontSize: "1.2em", marginRight: "2px" }}>📎</span> {card.attachments.length}</span>
        )}
        {checklistTotal > 0 && (
          <span>
            <span style={{ fontSize: "1.2em", marginRight: "2px" }}>☑️</span> {checklistDone}/{checklistTotal}
          </span>
        )}
        {card.comments?.length > 0 && (
          <span><span style={{ fontSize: "1.2em", marginRight: "2px" }}>💬</span> {card.comments.length}</span>
        )}
        {card.assignedTo?.length > 0 && (
          <div className="card-assignees">
            {card.assignedTo.map((user) => (
              <div key={user._id} className="card-assignee-avatar" title={user.name}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  user.name?.slice(0, 2).toUpperCase()
                )}
              </div>
            ))}
          </div>
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
