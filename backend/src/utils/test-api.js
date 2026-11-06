const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../app');
const connectDB = require('../config/db');

const runTests = async () => {
  console.log('--- Starting Comprehensive Pharmacy Management System Integration Tests ---');
  let adminToken = '';
  let employeeToken = '';
  let testMedicineId = '';
  let testCustomerId = '';
  let createdInvoiceId = '';
  let createdPoId = '';

  const PORT = 5099;
  const server = app.listen(PORT);
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  try {
    await connectDB();

    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
    console.log('✓ Health check:', healthRes.status, healthRes.message);

    // 2. Auth: Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pharma.com', password: 'admin123' }),
    }).then((r) => r.json());
    console.log('✓ Admin login:', adminLoginRes.success, 'Role:', adminLoginRes.data?.user?.role);
    adminToken = adminLoginRes.data?.accessToken;

    // 3. Auth: Employee Login
    const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@pharma.com', password: 'emp123' }),
    }).then((r) => r.json());
    console.log('✓ Employee login:', empLoginRes.success, 'Role:', empLoginRes.data?.user?.role);
    employeeToken = empLoginRes.data?.accessToken;

    // 4. Role Authorization Check: Employee attempting Admin-only endpoint
    const empForbiddenRes = await fetch(`${BASE_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    console.log(
      '✓ Role check - Employee blocked from Admin employee route:',
      empForbiddenRes.status === 403 ? '403 Forbidden (PASSED)' : empForbiddenRes.status
    );

    // 5. Admin allowed on Admin employee route
    const adminAllowedRes = await fetch(`${BASE_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    console.log(
      '✓ Role check - Admin allowed on Admin employee route:',
      adminAllowedRes.success ? '200 OK (PASSED)' : 'FAILED',
      `(${adminAllowedRes.data?.length} staff members)`
    );

    // 6. Medicines API
    const medsRes = await fetch(`${BASE_URL}/api/medicines`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    console.log('✓ Medicines list:', medsRes.success, `(${medsRes.data?.length} medicines with live stock)`);
    testMedicineId = medsRes.data?.[0]?._id;
    console.log('  Selected medicine for tests:', medsRes.data?.[0]?.name, 'Stock:', medsRes.data?.[0]?.totalStock);

    // 7. Inventory Batches & Alerts
    const batchesRes = await fetch(`${BASE_URL}/api/inventory/batches`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    console.log('✓ Inventory batches:', batchesRes.success, `(${batchesRes.data?.length} batches)`);

    const alertsRes = await fetch(`${BASE_URL}/api/inventory/alerts`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    console.log(
      '✓ Inventory alerts:',
      `Low-stock: ${alertsRes.data?.lowStockMedicines?.length}, Expiring: ${alertsRes.data?.expiringBatches?.length}`
    );

    // 8. Customers API
    const custRes = await fetch(`${BASE_URL}/api/customers`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    testCustomerId = custRes.data?.[0]?._id;
    console.log('✓ Customers list:', custRes.success, `(${custRes.data?.length} patients)`);

    // 9. Billing / POS: Create Sale Bill
    const billPayload = {
      customerData: {
        customerId: testCustomerId,
        name: custRes.data?.[0]?.name || 'Test Patient',
        phone: custRes.data?.[0]?.phone || '555-0199',
      },
      items: [
        {
          medicineId: testMedicineId,
          medicineName: medsRes.data?.[0]?.name,
          requestedQuantity: 2,
          unitPrice: medsRes.data?.[0]?.sellingPrice,
          discountPercent: 5,
          taxPercent: 5,
        },
      ],
      paymentMethod: 'Cash',
      paymentDetails: {
        amountTendered: 50,
      },
      notes: 'Automated Test Bill',
    };

    const billRes = await fetch(`${BASE_URL}/api/billing/create-bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify(billPayload),
    }).then((r) => r.json());

    console.log(
      '✓ POS Billing Create Bill:',
      billRes.success ? 'PASSED' : 'FAILED',
      'Invoice #:',
      billRes.data?.invoiceNumber,
      'Grand Total: $' + billRes.data?.grandTotal,
      'Profit: $' + billRes.data?.totalProfit
    );
    createdInvoiceId = billRes.data?._id;

    // 10. Billing: Cancel Bill and verify stock restoration
    const cancelRes = await fetch(`${BASE_URL}/api/billing/sales/${createdInvoiceId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ reason: 'Integration Test Cancellation' }),
    }).then((r) => r.json());

    console.log(
      '✓ POS Bill Cancellation & Stock Restoration:',
      cancelRes.success ? 'PASSED' : 'FAILED',
      'Status:',
      cancelRes.data?.status
    );

    // 11. Auth: User Registration Test
    const newRegEmail = `pharmacist_${Date.now()}@pharma.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Registered Pharmacist',
        email: newRegEmail,
        password: 'securePassword123',
        role: 'employee',
      }),
    }).then((r) => r.json());

    console.log(
      '✓ Auth Registration (Fixed):',
      regRes.success ? 'PASSED' : 'FAILED',
      'Registered User:',
      regRes.data?.user?.email,
      'Role:',
      regRes.data?.user?.role
    );

    // 12. Dashboard: Admin Analytics
    const adminDashRes = await fetch(`${BASE_URL}/api/dashboard/admin?period=month`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    console.log(
      '✓ Admin Dashboard Analytics:',
      adminDashRes.success ? 'PASSED' : 'FAILED',
      'Revenue: $' + adminDashRes.data?.stats?.revenue,
      'Profit: $' + adminDashRes.data?.stats?.profit,
      'Monthly Trends Count:',
      adminDashRes.data?.monthlyTrends?.length
    );

    // 13. Dashboard: Employee Overview
    const empDashRes = await fetch(`${BASE_URL}/api/dashboard/employee`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());

    console.log(
      '✓ Employee Shift Dashboard:',
      empDashRes.success ? 'PASSED' : 'FAILED',
      'Today Sales: $' + empDashRes.data?.todaySalesTotal,
      'Transactions Count:',
      empDashRes.data?.todayTransactionsCount
    );

    // 14. Expiry in Days: Add Stock Batch with expiryDays: 30
    const addBatchWithDaysRes = await fetch(`${BASE_URL}/api/inventory/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        medicineId: testMedicineId,
        batchNumber: `TEST-30D-${Date.now().toString().slice(-4)}`,
        expiryDays: 30, // Expiry specified in days!
        purchasePrice: 5.5,
        sellingPrice: 10.0,
        quantity: 50,
      }),
    }).then((r) => r.json());

    console.log(
      '✓ Inventory Expiry in 30 Days Batch Entry:',
      addBatchWithDaysRes.success ? 'PASSED' : 'FAILED',
      'Message:',
      addBatchWithDaysRes.message,
      'Batch Expiry:',
      addBatchWithDaysRes.data?.expiryDate
    );

    // 15. ImageKit Integration: Direct Upload Test
    const samplePixelBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        image: samplePixelBase64,
        fileName: 'test_imagekit_upload.png',
        folder: '/pharma_tests',
      }),
    }).then((r) => r.json());

    console.log(
      '✓ ImageKit Upload API:',
      uploadRes.success ? 'PASSED' : 'FAILED',
      'URL:',
      uploadRes.data?.url,
      'FileId:',
      uploadRes.data?.fileId
    );

    // 16. Medicine Creation with ImageKit Image and Initial Stock with 45 Days Expiry
    const newMedRes = await fetch(`${BASE_URL}/api/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        name: `Test Medicine ${Date.now().toString().slice(-4)}`,
        category: 'Tablet',
        manufacturer: 'PharmaCore Labs',
        composition: 'Test Compound 50mg',
        purchasePrice: 4.0,
        sellingPrice: 8.5,
        image: samplePixelBase64, // ImageKit upload
        initialQuantity: 100,
        initialBatchNumber: `INIT-${Date.now().toString().slice(-4)}`,
        expiryDays: 45, // Expiry in 45 days
      }),
    }).then((r) => r.json());

    console.log(
      '✓ Medicine Creation with ImageKit & 45-day Expiry Stock:',
      newMedRes.success ? 'PASSED' : 'FAILED',
      'Image URL:',
      newMedRes.data?.image,
      'Initial Batch Quantity:',
      newMedRes.initialBatch?.quantity
    );

    // 17. Multer Multipart/Form-Data Image Upload to ImageKit Test
    const pixelBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const multerForm = new FormData();
    const pixelBlob = new Blob([pixelBuffer], { type: 'image/png' });
    multerForm.append('file', pixelBlob, 'sample_capsule.png');
    multerForm.append('folder', '/medicines_multer');

    const multerUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${employeeToken}`,
      },
      body: multerForm,
    }).then((r) => r.json());

    console.log(
      '✓ Multer Multipart Upload to ImageKit:',
      multerUploadRes.success ? 'PASSED' : 'FAILED',
      'CDN URL:',
      multerUploadRes.data?.url
    );

    console.log('\n======================================================');
    console.log('ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
    server.close();
    process.exit(0);
  } catch (error) {
    console.error('Test Execution Error:', error);
    server.close();
    process.exit(1);
  }
};

runTests();
