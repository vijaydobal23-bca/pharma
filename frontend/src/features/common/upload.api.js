import { axiosInstance } from "../auth/api/auth.api";

/**
 * Upload an image file via Multer to ImageKit CDN
 * @param {File} file - Browser File object from input[type="file"]
 * @param {string} folder - Target folder on ImageKit (e.g. '/medicines', '/employees')
 * @returns {Promise<{ url: string, fileId: string, thumbnailUrl: string }>}
 */
export const uploadImageFile = async (file, folder = "/medicines") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await axiosInstance.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data?.data;
};

