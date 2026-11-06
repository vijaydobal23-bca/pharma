# PharmaFlow — Clinical Pharmacy Management System

A complete, modern, professional Pharmacy Management System with a premium clinical SaaS dashboard UI, robust MVC backend architecture, and full role-based access control (Admin & Employee).

---

## 🚀 Key Features

### 1. Role-Based Access Control (RBAC)
- **Admin**:
  - Executive Business Analytics & Financial Trends (Revenue vs Profit, AOV, real MongoDB aggregations).
  - Employee Management (create accounts, update profiles, toggle active/inactive status, sales audit history).
  - Low-stock and expiring medication surveillance.
- **Employee (Pharmacist / Staff)**:
  - Fast Point-of-Sale (POS) Billing Workstation with keyboard shortcuts (`[F2]`).
  - First-Expiry-First-Out (FEFO) automated batch selection.
  - Medicine master catalog management (separate from inventory batches).
  - Stock batch oversight and manual stock adjustment audit logging.
  - Patient allergy detection and medication sensitivity warnings.
  - Cash memo generation, printable thermal invoices, cancellations, and partial returns/refunds.

### 2. POS Billing & Dispensary Workstation
- Instant medicine search with barcode hotkey `[F2]`.
- Patient selection with real-time allergy alerts (e.g., Penicillin sensitivity).
- Automatic batch allocation using **FEFO (First Expiry, First Out)** to minimize expired stock wastage.
- Multiple payment methods: **Cash** (with tender & change calculator), **UPI** (with dynamic QR code preview), and **Card**.
- Automatic calculation of subtotal, item discounts, GST/sales taxes, grand total, and **true profit** (`sellingPrice - batchPurchasePrice`).
- Complete invoice cancellation and return/refund handling with automatic stock replenishment.
- Official printable thermal prescription cash memos (`window.print()` formatted).

### 3. Inventory & FEFO Batches
- Batch-wise inventory tracking (Batch Number, Manufacturing Date, Expiry Date, Cost, Selling Price, Shelf Location).
- Direct batch entry into inventory.
- Live stock aggregation across active, unexpired batches.
- Low-stock and near-expiry alerts (within 30/60/90 days).
- Full Stock Movement ledger recording all stock movements and adjustments.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite), Tailwind CSS v4, Lucide React Icons, React Router v7, Axios with automatic HTTP-Only cookie token refresh.
- **Backend**: Node.js, Express.js (MVC Architecture).
- **Database**: MongoDB with Mongoose (Indexing, Aggregations, FEFO compound indexes).
- **Image Storage**: ImageKit SDK integration with graceful fallback.
- **UI Design System**: Google Stitch MCP Server (**PharmaFlow Clinical System** - Emerald `#059669`, Teal `#0D9488`, Slate `#1E293B`).

---

## 🔑 Pre-Seeded Default Accounts

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pharma.com` | `admin123` | Executive Analytics, Employee Management, Inventory, Sales, Purchases, Settings |
| **Employee** | `employee@pharma.com` | `emp123` | POS Billing, Medicine Master, Inventory Batches, Purchases, Returns & Invoices |

---

## 💻 Quick Start Guide

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds demo categories, medicines, batches, customers, and accounts
npm start        # Starts server on port 5000
```
To run the automated backend test suite:
```bash
npm test
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Launches Vite dev server at http://localhost:5173
```
Build for production:
```bash
npm run build
```
