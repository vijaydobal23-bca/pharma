import { useContext } from "react";
import { authContext } from "../auth.context";
import { login, register, logout } from "../api/auth.api";

export function useAuth() {
  const context = useContext(authContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }

  const { user, setUser, loading, setLoading, error, setError } = context;

  async function handleRegister(payload) {
    try {
      setLoading(true);
      setError(null);
      const data = await register(payload);
      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      const msg = err.message || "Registration failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(payload) {
    try {
      setLoading(true);
      setError(null);
      const data = await login(payload);
      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      const msg = err.message || "Login failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoading(true);
      setError(null);
      await logout();
      setUser(null);
      return { success: true };
    } catch (err) {
      const msg = err.message || "Logout failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  return {
    user,
    setUser,
    loading,
    error,
    setError,
    handleRegister,
    handleLogin,
    handleLogout,
  };
}
