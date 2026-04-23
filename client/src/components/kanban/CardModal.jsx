import React, { useEffect } from "react";
import "./CardModal.css";

const CardModal = ({ show, onClose, card }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (show) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [show, onClose]);

  if (!show) {
    return null;
  }

  const Avatar = ({ user }) => {
    if (user.avatar) {
      return <img src={user.avatar} alt={user.name} />;
    }
    const initials = user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
    return <span>{initials}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-button">
          &times;
        </button>

        {!card ? (
          <div>Loading...</div>
        ) : (
          <>
            <h2 className="modal-card-title">{card.title}</h2>

            <div className="modal-body">
              <div className="modal-main-content">
                <h3 className="modal-section-title">Description</h3>
                <p className="modal-card-description">
                  {card.description || "No description provided."}
                </p>

                <div className="comments-section">
                  <h3 className="modal-section-title">Comments</h3>

                  <ul className="comments-list">
                    {card.comments?.map((comment) => (
                      <li key={comment._id} className="comment-item">
                        <div className="user-avatar">
                          <Avatar
                            user={{
                              name: comment.name,
                              avatar: comment.avatar,
                            }}
                          />
                        </div>
                        <div className="comment-body">
                          <div>
                            <span className="comment-author">
                              {comment.name}
                            </span>
                            <span className="comment-date">
                              {new Date(comment.date).toLocaleString()}
                            </span>
                          </div>
                          <div className="comment-text">{comment.text}</div>
                        </div>
                      </li>
                    ))}
                    {card.comments?.length === 0 && <p>No comments yet.</p>}
                  </ul>
                </div>
              </div>

              <div className="modal-sidebar">
                <h3 className="modal-section-title">Assigned To</h3>
                <ul className="assigned-users-list">
                  {card.assignedTo?.map((user) => (
                    <li key={user._id} className="assigned-user">
                      <div className="user-avatar" title={user.name}>
                        <Avatar user={user} />
                      </div>
                      <span className="user-name">{user.name}</span>
                    </li>
                  ))}
                  {card.assignedTo?.length === 0 && <p>No one assigned.</p>}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardModal;
