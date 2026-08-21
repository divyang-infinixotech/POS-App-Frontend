/**
 * API Service - Connects the frontend to the Restaurant POS backend APIs.
 * Backend runs on http://localhost:5001
 */
const API_BASE_URL = 'http://localhost:5001/api';

let authToken: string | null = localStorage.getItem('pos_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('pos_token', token);
  } else {
    localStorage.removeItem('pos_token');
  }
};

export const getAuthToken = () => authToken;

// Helper: make an authenticated fetch request with timeout
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    // Network error (backend not available)
    throw new Error(`Unable to connect to the server. Please check your connection. (${e.message})`);
  }

  clearTimeout(timeoutId);

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}). Please try again.`);
  }

  if (!response.ok) {
    const message = data?.message
      || data?.error
      || (data?.errors ? Object.values(data.errors).flat().join(', ') : null)
      || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// ─── AUTH ───────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: any; settings: any | null }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  register: (data: { restaurantId: number; name: string; email: string; password: string; role: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  profile: () =>
    request<{ success: boolean; user: any }>('/auth/profile'),
};

// ─── TABLES ─────────────────────────────────────────
export const tableApi = {
  getAll: () =>
    request<{ success: boolean; tables: any[] }>('/tables'),

  create: (data: { tableNo: string; name?: string; capacity: number; shape?: string; floorId?: number | null }) =>
    request<{ success: boolean; table: any }>('/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { tableNo?: string; capacity?: number; floorId?: number; status?: string }) =>
    request<{ success: boolean; table: any }>(`/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/tables/${id}`, {
      method: 'DELETE',
    }),

  updateStatus: (id: number, status: string) =>
    request<{ success: boolean; table: any }>(`/tables/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ─── CATEGORIES ─────────────────────────────────────
export const categoryApi = {
  getAll: () =>
    request<{ success: boolean; categories: any[] }>('/categories'),

  create: (data: { name: string; image?: string; color?: string; icon?: string; sortOrder?: number; isActive?: boolean }) =>
    request<{ success: boolean; category: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name?: string; image?: string; isActive?: boolean; color?: string; icon?: string; sortOrder?: number }) =>
    request<{ success: boolean; category: any }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};

// ─── MENU ITEMS ─────────────────────────────────────
export const menuApi = {
  getAll: () =>
    request<{ success: boolean; items: any[] }>('/menu'),

  getById: (id: number) =>
    request<{ success: boolean; item: any }>(`/menu/${id}`),

  create: (data: {
    name: string;
    price: number;
    categoryId: number;
    description?: string;
    shortName?: string;
    shortDescription?: string;
    image?: string;
    images?: string[];
    sku?: string;
    barcode?: string;
    costPrice?: number;
    gstPercentage?: number;
    taxInclusive?: boolean;
    tax?: number;
    isVeg?: boolean;
    isAvailable?: boolean;
    isFeatured?: boolean;
    isRecommended?: boolean;
    preparationTime?: number;
    kitchenCategory?: string;
    displayOrder?: number;
    spicyLevel?: number;
    currentStock?: number;
    minStock?: number;
    maxStock?: number;
    unit?: string;
  }) =>
    request<{ success: boolean; data: any }>('/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: {
    name?: string;
    price?: number;
    image?: string;
    images?: string[];
    isAvailable?: boolean;
    categoryId?: number;
    tax?: number;
    gstPercentage?: number;
    taxInclusive?: boolean;
    description?: string;
    shortName?: string;
    shortDescription?: string;
    sku?: string;
    barcode?: string;
    costPrice?: number;
    isVeg?: boolean;
    isFeatured?: boolean;
    isRecommended?: boolean;
    preparationTime?: number;
    kitchenCategory?: string;
    displayOrder?: number;
    spicyLevel?: number;
    currentStock?: number;
    minStock?: number;
    maxStock?: number;
    unit?: string;
  }) =>
    request<{ success: boolean; item: any }>(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleAvailability: (id: number, isAvailable: boolean) =>
    request<{ success: boolean; item: any }>(`/menu/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),

  duplicate: (id: number) =>
    request<{ success: boolean; data: any }>(`/menu/${id}/duplicate`, {
      method: 'POST',
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/menu/${id}`, {
      method: 'DELETE',
    }),
};

