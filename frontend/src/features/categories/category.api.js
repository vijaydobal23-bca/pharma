import { axiosInstance } from "../auth/api/auth.api";

export const getCategories = async () => {
  const response = await axiosInstance.get("/api/categories");
  return response.data?.data;
};

export const createCategory = async (payload) => {
  const response = await axiosInstance.post("/api/categories", payload);
  return response.data?.data;
};

