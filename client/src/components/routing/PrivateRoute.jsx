import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Show } from "@clerk/react";

const PrivateRoute = () => {
  return (
    <>
      <Show when="signed-in">
        <Outlet />
      </Show>
      <Show when="signed-out">
        <Navigate to="/" replace />
      </Show>
    </>
  );
};

export default PrivateRoute;
