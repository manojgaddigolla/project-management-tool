import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import './Card.css';

const Card = ({ card, index, onClick }) => {
  return (
     <Draggable 
       draggableId={card._id} 
      index={index}
     >
       {(provided, snapshot) => (
         <div
           className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
           ref={provided.innerRef}
           {...provided.draggableProps}
           {...provided.dragHandleProps}
           onClick={onClick}
         >
           <p className="kanban-card-title">{card.title}</p>
         </div>
       )}
     </Draggable>
   );
};

export default Card;