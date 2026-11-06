const Medicine = require('../models/medicine.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const Sale = require('../models/sale.model');
const Purchase = require('../models/purchase.model');
const InventoryBatch = require('../models/inventoryBatch.model');
const inventoryService = require('../services/inventory.service');

/**
 * Get Admin Executive Dashboard Analytics with Dynamic Date Filtering
 */
const getAdminDashboard = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    const now = new Date();
    let filterStart = new Date();
    let filterEnd = new Date();

    if (period === 'today') {
      filterStart.setHours(0, 0, 0, 0);
      filterEnd.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      filterStart = new Date(now.setDate(diff));
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date();
      filterEnd.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      filterStart = new Date(now.getFullYear(), 0, 1);
      filterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'custom' && startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      // Default: Last 30 days
      filterStart.setDate(now.getDate() - 30);
      filterStart.setHours(0, 0, 0, 0);
    }

    // 1. Sales & Revenue Aggregation for selected period
    const salesMetrics = await Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: filterStart, $lte: filterEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalProfit: { $sum: '$totalProfit' },
          totalSalesCount: { $sum: 1 },
          averageOrderValue: { $avg: '$grandTotal' },
        },
      },
    ]);

    const revenue = salesMetrics[0]?.totalRevenue || 0;
    const profit = salesMetrics[0]?.totalProfit || 0;
    const salesCount = salesMetrics[0]?.totalSalesCount || 0;
    const avgOrderValue = salesMetrics[0]?.averageOrderValue || 0;

    // 2. Counts
    const totalMedicines = await Medicine.countDocuments({ status: 'active' });
    const totalCategories = await Category.countDocuments({ status: 'active' });
    const totalEmployees = await User.countDocuments({ role: { $in: ['employee', 'user'] } });
    const activeEmployees = await User.countDocuments({
      role: { $in: ['employee', 'user'] },
      status: 'active',
    });

    // 3. Alerts (Low-stock, Out-of-stock, Expiring Batches)
    const alerts = await inventoryService.getInventoryAlerts();

    // 4. Monthly Trend Data for Charting (Last 6 Months or Grouped Days)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendAggregation = await Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$grandTotal' },
          profit: { $sum: '$totalProfit' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends = trendAggregation.map((t) => ({
      name: `${monthNames[t._id.month - 1]} ${t._id.year}`,
      revenue: Number(t.revenue.toFixed(2)),
      profit: Number(t.profit.toFixed(2)),
      sales: t.count,
    }));

    // 5. Recent Transactions and Recent Purchases
    const recentSales = await Sale.find().sort({ createdAt: -1 }).limit(8);
    const recentPurchases = await Purchase.find().sort({ createdAt: -1 }).limit(6);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMedicines,
          totalCategories,
          totalEmployees,
          activeEmployees,
          revenue: Number(revenue.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          salesCount,
          averageOrderValue: Number(avgOrderValue.toFixed(2)),
          lowStockCount: alerts.lowStockMedicines.length,
          outOfStockCount: alerts.outOfStockMedicines.length,
          expiringCount: alerts.expiringBatches.length,
        },
        monthlyTrends,
        alerts: {
          lowStockMedicines: alerts.lowStockMedicines.slice(0, 10),
          outOfStockMedicines: alerts.outOfStockMedicines.slice(0, 10),
          expiringBatches: alerts.expiringBatches.slice(0, 10),
        },
        recentSales,
        recentPurchases,
        filterInfo: {
          period,
          startDate: filterStart,
          endDate: filterEnd,
        },
      },
    });
  } catch (error) {
    console.error('Get Admin Dashboard Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate dashboard analytics',
    });
  }
};

/**
 * Get Employee Dashboard Overview
 */
const getEmployeeDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await Sale.find({
      soldBy: userId,
      createdAt: { $gte: today },
      status: 'completed',
    }).sort({ createdAt: -1 });

    const todayTotal = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);
    const totalTransactionsToday = todaySales.length;

    const myRecentSales = await Sale.find({ soldBy: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const alerts = await inventoryService.getInventoryAlerts();

    return res.status(200).json({
      success: true,
      data: {
        todaySalesTotal: Number(todayTotal.toFixed(2)),
        todayTransactionsCount: totalTransactionsToday,
        myRecentSales,
        lowStockAlerts: alerts.lowStockMedicines.slice(0, 8),
        expiringAlerts: alerts.expiringBatches.slice(0, 8),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch employee dashboard',
    });
  }
};

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};
