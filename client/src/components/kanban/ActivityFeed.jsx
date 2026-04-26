import React, { useState, useEffect } from "react";
import { getActivitiesForProject } from "../../services/activityService";
import "./ActivityFeed.css";

const Avatar = ({ user }) => {
  if (user && user.avatar) {
    return <img src={user.avatar} alt={user.name} />;
  }
  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
    : "?";
  return <span>{initials}</span>;
};

const ActivityFeed = ({ projectId, isVisible, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && projectId) {
      const fetchActivities = async () => {
        setLoading(true);
        try {
          const data = await getActivitiesForProject(projectId);
          setActivities(data);
        } catch (error) {
          console.error("Failed to fetch project activities:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchActivities();
    }
  }, [projectId, isVisible]);

  return (
    <div className={`activity-feed-sidebar ${isVisible ? "visible" : ""}`}>
      <div className="activity-feed-header">
        <h2 className="activity-feed-title">Project Activity</h2>
        <button onClick={onClose} className="close-activity-feed-btn">
          &times;
        </button>
      </div>
      <ul className="activity-list">
        {loading ? (
          <p>Loading activities...</p>
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <li key={activity._id} className="activity-item">
              <div className="activity-avatar">
                <Avatar user={activity.user} />
              </div>
              <div className="activity-content">
                <p>{activity.actionText}</p>
                <p className="activity-date">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))
        ) : (
          <p>No activity has been recorded for this project yet.</p>
        )}
      </ul>
    </div>
  );
};

export default ActivityFeed;
