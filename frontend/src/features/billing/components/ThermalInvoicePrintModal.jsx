import React from "react";
import Modal from "../../../components/ui/Modal";
import { Printer, Download, CheckCircle, ShieldCheck } from "lucide-react";

export const ThermalInvoicePrintModal = ({ isOpen, onClose, sale }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Invoice & Prescription Receipt"
      subtitle={`Invoice ${sale.invoiceNumber} • Generated on ${new Date(
        sale.createdAt || Date.now()
      ).toLocaleString()}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Printable Paper Canvas */}
        <div
          id="printable-thermal-invoice"
          className="p-6 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 shadow-inner"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
            <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
              PharmaFlow Clinical Dispensary
            </h2>
            <p className="text-[11px] text-slate-500">
              License #PH-2026-9921 • GSTIN: 29AAACA1122Q1ZB
            </p>
            <p className="text-[11px] text-slate-500">
              42 Healthway Boulevard, Metro City • Tel: (800) 555-0199
            </p>
            <div className="mt-2 inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
              OFFICIAL CASH MEMO / TAX INVOICE
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-dashed border-slate-300 text-[11px]">
            <div>
              <span className="text-slate-500 block">Invoice #:</span>
              <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Date & Time:</span>
              <span>{new Date(sale.createdAt || Date.now()).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Patient / Customer:</span>
              <span className="font-bold text-slate-900">{sale.customerName}</span>
              {sale.customerPhone && (
                <span className="block text-[10px] text-slate-500">{sale.customerPhone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Dispensed By:</span>
              <span>{sale.soldByName || "Pharmacist"}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-1">Item / Batch</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((it, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 pr-2">
                      <div className="font-bold text-slate-900">{it.medicineName}</div>
                      <div className="text-[10px] text-slate-500">
                        Batch: {it.batchNumber} • Exp:{" "}
                        {it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : "N/A"}
                      </div>
                    </td>
                    <td className="text-center py-1.5 align-top">{it.quantity}</td>
                    <td className="text-right py-1.5 align-top">${Number(it.unitPrice).toFixed(2)}</td>
                    <td className="text-right py-1.5 font-bold align-top">
                      ${Number(it.totalPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Subtotal:</span>
              <span>${Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount Applied:</span>
                <span>-${Number(sale.discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Estimated Tax (GST/Sales):</span>
              <span>+${Number(sale.taxAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300 text-slate-900">
              <span>NET GRAND TOTAL:</span>
              <span className="text-teal-700 font-bold">${Number(sale.grandTotal).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="py-2.5 text-[11px] flex justify-between items-center text-slate-600">
            <div>
              <span className="font-bold">Payment Method: </span>
              <span className="uppercase">{sale.paymentMethod || "Cash"}</span>
            </div>
            {sale.paymentMethod === "Cash" && (
              <div className="text-right text-[10px]">
                <span>Tendered: ${Number(sale.paymentDetails?.amountTendered || sale.grandTotal).toFixed(2)}</span>
                <span className="ml-2 font-bold text-emerald-700">
                  Change: ${Number(sale.paymentDetails?.changeDue || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-300 space-y-0.5">
            <p className="font-semibold text-slate-600">*** Thank You For Choosing PharmaFlow ***</p>
            <p>Medicines once sold cannot be returned without original cash memo.</p>
            <p>Store in a cool, dry place away from direct sunlight.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ThermalInvoicePrintModal;

