import { axiosInstance } from "../auth/api/auth.api";

export const getMedicines = async (params = {}) => {
  const response = await axiosInstance.get("/api/medicines", { params });
  return response.data;
};

export const getMedicineById = async (id) => {
  const response = await axiosInstance.get(`/api/medicines/${id}`);
  return response.data?.data;
};

export const createMedicine = async (payload) => {
  const response = await axiosInstance.post("/api/medicines", payload);
  return response.data?.data;
};

export const updateMedicine = async (id, payload) => {
  const response = await axiosInstance.put(`/api/medicines/${id}`, payload);
  return response.data?.data;
};

export const deleteMedicine = async (id) => {
  const response = await axiosInstance.delete(`/api/medicines/${id}`);
  return response.data;
};

export const getMedicineFilters = async () => {
  const response = await axiosInstance.get("/api/medicines/filters");
  return response.data?.data;
};

