import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const guestLinks = (
    <ul>
      <li>
        <NavLink to="/register">Register</NavLink>
      </li>
      <li>
        <NavLink to="/login" className="navbar-cta">
          Login
        </NavLink>
      </li>
    </ul>
  );

  const authLinks = (
    <ul>
      <li>
        <span className="navbar-user">Hello, {user ? user.name : "User"}</span>
      </li>
      <li>
        <NavLink to="/dashboard">Dashboard</NavLink>
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
        <span className="navbar-logo-mark">P</span>
        ProjecTrak
      </Link>
      <div className="navbar-links">
        <>{isAuthenticated ? authLinks : guestLinks}</>
        {isAuthenticated && (
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
        )}
      </div>
    </nav>
  );
};

export default Navbar;
