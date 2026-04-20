import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
  }));

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
