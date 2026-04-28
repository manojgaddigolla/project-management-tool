import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useNotifications from "../../hooks/useNotifications";
import "./Navbar.css";

const Navbar = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();  
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const handleBellClick = () => {
    setDropdownVisible(prev => !prev);
    
    if (!isDropdownVisible && unreadCount > 0) {
      markAsRead();
    }
  };
  
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    logout: state.logout,
  }));

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const guestLinks = (
    <ul>
      <li>
        <Link to="/register">Register</Link>
      </li>
      <li>
        <Link to="/login">Login</Link>
      </li>
    </ul>
  );

  const authLinks = (
    <ul>
      <li>
        <span className="navbar-user">Hello, {user ? user.name : "User"}</span>
      </li>
      <li>
        <Link to="/dashboard">Dashboard</Link>
      </li>
      <li>
        <a onClick={onLogout} href="#!">
          <i className="fas fa-sign-out-alt"></i>{" "}
          <span className="hide-sm">Logout</span>
        </a>
      </li>
    </ul>
  );

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        ProjectTool
      </Link>
      <div className="navbar-links">
        <h1>
          <Link to="/">
            <i className="fas fa-tasks"></i> ProjecTrak
          </Link>
        </h1>
        <>{isAuthenticated ? authLinks : guestLinks}</>
        <div className="notification-bell" onClick={handleBellClick}>
          <i className="fas fa-bell"></i>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
          {isDropdownVisible && (
            <div className="notification-dropdown">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <Link
                    to={n.link || "#"}
                    key={n._id}
                    className="notification-item"
                    onClick={() => setDropdownVisible(false)}
                  >
                    <p>{n.message}</p>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </Link>
                ))
              ) : (
                <div className="notification-item">No new notifications</div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
