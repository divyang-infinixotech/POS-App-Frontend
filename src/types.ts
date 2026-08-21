/**
 * Unified type definitions for the Restaurant POS application.
 */

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: 'Manager' | 'Admin' | 'Head Chef' | 'Chef' | 'Server' | 'Host' | 'Bartender' | 'Cashier' | 'Waiter' | 'Kitchen Staff';
  email: string;
  userId: string;
  password?: string;
  status: 'On Shift' | 'On Break' | 'Off Shift' | 'Disabled';
  initials: string;
  avatarColor: string;
  phone?: string;
  address?: string;
  joiningDate?: string;
  photo?: string;
  permissions?: string[];
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  image?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  shortName?: string;
  price: number;
  costPrice?: number;
  gstPercentage?: number;
  taxInclusive?: boolean;
  category: string;
  categoryId?: number;
  description: string;
  shortDescription?: string;
  image: string;
  imagePublicId?: string;
  imageIsExternal?: boolean;
  images?: string[];
  isLive: boolean;
  stockStatus: 'Available' | 'Low Stock' | 'Out of Stock';
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  preparationTime?: number;
  kitchenCategory?: string;
  displayOrder?: number;
  isVeg?: boolean;
  spicyLevel?: number;
  isFeatured?: boolean;
  isRecommended?: boolean;
  modifierOptions?: string;
}

export interface MenuItemFormData {
  name: string;
  sku?: string;
  barcode?: string;
  shortName?: string;
  price: number;
  costPrice?: number;
  gstPercentage?: number;
  taxInclusive?: boolean;
  categoryId: number;
  categoryName?: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  imagePublicId?: string;
  imageIsExternal?: boolean;
  images?: string[];
  isAvailable: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  preparationTime?: number;
  kitchenCategory?: string;
  displayOrder?: number;
  isVeg?: boolean;
  spicyLevel?: number;
  isFeatured?: boolean;
  isRecommended?: boolean;
  modifierOptions?: string;
}

export interface CategoryFormData {
  name: string;
  image?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Floor {
  id: string;
  name: string;
}

export interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  floorId: string;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Dirty' | 'Disabled';
  currentOrderId: string | null;
  guestsCount?: number;
  billAmount?: number;
  hasNotification?: boolean;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Completed';
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId: string | null;
  tableName: string;
  guestsCount: number;
  timestamp: string;
  createdAt: string;
  serverName: string;
  items: OrderItem[];
  status: 'PREP' | 'LATE' | 'HOLD' | 'SERVED' | 'UNPAID' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  minutesElapsed?: number;
  orderType: 'Dine In' | 'Takeaway' | 'Parcel';
  customerName?: string;
  customerPhone?: string;
  discountAmount?: number;
  appliedOfferCode?: string;
  paymentMethod?: 'Cash' | 'Card' | 'UPI';
  paymentStatus?: 'Pending' | 'Completed' | 'Failed';
  cancelReason?: string;
  cancelNotes?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  isEnabled: boolean;
  isDefault: boolean;
}

export interface Printer {
  id: string;
  name: string;
  connection: string;
  ipOrAddress: string;
  status: 'Online' | 'Offline';
}

export interface BrandingSettings {
  logo: string;
  restaurantName: string;
  loginLogo: string;
  sidebarLogo: string;
  receiptLogo: string;
  invoiceLogo: string;
}

export interface POSSettings {
  branding: BrandingSettings;
  language: 'English' | 'Hindi' | 'Gujarati';
  taxType: 'Inclusive' | 'Exclusive';
  gstPercentage: number;
  gstNumber: string;
  taxesAndCharges: TaxRule[];
  printers: Printer[];
  kotScreenEnabled: boolean;
  kotOptionalStatusEnabled: boolean;
  receiptShowLogo: boolean;
  receiptTableNumber: boolean;
  receiptItemizedSubtotal: boolean;
  receiptOrderTimestamp: boolean;
  receiptFooterMessage: string;
  address: string;
  contactNumber: string;
  email: string;
  showTerminalId?: boolean;
  tablesScreenEnabled: boolean;
  // Screen Options
  showFloorPanel: boolean;
  showTablePanel: boolean;
  showCategoryPanel: boolean;
  showMenuPanel: boolean;
  showCart: boolean;
  showOrderSummary: boolean;
  compactMode: boolean;
  fullScreenPOS: boolean;
  darkMode: boolean;
  largeButtons: boolean;
  tabletMode: boolean;
  // Billing Settings
  taxInclusive: boolean;
  autoPrintBill: boolean;
  autoPrintKOT: boolean;
  roundOff: boolean;
  multiplePayments: boolean;
  splitBill: boolean;
  askCustomerBeforePrint: boolean;
  // Table Settings
  autoReleaseTable: boolean;
  enableMergeTable: boolean;
  enableTransferTable: boolean;
  enableHoldOrder: boolean;
  enableAddItem: boolean;
  // Module Visibility (added for parity with settingsStore)
  enableKitchen: boolean;
  enableBilling: boolean;
  enableHoldOrders: boolean;
  enableSplitBill: boolean;
  enableMergeTables: boolean;
  enableFloorManagement: boolean;
  enableReports: boolean;
  enableMenu: boolean;
  enableActiveOrders: boolean;
  enableTableReservations: boolean;
}

export interface HistoricalSale {
  id: string;
  tableNumber: string;
  categorySales: { [cat: string]: number };
  itemsCount: number;
  server: string;
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  subtotal: number;
  total: number;
  timestamp: string;
  status: string;
  discountAmount?: number;
  appliedOfferCode?: string;
}
