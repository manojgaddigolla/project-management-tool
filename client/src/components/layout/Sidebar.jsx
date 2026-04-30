import React from "react";
import { NavLink } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import "./Sidebar.css";

const Sidebar = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="sidebar-link">
        Dashboard
      </NavLink>
    </aside>
  );
};

export default Sidebar;
