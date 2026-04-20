import React from 'react';
import Card from './Card'; 
import './Column.css';

const Column = ({ column }) => {
  return (
    <div className="kanban-column">
      <h3 className="kanban-column-title">{column.title}</h3>
      <div className="kanban-card-list">
        
        {column.cards.map(card => (
          <Card key={card._id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default Column;