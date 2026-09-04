/**
 * Centralized Role-Based Access Control (RBAC) Configuration
 * 
 * Defines which screens/actions each role can access.
 * Used by both the sidebar filtering and route protection.
 */

// ─── Role Constants ─────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  KITCHEN: 'KITCHEN',
  WAITER: 'WAITER',
};

// ─── Screen-level permissions ───────────────────────────────────────────────
// Maps screen names (matching uiStore.currentScreen values) to roles
export const SCREEN_PERMISSIONS = {
  // Admin & Management
  dashboard: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // POS / Order Taking
  order_taking: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],

  // New Order (full-screen Take Order Wizard — same role access as order_taking)
  new_order: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  
  // Kitchen Orders / KOT
  orders: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN],
  
  // Table Management
  tables: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  
  // Active Orders (KITCHEN is explicitly excluded — kitchen staff only see Kitchen Tickets)
  active_orders: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  
  // Menu Management
  menu: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // Staff Management
  staff: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // Reports
  reports: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // Settings
  settings: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Subscription / Billing (restaurant admin self-service plan management)
  subscription: [ROLES.ADMIN],
  
  // Billing / Checkout
  checkout: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CASHIER],
  
  // Customers (no longer a sidebar page)
  customers: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  
  // Held Orders (no longer a sidebar page - inside Active Orders as tab)
  held_orders: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  
  // Categories (no longer a sidebar page - inside Menu & Stock as tab)
  categories: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // ─── Super Admin Portal Screens ───────────────────────────────────────
  // These are accessible only by SUPER_ADMIN role
  sa_dashboard: [ROLES.SUPER_ADMIN],
  sa_restaurants: [ROLES.SUPER_ADMIN],
  sa_subscriptions: [ROLES.SUPER_ADMIN],
  // sa_users removed from Super Admin UI — kept in codebase for backward compatibility
  sa_plans: [ROLES.SUPER_ADMIN],
  sa_invoices: [ROLES.SUPER_ADMIN],
  sa_reports: [ROLES.SUPER_ADMIN],
  sa_notifications: [ROLES.SUPER_ADMIN],
  sa_settings: [ROLES.SUPER_ADMIN],
  sa_audit: [ROLES.SUPER_ADMIN],
  sa_profile: [ROLES.SUPER_ADMIN],
};

// ─── Action-level permissions ───────────────────────────────────────────────
// Fine-grained action permissions within screens
export const ACTION_PERMISSIONS = {
  // Menu Actions
  'menu.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'menu.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  'menu.delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'menu.toggle_availability': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // Staff Actions
  'staff.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'staff.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  'staff.delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'staff.change_role': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Order Actions
  'order.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  'order.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  'order.delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'order.cancel': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'order.discount': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  'order.approve_discount': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // KOT Actions
  'kot.accept': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN],
  'kot.prepare': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN],
  'kot.complete': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN],
  'kot.cancel': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  
  // Table Actions
  'table.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'table.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  'table.delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'table.assign': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.WAITER],
  'table.transfer': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.WAITER],
  
  // Billing Actions — restricted to billing-capable roles (ADMIN/MANAGER/CASHIER)
  'bill.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'bill.print': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'bill.refund': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'bill.split': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'bill.close': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  
  // Payment Actions — restricted to billing-capable roles (ADMIN/MANAGER/CASHIER)
  'payment.accept': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'payment.refund': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Settings Actions
  'settings.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'settings.view': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Report Actions
  'report.view': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  'report.export': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Customer Actions
  'customer.create': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  'customer.edit': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  'customer.delete': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Printer Actions
  'printer.test': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'printer.configure': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  
  // Admin Actions
  'admin.restaurant.delete': [ROLES.SUPER_ADMIN],
  'admin.subscription.manage': [ROLES.SUPER_ADMIN],
  'admin.system.settings': [ROLES.SUPER_ADMIN],
  
  // Audit
  'audit.view': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
};

// ─── Plan Module Keys (mirror the PlanModule catalog in the database) ──────
export const FEATURES = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  BILLING: 'billing',
  FLOORS: 'floors',
  TABLES: 'tables',
  KITCHEN: 'kitchen',
  ACTIVE_ORDERS: 'active_orders',
  MENU: 'menu',
  CUSTOMERS: 'customers',
  STAFF: 'staff',
  REPORTS: 'reports',
  INVENTORY: 'inventory',
  SETTINGS: 'settings',
  PRINTERS: 'printers',
  QR_ORDERING: 'qr_ordering',
  API_ACCESS: 'api_access',
  MULTI_TERMINAL: 'multi_terminal',
};

// ─── Human-readable module labels (fallback — the live catalog comes from the API) ─
export const FEATURE_LABELS = {
  dashboard: 'Dashboard',
  pos: 'POS Ordering',
  billing: 'Billing & Payments',
  floors: 'Floor Management',
  tables: 'Table Management',
  kitchen: 'Kitchen (KOT)',
  active_orders: 'Active Orders',
  menu: 'Menu & Stock',
  customers: 'Customers',
  staff: 'Staff',
  reports: 'Reports & Sales',
  inventory: 'Inventory',
  settings: 'Settings',
  printers: 'Printer Management',
  qr_ordering: 'QR Ordering',
  api_access: 'API Access',
  multi_terminal: 'Multi-Terminal',
};

