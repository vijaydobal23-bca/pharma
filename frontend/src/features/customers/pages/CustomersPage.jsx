import React, { useState, useEffect } from "react";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
} from "../customer.api";
import { useToast } from "../../../components/ui/Toast";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Receipt,
  DollarSign,
} from "lucide-react";

const CustomersPage = () => {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form State
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    allergies: "",
  });
  const [submittingForm, setSubmittingForm] = useState(false);

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getCustomers({ page, limit: 15, search });
      setCustomers(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      addToast(err.message || "Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: "", phone: "", email: "", address: "", allergies: "" });
    setShowFormModal(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setCustomerForm({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || "",
      address: cust.address || "",
      allergies: cust.allergies?.join(", ") || "",
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      const payload = {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        allergies: customerForm.allergies
          ? customerForm.allergies.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer._id, payload);
        addToast(`Patient "${payload.name}" updated successfully`, "success");
      } else {
        await createCustomer(payload);
        addToast(`Patient "${payload.name}" registered successfully`, "success");
      }
      setShowFormModal(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      addToast(err.message || "Failed to save customer", "error");
    } finally {
      setSubmittingForm(false);
    }
  };

  const openProfileModal = async (cust) => {
    setShowProfileModal(true);
    setLoadingProfile(true);
    try {
      const data = await getCustomerById(cust._id);
      setSelectedProfile(data);
    } catch (err) {
      addToast("Failed to fetch customer profile and invoices", "error");
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>Customer & Patient Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain patient drug profiles, lifetime dispensation spend, and sensitivity alerts.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, telephone number..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers registered"
            description="Add patients to keep track of their medication history and allergy warnings."
            actionText="Register Patient"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Allergy Alerts</th>
                  <th className="py-3 px-3 text-center">Total Invoices</th>
                  <th className="py-3 px-3 text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                      {cust.address && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                          <span className="truncate max-w-xs">{cust.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800 font-semibold">{cust.phone}</div>
                      {cust.email && <div className="text-[11px] text-slate-500">{cust.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {cust.allergies?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cust.allergies.map((all, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                              {all}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No known drug allergies</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {cust.totalVisits || 0}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-teal-800 text-sm">
                      ${Number(cust.totalSpent || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openProfileModal(cust)}
                          title="View Patient Prescription History"
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cust)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingCustomer ? `Edit Patient: ${editingCustomer.name}` : "Register New Patient"}
        subtitle="Record contact details and medical sensitivities for dispensing safety"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Eleanor Vance"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+1 555-014-8822"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="patient@email.com"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Residential Address
            </label>
            <input
              type="text"
              placeholder="742 Evergreen Terrace"
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Known Drug Sensitivities / Allergies (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="Penicillin, Sulfa, Ibuprofen"
              value={customerForm.allergies}
              onChange={(e) => setCustomerForm({ ...customerForm, allergies: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              {submittingForm ? "Saving..." : editingCustomer ? "Update Patient" : "Register Patient"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Profile & Purchase History Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title={selectedProfile?.customer?.name}
        subtitle={`Patient ID: ${selectedProfile?.customer?._id?.slice(-8)} • Phone: ${selectedProfile?.customer?.phone}`}
        maxWidth="max-w-3xl"
      >
        {loadingProfile ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading patient dispensation ledger...</p>
          </div>
        ) : selectedProfile ? (
          <div className="space-y-4 text-xs">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
                <span className="text-[11px] font-bold text-teal-800 block">
                  Lifetime Spend
                </span>
                <span className="text-xl font-black text-teal-900">
                  ${selectedProfile.totalSpending?.toFixed(2)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Total Pharmacy Invoices
                </span>
                <span className="text-xl font-black text-slate-900">
                  {selectedProfile.invoices?.length || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800 block">
                  Recorded Allergies
                </span>
                <span className="text-xs font-bold text-rose-900 block truncate mt-1">
                  {selectedProfile.customer?.allergies?.join(", ") || "None Recorded"}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient Dispensary Invoices</span>
              </h5>

              {selectedProfile.invoices?.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-400">
                  No invoices recorded for this patient.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Items Dispensed</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedProfile.invoices.map((inv) => (
                        <tr key={inv._id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {inv.items?.map((it) => `${it.medicineName} (${it.quantity})`).join(", ")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            ${Number(inv.grandTotal).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={inv.status === "completed" ? "success" : "danger"}
                              size="xs"
                            >
                              {inv.status}
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

export default CustomersPage;

