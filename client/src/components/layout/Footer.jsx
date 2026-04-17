import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>Copyright &copy; {new Date().getFullYear()} ProjecTrak. All Rights Reserved.</p>
    </footer>
  );
};

export default Footer;