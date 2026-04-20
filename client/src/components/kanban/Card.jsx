import React from 'react';
import './Card.css';

const Card = ({ card }) => {
  return (
    <div className="kanban-card">
      <p className="kanban-card-title">{card.title}</p>
    </div>
  );
};

export default Card;