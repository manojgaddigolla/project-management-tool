 import React from 'react';
 import Navbar from './components/layout/Navbar';
 import Sidebar from './components/layout/Sidebar';
 import Footer from './components/layout/Footer';

 import './App.css'; 

 function App() {
  
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
       <Sidebar />
        <main className="page-content">
          <h2>Welcome to ProjecTrak</h2>
          <p>Your main content will appear here.</p>
        </main>
      </div>
      <Footer />
    </div>
  );
 }

 export default App;