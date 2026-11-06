import { axiosInstance } from "../auth/api/auth.api";

export const createBill = async (payload) => {
  const response = await axiosInstance.post("/api/billing/create-bill", payload);
  return response.data?.data;
};

export const getSalesHistory = async (params = {}) => {
  const response = await axiosInstance.get("/api/billing/sales", { params });
  return response.data;
};

export const getSaleById = async (id) => {
  const response = await axiosInstance.get(`/api/billing/sales/${id}`);
  return response.data?.data;
};

export const cancelBill = async (id, reason) => {
  const response = await axiosInstance.post(`/api/billing/sales/${id}/cancel`, { reason });
  return response.data?.data;
};

export const processReturn = async (id, returnedItems, reason) => {
  const response = await axiosInstance.post(`/api/billing/sales/${id}/return`, {
    returnedItems,
    reason,
  });
  return response.data?.data;
};

