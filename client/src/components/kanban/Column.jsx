import React from "react";
import Card from "./Card";
import { Droppable } from "react-beautiful-dnd";
import "./Column.css";

const Column = ({ column }) => {
  return (
    <div className="kanban-column">
      <h3 className="kanban-column-title">{column.title}</h3>

      <Droppable droppableId={column._id}>
        {(provided, snapshot) => (
          <div
            className={`kanban-card-list ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {column.cards.map((card, index) => (
              <Card key={card._id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;
