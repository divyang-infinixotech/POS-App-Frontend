import { dashboardApi } from '../../../api/dashboard.api';

export const getDashboardData = async () => {
  try {
    const resp = await dashboardApi.getDashboard();
    if (resp.data) return resp.data;

    // Fallback to individual endpoints
    const [summary, sales] = await Promise.allSettled([
      dashboardApi.getSummary(),
      dashboardApi.getSales(),
    ]);

    return {
      todaySales: 0,
      totalOrders: 0,
      activeOrders: 0,
      tableOccupancy: 0,
      totalTables: 0,
      staffOnShift: 0,
      totalStaff: 0,
      averageOrderValue: 0,
      monthlySales: 0,
      topSellingItems: [],
      salesByHour: [],
      ...(summary.status === 'fulfilled' ? summary.value.data : {}),
      ...(sales.status === 'fulfilled' ? { salesByHour: sales.value.data?.hourlySales || [] } : {}),
    };
  } catch {
    return null;
  }
};
