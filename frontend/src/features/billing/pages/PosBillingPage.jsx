import React, { useState, useEffect, useRef } from "react";
import { getMedicines } from "../../medicines/medicine.api";
import { getCustomers, createCustomer } from "../../customers/customer.api";
import { createBill } from "../billing.api";
import { useToast } from "../../../components/ui/Toast";
import ThermalInvoicePrintModal from "../components/ThermalInvoicePrintModal";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  UserPlus,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Sparkles,
  CheckCircle2,
  Package,
} from "lucide-react";

const PosBillingPage = () => {
  const { addToast } = useToast();

  // Search & Medicine Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef(null);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5); // default 5% GST

  // Customer State
  const [customerMode, setCustomerMode] = useState("walkin"); // 'walkin' | 'existing' | 'new'
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    allergies: "",
  });
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // 'Cash' | 'UPI' | 'Card'
  const [amountTendered, setAmountTendered] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Completed Invoice Modal
  const [completedSale, setCompletedSale] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Quick OTC Medicines
  const [otcMedicines, setOtcMedicines] = useState([]);

  // Focus shortcut: F2 focuses search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch initial OTC medicines and customer list
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const medsRes = await getMedicines({ limit: 8, status: "active" });
        if (medsRes?.data) setOtcMedicines(medsRes.data);

        const custRes = await getCustomers({ limit: 100 });
        if (custRes?.data) setCustomersList(custRes.data);
      } catch (err) {
        console.error("Initial load error:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Debounced search for medicines
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getMedicines({ search: searchQuery, limit: 10, status: "active" });
        setSearchResults(res?.data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add medicine to Cart
  const handleAddToCart = (medicine) => {
    if (!medicine.totalStock || medicine.totalStock <= 0) {
      addToast(`"${medicine.name}" is currently Out of Stock!`, "error");
      return;
    }

    // Check allergy warning if customer selected
    if (selectedCustomer?.allergies?.length) {
      const allergyMatch = selectedCustomer.allergies.some(
        (all) =>
          medicine.name.toLowerCase().includes(all.toLowerCase()) ||
          medicine.composition?.toLowerCase().includes(all.toLowerCase())
      );
      if (allergyMatch) {
        addToast(
          `PATIENT ALLERGY ALERT: ${selectedCustomer.name} has recorded sensitivity to components in ${medicine.name}!`,
          "warning",
          6000
        );
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.medicineId === medicine._id);
      if (existing) {
        if (existing.quantity >= medicine.totalStock) {
          addToast(`Max available stock (${medicine.totalStock}) reached for this item`, "warning");
          return prev;
        }
        return prev.map((item) =>
          item.medicineId === medicine._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            medicineId: medicine._id,
            medicineName: medicine.name,
            composition: medicine.composition,
            category: medicine.category,
            unit: medicine.unit,
            unitPrice: medicine.sellingPrice,
            quantity: 1,
            maxStock: medicine.totalStock,
            discountPercent: 0,
            taxPercent: 5,
            prescriptionRequired: medicine.prescriptionRequired,
            nearestExpiry: medicine.nearestExpiry,
          },
        ];
      }
    });

    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleUpdateQuantity = (medicineId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(medicineId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.medicineId === medicineId) {
          if (newQty > item.maxStock) {
            addToast(`Cannot exceed total available stock of ${item.maxStock}`, "warning");
            return { ...item, quantity: item.maxStock };
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (medicineId) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  // Calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = (grossSubtotal * discountPercent) / 100;
  const taxableAmount = grossSubtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

  const changeDue = Math.max(
    0,
    Number((Number(amountTendered || grandTotal) - grandTotal).toFixed(2))
  );

  // Handle New Customer Creation inline
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.phone) {
      addToast("Customer name and phone number are required", "error");
      return;
    }

    try {
      const created = await createCustomer({
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        address: newCustomerForm.address,
        allergies: newCustomerForm.allergies
          ? newCustomerForm.allergies.split(",").map((a) => a.trim())
          : [],
      });
      setSelectedCustomer(created);
      setCustomersList((prev) => [created, ...prev]);
      setShowNewCustomerModal(false);
      setNewCustomerForm({ name: "", phone: "", address: "", allergies: "" });
      addToast(`Customer ${created.name} registered and selected`, "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // Handle Checkout / Bill Creation
  const handleCheckout = async () => {
    if (cart.length === 0) {
      addToast("Cart is empty. Please add medicines first.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerData: {
          customerId: selectedCustomer?._id || null,
          name: selectedCustomer?.name || "Walk-in Customer",
          phone: selectedCustomer?.phone || "",
          address: selectedCustomer?.address || "",
          allergies: selectedCustomer?.allergies || [],
        },
        items: cart.map((item) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          requestedQuantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: discountPercent,
          taxPercent: taxPercent,
        })),
        paymentMethod,
        paymentDetails: {
          amountTendered: Number(amountTendered || grandTotal),
          changeDue,
          transactionRef,
        },
        notes,
      };

      const sale = await createBill(payload);
      setCompletedSale(sale);
      setShowPrintModal(true);
      setCart([]);
      setAmountTendered("");
      setTransactionRef("");
      setNotes("");
      setSelectedCustomer(null);
      addToast(`Invoice ${sale.invoiceNumber} created successfully!`, "success");
    } catch (err) {
      addToast(err.message || "Checkout failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Hotkeys Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              POS Dispensary Register
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                FEFO Active
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Point-of-sale dispensation with automatic First-Expiry-First-Out batch selection.
            </p>
          </div>
        </div>

        {/* Hotkeys */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-slate-600 border border-slate-200">
            [F2] Focus Search
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 font-mono text-teal-700 border border-teal-200">
            [Enter] Complete Sale
          </span>
        </div>
      </div>

      {/* Main Grid: Left Catalog/Cart (8 cols) + Right Checkout Summary (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Patient / Customer Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Active Patient Profile
              </span>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register New Patient</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({selectedCustomer.phone})
                    </span>
                    {selectedCustomer.allergies?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Allergies: {selectedCustomer.allergies.join(", ")}
                      </span>
                    )}
                  </div>
                  {selectedCustomer.address && (
                    <p className="text-[11px] text-slate-500 truncate max-w-md">
                      Address: {selectedCustomer.address}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition px-2 py-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value=""
                  onChange={(e) => {
                    const cust = customersList.find((c) => c._id === e.target.value);
                    if (cust) setSelectedCustomer(cust);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Existing Customer / Patient (or leave as Walk-in)...</option>
                  {customersList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — {c.phone} {c.allergies?.length ? `[Allergies: ${c.allergies.join(", ")}]` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-bold text-slate-400">OR</span>
                <span className="text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-100 rounded-xl">
                  Walk-in Guest
                </span>
              </div>
            )}
          </div>

          {/* Omnisearch Bar with FEFO Previews */}
          <div className="relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine name, salt/composition, brand... (Press F2 to focus)"
                className="w-full pl-11 pr-12 py-3 bg-white border border-slate-300 rounded-2xl shadow-xs text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              {searching && (
                <div className="absolute right-3.5 top-3.5 w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((med) => (
                  <div
                    key={med._id}
                    onClick={() => handleAddToCart(med)}
                    className="p-3.5 hover:bg-teal-50/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                        <Badge variant="teal" size="xs">
                          {med.category}
                        </Badge>
                        {med.prescriptionRequired && (
                          <Badge variant="warning" size="xs">
                            Rx Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {med.composition} • {med.manufacturer}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-sm font-extrabold text-teal-700">
                        ${Number(med.sellingPrice).toFixed(2)}
                      </div>
                      <div className="text-[11px] font-semibold flex items-center gap-1.5 justify-end">
                        <span
                          className={`${
                            med.totalStock > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {med.totalStock > 0 ? `Stock: ${med.totalStock}` : "Out of Stock"}
                        </span>
                        {med.nearestExpiry && (
                          <span className="font-mono text-[10px] text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                            FEFO Exp: {new Date(med.nearestExpiry).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Cart Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>Dispensary Cart</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {cart.length} {cart.length === 1 ? "Item" : "Items"}
                </span>
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 transition"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400">
                  Scan a barcode or use the search bar above [F2] to add medicines.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Medicine & Formula</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cart.map((item) => (
                      <tr key={item.medicineId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.medicineName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {item.composition}
                          </div>
                          {item.nearestExpiry && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono text-cyan-800 bg-cyan-50 px-1 rounded border border-cyan-200">
                              FEFO: {new Date(item.nearestExpiry).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{item.category}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          ${Number(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.medicineId, item.quantity - 1)}
                              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-bold text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.medicineId, item.quantity + 1)}
                              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.medicineId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick OTC Medicines bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Rapid OTC Additions
            </span>
            <div className="flex flex-wrap gap-2">
              {otcMedicines.slice(0, 6).map((med) => (
                <button
                  key={med._id}
                  type="button"
                  onClick={() => handleAddToCart(med)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 text-teal-600" />
                  <span>{med.name}</span>
                  <span className="text-[10px] text-teal-700 font-bold">
                    ${Number(med.sellingPrice).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Billing Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Financial Summary</span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                USD ($)
              </span>
            </h3>

            {/* Summary lines */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Items Total</span>
                <span className="font-semibold text-slate-800">
                  ${grossSubtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Discount (%)</span>
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        discountPercent === pct
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Savings</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Tax Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Tax / GST Rate</span>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={5}>5% (Standard GST)</option>
                  <option value={12}>12% (Schedule II)</option>
                  <option value={18}>18% (Specialty)</option>
                </select>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Calculated Tax</span>
                <span className="font-semibold text-slate-800">
                  +${taxAmount.toFixed(2)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between mt-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Grand Total
                  </span>
                  <span className="text-2xl font-black text-emerald-400 tracking-tight">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
                <Badge variant="success" size="xs">
                  Net Payable
                </Badge>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 block">
                Select Tender Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Cash", icon: Banknote, label: "Cash" },
                  { id: "UPI", icon: QrCode, label: "UPI / QR" },
                  { id: "Card", icon: CreditCard, label: "Card" },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Tender Fields */}
              {paymentMethod === "Cash" && (
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Amount Received:</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`$${grandTotal.toFixed(2)}`}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-right font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold">
                    <span>Change Due:</span>
                    <span>${changeDue.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* UPI QR Simulation */}
              {paymentMethod === "UPI" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-xs">
                  <div className="w-28 h-28 mx-auto bg-white p-2 rounded-lg border border-slate-300 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <p className="font-semibold text-slate-700">
                    Scan dynamic QR with any UPI app
                  </p>
                  <p className="text-[11px] text-slate-400">
                    UPI ID: pharmaflow.pos@bank
                  </p>
                </div>
              )}

              {/* Card Reference */}
              {paymentMethod === "Card" && (
                <div className="pt-2 text-xs">
                  <input
                    type="text"
                    placeholder="Terminal Auth Code / Card Last 4 (optional)"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Notes / Instructions */}
            <div className="pt-2">
              <input
                type="text"
                placeholder="Prescription or billing note (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Primary Submit Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <span>Processing & Deducting Stock...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Sale & Print Bill (Enter)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Register New Customer Modal */}
      <Modal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="Register New Customer / Patient"
        subtitle="Quickly enroll a patient to track medication history and allergy warnings"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Eleanor Vance"
              value={newCustomerForm.name}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+1 555-014-8822"
              value={newCustomerForm.phone}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address / Residence
            </label>
            <input
              type="text"
              placeholder="742 Evergreen Terrace"
              value={newCustomerForm.address}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Known Drug Allergies (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Penicillin, Sulfa, Aspirin"
              value={newCustomerForm.allergies}
              onChange={(e) =>
                setNewCustomerForm({ ...newCustomerForm, allergies: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewCustomerModal(false)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
            >
              Save & Select Patient
            </button>
          </div>
        </form>
      </Modal>

      {/* Thermal Invoice Print Modal */}
      <ThermalInvoicePrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sale={completedSale}
      />
    </div>
  );
};

export default PosBillingPage;

