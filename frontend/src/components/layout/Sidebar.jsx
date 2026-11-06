import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  Receipt,
  Users,
  UserCog,
  LogOut,
  Activity,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  const onLogout = async () => {
    await handleLogout();
    navigate("/login");
  };

  const navItems = [
    {
      to: "/dashboard",
      icon: LayoutDashboard,
      label: isAdmin ? "Executive Analytics" : "Shift Dashboard",
      exact: true,
    },
    {
      to: "/pos",
      icon: ShoppingCart,
      label: "POS Billing",
      badge: "F2",
    },
    {
      to: "/medicines",
      icon: Pill,
      label: "Medicines",
    },
    {
      to: "/inventory",
      icon: Boxes,
      label: "Inventory & FEFO",
    },
    {
      to: "/sales",
      icon: Receipt,
      label: "Sales & Invoices",
    },
    {
      to: "/customers",
      icon: Users,
      label: "Customers",
    },
    // Admin only
    ...(isAdmin
      ? [
          {
            to: "/employees",
            icon: UserCog,
            label: "Employee Staff",
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 font-black text-lg">
              Rx
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                PharmaFlow
              </span>
              <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                Clinical POS
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Workstation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
                {item.adminOnly && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.profileImage ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || "Pharmacist"
                  )}&background=0D9488&color=fff&size=80`
                }
                alt="Avatar"
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-teal-500/30 shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Staff"}</p>
                <p className="text-[11px] text-teal-400 capitalize truncate flex items-center gap-1">
                  {isAdmin ? (
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Stethoscope className="w-3 h-3 text-teal-400" />
                  )}
                  {user?.role || "employee"}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

