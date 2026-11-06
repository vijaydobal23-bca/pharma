import { axiosInstance } from "../auth/api/auth.api";

export const getCustomers = async (params = {}) => {
  const response = await axiosInstance.get("/api/customers", { params });
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/api/customers/${id}`);
  return response.data?.data;
};

export const createCustomer = async (payload) => {
  const response = await axiosInstance.post("/api/customers", payload);
  return response.data?.data;
};

export const updateCustomer = async (id, payload) => {
  const response = await axiosInstance.put(`/api/customers/${id}`, payload);
  return response.data?.data;
};

