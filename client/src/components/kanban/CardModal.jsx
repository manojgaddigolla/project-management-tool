import React, { useState, useEffect } from "react";
import { addComment, assignUsersToCard } from "../../services/cardService";
import "./CardModal.css";

const CardModal = ({ show, onClose, card, socketId, projectMembers = [] }) => {
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [prevCard, setPrevCard] = useState(null);

  // Reset selected assignees whenever the card prop changes (update during render,
  // avoiding a synchronous setState inside an effect).
  if (card !== prevCard) {
    setPrevCard(card);
    setSelectedAssignees(card?.assignedTo?.map((user) => user._id) ?? []);
  }

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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!newCommentText.trim()) {
      return;
    }

    try {
      await addComment(card._id, {
        text: newCommentText,
        socketId: socketId,
      });

      setNewCommentText("");
    } catch (err) {
      console.error("Failed to add comment:", err);
      alert("Could not post your comment. Please try again.");
    }
  };

  const handleAssigneeChange = (memberId) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleAssigneeSave = async () => {
    if (!card) return;
    try {
      await assignUsersToCard(card._id, {
        assignedTo: selectedAssignees,
        socketId: socketId,
      });
    } catch (err) {
      console.error("Failed to update assignees:", err);
      alert("Could not save assignees. Please try again.");
    }
  };

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

                  <form onSubmit={handleCommentSubmit} className="comment-form">
                    <textarea
                      className="comment-textarea"
                      placeholder="Write a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                    ></textarea>
                    <button
                      type="submit"
                      className="comment-submit-button"
                      disabled={!newCommentText.trim()}
                    >
                      Save
                    </button>
                  </form>

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

                <div className="member-assignment-section">
                  <h3 className="modal-section-title">Members</h3>
                  <div className="members-list">
                    {projectMembers.map((member) => (
                      <div key={member._id} className="member-item">
                        <input
                          type="checkbox"
                          id={`member-${member._id}`}
                          checked={selectedAssignees.includes(member._id)}
                          onChange={() => handleAssigneeChange(member._id)}
                        />
                        <label htmlFor={`member-${member._id}`}>
                          <div className="user-avatar" title={member.name}>
                            <Avatar user={member} />
                          </div>
                          <span className="user-name">{member.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleAssigneeSave}
                    className="assignee-save-button"
                  >
                    Save Assignments
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardModal;
