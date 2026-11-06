import { axiosInstance } from "../auth/api/auth.api";

export const getEmployees = async (params = {}) => {
  const response = await axiosInstance.get("/api/employees", { params });
  return response.data?.data;
};

export const createEmployee = async (payload) => {
  const response = await axiosInstance.post("/api/employees", payload);
  return response.data?.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await axiosInstance.put(`/api/employees/${id}`, payload);
  return response.data?.data;
};

export const toggleEmployeeStatus = async (id) => {
  const response = await axiosInstance.patch(`/api/employees/${id}/toggle-status`);
  return response.data?.data;
};

export const getEmployeeActivity = async (id) => {
  const response = await axiosInstance.get(`/api/employees/${id}/activity`);
  return response.data?.data;
};

