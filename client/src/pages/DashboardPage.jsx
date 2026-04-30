import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createProject, getProjects } from "../services/projectService";
import "./DashboardPage.css";

const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getProjects();
        setProjects(data);
    } catch (err) {
      setError(err.msg || err.errors?.[0]?.msg || "Failed to fetch projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleFormChange = (event) => {
    setProjectForm({
      ...projectForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectForm.name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setCreatingProject(true);
      setError(null);
      const project = await createProject({
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
      });
      setProjects((currentProjects) => [project, ...currentProjects]);
      setProjectForm({ name: "", description: "" });
    } catch (err) {
      setError(err.msg || err.errors?.[0]?.msg || "Failed to create project.");
    } finally {
      setCreatingProject(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading projects...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Your Projects</h2>
      </div>

      {error && <div className="dashboard-error">Error: {error}</div>}

      <form className="create-project-form" onSubmit={handleCreateProject}>
        <div className="create-project-fields">
          <input
            type="text"
            name="name"
            placeholder="Project name"
            value={projectForm.name}
            onChange={handleFormChange}
            disabled={creatingProject}
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Short description"
            value={projectForm.description}
            onChange={handleFormChange}
            disabled={creatingProject}
          />
        </div>
        <button
          type="submit"
          className="create-project-btn"
          disabled={creatingProject}
        >
          {creatingProject ? "Creating..." : "Create Project"}
        </button>
      </form>
      
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
