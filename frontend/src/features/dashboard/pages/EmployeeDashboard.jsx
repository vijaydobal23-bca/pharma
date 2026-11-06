import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { getEmployeeDashboard } from "../dashboard.api";
import { useToast } from "../../../components/ui/Toast";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import {
  ShoppingCart,
  Receipt,
  Pill,
  Boxes,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Stethoscope,
} from "lucide-react";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await getEmployeeDashboard();
        setData(res);
      } catch (err) {
        addToast(err.message || "Failed to load shift overview", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome & Register Shift Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Active Dispensary Shift</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || "Pharmacist"}! 👋
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm max-w-xl">
            Terminal register #01 is online with live FEFO batch prioritization and allergy detection.
          </p>
        </div>

        <Link
          to="/pos"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-teal-800 font-extrabold text-sm shadow-md hover:bg-teal-50 transition active:scale-[0.99] self-start sm:self-auto"
        >
          <ShoppingCart className="w-4 h-4 text-teal-600" />
          <span>Open POS Workstation (F2)</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-8">
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : (
        <>
          {/* Shift Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Dispensed Sales
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ${data?.todaySalesTotal?.toFixed(2) || "0.00"}
              </div>
              <p className="text-[11px] text-teal-700 font-semibold">
                Your personal shift total
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prescriptions Filled Today
              </span>
              <div className="text-2xl font-black text-teal-700 tracking-tight">
                {data?.todayTransactionsCount || 0} Bills
              </div>
              <p className="text-[11px] text-slate-500">
                Completed cashier checkouts
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Low-Stock Alerts
              </span>
              <div className="text-2xl font-black text-amber-600 tracking-tight">
                {data?.lowStockAlerts?.length || 0} Meds
              </div>
              <p className="text-[11px] text-slate-500">
                Under minimum dispensary threshold
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                FEFO Priority Batches
              </span>
              <div className="text-2xl font-black text-rose-600 tracking-tight">
                {data?.expiringAlerts?.length || 0} Batches
              </div>
              <p className="text-[11px] text-slate-500">
                Expiring within 60 days
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/pos"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition group block space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>POS Billing Workstation</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-slate-500">
                Dispense medication, scan barcodes, apply discounts, and generate thermal cash receipts.
              </p>
            </Link>

            <Link
              to="/medicines"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition group block space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
                <Pill className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Medicine Catalog</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-slate-500">
                Look up active chemical compositions, prescription requirements, and pricing monographs.
              </p>
            </Link>

            <Link
              to="/inventory"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition group block space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
                <Boxes className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>FEFO Inventory & Batches</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-slate-500">
                Inspect physical shelf locations, check expiration dates, and perform manual stock adjustments.
              </p>
            </Link>
          </div>

          {/* Recent Shift Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>Your Recent Dispensation Invoices</span>
              </h3>
              <Link
                to="/sales"
                className="text-xs font-bold text-teal-600 hover:text-teal-700"
              >
                View Full Sales History &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data?.myRecentSales?.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  You have not dispensed any bills yet during this shift.
                </div>
              ) : (
                data?.myRecentSales?.map((sale) => (
                  <div
                    key={sale._id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-teal-700">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {sale.customerName} • {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 text-sm">
                        ${Number(sale.grandTotal).toFixed(2)}
                      </div>
                      <Badge
                        variant={sale.status === "completed" ? "success" : "default"}
                        size="xs"
                      >
                        {sale.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeDashboard;

