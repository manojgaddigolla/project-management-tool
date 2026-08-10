import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import "./Sidebar.css";

const Sidebar = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button 
        className="sidebar-toggle-btn" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <path d="M9 3v18"></path>
            <path d="m14 9 3 3-3 3"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <path d="M9 3v18"></path>
            <path d="m16 15-3-3 3-3"></path>
          </svg>
        )}
      </button>

      <div className="sidebar-content">
        <NavLink to="/dashboard" className="sidebar-link">
          <i className="fas fa-home"></i>
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
