import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { getInventoryAlerts } from "../../features/inventory/inventory.api";
import {
  Menu,
  Bell,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Shield,
  CircleDot,
} from "lucide-react";

const Topbar = ({ onOpenSidebar }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState({ lowStockMedicines: [], expiringBatches: [] });
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getInventoryAlerts();
        if (data) setAlerts(data);
      } catch (err) {
        // Silently ignore if not authorized or network failure
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

  const totalAlertCount =
    (alerts.lowStockMedicines?.length || 0) + (alerts.expiringBatches?.length || 0);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-600">
            Terminal Register #01
          </span>
          <span className="text-xs text-slate-400 font-mono">|</span>
          <span className="text-xs text-slate-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick POS action button */}
        <Link
          to="/pos"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/20 transition"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Launch POS (F2)</span>
        </Link>

        {/* Alerts Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Clinical & Stock Alerts"
          >
            <Bell className="w-5 h-5" />
            {totalAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {totalAlertCount > 9 ? "9+" : totalAlertCount}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Critical Pharmacy Alerts
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {totalAlertCount} Active
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
                {totalAlertCount === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No active stock or expiry alerts.
                  </div>
                ) : (
                  <>
                    {alerts.lowStockMedicines?.map((item) => (
                      <Link
                        key={item.medicine._id}
                        to="/inventory"
                        onClick={() => setShowAlertMenu(false)}
                        className="p-2.5 flex items-start gap-2.5 hover:bg-rose-50/50 rounded-xl transition block"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.medicine.name}
                          </p>
                          <p className="text-[11px] text-rose-600">
                            Low Stock: {item.currentStock} left (Min: {item.minStockLevel})
                          </p>
                        </div>
                      </Link>
                    ))}
                    {alerts.expiringBatches?.map((b) => (
                      <Link
                        key={b._id}
                        to="/inventory"
                        onClick={() => setShowAlertMenu(false)}
                        className="p-2.5 flex items-start gap-2.5 hover:bg-amber-50/50 rounded-xl transition block"
                      >
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            Batch {b.batchNumber} ({b.medicine?.name})
                          </p>
                          <p className="text-[11px] text-amber-600">
                            Expiring: {new Date(b.expiryDate).toLocaleDateString()} ({b.quantity} units)
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  to="/inventory"
                  onClick={() => setShowAlertMenu(false)}
                  className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                >
                  View All in Inventory &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          <img
            src={
              user?.profileImage ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || "Pharmacist"
              )}&background=0D9488&color=fff&size=80`
            }
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
          <div className="text-left">
            <span className="block text-xs font-bold text-slate-800 leading-tight">
              {user?.name || "Staff"}
            </span>
            <span className="block text-[10px] font-medium text-slate-500 capitalize">
              {user?.role === "admin" ? "Administrator" : "Pharmacist"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

