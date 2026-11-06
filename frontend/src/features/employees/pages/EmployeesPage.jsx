import React, { useState, useEffect } from "react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeActivity,
} from "../employee.api";
import { useToast } from "../../../components/ui/Toast";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import {
  UserCog,
  Plus,
  Search,
  Eye,
  Edit,
  Power,
  ShieldCheck,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Receipt,
  Image as ImageIcon,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { uploadImageFile } from "../../common/upload.api";

const EmployeesPage = () => {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Form State
  const [empForm, setEmpForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    profileImage: "",
    role: "employee",
  });
  const [submittingForm, setSubmittingForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees({ search, status: statusFilter });
      setEmployees(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setEmpForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      profileImage: "",
      role: "employee",
    });
    setShowFormModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      password: "",
      phone: emp.phone || "",
      address: emp.address || "",
      profileImage: emp.profileImage || "",
      role: emp.role || "employee",
    });
    setShowFormModal(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Profile picture must be under 5MB", "warning");
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploaded = await uploadImageFile(file, "/employees");
      if (uploaded?.url) {
        setEmpForm((prev) => ({ ...prev, profileImage: uploaded.url }));
        addToast("Profile photo uploaded to ImageKit CDN", "success");
      }
    } catch (err) {
      console.error("Profile photo upload error:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmpForm((prev) => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
      addToast(err.message || "Failed to upload to ImageKit", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee._id, empForm);
        addToast(`Employee "${empForm.name}" updated successfully`, "success");
      } else {
        await createEmployee(empForm);
        addToast(`Employee account created for "${empForm.name}"`, "success");
      }
      setShowFormModal(false);
      fetchEmployees();
    } catch (err) {
      addToast(err.message || "Failed to save employee", "error");
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      const updated = await toggleEmployeeStatus(emp._id);
      addToast(`Account for ${emp.name} is now ${updated.status}`, "success");
      fetchEmployees();
    } catch (err) {
      addToast(err.message || "Failed to toggle status", "error");
    }
  };

  const openActivityModal = async (emp) => {
    setShowActivityModal(true);
    setLoadingActivity(true);
    try {
      const data = await getEmployeeActivity(emp._id);
      setSelectedActivity(data);
    } catch (err) {
      addToast("Failed to fetch employee activity", "error");
    } finally {
      setLoadingActivity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-teal-600" />
            <span>Staff & Pharmacist Management (Admin)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer dispensary staff credentials, active authorizations, and transaction audit trails.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Employee Account</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, email, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium text-xs"
        >
          <option value="all">All Employment Statuses</option>
          <option value="active">Active Staff</option>
          <option value="inactive">Inactive Staff</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No employees registered"
            description="Create employee accounts to grant staff access to the dispensary workstation."
            actionText="Create Employee"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Sales Made</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            emp.profileImage ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              emp.name
                            )}&background=0D9488&color=fff&size=80`
                          }
                          alt={emp.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Joined {new Date(emp.joiningDate || emp.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{emp.email}</div>
                      {emp.phone && (
                        <div className="text-[11px] text-slate-400 font-mono">{emp.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={emp.role === "admin" ? "indigo" : "teal"} size="xs">
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {emp.salesCount || 0} Invoices
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={emp.status === "active" ? "success" : "danger"}
                        size="xs"
                      >
                        {emp.status || "active"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openActivityModal(emp)}
                          title="View Employee Activity & Logs"
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          title="Edit Profile"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          title={
                            emp.status === "active"
                              ? "Deactivate Employee"
                              : "Activate Employee"
                          }
                          className={`p-1.5 rounded-lg transition ${
                            emp.status === "active"
                              ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : "Create Employee Account"}
        subtitle="Credentials will authenticate through the existing secure auth system"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="Sarah Jenkins, RPh"
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address (Login Username) *
              </label>
              <input
                type="email"
                required
                disabled={Boolean(editingEmployee)}
                placeholder="sarah@pharmacy.com"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {editingEmployee ? "Reset Password (leave blank to keep)" : "Password *"}
              </label>
              <input
                type="password"
                required={!editingEmployee}
                placeholder="At least 6 characters"
                value={empForm.password}
                onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                System Role
              </label>
              <select
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="employee">Pharmacist / Staff Member</option>
                <option value="admin">Pharmacy Administrator</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Telephone Number
              </label>
              <input
                type="tel"
                placeholder="+1 800-555-0188"
                value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Physical Address
              </label>
              <input
                type="text"
                placeholder="42 Baker St, West District"
                value={empForm.address}
                onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Profile Picture Upload with ImageKit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Profile Photo (ImageKit Integration)
              </label>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CloudUpload className="w-3 h-3 text-teal-600" /> ImageKit CDN Active
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
              {uploadingPhoto ? (
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center text-teal-600 shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[8px] font-bold mt-0.5">Uploading</span>
                </div>
              ) : empForm.profileImage ? (
                <div className="relative group shrink-0">
                  <img
                    src={empForm.profileImage}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setEmpForm((prev) => ({ ...prev, profileImage: "" }))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs hover:bg-rose-700"
                    title="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-0.5 flex-1">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={handleImageChange}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400">
                  {uploadingPhoto
                    ? "Uploading photo via Multer to ImageKit..."
                    : empForm.profileImage?.startsWith("http")
                    ? "✓ Profile photo hosted on ImageKit CDN"
                    : "Max 5MB. Uploads via Multer directly to ImageKit."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingForm}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {submittingForm ? "Saving..." : editingEmployee ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Activity & Performance Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title={selectedActivity?.employee?.name}
        subtitle={`Role: ${selectedActivity?.employee?.role} • Status: ${selectedActivity?.employee?.status}`}
        maxWidth="max-w-3xl"
      >
        {loadingActivity ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading activity records...</p>
          </div>
        ) : selectedActivity ? (
          <div className="space-y-4 text-xs">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-[11px] font-bold text-teal-800 block">Total Sales Generated</span>
                <span className="text-xl font-black text-teal-900">
                  ${selectedActivity.totalSalesAmount?.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-600 block">Bills Dispensed</span>
                <span className="text-xl font-black text-slate-900">
                  {selectedActivity.totalSalesCount}
                </span>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                <span>Recent Auditable Actions ({selectedActivity.auditLogs?.length || 0})</span>
              </h5>

              {selectedActivity.auditLogs?.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-400">
                  No activity actions recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedActivity.auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                            {new Date(log.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-3 font-bold text-teal-800">{log.action}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-sm">
                            {log.description}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {log.amount ? `$${Number(log.amount).toFixed(2)}` : "-"}
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

export default EmployeesPage;

