import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Dashboard from "./features/dashboard/Dashboard";
import PosBillingPage from "./features/billing/pages/PosBillingPage";
import SalesHistoryPage from "./features/billing/pages/SalesHistoryPage";
import MedicinesPage from "./features/medicines/pages/MedicinesPage";
import InventoryPage from "./features/inventory/pages/InventoryPage";
import CustomersPage from "./features/customers/pages/CustomersPage";
import EmployeesPage from "./features/employees/pages/EmployeesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "",
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "pos",
            element: <PosBillingPage />,
          },
          {
            path: "medicines",
            element: <MedicinesPage />,
          },
          {
            path: "inventory",
            element: <InventoryPage />,
          },
          {
            path: "sales",
            element: <SalesHistoryPage />,
          },
          {
            path: "customers",
            element: <CustomersPage />,
          },
          {
            path: "employees",
            element: (
              <ProtectedRoute requireAdmin={true}>
                <EmployeesPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
