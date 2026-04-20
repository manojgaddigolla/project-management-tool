import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../services/projectService";
import "./DashboardPage.css";

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        setError(err.msg || "Failed to fetch projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading projects...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Your Projects</h2>
        <button className="create-project-btn">Create New Project</button>
      </div>
      
      {projects.length > 0 ? (
        <div className="project-list">
          {projects.map((project) => (
            <div key={project._id} className="project-card">
              <h3 className="project-card-title">{project.name}</h3>
              <p className="project-card-description">{project.description}</p>
              
              <Link to={`/project/${project._id}`} className="project-card-link">
                View Board
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-projects">
          <p>You haven't been added to any projects yet.</p>
          <p>Create your first project to get started!</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
