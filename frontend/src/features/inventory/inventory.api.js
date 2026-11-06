import { axiosInstance } from "../auth/api/auth.api";

export const getInventoryBatches = async (params = {}) => {
  const response = await axiosInstance.get("/api/inventory/batches", { params });
  return response.data;
};

export const addStockBatch = async (payload) => {
  const response = await axiosInstance.post("/api/inventory/batches", payload);
  return response.data?.data;
};

export const updateBatch = async (id, payload) => {
  const response = await axiosInstance.put(`/api/inventory/batches/${id}`, payload);
  return response.data?.data;
};

export const adjustStock = async (payload) => {
  const response = await axiosInstance.post("/api/inventory/adjust", payload);
  return response.data?.data;
};

export const getInventoryAlerts = async () => {
  const response = await axiosInstance.get("/api/inventory/alerts");
  return response.data?.data;
};

export const getStockMovements = async (params = {}) => {
  const response = await axiosInstance.get("/api/inventory/movements", { params });
  return response.data;
};

