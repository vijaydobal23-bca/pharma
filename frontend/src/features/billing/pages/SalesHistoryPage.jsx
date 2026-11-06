import React, { useState, useEffect } from "react";
import { getSalesHistory, cancelBill, processReturn } from "../billing.api";
import { useToast } from "../../../components/ui/Toast";
import ThermalInvoicePrintModal from "../components/ThermalInvoicePrintModal";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
} from "lucide-react";

const SalesHistoryPage = () => {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Modals
  const [selectedSale, setSelectedSale] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Cancel Modal
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Return / Refund Modal
  const [saleToReturn, setSaleToReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getSalesHistory({
        page,
        limit: 15,
        search,
        status: statusFilter,
        paymentMethod: paymentFilter,
      });
      setSales(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      addToast(err.message || "Failed to load sales", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales(1);
  };

  const handleCancelSale = async () => {
    if (!saleToCancel) return;
    setCancelling(true);
    try {
      await cancelBill(saleToCancel._id, cancelReason);
      addToast(`Invoice ${saleToCancel.invoiceNumber} cancelled & stock restored`, "success");
      setSaleToCancel(null);
      setCancelReason("");
      fetchSales(pagination.page);
    } catch (err) {
      addToast(err.message || "Failed to cancel bill", "error");
    } finally {
      setCancelling(false);
    }
  };

  const openReturnModal = (sale) => {
    setSaleToReturn(sale);
    // Initialize return quantities
    setReturnItems(
      sale.items.map((it) => ({
        batchId: it.batch,
        medicineName: it.medicineName,
        maxReturnable: it.quantity - (it.returnedQuantity || 0),
        quantity: 0,
      }))
    );
    setReturnReason("");
  };

  const handleProcessReturn = async () => {
    if (!saleToReturn) return;
    const itemsToReturn = returnItems
      .filter((it) => it.quantity > 0)
      .map((it) => ({ batchId: it.batchId, quantity: it.quantity }));

    if (itemsToReturn.length === 0) {
      addToast("Please select at least 1 item quantity to return", "warning");
      return;
    }

    setReturning(true);
    try {
      const res = await processReturn(saleToReturn._id, itemsToReturn, returnReason);
      addToast(
        `Refund of $${res.refundAmount.toFixed(2)} processed & batch stock restored`,
        "success"
      );
      setSaleToReturn(null);
      fetchSales(pagination.page);
    } catch (err) {
      addToast(err.message || "Failed to process return", "error");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" />
            <span>Sales Invoices & Audit History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction ledger with cancellation audit and partial refund processing.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-60 bg-slate-50"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Tenders</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales invoices found"
            description="No sales matches your current filter options."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Tender</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sales.map((sale) => {
                  const statusVariants = {
                    completed: "success",
                    cancelled: "danger",
                    refunded: "warning",
                    partially_refunded: "warning",
                  };

                  return (
                    <tr key={sale._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(sale.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                          {sale.paymentMethod === "Cash" && (
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {sale.paymentMethod === "UPI" && (
                            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          {sale.paymentMethod === "Card" && (
                            <CreditCard className="w-3.5 h-3.5 text-cyan-600" />
                          )}
                          <span>{sale.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        ${Number(sale.grandTotal).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={statusVariants[sale.status] || "default"} size="xs">
                          {sale.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowViewModal(true);
                            }}
                            title="View Invoice Details"
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print thermal */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowPrintModal(true);
                            }}
                            title="Print Prescription Memo"
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Refund/Return */}
                          {sale.status === "completed" && (
                            <button
                              type="button"
                              onClick={() => openReturnModal(sale)}
                              title="Process Medicine Return / Refund"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Bill */}
                          {sale.status === "completed" && (
                            <button
                              type="button"
                              onClick={() => setSaleToCancel(sale)}
                              title="Cancel Bill & Restore Stock"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSales(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSales(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Invoice Breakdown: ${selectedSale?.invoiceNumber}`}
        subtitle={`Dispensed by ${selectedSale?.soldByName} on ${new Date(
          selectedSale?.createdAt || Date.now()
        ).toLocaleString()}`}
        maxWidth="max-w-2xl"
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Customer / Patient</span>
                <span className="font-bold text-slate-900">{selectedSale.customerName}</span>
                {selectedSale.customerPhone && (
                  <span className="text-slate-500 block font-mono">{selectedSale.customerPhone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Method & Status</span>
                <span className="font-bold text-slate-900">{selectedSale.paymentMethod}</span>
                <Badge variant={selectedSale.status === "completed" ? "success" : "danger"} size="xs">
                  {selectedSale.status}
                </Badge>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedSale.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {it.medicineName}
                        {it.returnedQuantity > 0 && (
                          <span className="ml-2 text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Returned: {it.returnedQuantity}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {it.batchNumber} (Exp: {new Date(it.expiryDate).toLocaleDateString()})
                      </td>
                      <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right">${Number(it.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ${Number(it.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${Number(selectedSale.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-${Number(selectedSale.discountAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>+${Number(selectedSale.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5 text-slate-900">
                <span>Grand Total:</span>
                <span className="text-teal-700">${Number(selectedSale.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setShowPrintModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Bill Confirmation Modal */}
      <Modal
        isOpen={Boolean(saleToCancel)}
        onClose={() => setSaleToCancel(null)}
        title="Cancel Bill & Restore Inventory"
        subtitle={`Invoice ${saleToCancel?.invoiceNumber} will be marked as cancelled`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this bill will automatically reverse and restore all deducted medicine
            batches back to available inventory.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Cancellation *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g., Customer changed mind, incorrect billing entries..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSaleToCancel(null)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={cancelling || !cancelReason.trim()}
              onClick={handleCancelSale}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {cancelling ? "Restoring Stock..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Process Return / Partial Refund Modal */}
      <Modal
        isOpen={Boolean(saleToReturn)}
        onClose={() => setSaleToReturn(null)}
        title="Process Medicine Return & Refund"
        subtitle={`Select quantity to return for invoice ${saleToReturn?.invoiceNumber}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Specify the number of units returned. Returned quantities will be automatically
            replenished into their respective batch stock.
          </p>

          <div className="space-y-2 border border-slate-200 rounded-xl p-3">
            {returnItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-b-0">
                <div>
                  <span className="font-bold text-slate-800">{item.medicineName}</span>
                  <span className="text-[11px] text-slate-400 block">
                    Eligible for return: {item.maxReturnable}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Return Qty:</span>
                  <input
                    type="number"
                    min={0}
                    max={item.maxReturnable}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = Math.min(item.maxReturnable, Math.max(0, Number(e.target.value)));
                      setReturnItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                      );
                    }}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Return Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Unopened blister pack, doctor change of prescription"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSaleToReturn(null)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={returning}
              onClick={handleProcessReturn}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {returning ? "Processing..." : "Process Return & Refund"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Modal */}
      <ThermalInvoicePrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sale={selectedSale}
      />
    </div>
  );
};

export default SalesHistoryPage;

