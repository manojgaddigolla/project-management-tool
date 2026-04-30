import React, { useMemo, useState, useEffect } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return projects;

    return projects.filter((project) => {
      return [project.name, project.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [projects, searchTerm]);

  const dashboardStats = useMemo(
    () => ({
      total: projects.length,
      owned: projects.filter((project) => project.owner).length,
      recent: projects.filter((project) => {
        const created = new Date(project.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length,
    }),
    [projects],
  );

  if (loading) {
    return <div className="dashboard-loading">Loading projects...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Project command center</p>
          <h2 className="dashboard-title">Your Projects</h2>
          <p className="dashboard-subtitle">
            Create workspaces, organize delivery boards, and keep task momentum
            visible.
          </p>
        </div>
      </div>

      {error && <div className="dashboard-error">Error: {error}</div>}

      <div className="dashboard-stats">
        <div>
          <span>{dashboardStats.total}</span>
          <p>Total projects</p>
        </div>
        <div>
          <span>{dashboardStats.recent}</span>
          <p>Created this week</p>
        </div>
        <div>
          <span>{dashboardStats.owned}</span>
          <p>Owned by you</p>
        </div>
        <div>
          <span>{filteredProjects.length}</span>
          <p>Matching view</p>
        </div>
      </div>

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

      <div className="project-toolbar">
        <input
          type="search"
          placeholder="Search projects"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
      
      {filteredProjects.length > 0 ? (
        <div className="project-list">
          {filteredProjects.map((project) => (
            <div key={project._id} className="project-card">
              <div className="project-card-kicker">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </div>
              <h3 className="project-card-title">{project.name}</h3>
              <p className="project-card-description">
                {project.description || "No description added yet."}
              </p>
              
              <Link to={`/project/${project._id}`} className="project-card-link">
                Open Board
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
