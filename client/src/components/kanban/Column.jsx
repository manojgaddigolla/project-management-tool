import React from "react";
import Card from "./Card";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import "./Column.css";

const Column = ({ column, onCardClick }) => {
  const { setNodeRef } = useDroppable({
    id: column._id,
    data: { type: "column" },
  });

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
    </div>
  );
};

export default Column;
