import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../dashboard.api";
import { useToast } from "../../../components/ui/Toast";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Pill,
  Users,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Receipt,
  Calendar,
  Layers,
  CheckCircle2,
  Package,
} from "lucide-react";

const AdminDashboard = () => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customDates, setCustomDates] = useState({ startDate: "", endDate: "" });

  const fetchDashboardData = async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const params = { period: selectedPeriod };
      if (selectedPeriod === "custom" && customDates.startDate && customDates.endDate) {
        params.startDate = customDates.startDate;
        params.endDate = customDates.endDate;
      }
      const res = await getAdminDashboard(params);
      setData(res);
    } catch (err) {
      addToast(err.message || "Failed to load admin analytics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (!customDates.startDate || !customDates.endDate) {
      addToast("Please select both start and end dates", "warning");
      return;
    }
    setPeriod("custom");
    fetchDashboardData("custom");
  };

  const stats = data?.stats || {};
  const trends = data?.monthlyTrends || [];
  const alerts = data?.alerts || {};

  // Find max revenue in trends for bar scaling
  const maxTrendVal = Math.max(...trends.map((t) => Math.max(t.revenue, t.profit)), 100);

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Executive Pharmacy Analytics</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              Admin Portal
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business performance, margins, low-stock reorders, and auditable MongoDB analytics.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "year", label: "This Year" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === tab.id
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Custom Date Form */}
          <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={customDates.startDate}
              onChange={(e) => setCustomDates({ ...customDates, startDate: e.target.value })}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customDates.endDate}
              onChange={(e) => setCustomDates({ ...customDates, endDate: e.target.value })}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Gross Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ${stats.revenue?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>From {stats.salesCount || 0} completed invoices</span>
              </div>
            </div>

            {/* Total Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Net Realized Profit
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                ${stats.profit?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-slate-500">
                Calculated strictly via FEFO purchase batch costs
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Average Order Value
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ${stats.averageOrderValue?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[11px] text-slate-500">
                Per customer transaction basket
              </div>
            </div>

            {/* Dispensary Master Counts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Drug Catalog
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalMedicines || 0} Meds
              </div>
              <div className="text-[11px] text-slate-500">
                Across {stats.totalCategories || 0} dosage formulation categories
              </div>
            </div>
          </div>

          {/* Secondary KPI Row: Staff and Alerts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Pharmacy Employees</span>
                <span className="text-base font-extrabold text-slate-900">
                  {stats.activeEmployees || 0} Active / {stats.totalEmployees || 0} Total
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-amber-800 font-semibold block">Low-Stock Medications</span>
                <span className="text-base font-extrabold text-amber-900">
                  {stats.lowStockCount || 0} Under Reorder Threshold
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-rose-800 font-semibold block">Expiring Within 60 Days</span>
                <span className="text-base font-extrabold text-rose-900">
                  {stats.expiringCount || 0} Batches Requiring FEFO
                </span>
              </div>
            </div>
          </div>

          {/* Revenue & Profit Trends Visualizer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Monthly Financial Trends (Revenue vs Profit)
                </h3>
                <p className="text-xs text-slate-500">
                  Dynamic month-by-month trajectory based on actual MongoDB sales
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-600"></span>
                  <span className="text-slate-700">Gross Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span className="text-slate-700">Net Profit</span>
                </div>
              </div>
            </div>

            {trends.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No monthly sales history found for visualization.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {trends.map((item, idx) => {
                  const revWidth = Math.min(100, (item.revenue / maxTrendVal) * 100);
                  const profitWidth = Math.min(100, (item.profit / maxTrendVal) * 100);

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{item.name} ({item.sales} Invoices)</span>
                        <span className="space-x-3 font-mono">
                          <span className="text-teal-700">Rev: ${item.revenue.toFixed(2)}</span>
                          <span className="text-emerald-700">Profit: ${item.profit.toFixed(2)}</span>
                        </span>
                      </div>
                      {/* Bar tracks */}
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex gap-0.5 p-0.5">
                        <div
                          style={{ width: `${revWidth}%` }}
                          className="bg-teal-600 rounded-full h-full transition-all duration-500"
                        />
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex gap-0.5 p-0.5">
                        <div
                          style={{ width: `${profitWidth}%` }}
                          className="bg-emerald-500 rounded-full h-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two Columns: Recent Transactions & Alerts List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>Recent Sales Invoices</span>
                </h3>
                <Link
                  to="/sales"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700"
                >
                  View All Invoices &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data?.recentSales?.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No recent sales.</div>
                ) : (
                  data?.recentSales?.map((sale) => (
                    <div
                      key={sale._id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="font-mono font-bold text-teal-700">
                          {sale.invoiceNumber}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {sale.customerName} • By {sale.soldByName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-sm">
                          ${Number(sale.grandTotal).toFixed(2)}
                        </div>
                        <Badge
                          variant={sale.status === "completed" ? "success" : "danger"}
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

            {/* Low-Stock & Expiring Priority Monitor */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low-Stock & Expiring Attention</span>
                </h3>
                <Link
                  to="/inventory"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700"
                >
                  Inventory &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {alerts.lowStockMedicines?.length === 0 && alerts.expiringBatches?.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    Stock levels are optimal and no batches are near expiry.
                  </div>
                ) : (
                  <>
                    {alerts.lowStockMedicines?.slice(0, 4).map((m) => (
                      <div
                        key={m.medicine._id}
                        className="p-3 flex items-center justify-between hover:bg-amber-50/30 transition"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{m.medicine.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Category: {m.medicine.category}
                          </div>
                        </div>
                        <span className="font-black text-rose-600 text-xs">
                          {m.currentStock} Units Left (Min: {m.minStockLevel})
                        </span>
                      </div>
                    ))}

                    {alerts.expiringBatches?.slice(0, 3).map((b) => (
                      <div
                        key={b._id}
                        className="p-3 flex items-center justify-between hover:bg-rose-50/30 transition"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            Batch {b.batchNumber} ({b.medicine?.name})
                          </div>
                          <div className="text-[11px] text-rose-600">
                            Expires: {new Date(b.expiryDate).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {b.quantity} Units in Batch
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

