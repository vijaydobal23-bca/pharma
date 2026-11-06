import React, { useState, useEffect } from "react";
import {
  getInventoryBatches,
  addStockBatch,
  updateBatch,
  adjustStock,
  getInventoryAlerts,
  getStockMovements,
} from "../inventory.api";
import { getMedicines } from "../../medicines/medicine.api";
import { getSuppliers } from "../../suppliers/supplier.api";
import { useToast } from "../../../components/ui/Toast";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  History,
  SlidersHorizontal,
  CheckCircle,
  CheckCircle2,
  Calendar,
  XCircle,
  PackageCheck,
  Sparkles,
} from "lucide-react";

const InventoryPage = () => {
  const { addToast } = useToast();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expiringFilter, setExpiringFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Critical alerts
  const [alerts, setAlerts] = useState({
    lowStockMedicines: [],
    outOfStockMedicines: [],
    expiringBatches: [],
    expiredBatches: [],
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  // Data for Selects
  const [medicinesList, setMedicinesList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);

  // Add Batch Form
  const [batchForm, setBatchForm] = useState({
    medicineId: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    expiryDays: "30",
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    supplierId: "",
    supplierName: "",
    location: "Aisle 1",
  });
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Helper to open Add Batch Modal with smart 30-day default
  const openAddModal = () => {
    const defaultDays = 30;
    const d = new Date();
    d.setDate(d.getDate() + defaultDays);
    const iso = d.toISOString().split("T")[0];

    setBatchForm({
      medicineId: "",
      batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
      manufacturingDate: new Date().toISOString().split("T")[0],
      expiryDate: iso,
      expiryDays: "30",
      purchasePrice: "",
      sellingPrice: "",
      quantity: "",
      supplierId: "",
      supplierName: "",
      location: "Aisle 1",
    });
    setShowAddModal(true);
  };

  // Calculate calendar date from days input
  const handleDaysChange = (daysVal) => {
    const days = parseInt(daysVal, 10);
    if (!isNaN(days) && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const iso = d.toISOString().split("T")[0];
      setBatchForm((prev) => ({
        ...prev,
        expiryDays: String(daysVal),
        expiryDate: iso,
      }));
    } else {
      setBatchForm((prev) => ({
        ...prev,
        expiryDays: daysVal,
        expiryDate: "",
      }));
    }
  };

  // Calculate days count from date picker
  const handleDateChange = (dateVal) => {
    if (dateVal) {
      const picked = new Date(dateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = picked - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setBatchForm((prev) => ({
        ...prev,
        expiryDate: dateVal,
        expiryDays: diffDays > 0 ? String(diffDays) : "",
      }));
    } else {
      setBatchForm((prev) => ({ ...prev, expiryDate: "", expiryDays: "" }));
    }
  };

  // Stock Adjustment Form
  const [adjustData, setAdjustData] = useState({
    batchId: "",
    adjustmentType: "subtract", // 'add' | 'subtract'
    quantity: "",
    reason: "Damaged / Expired stock write-off",
  });
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Movements Audit Log State
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const fetchBatches = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getInventoryBatches({
        page,
        limit: 15,
        search,
        status: statusFilter,
        expiringWithinDays: expiringFilter || undefined,
      });
      setBatches(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      addToast(err.message || "Failed to load inventory batches", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAlertsAndMeta = async () => {
    try {
      const alertData = await getInventoryAlerts();
      if (alertData) setAlerts(alertData);

      const medsRes = await getMedicines({ limit: 100, status: "active" });
      if (medsRes?.data) setMedicinesList(medsRes.data);

      const supRes = await getSuppliers();
      if (supRes) setSuppliersList(supRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatches(1);
    loadAlertsAndMeta();
  }, [statusFilter, expiringFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBatches(1);
  };

  // Add Batch Submit
  const handleAddBatchSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBatch(true);
    try {
      await addStockBatch(batchForm);
      addToast(`Batch ${batchForm.batchNumber} added to inventory`, "success");
      setShowAddModal(false);
      setBatchForm({
        medicineId: "",
        batchNumber: "",
        manufacturingDate: "",
        expiryDate: "",
        purchasePrice: "",
        sellingPrice: "",
        quantity: "",
        supplierId: "",
        supplierName: "",
        location: "Aisle 1",
      });
      fetchBatches(1);
      loadAlertsAndMeta();
    } catch (err) {
      addToast(err.message || "Failed to add batch", "error");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Open Adjust Modal
  const openAdjustModal = (batch) => {
    setSelectedBatchForAdjust(batch);
    setAdjustData({
      batchId: batch._id,
      adjustmentType: "subtract",
      quantity: 1,
      reason: "Damaged packaging / Expired write-off",
    });
    setShowAdjustModal(true);
  };

  // Adjust Submit
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAdjust(true);
    try {
      await adjustStock(adjustData);
      addToast(`Batch stock updated and audit record logged`, "success");
      setShowAdjustModal(false);
      fetchBatches(pagination.page);
      loadAlertsAndMeta();
    } catch (err) {
      addToast(err.message || "Stock adjustment failed", "error");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Open Movements Log
  const openMovementsLog = async () => {
    setShowMovementsModal(true);
    setLoadingMovements(true);
    try {
      const res = await getStockMovements({ limit: 40 });
      setMovements(res.data || []);
    } catch (err) {
      addToast("Failed to fetch movements history", "error");
    } finally {
      setLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-teal-600" />
            <span>Inventory & FEFO Batch Oversight</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor batch shelf-life, automatic FEFO dispensation orders, and real-time stock thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openMovementsLog}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Movement Audit Log</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Batch</span>
          </button>
        </div>
      </div>

      {/* Alert Callout Cards */}
      {(alerts.lowStockMedicines.length > 0 || alerts.expiringBatches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Low Stock Alert Banner */}
          {alerts.lowStockMedicines.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-900 block">
                  Low-Stock Reorder Required ({alerts.lowStockMedicines.length} Medicines)
                </span>
                <p className="text-[11px] text-amber-700">
                  {alerts.lowStockMedicines.slice(0, 3).map((m) => `${m.medicine.name} (${m.currentStock} left)`).join(", ")}
                  {alerts.lowStockMedicines.length > 3 ? "..." : ""}
                </p>
              </div>
            </div>
          )}

          {/* Near Expiry Banner */}
          {alerts.expiringBatches.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-900 block">
                  Near Expiry Attention ({alerts.expiringBatches.length} Batches within 60 days)
                </span>
                <p className="text-[11px] text-rose-700">
                  {alerts.expiringBatches.slice(0, 3).map((b) => `${b.batchNumber} (${new Date(b.expiryDate).toLocaleDateString()})`).join(", ")}
                  {alerts.expiringBatches.length > 3 ? "..." : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch number..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Available</option>
            <option value="depleted">Depleted (0 Stock)</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={expiringFilter}
            onChange={(e) => setExpiringFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Expiry Dates</option>
            <option value="30">Expiring in 30 Days</option>
            <option value="60">Expiring in 60 Days (Warning)</option>
            <option value="90">Expiring in 90 Days</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory batches found"
            description="Add stock batches directly to populate inventory."
            actionText="Add Stock Batch"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine & Formulation</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-3">Expiry Date (FEFO)</th>
                  <th className="py-3 px-3 text-center">Remaining Stock</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {batches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {batch.medicine?.name || "Unknown Medicine"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {batch.medicine?.category} • Location: {batch.location || "Aisle 1"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-slate-900 block">
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                        {batch.isExpired ? (
                          <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            EXPIRED ({Math.abs(batch.daysUntilExpiry || 0)}d ago)
                          </span>
                        ) : batch.daysUntilExpiry !== undefined && batch.daysUntilExpiry <= 30 ? (
                          <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Exp in {batch.daysUntilExpiry} days
                          </span>
                        ) : batch.isNearExpiry ? (
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Exp in {batch.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {batch.daysUntilExpiry ? `${batch.daysUntilExpiry}d shelf life` : "FEFO Priority"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-black text-sm text-slate-900">
                        {batch.quantity}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        of {batch.initialQuantity} units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      ${Number(batch.purchasePrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-teal-800">
                      ${Number(batch.sellingPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={
                          batch.status === "active"
                            ? "success"
                            : batch.status === "expired"
                            ? "danger"
                            : "default"
                        }
                        size="xs"
                      >
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(batch)}
                        title="Adjust Stock / Write-off"
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} batches)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchBatches(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchBatches(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Stock Batch Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Stock Batch"
        subtitle="Direct batch addition with manufacturing and FEFO expiry dating"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddBatchSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Medicine Select */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Medicine *
              </label>
              <select
                required
                value={batchForm.medicineId}
                onChange={(e) => {
                  const med = medicinesList.find((m) => m._id === e.target.value);
                  setBatchForm({
                    ...batchForm,
                    medicineId: e.target.value,
                    purchasePrice: med?.purchasePrice || "",
                    sellingPrice: med?.sellingPrice || "",
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Choose medicine...</option>
                {medicinesList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BATCH-2026-X1"
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Manufacturing Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={batchForm.manufacturingDate}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, manufacturingDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Expiry Date & Days Selection */}
            <div className="col-span-1 sm:col-span-2 p-3.5 bg-teal-50/60 rounded-xl border border-teal-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs">
                  Expiry Period (Enter Days like 30, 60, 90) *
                </label>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                  FEFO Priority Auto-Sorted
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
                {[
                  { label: "30 Days (1 Mo)", days: 30 },
                  { label: "60 Days (2 Mos)", days: 60 },
                  { label: "90 Days (3 Mos)", days: 90 },
                  { label: "180 Days (6 Mos)", days: 180 },
                  { label: "365 Days (1 Yr)", days: 365 },
                  { label: "730 Days (2 Yrs)", days: 730 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleDaysChange(preset.days)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      Number(batchForm.expiryDays) === preset.days
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Direct Days Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Validity in Days (e.g. 30):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 30"
                      value={batchForm.expiryDays}
                      onChange={(e) => handleDaysChange(e.target.value)}
                      className="w-full pl-3 pr-14 py-2 rounded-xl border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                      days
                    </span>
                  </div>
                </div>

                {/* Calendar Date Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Or Specific Calendar Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiryDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Active Preview Pill */}
              {batchForm.expiryDate && (
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-teal-200 text-xs text-teal-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    Expires on <strong>{new Date(batchForm.expiryDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                    {batchForm.expiryDays ? ` (in ${batchForm.expiryDays} days)` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Quantity Added *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="100"
                value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Batch Purchase Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="4.50"
                value={batchForm.purchasePrice}
                onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Batch Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="8.00"
                value={batchForm.sellingPrice}
                onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Supplier
              </label>
              <select
                value={batchForm.supplierId}
                onChange={(e) => {
                  const s = suppliersList.find((sup) => sup._id === e.target.value);
                  setBatchForm({
                    ...batchForm,
                    supplierId: e.target.value,
                    supplierName: s?.name || "",
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Direct or existing supplier...</option>
                {suppliersList.map((sup) => (
                  <option key={sup._id} value={sup._id}>
                    {sup.name} ({sup.companyName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBatch}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submittingBatch ? "Adding Batch..." : "Add Batch to Stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Stock Level Adjustment"
        subtitle={`Adjust available stock for batch ${selectedBatchForAdjust?.batchNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block">Medicine:</span>
            <span className="font-bold text-slate-900 text-sm">
              {selectedBatchForAdjust?.medicine?.name}
            </span>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Current Available:</span>
              <span className="font-black text-teal-800">
                {selectedBatchForAdjust?.quantity} units
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, adjustmentType: "subtract" })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  adjustData.adjustmentType === "subtract"
                    ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                - Subtract Stock (Loss/Damaged)
              </button>
              <button
                type="button"
                onClick={() => setAdjustData({ ...adjustData, adjustmentType: "add" })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  adjustData.adjustmentType === "add"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                + Add Stock (Correction)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Quantity to Adjust *
            </label>
            <input
              type="number"
              min="1"
              required
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Audit Reason *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Expired batch removal, physical inventory audit mismatch"
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAdjust}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submittingAdjust ? "Updating..." : "Commit Adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Audit Log Modal */}
      <Modal
        isOpen={showMovementsModal}
        onClose={() => setShowMovementsModal(false)}
        title="Stock Movement Ledger & Audit Trail"
        subtitle="Real-time chronological log of all stock deductions, receipts, and returns"
        maxWidth="max-w-3xl"
      >
        {loadingMovements ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading stock audit trail...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No stock movements recorded yet.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Medicine / Batch</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Change</th>
                  <th className="py-2.5 px-3">Reason / Ref</th>
                  <th className="py-2.5 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movements.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{m.medicineName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{m.batchNumber}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-black">
                      <span
                        className={
                          m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                      {m.reason} {m.referenceId ? `(${m.referenceId})` : ""}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">
                      {m.performedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;

