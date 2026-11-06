require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/user.model');
const Category = require('../models/category.model');
const Supplier = require('../models/supplier.model');
const Medicine = require('../models/medicine.model');
const InventoryBatch = require('../models/inventoryBatch.model');
const Customer = require('../models/customer.model');
const Sale = require('../models/sale.model');
const Purchase = require('../models/purchase.model');
const StockMovement = require('../models/stockMovement.model');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections if desired
    // Check if admin already exists
    let admin = await User.findOne({ email: 'admin@pharma.com' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      admin = await User.create({
        name: 'Dr. Arthur Pendelton',
        email: 'admin@pharma.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+1 800-555-0199',
        address: 'Suite 400, Medical Plaza, Metro City',
        profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        isActive: true,
      });
      console.log('Created Admin user: admin@pharma.com / admin123');
    }

    let employee = await User.findOne({ email: 'employee@pharma.com' });
    if (!employee) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('emp123', salt);
      employee = await User.create({
        name: 'Sarah Jenkins, RPh',
        email: 'employee@pharma.com',
        password: hashedPassword,
        role: 'employee',
        phone: '+1 800-555-0188',
        address: '42 Baker St, West District',
        profileImage: 'https://images.unsplash.com/photo-1594824813637-a1f9a0c6488a?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        isActive: true,
      });
      console.log('Created Employee user: employee@pharma.com / emp123');
    }

    // Categories
    const categoriesData = [
      { name: 'Tablet', description: 'Solid unit dosage form' },
      { name: 'Syrup', description: 'Liquid concentrated sugar-based formulation' },
      { name: 'Capsule', description: 'Gelatin shell containing powdered medicine' },
      { name: 'Injection', description: 'Sterile solution for parenteral administration' },
      { name: 'Ointment', description: 'Semi-solid preparation for topical application' },
      { name: 'Inhaler', description: 'Aerosolized respiratory delivery system' },
      { name: 'Drops', description: 'Liquid formulation for ophthalmic or otic use' },
    ];

    for (const cat of categoriesData) {
      await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
    }
    console.log('Seeded categories');

    // Suppliers
    const suppliersData = [
      {
        name: 'Apex Pharma Distributors',
        companyName: 'Apex Health Holdings Inc.',
        email: 'orders@apexpharma.com',
        phone: '+1 888-234-5678',
        address: 'Industrial Area Zone 3, Logistics Park',
        taxNumber: 'GSTIN29AAACA1122Q1ZB',
      },
      {
        name: 'Global BioTech Supplies',
        companyName: 'BioTech Global Logistics',
        email: 'supply@biotechglobal.com',
        phone: '+1 888-999-4433',
        address: 'Terminal 4, Port Road, Gateway City',
        taxNumber: 'GSTIN27AABCB3344R1ZC',
      },
      {
        name: 'Novartis Healthcare Wholesale',
        companyName: 'Novartis Commercial Supply',
        email: 'contact@novartiswholesale.com',
        phone: '+1 888-444-7711',
        address: 'Pharma Park, Sector 12',
        taxNumber: 'GSTIN33AACCC5566S1ZD',
      },
    ];

    const seededSuppliers = [];
    for (const sup of suppliersData) {
      const s = await Supplier.findOneAndUpdate({ phone: sup.phone }, sup, { upsert: true, new: true });
      seededSuppliers.push(s);
    }
    console.log('Seeded suppliers');

    // Medicines
    const medicinesData = [
      {
        name: 'Amoxicillin 500mg',
        category: 'Capsule',
        manufacturer: 'Pfizer Inc.',
        composition: 'Amoxicillin Trihydrate 500mg',
        description: 'Broad-spectrum penicillin antibiotic for bacterial infections',
        purchasePrice: 4.5,
        sellingPrice: 8.0,
        prescriptionRequired: true,
        minStockLevel: 30,
        unit: 'Strip',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Paracetamol 650mg Fast-Action',
        category: 'Tablet',
        manufacturer: 'GlaxoSmithKline',
        composition: 'Acetaminophen / Paracetamol 650mg',
        description: 'Analgesic and antipyretic for mild to moderate pain and fever relief',
        purchasePrice: 1.2,
        sellingPrice: 2.5,
        prescriptionRequired: false,
        minStockLevel: 50,
        unit: 'Strip',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Lipitor 20mg (Atorvastatin)',
        category: 'Tablet',
        manufacturer: 'Viatris / Pfizer',
        composition: 'Atorvastatin Calcium 20mg',
        description: 'HMG-CoA reductase inhibitor for lipid and cholesterol management',
        purchasePrice: 12.0,
        sellingPrice: 19.5,
        prescriptionRequired: true,
        minStockLevel: 25,
        unit: 'Strip',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Azithromycin 500mg ER',
        category: 'Tablet',
        manufacturer: 'Cipla Therapeutics',
        composition: 'Azithromycin Dihydrate 500mg',
        description: 'Macrolide antibiotic for respiratory tract and soft tissue infections',
        purchasePrice: 6.0,
        sellingPrice: 11.0,
        prescriptionRequired: true,
        minStockLevel: 20,
        unit: 'Strip',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Metformin HCl 500mg Extended Release',
        category: 'Tablet',
        manufacturer: 'Merck & Co.',
        composition: 'Metformin Hydrochloride 500mg ER',
        description: 'First-line biguanide oral antihyperglycemic agent for Type 2 Diabetes',
        purchasePrice: 2.0,
        sellingPrice: 4.5,
        prescriptionRequired: true,
        minStockLevel: 40,
        unit: 'Strip',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Benadryl Cough Relief Syrup 100ml',
        category: 'Syrup',
        manufacturer: 'Johnson & Johnson',
        composition: 'Diphenhydramine HCl 14mg + Ammonium Chloride 138mg',
        description: 'Antitussive and antihistamine syrup for cough and chest congestion',
        purchasePrice: 3.8,
        sellingPrice: 6.5,
        prescriptionRequired: false,
        minStockLevel: 15,
        unit: 'Bottle',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Ventolin HFA Inhaler 100mcg',
        category: 'Inhaler',
        manufacturer: 'GlaxoSmithKline',
        composition: 'Albuterol Sulfate 100mcg / actuation',
        description: 'Short-acting beta2-adrenergic agonist for acute bronchospasm',
        purchasePrice: 15.0,
        sellingPrice: 24.0,
        prescriptionRequired: true,
        minStockLevel: 10,
        unit: 'Piece',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
      {
        name: 'Ceftriaxone 1g Injection Vial',
        category: 'Injection',
        manufacturer: 'Roche Diagnostics',
        composition: 'Ceftriaxone Sodium 1g',
        description: 'Third-generation cephalosporin for severe intra-abdominal and systemic infections',
        purchasePrice: 8.5,
        sellingPrice: 14.0,
        prescriptionRequired: true,
        minStockLevel: 15,
        unit: 'Vial',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
        status: 'active',
      },
    ];

    const seededMedicines = [];
    for (const med of medicinesData) {
      const m = await Medicine.findOneAndUpdate({ name: med.name }, med, { upsert: true, new: true });
      seededMedicines.push(m);
    }
    console.log('Seeded medicines');

    // Inventory Batches with FEFO variation
    // Batch 1: Expiring in 2 months (FEFO First out)
    // Batch 2: Expiring in 12 months
    const now = new Date();
    const batchList = [
      {
        medicine: seededMedicines[0]._id, // Amoxicillin
        batchNumber: 'AMX-2026-A1',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 6, 15),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 2, 28), // FEFO priority
        purchasePrice: 4.5,
        sellingPrice: 8.0,
        initialQuantity: 150,
        quantity: 120,
        supplier: seededSuppliers[0]._id,
        supplierName: seededSuppliers[0].name,
        status: 'active',
        location: 'Aisle 1 - Shelf B',
      },
      {
        medicine: seededMedicines[0]._id, // Amoxicillin later batch
        batchNumber: 'AMX-2026-B2',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 14, 15),
        purchasePrice: 4.8,
        sellingPrice: 8.5,
        initialQuantity: 200,
        quantity: 200,
        supplier: seededSuppliers[0]._id,
        supplierName: seededSuppliers[0].name,
        status: 'active',
        location: 'Aisle 1 - Shelf B',
      },
      {
        medicine: seededMedicines[1]._id, // Paracetamol
        batchNumber: 'PCM-650-881',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 8, 30),
        purchasePrice: 1.2,
        sellingPrice: 2.5,
        initialQuantity: 300,
        quantity: 240,
        supplier: seededSuppliers[1]._id,
        supplierName: seededSuppliers[1].name,
        status: 'active',
        location: 'Aisle 2 - Shelf A',
      },
      {
        medicine: seededMedicines[2]._id, // Lipitor
        batchNumber: 'LPT-20-409',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 8, 5),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 3, 20),
        purchasePrice: 12.0,
        sellingPrice: 19.5,
        initialQuantity: 80,
        quantity: 45,
        supplier: seededSuppliers[2]._id,
        supplierName: seededSuppliers[2].name,
        status: 'active',
        location: 'Aisle 3 - Shelf C',
      },
      {
        medicine: seededMedicines[3]._id, // Azithromycin
        batchNumber: 'AZI-500-102',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 2, 12),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 10, 15),
        purchasePrice: 6.0,
        sellingPrice: 11.0,
        initialQuantity: 100,
        quantity: 85,
        supplier: seededSuppliers[0]._id,
        supplierName: seededSuppliers[0].name,
        status: 'active',
        location: 'Aisle 1 - Shelf D',
      },
      {
        medicine: seededMedicines[4]._id, // Metformin
        batchNumber: 'MTF-500-774',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 5, 20),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 15, 10),
        purchasePrice: 2.0,
        sellingPrice: 4.5,
        initialQuantity: 250,
        quantity: 190,
        supplier: seededSuppliers[1]._id,
        supplierName: seededSuppliers[1].name,
        status: 'active',
        location: 'Aisle 2 - Shelf C',
      },
      {
        medicine: seededMedicines[5]._id, // Benadryl Syrup
        batchNumber: 'BND-SYR-091',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 5, 15),
        purchasePrice: 3.8,
        sellingPrice: 6.5,
        initialQuantity: 50,
        quantity: 38,
        supplier: seededSuppliers[1]._id,
        supplierName: seededSuppliers[1].name,
        status: 'active',
        location: 'Aisle 4 - Liquid Rack',
      },
      {
        medicine: seededMedicines[6]._id, // Inhaler - Near low stock
        batchNumber: 'VNT-INH-552',
        manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 9, 1),
        expiryDate: new Date(now.getFullYear(), now.getMonth() + 4, 1),
        purchasePrice: 15.0,
        sellingPrice: 24.0,
        initialQuantity: 30,
        quantity: 8, // Low stock (< 10)
        supplier: seededSuppliers[2]._id,
        supplierName: seededSuppliers[2].name,
        status: 'active',
        location: 'Refrigerated Bay',
      },
    ];

    for (const b of batchList) {
      await InventoryBatch.findOneAndUpdate(
        { batchNumber: b.batchNumber },
        b,
        { upsert: true }
      );
    }
    console.log('Seeded inventory batches');

    // Customers
    const customersData = [
      {
        name: 'Eleanor Vance',
        phone: '+1 555-014-8822',
        email: 'eleanor.vance@gmail.com',
        address: '742 Evergreen Terrace, Springfield',
        allergies: ['Penicillin', 'Sulfa'],
        totalSpent: 124.5,
        totalVisits: 3,
      },
      {
        name: 'James R. Wilson',
        phone: '+1 555-018-9933',
        email: 'jwilson@outlook.com',
        address: '108 Ocean Drive, Bay City',
        allergies: ['Aspirin'],
        totalSpent: 86.0,
        totalVisits: 2,
      },
      {
        name: 'Maria Santos',
        phone: '+1 555-019-3344',
        email: 'msantos@healthnet.org',
        address: '502 Pinecrest Blvd, North Hills',
        allergies: [],
        totalSpent: 45.0,
        totalVisits: 1,
      },
    ];

    const seededCustomers = [];
    for (const cust of customersData) {
      const c = await Customer.findOneAndUpdate({ phone: cust.phone }, cust, { upsert: true, new: true });
      seededCustomers.push(c);
    }
    console.log('Seeded customers');

    // Sample Sales Invoices
    const existingSales = await Sale.countDocuments();
    if (existingSales === 0) {
      const salesBatch = await InventoryBatch.findOne({ batchNumber: 'AMX-2026-A1' });
      const pcmBatch = await InventoryBatch.findOne({ batchNumber: 'PCM-650-881' });

      await Sale.create({
        invoiceNumber: 'INV-2026-00001',
        customer: seededCustomers[0]._id,
        customerName: seededCustomers[0].name,
        customerPhone: seededCustomers[0].phone,
        customerAddress: seededCustomers[0].address,
        items: [
          {
            medicine: seededMedicines[0]._id,
            medicineName: seededMedicines[0].name,
            batch: salesBatch._id,
            batchNumber: salesBatch.batchNumber,
            expiryDate: salesBatch.expiryDate,
            quantity: 2,
            unitPrice: 8.0,
            purchasePrice: 4.5,
            discountPercent: 5,
            taxPercent: 5,
            totalPrice: 15.96,
            returnedQuantity: 0,
          },
          {
            medicine: seededMedicines[1]._id,
            medicineName: seededMedicines[1].name,
            batch: pcmBatch._id,
            batchNumber: pcmBatch.batchNumber,
            expiryDate: pcmBatch.expiryDate,
            quantity: 4,
            unitPrice: 2.5,
            purchasePrice: 1.2,
            discountPercent: 0,
            taxPercent: 5,
            totalPrice: 10.5,
            returnedQuantity: 0,
          },
        ],
        subtotal: 26.0,
        discountAmount: 0.8,
        taxAmount: 1.26,
        grandTotal: 26.46,
        totalProfit: 11.4, // ($8-$4.5)*2 - $0.8 + ($2.5-$1.2)*4
        paymentMethod: 'Cash',
        paymentDetails: {
          amountTendered: 30.0,
          changeDue: 3.54,
          transactionRef: 'CASH_REC_01',
        },
        status: 'completed',
        soldBy: employee._id,
        soldByName: employee.name,
        notes: 'Dispensed with dosage instructions',
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
      });

      console.log('Seeded initial sales invoice');
    }

    // Sample Purchase Order
    const existingPurchases = await Purchase.countDocuments();
    if (existingPurchases === 0) {
      await Purchase.create({
        purchaseOrderNumber: 'PO-2026-00001',
        supplier: seededSuppliers[0]._id,
        supplierName: seededSuppliers[0].name,
        supplierPhone: seededSuppliers[0].phone,
        items: [
          {
            medicine: seededMedicines[0]._id,
            medicineName: seededMedicines[0].name,
            batchNumber: 'AMX-2026-A1',
            manufacturingDate: new Date(now.getFullYear(), now.getMonth() - 6, 15),
            expiryDate: new Date(now.getFullYear(), now.getMonth() + 2, 28),
            quantity: 150,
            receivedQuantity: 150,
            purchasePrice: 4.5,
            sellingPrice: 8.0,
            totalAmount: 675.0,
          },
        ],
        totalAmount: 675.0,
        status: 'Received',
        createdBy: employee._id,
        createdByName: employee.name,
        receivedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        receivedBy: employee._id,
        receivedByName: employee.name,
        notes: 'Initial restock batch received and inspected',
      });
      console.log('Seeded initial purchase order');
    }

    console.log('=== Database Seeding Completed Successfully! ===');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
