import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth, SignIn, SignUp } from "@clerk/react";
import useAuthStore from "./store/authStore";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { ConfirmDialogProvider } from "./context/ConfirmDialogContext.jsx";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import ProjectBoardPage from "./pages/ProjectBoardPage";
import PrivateRoute from "./components/routing/PrivateRoute";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import "./App.css";

function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const syncUser = useAuthStore((state) => state.syncUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        syncUser();
      } else {
        logout();
      }
    }
  }, [isLoaded, isSignedIn, syncUser, logout]);

  return (
    <NotificationProvider>
      <ConfirmDialogProvider>
        <div className="app-container">
          <Navbar />
          <div className="main-content">
            <Sidebar />
            <main className="page-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<div style={{display: 'flex', justifyContent: 'center', margin: '40px'}}><SignIn routing="path" path="/login" /></div>} />
                <Route path="/register" element={<div style={{display: 'flex', justifyContent: 'center', margin: '40px'}}><SignUp routing="path" path="/register" /></div>} />
                <Route element={<PrivateRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route
                    path="/project/:projectId"
                    element={<ProjectBoardPage />}
                  />
                  <Route
                    path="/project/:projectId/board"
                    element={<ProjectBoardPage />}
                  />
                </Route>
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
        <ToastContainer
          position="top-right"
          autoClose={4200}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </ConfirmDialogProvider>
    </NotificationProvider>
  );
}

export default App;