// ─── ORDERS ─────────────────────────────────────────
export const orderApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/orders'),

  getById: (id: number) =>
    request<{ success: boolean; data: any }>(`/orders/${id}`),

  create: (data: {
    tableId?: number;
    customerId?: number;
    orderType: string;
    items: { menuItemId: number; quantity: number; notes?: string }[];
    discountType?: string;
    discountValue?: number;
    serviceCharge?: number;
    notes?: string;
  }) =>
    request<{ success: boolean; data: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: string) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  addItem: (id: number, data: { menuItemId: number; quantity: number; notes?: string }) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (orderId: number, itemId: number, data: { quantity: number; notes?: string }) =>
    request<{ success: boolean; data: any }>(`/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteItem: (orderId: number, itemId: number) =>
    request<{ success: boolean; data: any }>(`/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  updateDiscount: (id: number, data: { discountType: string; discountValue: number }) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/discount`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  cancel: (id: number, reason?: string) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  hold: (id: number) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/hold`, {
      method: 'PATCH',
    }),

  resume: (id: number) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/resume`, {
      method: 'PATCH',
    }),

  changeTable: (id: number, tableId: number) =>
    request<{ success: boolean; data: any }>(`/orders/${id}/change-table`, {
      method: 'PATCH',
      body: JSON.stringify({ tableId }),
    }),

  update: (id: number, data: any) =>
    request<{ success: boolean; data: any }>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; data: any }>(`/orders/${id}`, {
      method: 'DELETE',
    }),
};

// ─── BILLS ──────────────────────────────────────────
export const billApi = {
  create: (data: { orderId: number; paymentMode: string; paidAmount: number; notes?: string }) =>
    request<{ success: boolean; data: any }>('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () =>
    request<{ success: boolean; data: any }>('/bills'),

  getById: (id: number) =>
    request<{ success: boolean; data: any }>(`/bills/${id}`),

  cancel: (id: number, reason?: string) =>
    request<{ success: boolean; data: any }>(`/bills/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─── CUSTOMERS ──────────────────────────────────────
export const customerApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/customers'),

  createWalkIn: () =>
    request<{ success: boolean; data: any }>('/customers/walk-in', {
      method: 'POST',
    }),
};

// ─── DASHBOARD ──────────────────────────────────────
export const dashboardApi = {
  getDashboard: () =>
    request<{ success: boolean; data: any }>('/dashboard'),

  getSummary: () =>
    request<{ success: boolean; data: any }>('/dashboard/summary'),

  getSales: () =>
    request<{ success: boolean; data: any }>('/dashboard/sales'),

  getTables: () =>
    request<{ success: boolean; data: any }>('/dashboard/tables'),

  getKitchen: () =>
    request<{ success: boolean; data: any }>('/dashboard/kitchen'),

  getPayments: () =>
    request<{ success: boolean; data: any }>('/dashboard/payments'),

  getRecentOrders: () =>
    request<{ success: boolean; data: any }>('/dashboard/recent-orders'),

  getTopItems: () =>
    request<{ success: boolean; data: any }>('/dashboard/top-items'),

  getCategorySales: () =>
    request<{ success: boolean; data: any }>('/dashboard/category-sales'),

  getRecentPayments: () =>
    request<{ success: boolean; data: any }>('/dashboard/recent-payments'),

  getLiveOrders: () =>
    request<{ success: boolean; data: any }>('/dashboard/live-orders'),

  getStaff: () =>
    request<{ success: boolean; data: any }>('/dashboard/staff'),

  getHourlySales: () =>
    request<{ success: boolean; data: any }>('/dashboard/hourly-sales'),
};

// ─── REPORTS ────────────────────────────────────────
export const reportApi = {
  getSales: (params?: { startDate?: string; endDate?: string }) => {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return request<{ success: boolean; data: any }>(`/reports/sales${query}`);
  },

  getItemSales: () =>
    request<{ success: boolean; data: any }>('/reports/item-sales'),

  getCategorySales: () =>
    request<{ success: boolean; data: any }>('/reports/category-sales'),

  getPaymentReport: () =>
    request<{ success: boolean; data: any }>('/reports/payment'),

  getDailyReport: () =>
    request<{ success: boolean; data: any }>('/reports/daily'),

  getSalesExcel: () =>
    `${API_BASE_URL}/reports/sales/excel${authToken ? `?token=${authToken}` : ''}`,

  getSalesPDF: () =>
    `${API_BASE_URL}/reports/sales/pdf${authToken ? `?token=${authToken}` : ''}`,
};

