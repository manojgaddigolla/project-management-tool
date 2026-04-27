import React from "react";
import "./BoardSkeleton.css";

const BoardSkeleton = () => {
  const columns = [1, 2, 3, 4];

  return (
    <div className="skeleton-board">
      {columns.map((col) => (
        <div key={col} className="skeleton-column">
          <div className="skeleton skeleton-column-title"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      ))}
    </div>
  );
};

export default BoardSkeleton;