// ─── Screen → required plan module ─────────────────────────────────────────
// Screens not listed here are always available (settings, checkout).
export const SCREEN_FEATURES = {
  dashboard: FEATURES.DASHBOARD,
  order_taking: FEATURES.POS,
  new_order: FEATURES.POS,
  orders: FEATURES.KITCHEN,
  tables: FEATURES.TABLES,
  active_orders: FEATURES.ACTIVE_ORDERS,
  menu: FEATURES.MENU,
  staff: FEATURES.STAFF,
  reports: FEATURES.REPORTS,
};

// ─── RestaurantSetting visibility flag → plan module key ───────────────────
// Used by the Settings screen to lock toggles the plan does not grant.
export const FEATURE_FOR_SETTING = {
  enablePosOrdering: FEATURES.POS,
  enableKitchen: FEATURES.KITCHEN,
  enableBilling: FEATURES.BILLING,
  enableFloorManagement: FEATURES.FLOORS,
  enableReports: FEATURES.REPORTS,
  enableMenu: FEATURES.MENU,
  enableStock: FEATURES.INVENTORY,
  enableActiveOrders: FEATURES.ACTIVE_ORDERS,
  enableTableReservations: FEATURES.TABLES,
};

/**
 * Check whether a subscription grants a plan feature.
 * subscription = { features: string[], status, plan, ... } (from /auth/login)
 */
export const hasFeature = (subscription, feature) => {
  if (!subscription) return false;
  if (!feature) return true;
  const features = Array.isArray(subscription.features) ? subscription.features : [];
  return features.includes(feature);
};

// ─── Business-mode applicability for screens ───────────────────────────────
// Centralized rule: a screen is available in a business mode only when the
// mode is in its allowed list. Screens not listed here are available in every
// mode (subject to role / plan / settings checks).
export const BUSINESS_MODE_SCREENS = {
  // New Order (full-page TakeOrderWizard) — Restaurant mode only
  new_order: ['restaurant'],
  // order_taking (Basic POS / Counter screen) — counter & hybrid modes only
  // Restaurant mode uses new_order (TakeOrderWizard) as its order entry point
  order_taking: ['counter', 'hybrid'],
};

/**
 * Check whether a screen is allowed in the restaurant's current business mode.
 * businessMode: 'restaurant' | 'counter' | 'hybrid' (from settingsStore)
 */
export const isScreenAllowedForBusinessMode = (screen, businessMode) => {
  if (!screen) return true;
  const allowedModes = BUSINESS_MODE_SCREENS[screen];
  if (!allowedModes) return true;
  const mode = String(businessMode || '').toLowerCase();
  return allowedModes.includes(mode);
};

// ─── Billing capability ─────────────────────────────────────────────────────
// Roles allowed to handle payment collection, bill checkout, and checkout-desk
// operations. KITCHEN and WAITER are explicitly excluded — the backend enforces
// the same set (src/utils/billing-roles.js) so hiding the UI is never the only
// line of defense.
export const BILLING_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CASHIER,
];

/** Check whether a role can handle payment / bill checkout operations. */
export const canHandleBilling = (role) => {
  if (!role) return false;
  return BILLING_ROLES.includes(role.toUpperCase());
};

// ─── Helper: Check if a role can access a screen ───────────────────────────
export const canAccessScreen = (role, screen) => {
  if (!role || !screen) return false;
  const upperRole = role.toUpperCase();
  const allowedRoles = SCREEN_PERMISSIONS[screen];
  if (!allowedRoles) return false;
  return allowedRoles.includes(upperRole);
};

// ─── Helper: Check if a role can perform an action ─────────────────────────
export const canPerformAction = (role, action) => {
  if (!role || !action) return false;
  const upperRole = role.toUpperCase();
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(upperRole);
};

// ─── Helper: Get all screen keys a role can access ─────────────────────────
export const getAccessibleScreens = (role) => {
  if (!role) return [];
  const upperRole = role.toUpperCase();
  return Object.entries(SCREEN_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(upperRole))
    .map(([screen]) => screen);
};

// ─── Role → Default Landing Page ───────────────────────────────────────────
// Each role is redirected here after login.
// Matches screen keys from SCREEN_PERMISSIONS / uiStore.currentScreen.
export const ROLE_DEFAULT_SCREENS = {
  SUPER_ADMIN: 'sa_dashboard',
  ADMIN: 'dashboard',
  MANAGER: 'dashboard',
  CASHIER: 'order_taking',
  KITCHEN: 'orders',
  WAITER: 'order_taking',
};

/** Get the default landing screen for a given role */
export const getDefaultScreenForRole = (role) => {
  if (!role) return 'dashboard';
  const upperRole = role.toUpperCase();
  return ROLE_DEFAULT_SCREENS[upperRole] || 'dashboard';
};

// ─── Helper: Get role display name ─────────────────────────────────────────
export const getRoleDisplayName = (role) => {
  const names = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    CASHIER: 'Cashier',
    KITCHEN: 'Kitchen Staff',
    WAITER: 'Service Staff',
  };
  return names[role] || role;
};
