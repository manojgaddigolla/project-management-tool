import React from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";

import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectBoardPage from "./pages/ProjectBoardPage";

import "./App.css";

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <Sidebar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/project/:projectId" element={<ProjectBoardPage />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;
