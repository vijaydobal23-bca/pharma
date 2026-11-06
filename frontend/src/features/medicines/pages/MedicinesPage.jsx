import React, { useState, useEffect } from "react";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getMedicineFilters,
  getMedicineById,
} from "../medicine.api";
import { useToast } from "../../../components/ui/Toast";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import {
  Pill,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  CheckCircle2,
  Clock,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { uploadImageFile } from "../../common/upload.api";

const MedicinesPage = () => {
  const { addToast } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [filterOptions, setFilterOptions] = useState({ categories: [], manufacturers: [] });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [initialStockData, setInitialStockData] = useState({
    initialQuantity: "100",
    initialBatchNumber: "",
    expiryDays: "30",
  });
  const [formData, setFormData] = useState({
    name: "",
    category: "Tablet",
    manufacturer: "",
    composition: "",
    description: "",
    purchasePrice: "",
    sellingPrice: "",
    prescriptionRequired: false,
    minStockLevel: 20,
    unit: "Strip",
    image: "",
  });

  // Details Modal
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch filter metadata
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const filters = await getMedicineFilters();
        if (filters) setFilterOptions(filters);
      } catch (err) {
        console.error(err);
      }
    };
    loadFilters();
  }, []);

  // Fetch medicines
  const fetchMedicines = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getMedicines({
        page,
        limit: 15,
        search,
        category: categoryFilter,
        manufacturer: manufacturerFilter,
      });
      setMedicines(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      addToast(err.message || "Failed to fetch medicines", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines(1);
  }, [categoryFilter, manufacturerFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedicines(1);
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setAddInitialStock(false);
    setInitialStockData({
      initialQuantity: "100",
      initialBatchNumber: `BTH-${Date.now().toString().slice(-4)}`,
      expiryDays: "30",
    });
    setFormData({
      name: "",
      category: filterOptions.categories[0] || "Tablet",
      manufacturer: "",
      composition: "",
      description: "",
      purchasePrice: "",
      sellingPrice: "",
      prescriptionRequired: false,
      minStockLevel: 20,
      unit: "Strip",
      image: "",
    });
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (med) => {
    setEditingMedicine(med);
    setAddInitialStock(false);
    setFormData({
      name: med.name,
      category: med.category,
      manufacturer: med.manufacturer,
      composition: med.composition,
      description: med.description || "",
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      prescriptionRequired: med.prescriptionRequired,
      minStockLevel: med.minStockLevel || 20,
      unit: med.unit || "Strip",
      image: med.image || "",
    });
    setIsFormOpen(true);
  };

  // Image Upload Handler using Multer & ImageKit CDN
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB", "warning");
      return;
    }

    setUploadingImage(true);
    try {
      // Direct Multer multipart upload to ImageKit
      const uploaded = await uploadImageFile(file, "/medicines");
      if (uploaded?.url) {
        setFormData((prev) => ({ ...prev, image: uploaded.url }));
        addToast("Image successfully uploaded to ImageKit CDN", "success");
      }
    } catch (err) {
      console.error("ImageKit upload error:", err);
      // Graceful local preview fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
      addToast(err.message || "Failed to upload image to ImageKit", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  // Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingMedicine) {
        await updateMedicine(editingMedicine._id, formData);
        addToast(`Medicine "${formData.name}" updated successfully`, "success");
      } else {
        const payload = { ...formData };
        if (addInitialStock && initialStockData.initialQuantity) {
          payload.initialQuantity = Number(initialStockData.initialQuantity);
          payload.initialBatchNumber = initialStockData.initialBatchNumber;
          payload.expiryDays = initialStockData.expiryDays;
        }
        const res = await createMedicine(payload);
        addToast(res.message || `Medicine "${formData.name}" created successfully`, "success");
      }
      setIsFormOpen(false);
      fetchMedicines(pagination.page);
    } catch (err) {
      addToast(err.message || "Failed to save medicine", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete / Deactivate
  const handleDeleteMedicine = async (med) => {
    if (!window.confirm(`Are you sure you want to deactivate "${med.name}"?`)) return;
    try {
      await deleteMedicine(med._id);
      addToast(`Medicine "${med.name}" deactivated`, "success");
      fetchMedicines(pagination.page);
    } catch (err) {
      addToast(err.message || "Failed to deactivate medicine", "error");
    }
  };

  // View Details
  const handleViewDetails = async (med) => {
    setViewingMedicine(med);
    setLoadingDetails(true);
    try {
      const data = await getMedicineById(med._id);
      setViewDetails(data);
    } catch (err) {
      addToast("Failed to load full medicine details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            <span>Medicine Master Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage drug formulations, strengths, prescription tags, and live inventory levels.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine name, active salt, manufacturer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Manufacturer Filter */}
          <select
            value={manufacturerFilter}
            onChange={(e) => setManufacturerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Manufacturers</option>
            {filterOptions.manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : medicines.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No medicines found"
            description="Try adjusting your search criteria or add a new medicine formulation."
            actionText="Add New Medicine"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine Info</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Manufacturer</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Live Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {medicines.map((med) => (
                  <tr key={med._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            med.image ||
                            "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={med.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                        />
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{med.name}</span>
                            {med.prescriptionRequired && (
                              <Badge variant="warning" size="xs">
                                Rx
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">
                            {med.composition}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <Badge variant="teal" size="xs">
                        {med.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {med.manufacturer}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      ${Number(med.purchasePrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-teal-800 text-sm">
                      ${Number(med.sellingPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="space-y-0.5">
                        <span
                          className={`font-black text-xs ${
                            med.totalStock === 0
                              ? "text-rose-600"
                              : med.isLowStock
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {med.totalStock} {med.unit || "Units"}
                        </span>
                        {med.isLowStock && (
                          <span className="block text-[10px] text-amber-700 font-bold">
                            Low Stock Alert
                          </span>
                        )}
                        {med.totalStock === 0 && (
                          <span className="block text-[10px] text-rose-700 font-bold">
                            Out of Stock
                          </span>
                        )}
                        {med.nearestExpiry && (
                          <span className="block text-[10px] text-slate-500 font-medium">
                            {(() => {
                              const days = Math.ceil(
                                (new Date(med.nearestExpiry) - new Date()) / (1000 * 60 * 60 * 24)
                              );
                              return days > 0 ? `Nearest Exp: ${days}d` : "Expired batch";
                            })()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(med)}
                          title="View Batches & Monographs"
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(med)}
                          title="Edit Medicine"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicine(med)}
                          title="Deactivate Medicine"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} medicines)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchMedicines(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchMedicines(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingMedicine ? `Edit: ${editingMedicine.name}` : "Add New Medicine"}
        subtitle="Master medicine formulation catalog (separate from individual batches)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin 500mg"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Dosage Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {["Tablet", "Syrup", "Capsule", "Injection", "Ointment", "Inhaler", "Drops"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Manufacturer / Brand *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pfizer Inc., GSK, Cipla"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Active Chemical Composition *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin Trihydrate 500mg"
                value={formData.composition}
                onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Default Purchase Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="4.50"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Base Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="8.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unit Pack Type
              </label>
              <input
                type="text"
                placeholder="Strip, Bottle, Vial, Box"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Min Stock Alert Level
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Clinical Usage & Indications
            </label>
            <textarea
              rows={2}
              placeholder="Dosage directions, antibiotic category, clinical notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Image Upload using ImageKit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Medicine Image (ImageKit Integration)
              </label>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CloudUpload className="w-3 h-3 text-teal-600" /> ImageKit CDN Active
              </span>
            </div>
            <div className="flex items-center gap-4 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              {uploadingImage ? (
                <div className="w-14 h-14 rounded-lg bg-teal-50 border border-teal-200 flex flex-col items-center justify-center text-teal-600 shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[8px] font-bold mt-1">Uploading...</span>
                </div>
              ) : formData.image ? (
                <div className="relative group shrink-0">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs hover:bg-rose-700"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleImageFileChange}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400">
                  {uploadingImage
                    ? "Uploading file via Multer to ImageKit..."
                    : formData.image?.startsWith("http")
                    ? "✓ Saved & hosted on ImageKit CDN"
                    : "PNG, JPG or WEBP up to 5MB. Uploads via Multer to ImageKit."}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Initial Stock Batch & Expiry in Days (For New Medicines) */}
          {!editingMedicine && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addInitialStock"
                    checked={addInitialStock}
                    onChange={(e) => setAddInitialStock(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <label htmlFor="addInitialStock" className="font-bold text-slate-800 text-xs cursor-pointer">
                    Add Initial Stock Batch & Expiry Date (Optional)
                  </label>
                </div>
                {addInitialStock && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    FEFO Batch Stocking
                  </span>
                )}
              </div>

              {addInitialStock && (
                <div className="space-y-3 pt-2 border-t border-slate-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Initial Stock Units *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required={addInitialStock}
                        placeholder="100"
                        value={initialStockData.initialQuantity}
                        onChange={(e) =>
                          setInitialStockData({ ...initialStockData, initialQuantity: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Batch Identifier *
                      </label>
                      <input
                        type="text"
                        required={addInitialStock}
                        placeholder="BTH-001"
                        value={initialStockData.initialBatchNumber}
                        onChange={(e) =>
                          setInitialStockData({ ...initialStockData, initialBatchNumber: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Expiry in Days for Medicine */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Expiry in Days (e.g. 30 days):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {[
                        { label: "30 Days (1 Mo)", days: 30 },
                        { label: "60 Days (2 Mos)", days: 60 },
                        { label: "90 Days (3 Mos)", days: 90 },
                        { label: "180 Days (6 Mos)", days: 180 },
                        { label: "365 Days (1 Yr)", days: 365 },
                      ].map((item) => (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => setInitialStockData({ ...initialStockData, expiryDays: String(item.days) })}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition ${
                            Number(initialStockData.expiryDays) === item.days
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        required={addInitialStock}
                        placeholder="e.g. 30"
                        value={initialStockData.expiryDays}
                        onChange={(e) =>
                          setInitialStockData({ ...initialStockData, expiryDays: e.target.value })
                        }
                        className="w-full pl-3 pr-14 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400 font-semibold">
                        days
                      </span>
                    </div>
                    {initialStockData.expiryDays && (
                      <p className="text-[11px] text-teal-700 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        Expires in {initialStockData.expiryDays} days (on{" "}
                        {(() => {
                          const d = new Date();
                          d.setDate(d.getDate() + Number(initialStockData.expiryDays || 30));
                          return d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        })()}
                        )
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prescription Required Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="prescriptionRequired"
              checked={formData.prescriptionRequired}
              onChange={(e) =>
                setFormData({ ...formData, prescriptionRequired: e.target.checked })
              }
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="prescriptionRequired" className="font-bold text-slate-800 cursor-pointer">
              Prescription Required (Rx Controlled Substance)
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {formSubmitting ? "Saving Medicine..." : editingMedicine ? "Update Medicine" : "Create Medicine"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Medicine Details & Associated Batches Modal */}
      <Modal
        isOpen={Boolean(viewingMedicine)}
        onClose={() => setViewingMedicine(null)}
        title={viewingMedicine?.name}
        subtitle={`${viewingMedicine?.category} • ${viewingMedicine?.manufacturer}`}
        maxWidth="max-w-3xl"
      >
        {loadingDetails ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading batch allocations & monographs...</p>
          </div>
        ) : viewDetails ? (
          <div className="space-y-5 text-xs">
            {/* Top specs card */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src={
                  viewDetails.medicine.image ||
                  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=80"
                }
                alt={viewDetails.medicine.name}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {viewDetails.medicine.name}
                  </h4>
                  {viewDetails.medicine.prescriptionRequired && (
                    <Badge variant="warning" size="xs">
                      Prescription Mandatory
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600 font-medium">
                  Salt Composition: {viewDetails.medicine.composition}
                </p>
                <p className="text-slate-500">{viewDetails.medicine.description}</p>
                <div className="flex gap-4 pt-1 font-semibold text-slate-700">
                  <span>
                    Cost: <strong className="text-slate-900">${Number(viewDetails.medicine.purchasePrice).toFixed(2)}</strong>
                  </span>
                  <span>
                    Selling Price: <strong className="text-teal-700 font-bold">${Number(viewDetails.medicine.sellingPrice).toFixed(2)}</strong>
                  </span>
                  <span>
                    Total Active Stock: <strong className="text-emerald-700">{viewDetails.totalStock} {viewDetails.medicine.unit}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Associated Batches Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Associated Batches & FEFO Expiry Queue ({viewDetails.batches?.length || 0})</span>
                </h5>
              </div>

              {viewDetails.batches?.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-400">
                  No inventory batches registered yet. Add batches via Stock Inventory.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3">Expiry Date (FEFO)</th>
                        <th className="py-2.5 px-3">Available Qty</th>
                        <th className="py-2.5 px-3">Batch Cost</th>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {viewDetails.batches.map((b) => (
                        <tr key={b._id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {b.batchNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-cyan-800 font-bold">
                              {new Date(b.expiryDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-800">
                            {b.quantity} / {b.initialQuantity}
                          </td>
                          <td className="py-2.5 px-3">${Number(b.purchasePrice).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {b.supplierName || b.supplier?.name || "Direct Supply"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={
                                b.status === "active"
                                  ? "success"
                                  : b.status === "expired"
                                  ? "danger"
                                  : "default"
                              }
                              size="xs"
                            >
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default MedicinesPage;

