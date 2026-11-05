import { createContext, useState, useEffect } from "react";
import { getProfile, getAccessToken } from "./api/auth.api";

export const authContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on initial mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getProfile();
        setUser(userData);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <authContext.Provider
      value={{
        user,
        setUser,
        loading,
        setLoading,
        error,
        setError,
        err: error, // backwards compatibility
      }}
    >
      {children}
    </authContext.Provider>
  );
};
