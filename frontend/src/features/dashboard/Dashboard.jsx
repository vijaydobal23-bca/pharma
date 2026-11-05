import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";
import { getProfile, refreshAccessToken, getAccessToken } from "../auth/api/auth.api";

const Dashboard = () => {
  const { user, handleLogout, loading } = useAuth();
  const navigate = useNavigate();
  const [apiMessage, setApiMessage] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  const onLogout = async () => {
    await handleLogout();
    navigate("/login");
  };

  const handleTestProtectedApi = async () => {
    setTestingApi(true);
    setApiMessage(null);
    try {
      const data = await getProfile();
      setApiMessage({
        type: "success",
        text: `Protected API Succeeded! Verified user: ${data.name} (${data.email})`,
      });
    } catch (err) {
      setApiMessage({
        type: "error",
        text: `API Call failed: ${err.message}`,
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleManualTokenRefresh = async () => {
    setTestingApi(true);
    setApiMessage(null);
    try {
      const newToken = await refreshAccessToken();
      setApiMessage({
        type: "success",
        text: `Access Token successfully regenerated! New token: ${newToken.slice(0, 15)}...`,
      });
    } catch (err) {
      setApiMessage({
        type: "error",
        text: `Token regeneration failed: ${err.message}`,
      });
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              Rx
            </div>
            <div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">
                Pharma Portal
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name || "Pharmacist"}
              </p>
              <p className="text-xs text-slate-500">{user?.email || "user@pharma.com"}</p>
            </div>
            <button
              onClick={onLogout}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || "Pharmacist"}! 👋
          </h2>
          <p className="text-teal-100 text-sm sm:text-base mt-2 max-w-2xl">
            Your pharmacy dashboard is connected. Access tokens are automatically refreshed in the background via the HTTP-only cookie refresh mechanism.
          </p>
        </div>

        {apiMessage && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
              apiMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{apiMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              Active Profile Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Full Name</span>
                <span className="font-semibold text-slate-800">{user?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Email</span>
                <span className="font-semibold text-slate-800">{user?.email || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Role</span>
                <span className="inline-block uppercase tracking-wider text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {user?.role || "user"}
                </span>
              </div>
            </div>
          </div>

          {/* Token Health Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              Security & Tokens
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Access Token is attached to Axios requests. When it expires, Axios automatically intercepts the 401 response and requests a fresh token using your secure refresh cookie.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleTestProtectedApi}
                disabled={testingApi}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition disabled:opacity-50"
              >
                {testingApi ? "Verifying..." : "Test Protected /api/auth/profile"}
              </button>
              <button
                onClick={handleManualTokenRefresh}
                disabled={testingApi}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              >
                Trigger Manual Token Regeneration
              </button>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Status
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span>Access Token Status</span>
                <span className="text-emerald-600 font-semibold text-xs">
                  {getAccessToken() ? "Active (In-Memory)" : "None"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span>Refresh Token Storage</span>
                <span className="text-indigo-600 font-semibold text-xs">
                  HTTP-Only Cookie
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Backend Port</span>
                <span className="font-mono text-xs text-slate-800">5000</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

