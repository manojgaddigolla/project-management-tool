import React from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">Project delivery, made visible</p>
          <h1>ProjecTrak</h1>
          <p>
            Plan projects, track tasks on live boards, assign owners, and keep
            team activity in one focused workspace.
          </p>
          <div className="home-actions">
            <Link to="/register" className="primary-home-action">
              Start a Workspace
            </Link>
            <Link to="/login" className="secondary-home-action">
              Sign In
            </Link>
          </div>
        </div>
        <div className="home-hero-media">
          <img src={heroImage} alt="Project management dashboard preview" />
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <span>01</span>
          <h2>Kanban workflow</h2>
          <p>Move tasks through custom columns with drag-and-drop boards.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Team coordination</h2>
          <p>Invite members, assign work, and notify teammates in real time.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Execution detail</h2>
          <p>Use priorities, due dates, comments, and checklists on each card.</p>
        </article>
      </section>
    </div>
  );
};

export default HomePage;
