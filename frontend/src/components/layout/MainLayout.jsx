import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ToastProvider } from "../ui/Toast";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
        {/* Left Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Wrapper */}
        <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
          <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default MainLayout;

