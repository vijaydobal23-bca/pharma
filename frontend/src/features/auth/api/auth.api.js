import axios from "axios";


let currentAccessToken = localStorage.getItem("accessToken") || null;

export const setAccessToken = (token) => {
  currentAccessToken = token;
  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
};

export const getAccessToken = () => currentAccessToken;

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true, // Sends HTTP-only refreshToken cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Access Token to every outgoing request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// State for handling concurrent 401 refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;


    const isAuthEndpoint =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh-token");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
      
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        
        const refreshResponse = await axios.post(
          `${axiosInstance.defaults.baseURL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("Failed to receive new access token");
        }

    
        setAccessToken(newAccessToken);

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

       
        processQueue(null, newAccessToken);

       
        return axiosInstance(originalRequest);
      } catch (refreshError) {
       
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export async function register(payload) {
  try {
    const response = await axiosInstance.post("/api/auth/register", payload);
    const data = response.data?.data || response.data;
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Registration failed");
  }
}

export async function login(payload) {
  try {
    const response = await axiosInstance.post("/api/auth/login", payload);
    const data = response.data?.data || response.data;
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || "Login failed");
  }
}

export async function logout() {
  try {
    const response = await axiosInstance.post("/api/auth/logout");
    setAccessToken(null);
    return response.data;
  } catch (error) {
    setAccessToken(null);
    throw new Error(error.response?.data?.message || error.message || "Logout failed");
  }
}

export async function getProfile() {
  try {
    const response = await axiosInstance.get("/api/auth/profile");
    return response.data?.data?.user;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

export async function refreshAccessToken() {
  try {
    const response = await axiosInstance.post("/api/auth/refresh-token");
    const newAccessToken = response.data?.data?.accessToken;
    if (newAccessToken) {
      setAccessToken(newAccessToken);
    }
    return newAccessToken;
  } catch (error) {
    setAccessToken(null);
    throw new Error(error.response?.data?.message || error.message);
  }
}
