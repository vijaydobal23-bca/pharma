import { axiosInstance } from "../auth/api/auth.api";

export const getSuppliers = async () => {
  const response = await axiosInstance.get("/api/suppliers");
  return response.data?.data;
};

export const createSupplier = async (payload) => {
  const response = await axiosInstance.post("/api/suppliers", payload);
  return response.data?.data;
};

