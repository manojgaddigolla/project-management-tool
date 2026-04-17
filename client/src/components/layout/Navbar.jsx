import React from 'react';
import { Link } from 'react-router-dom'; 
import useAuthStore from '../../store/authStore';
import './Navbar.css'; 

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore(state => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    logout: state.logout,
  }));

  const guestLinks = (
    <ul>
      <li><Link to="/register">Register</Link></li>
      <li><Link to="/login">Login</Link></li>
    </ul>
  );

  const authLinks = (
    <ul>
      <li>
        <span className="navbar-user">Hello, {user ? user.name : 'User'}</span>
      </li>
      <li>
        <Link to="/dashboard">Dashboard</Link>
      </li>
      <li>
        <a onClick={logout} href="#!">
          <i className="fas fa-sign-out-alt"></i>{' '}
          <span className="hide-sm">Logout</span>
        </a>
      </li>
    </ul>
  );

  return (
    <nav className="navbar">
      <h1>
        <Link to="/">
          <i className="fas fa-tasks"></i> ProjecTrak
        </Link>
      </h1>
      <>{isAuthenticated ? authLinks : guestLinks}</>
    </nav>
  );
};

export default Navbar;