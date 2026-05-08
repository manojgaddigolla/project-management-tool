import React from "react";
import { Link, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import heroImage from "../assets/hero.png";
import "./HomePage.css";

const HomePage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">Project delivery, elevated</span>
          <h1>ProjecTrak</h1>
          <p>
            Where team productivity meets real-time collaboration. Streamline workflows, track tasks visually, and ship products faster in one unified workspace.
          </p>
          <div className="home-actions">
            <Link to="/register" className="primary-home-action">
              Get Started Free
            </Link>
            <Link to="/login" className="secondary-home-action">
              Sign In
            </Link>
          </div>
        </div>
        <div className="home-hero-media">
          <img src={heroImage} alt="ProjecTrak project management dashboard" />
        </div>
      </section>

      <section className="use-case-section">
        <h2>Built for High-Performing Teams</h2>
        <p>From agile product teams to freelance agencies, ProjecTrak adapts to your workflow.</p>
        <div className="feature-grid">
          <article>
            <span>01</span>
            <h3>Agile Product Managers</h3>
            <p>Get a high-level view of project sprints, monitor real-time task movements, and organize complex workflows effortlessly.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Full-Stack Developers</h3>
            <p>See assigned tasks clearly, receive instant notifications on PRs or blockers, and update statuses without context switching.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Freelance Agencies</h3>
            <p>Collaborate with clients on transparent boards, track execution progress, and maintain separate secure workspaces.</p>
          </article>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <span>✨</span>
          <h3>Dynamic Kanban</h3>
          <p>Move tasks through custom columns with fluid drag-and-drop mechanics and instant state synchronization.</p>
        </article>
        <article>
          <span>⚡</span>
          <h3>Real-Time Coordination</h3>
          <p>Powered by WebSockets, see teammates typing, moving cards, and leaving comments instantly—no refreshing required.</p>
        </article>
        <article>
          <span>🔒</span>
          <h3>Enterprise Security</h3>
          <p>Role-based access control, secure JWT authentication, and scoped workspaces keep your company's data safe.</p>
        </article>
      </section>
    </div>
  );
};

export default HomePage;
