import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";
import { NotificationProvider } from "./context/NotificationContext";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BoardPage from "./pages/BoardPage";
import ProjectBoardPage from "./pages/ProjectBoardPage";
import PrivateRoute from "./components/routing/PrivateRoute";
import useAuthStore from "./store/authStore";
import "./App.css";

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="app-container">
          <Navbar />
          <div className="main-content">
            <Sidebar />
            <main className="page-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />

                <Route element={<PrivateRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/project/:projectId" element={<ProjectBoardPage />} />
                </Route>
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
