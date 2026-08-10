import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import useNotifications from "../../hooks/useNotifications";
import useThemeStore from "../../store/themeStore";
import "./Navbar.css";

const Navbar = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();  
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = React.useRef(null);
  const { isSignedIn } = useAuth();
  const { theme, toggleTheme } = useThemeStore();

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setDropdownVisible(prev => !prev);
    
    if (!isDropdownVisible && unreadCount > 0) {
      markAsRead();
    }
  };

  return (
    <nav className="navbar">
      <Link to={isSignedIn ? "/dashboard" : "/"} className="navbar-logo">
        <span className="navbar-logo-mark">P</span>
        ProjecTrak
      </Link>
      
      <div className="navbar-links">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark Mode">
          {theme === 'dark' ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
        </button>

        <Show when="signed-out">
          <ul>
            <li>
              <SignUpButton mode="modal">
                <button className="navbar-cta-outline">Register</button>
              </SignUpButton>
            </li>
            <li>
              <SignInButton mode="modal">
                <button className="navbar-cta">Login</button>
              </SignInButton>
            </li>
          </ul>
        </Show>

        <Show when="signed-in">
          <ul>
            <li>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </li>
          </ul>
          <div className="navbar-icons">
            <UserButton />
            <div className="notification-bell" ref={dropdownRef} onClick={handleBellClick}>
              <i className="fas fa-bell"></i>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
              {isDropdownVisible && (
                <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="notification-header">
                    <h4>Notifications</h4>
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <Link
                          to={n.link || "#"}
                          key={n._id}
                          className="notification-item"
                          onClick={() => setDropdownVisible(false)}
                        >
                          <div className="notification-icon">
                            <i className="fas fa-bell"></i>
                          </div>
                          <div className="notification-content">
                            <p className="notification-message">{n.message}</p>
                            <small className="notification-date">{new Date(n.createdAt).toLocaleString()}</small>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="notification-empty">
                        <i className="fas fa-bell-slash"></i>
                        <p>No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Show>
      </div>
    </nav>
  );
};

export default Navbar;
