import { axiosInstance } from "../auth/api/auth.api";

export const getAdminDashboard = async (params = {}) => {
  const response = await axiosInstance.get("/api/dashboard/admin", { params });
  return response.data?.data;
};

export const getEmployeeDashboard = async () => {
  const response = await axiosInstance.get("/api/dashboard/employee");
  return response.data?.data;
};