// ─── USERS / STAFF ──────────────────────────────────
export const userApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/users'),

  getById: (id: number) =>
    request<{ success: boolean; user: any }>(`/users/${id}`),

  create: (data: { name: string; email: string; password: string; role: string; phone?: string }) =>
    request<{ success: boolean; user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name?: string; email?: string; role?: string; phone?: string }) =>
    request<{ success: boolean; user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changeStatus: (id: number, isActive: boolean) =>
    request<{ success: boolean; user: any }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  changePassword: (id: number, newPassword: string) =>
    request<{ success: boolean; data: any }>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// ─── SETTINGS ───────────────────────────────────────
export const settingApi = {
  get: () =>
    request<{ success: boolean; setting: any }>('/settings'),

  save: (data: any) =>
    request<{ success: boolean; data: any }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── KOT ────────────────────────────────────────────
export const kotApi = {
  create: (data: { orderId: number; items: { menuItemId: number; quantity: number; notes?: string }[] }) =>
    request<{ success: boolean; data: any }>('/kot', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () =>
    request<{ success: boolean; data: any }>('/kot'),

  getHistory: () =>
    request<{ success: boolean; data: any }>('/kot/history'),

  updateStatus: (id: number, status: string) =>
    request<{ success: boolean; data: any }>(`/kot/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  update: (id: number, data: any) =>
    request<{ success: boolean; data: any }>(`/kot/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updatePriority: (id: number, priority: string) =>
    request<{ success: boolean; data: any }>(`/kot/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),

  cancel: (id: number, reason?: string) =>
    request<{ success: boolean; data: any }>(`/kot/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  reprint: (id: number) =>
    request<{ success: boolean; data: any }>(`/kot/reprint/${id}`),
};

// ─── PAYMENTS ───────────────────────────────────────
export const paymentApi = {
  create: (data: { billId: number; amount: number; paymentMode: string }) =>
    request<{ success: boolean; data: any }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  partial: (data: { billId: number; amount: number; paymentMode: string }) =>
    request<{ success: boolean; data: any }>('/payments/partial', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  split: (data: { billId: number; splits: { amount: number; paymentMode: string }[] }) =>
    request<{ success: boolean; data: any }>('/payments/split', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () =>
    request<{ success: boolean; data: any }>('/payments'),
};

// ─── PRINTER ────────────────────────────────────────
export const printerApi = {
  getSettings: () =>
    request<{ success: boolean; data: any }>('/printer/settings'),

  saveSettings: (data: any) =>
    request<{ success: boolean; data: any }>('/printer/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  printBill: (id: number) =>
    request<{ success: boolean; data: any }>(`/printer/bill/${id}`),

  printKOT: (id: number) =>
    request<{ success: boolean; data: any }>(`/printer/kot/${id}`),

  printReprint: (id: number) =>
    request<{ success: boolean; data: any }>(`/printer/reprint/${id}`),
};

// ─── PRINT ──────────────────────────────────────────
export const printApi = {
  receipt: (id: number) =>
    request<{ success: boolean; data: any }>(`/print/receipt/${id}`),

  invoice: (id: number) =>
    request<{ success: boolean; data: any }>(`/print/invoice/${id}`),
};

// ─── FLOORS ─────────────────────────────────────────
export const floorApi = {
  getAll: () =>
    request<{ success: boolean; floors: any[] }>('/floors'),

  getById: (id: number) =>
    request<{ success: boolean; floor: any }>(`/floors/${id}`),

  create: (data: { name: string; sortOrder?: number }) =>
    request<{ success: boolean; floor: any }>('/floors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name?: string; sortOrder?: number }) =>
    request<{ success: boolean; floor: any }>(`/floors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/floors/${id}`, {
      method: 'DELETE',
    }),
};

// ─── NOTIFICATIONS ──────────────────────────────────
export const notificationApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/notifications'),

  markRead: (id: number) =>
    request<{ success: boolean; data: any }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllRead: () =>
    request<{ success: boolean; data: any }>('/notifications/read-all', {
      method: 'PATCH',
    }),

  delete: (id: number) =>
    request<{ success: boolean; data: any }>(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

// ─── AUDIT LOGS ─────────────────────────────────────
export const auditApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/audit'),
};

// ─── RESTAURANT ─────────────────────────────────────
export const restaurantApi = {
  getAll: () =>
    request<{ success: boolean; data: any }>('/restaurants'),

  getById: (id: number) =>
    request<{ success: boolean; data: any }>(`/restaurants/${id}`),

  create: (data: { name: string; email: string; phone: string; address: string }) =>
    request<{ success: boolean; data: any }>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    request<{ success: boolean; data: any }>(`/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; data: any }>(`/restaurants/${id}`, {
      method: 'DELETE',
    }),
};

// ─── SUBSCRIPTIONS ──────────────────────────────────
export const subscriptionApi = {
  upgrade: (restaurantId: number, data: { plan: string; duration?: number }) =>
    request<{ success: boolean; data: any }>(`/subscriptions/${restaurantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  renew: (restaurantId: number) =>
    request<{ success: boolean; data: any }>(`/subscriptions/${restaurantId}/renew`, {
      method: 'PATCH',
    }),
};

export default {
  setAuthToken,
  getAuthToken,
  authApi,
  tableApi,
  categoryApi,
  menuApi,
  orderApi,
  billApi,
  customerApi,
  dashboardApi,
  reportApi,
  userApi,
  settingApi,
  kotApi,
  paymentApi,
  printerApi,
  printApi,
  notificationApi,
  auditApi,
  restaurantApi,
  subscriptionApi,
  floorApi,
};
