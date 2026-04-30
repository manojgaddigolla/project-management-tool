import React, { useState, useEffect } from "react";
import {
  addComment,
  assignUsersToCard,
  deleteCard,
  updateCard,
} from "../../services/cardService";
import "./CardModal.css";

const CardModal = ({
  show,
  onClose,
  card,
  socketId,
  projectMembers = [],
  onChanged,
  onDeleted,
}) => {
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  const [checklistText, setChecklistText] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prevCard, setPrevCard] = useState(null);

  if (card !== prevCard) {
    setPrevCard(card);
    setSelectedAssignees(card?.assignedTo?.map((user) => user._id) ?? []);
    setEditForm({
      title: card?.title || "",
      description: card?.description || "",
      priority: card?.priority || "medium",
      dueDate: card?.dueDate ? card.dueDate.slice(0, 10) : "",
    });
    setChecklist(card?.checklist || []);
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
      await onChanged?.();
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
      await onChanged?.();
    } catch (err) {
      console.error("Failed to update assignees:", err);
      alert("Could not save assignees. Please try again.");
    }
  };

  const handleDetailsChange = (event) => {
    setEditForm({
      ...editForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleDetailsSave = async (event) => {
    event.preventDefault();
    if (!card || !editForm.title.trim()) return;

    try {
      setIsSavingDetails(true);
      await updateCard(card._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        dueDate: editForm.dueDate,
        checklist,
      });
      await onChanged?.();
    } catch (err) {
      console.error("Failed to update card:", err);
      alert("Could not save card details. Please try again.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleAddChecklistItem = () => {
    if (!checklistText.trim()) return;

    setChecklist((items) => [
      ...items,
      { text: checklistText.trim(), completed: false },
    ]);
    setChecklistText("");
  };

  const handleChecklistToggle = (index) => {
    setChecklist((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const handleChecklistRemove = (index) => {
    setChecklist((items) =>
      items.filter((item, itemIndex) => itemIndex !== index),
    );
  };

  const handleDeleteCard = async () => {
    if (!card) return;

    const shouldDelete = window.confirm(
      "Delete this card? This cannot be undone.",
    );
    if (!shouldDelete) return;

    try {
      setIsDeleting(true);
      await deleteCard(card._id);
      await onChanged?.();
      onDeleted?.();
    } catch (err) {
      console.error("Failed to delete card:", err);
      alert("Could not delete this card. Please try again.");
    } finally {
      setIsDeleting(false);
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
            <div className="modal-body">
              <div className="modal-main-content">
                <form className="card-details-form" onSubmit={handleDetailsSave}>
                  <div className="modal-title-row">
                    <input
                      className="modal-title-input"
                      name="title"
                      value={editForm.title}
                      onChange={handleDetailsChange}
                      required
                    />
                    <button
                      type="button"
                      className="danger-button"
                      onClick={handleDeleteCard}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <div className="details-grid">
                    <label>
                      Priority
                      <select
                        name="priority"
                        value={editForm.priority}
                        onChange={handleDetailsChange}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                    <label>
                      Due date
                      <input
                        type="date"
                        name="dueDate"
                        value={editForm.dueDate}
                        onChange={handleDetailsChange}
                      />
                    </label>
                  </div>

                  <h3 className="modal-section-title">Description</h3>
                  <textarea
                    className="modal-description-input"
                    name="description"
                    value={editForm.description}
                    onChange={handleDetailsChange}
                    placeholder="Add context, acceptance criteria, or links..."
                  />

                  <div className="checklist-section">
                    <h3 className="modal-section-title">Checklist</h3>
                    <div className="checklist-input-row">
                      <input
                        type="text"
                        value={checklistText}
                        onChange={(event) =>
                          setChecklistText(event.target.value)
                        }
                        placeholder="Add checklist item"
                      />
                      <button type="button" onClick={handleAddChecklistItem}>
                        Add
                      </button>
                    </div>
                    <ul className="checklist-list">
                      {checklist.map((item, index) => (
                        <li key={`${item.text}-${index}`}>
                          <label>
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleChecklistToggle(index)}
                            />
                            <span
                              className={item.completed ? "completed" : ""}
                            >
                              {item.text}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleChecklistRemove(index)}
                            aria-label={`Remove ${item.text}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {checklist.length === 0 && (
                        <p className="empty-state-text">
                          No checklist items yet.
                        </p>
                      )}
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="details-save-button"
                    disabled={isSavingDetails || !editForm.title.trim()}
                  >
                    {isSavingDetails ? "Saving..." : "Save Card Details"}
                  </button>
                </form>

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
