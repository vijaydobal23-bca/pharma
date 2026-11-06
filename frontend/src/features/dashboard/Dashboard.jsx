import React from "react";
import { useAuth } from "../auth/hooks/useAuth";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
};

export default Dashboard;
