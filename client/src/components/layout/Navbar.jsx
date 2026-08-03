import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import useNotifications from "../../hooks/useNotifications";
import "./Navbar.css";

const Navbar = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();  
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = React.useRef(null);
  const { isSignedIn } = useAuth();

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
        <Show when="signed-out">
          <ul>
            <li>
              <SignUpButton mode="modal">
                <button className="navbar-cta-outline" style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "750" }}>Register</button>
              </SignUpButton>
            </li>
            <li>
              <SignInButton mode="modal">
                <button className="navbar-cta" style={{ border: "none", cursor: "pointer", fontWeight: "750" }}>Login</button>
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
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <Link
                        to={n.link || "#"}
                        key={n._id}
                        className="notification-item"
                        onClick={() => setDropdownVisible(false)}
                      >
                        <p className="notification-message">{n.message}</p>
                        <small className="notification-date">{new Date(n.createdAt).toLocaleString()}</small>
                      </Link>
                    ))
                  ) : (
                    <div className="notification-item">No new notifications</div>
                  )}
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
