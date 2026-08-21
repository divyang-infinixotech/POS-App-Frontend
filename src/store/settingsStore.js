import { create } from 'zustand';
import { settingApi } from '../api/setting.api';

// ── Keys that control module visibility in the sidebar & route guard ──────
const MODULE_VISIBILITY_KEYS = [
  'enablePosOrdering', 'enableKitchen', 'enableBilling', 'enableFloorManagement',
  'enableReports', 'enableMenu', 'enableActiveOrders', 'enableTableReservations',
  'enableCounterSale',
];

// ── Business Mode presets ──────────────────────────────────────────────────
const BUSINESS_MODE_PRESETS = {
  restaurant: {
    label: 'Restaurant Mode',
    description: 'Full dine-in experience with tables, KOT, Active Orders, and Hold Orders',
    settings: {
      enableCounterSale: false,
      enableKitchen: true,
      enableFloorManagement: true,
      enableActiveOrders: true,
      enableMenu: true,
      enableReports: true,
      enableBilling: true,
      // POS Ordering is a counter/hybrid workflow — never in Restaurant mode.
      enablePosOrdering: false,
    },
  },
  counter: {
    label: 'Basic POS',
    description: 'Quick billing: no tables, no KOT, no Active Orders. Payment directly from POS Ordering.',
    settings: {
      enableCounterSale: true,
      enableKitchen: false,
      enableFloorManagement: false,
      enableActiveOrders: false,
      enableMenu: true,
      enableReports: true,
      enableBilling: true,
      enablePosOrdering: true,
    },
  },
  hybrid: {
    label: 'Hybrid Mode',
    description: 'Support both restaurant dine-in and counter sales simultaneously',
    settings: {
      enableCounterSale: true,
      enableKitchen: true,
      enableFloorManagement: true,
      enableActiveOrders: true,
      enableMenu: true,
      enableReports: true,
      enableBilling: true,
      enablePosOrdering: true,
    },
  },
};

// ── UI-only keys persisted to localStorage ──────────────────────────────────
const UI_STORAGE_KEY = 'pos_ui_settings';

const UI_ONLY_KEYS = [
  'taxType', 'dateFormat', 'timeFormat', 'receiptWidth',
  'theme', 'fontSize', 'posLayout', 'dashboardLayout', 'tabletMode',
  'printerNotifications',
  'kotScreenEnabled', 'kotOptionalStatusEnabled', 'tablesScreenEnabled', 'showTerminalId',
  'receiptShowLogo', 'receiptTableNumber', 'receiptItemizedSubtotal', 'receiptOrderTimestamp',
  'numberFormat', 'animationsEnabled', 'compactMode', 'darkMode',
  'sidebarCollapsed',
  'security',
  // Module visibility
  'enablePosOrdering', 'enableKitchen', 'enableBilling', 'enableHoldOrders', 'enableAddItem',
  'enableSplitBill', 'enableTransferTable', 'enableMergeTables', 'enableFloorManagement',
  'enableReports', 'enableMenu', 'enableStock', 'enableActiveOrders', 'enableTableReservations',
  // Business Mode & Counter Sale
  'businessMode', 'enableCounterSale',
  // Billing behavior
  'autoPrintBill', 'autoPrintKOT', 'multiplePayments', 'askCustomerBeforePrint',
  'autoReleaseTable', 'autoGenerateKOT',
];

function loadUiSettings() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveUiSettings(newSettings) {
  try {
    const existing = loadUiSettings();
    const patch = {};
    UI_ONLY_KEYS.forEach((key) => {
      if (key in newSettings) patch[key] = newSettings[key];
    });
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch { /* ignore */ }
}

function clearUiSettings() {
  try { localStorage.removeItem(UI_STORAGE_KEY); } catch { /* ignore */ }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const getCurrencySymbol = (currency) => {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', SGD: 'S$', AUD: 'A$' };
  return symbols[currency] || currency;
};

// ── Defaults ─────────────────────────────────────────────────────────────────
const defaultSettings = {
  branding: {
    logo: '',
    restaurantName: 'Restaurant POS',
    ownerName: '',
    loginLogo: '',
    sidebarLogo: '',
    receiptLogo: '',
    invoiceLogo: '',
  },
  // POS Configuration
  language: 'English',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  numberFormat: '1,234.56',
  
  // Tax & GST — no default tax components. Taxes are created manually by the restaurant.
  taxType: 'Inclusive',
  gstPercentage: 0,
  gstNumber: '',
  fssaiNumber: '',
  serviceCharge: 0,
  taxesAndCharges: [],
  
  // Billing
  invoicePrefix: 'INV',
  kotPrefix: 'KOT',
  billPrefix: 'BILL',
  billNumberStart: 1,
  roundOffEnabled: true,
  decimalPlaces: 2,
  autoPrintBill: false,
  autoPrintKOT: false,
  autoGenerateKOT: false,
  multiplePayments: false,
  askCustomerBeforePrint: false,
  autoReleaseTable: true,
  
  // Module Visibility (centralized controls)
  enablePosOrdering: true,      // POS Ordering screen (when ON, New Ticket is hidden — orders start here)
  posLayout: 'basic',           // POS Layout: 'basic' (Basic POS) | 'standard' | 'quick'
  enableKitchen: true,          // KOT generation + Kitchen module
  enableBilling: true,          // Billing workflow
  enableHoldOrders: true,       // Hold orders functionality
  enableAddItem: true,          // Add items to occupied tables
  enableSplitBill: true,        // Split bill button in billing
  enableTransferTable: true,    // Transfer table button
  enableMergeTables: true,      // Merge tables button
  enableFloorManagement: true,  // Floor & Table management
  enableReports: true,          // Reports module
  enableMenu: true,             // Menu management
  enableStock: true,            // Stock management
  enableActiveOrders: true,     // Active Orders screen
  enableTableReservations: false,
  // Business Mode (configures multiple module visibility toggles at once)
  businessMode: 'restaurant',   // 'restaurant' | 'counter' (Basic POS) | 'hybrid'
  // Counter Sale Mode
  enableCounterSale: false,     // Basic POS quick-billing flow (simplified POS flow)
  
  // Kitchen
  enableKitchenDisplay: true,
  enableKotStatusTracking: true,
  autoPrintKOT: false,
  
  // Printer
  printers: [],
  printerNotifications: true,
  
  // Security
  security: {
    authType: 'password',  // 'password' only (PIN removed)
    autoLock: 'disabled',  // 'disabled', '5', '10', '15', '30' (minutes)
    requireAuthAfterLock: true,
  },

  // Screen
  kotScreenEnabled: true,
  kotOptionalStatusEnabled: true,
  tablesScreenEnabled: true,
  showTerminalId: false,
  theme: 'Light',
  fontSize: 'Small',
  posLayout: 'Split',
  dashboardLayout: 'Compact',
  tabletMode: false,
  animationsEnabled: true,
  compactMode: true,
  darkMode: false,
  
  // Receipt
  receiptShowLogo: true,
  receiptTableNumber: true,
  receiptItemizedSubtotal: true,
  receiptOrderTimestamp: true,
  receiptFooterMessage: 'Thank you for dining with us!',
  receiptWidth: 80,
  
  // General
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  contactNumber: '',
  email: '',
  website: '',
  openingTime: '09:00',
  closingTime: '23:00',
  businessDate: new Date().toISOString().split('T')[0],
};

// Merge persisted UI settings on top of defaults
function getInitialSettings() {
  const merged = { ...defaultSettings, ...loadUiSettings() };
  merged.currencySymbol = getCurrencySymbol(merged.currency);
  
  // Apply business mode presets on load — this ensures visibility toggles
  // match the saved business mode, overriding any stale localStorage values
  const mode = merged.businessMode || 'restaurant';
  const preset = BUSINESS_MODE_PRESETS[mode];
  if (preset) {
    Object.assign(merged, preset.settings);
  }
  
  return merged;
}

const useSettingsStore = create((set, get) => ({
  settings: getInitialSettings(),
  loading: false,
  saving: false,
  error: null,
  lastFetched: null,
  moduleVisibilityVersion: 0,  // Incremented when any MODULE_VISIBILITY_KEYS value changes

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const resp = await settingApi.get();
      if (resp.setting) {
        const s = resp.setting;
        // Also load printers if the API returns them
        const printersFromBackend = resp.printers || [];
        
        set((state) => {
          // ── Restore the full persisted UI snapshot from the DB first ──
          // (taxes, screen/panel toggles, display modes, formats, security, etc.)
          // Explicit DB columns below are then applied ON TOP so they stay canonical.
          const persistedUi = (s.uiSettings && typeof s.uiSettings === 'object') ? s.uiSettings : {};
          const newSettings = {
            ...state.settings,
            ...persistedUi,
            branding: {
              ...state.settings.branding,
              ...(persistedUi.branding || {}),
              restaurantName: s.restaurantName || state.settings.branding.restaurantName,
              logo: s.logo || state.settings.branding.logo,
              loginLogo: s.logo || state.settings.branding.loginLogo,
              sidebarLogo: s.logo || state.settings.branding.sidebarLogo,
              receiptLogo: s.logo || state.settings.branding.receiptLogo,
              invoiceLogo: s.logo || state.settings.branding.invoiceLogo,
            },
            // Restaurant info
            gstNumber: s.gstNumber || state.settings.gstNumber,
            fssaiNumber: s.fssaiNumber || state.settings.fssaiNumber,
            gstPercentage: Number(s.taxPercentage ?? state.settings.gstPercentage),
            serviceCharge: Number(s.serviceCharge ?? state.settings.serviceCharge),
            address: s.address || state.settings.address,
            contactNumber: s.phone || state.settings.contactNumber,
            email: s.email || state.settings.email,
            website: s.website || state.settings.website,
            
            // Billing
            receiptFooterMessage: s.receiptFooter || state.settings.receiptFooterMessage,
            billPrefix: s.billPrefix || state.settings.billPrefix,
            billNumberStart: s.billNumberStart != null ? s.billNumberStart : state.settings.billNumberStart,
            invoicePrefix: s.invoicePrefix || state.settings.invoicePrefix,
            kotPrefix: s.kotPrefix || state.settings.kotPrefix,
            roundOffEnabled: s.roundOffEnabled != null ? s.roundOffEnabled : state.settings.roundOffEnabled,
            
            // Kitchen
            kotScreenEnabled: s.enableKitchenDisplay ?? state.settings.kotScreenEnabled,
            kotOptionalStatusEnabled: s.enableKotStatusTracking ?? state.settings.kotOptionalStatusEnabled,
            
            // Module visibility (from backend, fallback to defaults)
            enableKitchen: s.enableKitchen ?? state.settings.enableKitchen,
            enableBilling: s.enableBilling ?? state.settings.enableBilling,
            enableHoldOrders: s.enableHoldOrders ?? state.settings.enableHoldOrders,
            enableAddItem: s.enableAddItem ?? state.settings.enableAddItem,
            enableSplitBill: s.enableSplitBill ?? state.settings.enableSplitBill,
            enableTransferTable: s.enableTransferTable ?? state.settings.enableTransferTable,
            enableMergeTables: s.enableMergeTables ?? state.settings.enableMergeTables,
            enableFloorManagement: s.enableFloorManagement ?? state.settings.enableFloorManagement,
            enableReports: s.enableReports ?? state.settings.enableReports,
            enableMenu: s.enableMenu ?? state.settings.enableMenu,
            enableStock: s.enableStock ?? state.settings.enableStock,
            enableActiveOrders: s.enableActiveOrders ?? state.settings.enableActiveOrders,
            enableTableReservations: s.enableTableReservations ?? state.settings.enableTableReservations,
            
            // Billing behavior
            autoPrintBill: s.autoPrintBill ?? state.settings.autoPrintBill,
            autoPrintKOT: s.autoPrintKOT ?? state.settings.autoPrintKOT,
            multiplePayments: s.multiplePayments ?? state.settings.multiplePayments,
            askCustomerBeforePrint: s.askCustomerBeforePrint ?? state.settings.askCustomerBeforePrint,
            autoReleaseTable: s.autoReleaseTable ?? state.settings.autoReleaseTable,
            splitBill: s.splitBill ?? state.settings.splitBill,
            
            // POS Config
            currency: s.currency || state.settings.currency,
            language: s.language || state.settings.language,
            timezone: s.timezone || state.settings.timezone,

            // POS Ordering / Layout (explicit columns)
            enablePosOrdering: s.enablePosOrdering !== null && s.enablePosOrdering !== undefined
              ? s.enablePosOrdering : state.settings.enablePosOrdering,
            posLayout: s.posLayout || state.settings.posLayout || 'basic',
            businessMode: s.businessMode || state.settings.businessMode || 'restaurant',
            enableCounterSale: s.enableCounterSale !== null && s.enableCounterSale !== undefined
              ? s.enableCounterSale : state.settings.enableCounterSale,
            taxType: s.taxType || state.settings.taxType || 'Inclusive',
            taxesAndCharges: Array.isArray(s.taxesAndCharges) ? s.taxesAndCharges : state.settings.taxesAndCharges,
            
            // System
            openingTime: s.openingTime || state.settings.openingTime,
            closingTime: s.closingTime || state.settings.closingTime,
            businessDate: s.businessDate || state.settings.businessDate,
            
            // Printers from backend (if available)
            printers: printersFromBackend.length > 0 ? printersFromBackend : state.settings.printers,
          };
          newSettings.currencySymbol = getCurrencySymbol(newSettings.currency);

          // ── Business-mode normalization ──
          // Restaurant mode never uses POS Ordering — the business mode is the
          // source of truth for screen applicability, so this also corrects
          // legacy rows saved before the mode rule existed.
          if (newSettings.businessMode === 'restaurant') {
            newSettings.enablePosOrdering = false;
          }

          return { settings: newSettings, loading: false, lastFetched: Date.now() };
        });
      } else {
        // No settings yet - that's ok, use defaults
        set({ loading: false, lastFetched: Date.now() });
      }
    } catch (e) {
      set({ error: e.message || 'Failed to load settings', loading: false });
    }
  },

  saveSettings: async () => {
    const state = get();
    const s = state.settings;
    set({ saving: true, error: null });
    try {
      // ── Build the full UI settings snapshot for the backend JSON column ──
      // Everything not already stored in an explicit DB column is persisted here
      // so NO setting is frontend-only (survives logout/login & server restart).
      const EXPLICIT_COLUMN_KEYS = [
        'restaurantName', 'gstNumber', 'fssaiNumber', 'phone', 'email', 'website',
        'address', 'logo', 'currency', 'timezone', 'language', 'taxPercentage',
        'serviceCharge', 'roundOffEnabled', 'billPrefix', 'billNumberStart',
        'invoicePrefix', 'kotPrefix', 'enableKitchenDisplay', 'enableKotStatusTracking',
        'receiptFooter', 'enableKitchen', 'enableBilling', 'enableHoldOrders',
        'enableAddItem', 'enableSplitBill', 'enableTransferTable', 'enableMergeTables',
        'enableFloorManagement', 'enableReports', 'enableMenu', 'enableStock',
        'enableActiveOrders', 'enableTableReservations', 'autoPrintBill', 'autoPrintKOT',
        'autoGenerateKOT', 'multiplePayments', 'askCustomerBeforePrint', 'autoReleaseTable',
        'printers', 'enablePosOrdering', 'posLayout', 'businessMode', 'enableCounterSale',
        'taxType', 'taxesAndCharges',
      ];
      const uiSettings = {};
      Object.keys(s).forEach((key) => {
        if (!EXPLICIT_COLUMN_KEYS.includes(key) && s[key] !== undefined) {
          uiSettings[key] = s[key];
        }
      });
      // Keep branding sub-fields (ownerName, logo URLs) except restaurantName/logo
      // which are already persisted via explicit columns.
      uiSettings.branding = { ...(s.branding || {}) };
      delete uiSettings.branding.restaurantName;
      delete uiSettings.branding.logo;

      // Build payload for backend - all supported fields
      const apiPayload = {
        restaurantName: s.branding.restaurantName,
        gstNumber: s.gstNumber,
        fssaiNumber: s.fssaiNumber,
        phone: s.contactNumber,
        email: s.email,
        website: s.website,
        address: s.address,
        logo: s.branding.logo || s.branding.sidebarLogo || '',
        currency: s.currency,
        timezone: s.timezone,
        language: s.language || 'en',
        taxPercentage: Number(s.gstPercentage ?? 0),
        serviceCharge: Number(s.serviceCharge ?? 0),
        roundOffEnabled: Boolean(s.roundOffEnabled),
        billPrefix: s.billPrefix || 'BILL',
        billNumberStart: Number(s.billNumberStart ?? 1),
        invoicePrefix: s.invoicePrefix || 'INV',
        kotPrefix: s.kotPrefix || 'KOT',
        enableKitchenDisplay: Boolean(s.kotScreenEnabled),
        enableKotStatusTracking: Boolean(s.kotOptionalStatusEnabled),
        receiptFooter: s.receiptFooterMessage || '',
        // Module Visibility
        enableKitchen: Boolean(s.enableKitchen !== false),
        enableBilling: Boolean(s.enableBilling !== false),
        enableHoldOrders: Boolean(s.enableHoldOrders !== false),
        enableAddItem: Boolean(s.enableAddItem !== false),
        enableSplitBill: Boolean(s.enableSplitBill !== false),
        enableTransferTable: Boolean(s.enableTransferTable !== false),
        enableMergeTables: Boolean(s.enableMergeTables !== false),
        enableFloorManagement: Boolean(s.enableFloorManagement !== false),
        enableReports: Boolean(s.enableReports !== false),
        enableMenu: Boolean(s.enableMenu !== false),
        enableStock: Boolean(s.enableStock !== false),
        enableActiveOrders: Boolean(s.enableActiveOrders !== false),
        enableTableReservations: Boolean(s.enableTableReservations === true),
        // Billing Behavior
        autoPrintBill: Boolean(s.autoPrintBill === true),
        autoPrintKOT: Boolean(s.autoPrintKOT === true),
        autoGenerateKOT: Boolean(s.autoGenerateKOT === true),
        multiplePayments: Boolean(s.multiplePayments === true),
        askCustomerBeforePrint: Boolean(s.askCustomerBeforePrint === true),
        autoReleaseTable: Boolean(s.autoReleaseTable !== false),
        // POS Ordering / Layout (persisted per restaurant)
        enablePosOrdering: Boolean(s.enablePosOrdering !== false),
        posLayout: s.posLayout || 'basic',
        businessMode: s.businessMode || 'restaurant',
        enableCounterSale: Boolean(s.enableCounterSale === true),
        taxType: s.taxType || 'Inclusive',
        taxesAndCharges: Array.isArray(s.taxesAndCharges) ? s.taxesAndCharges : [],
        // Full UI snapshot (everything else) — persisted, not frontend-only
        uiSettings,
        // Send printers as JSON to be stored in printer settings
        printers: s.printers || [],
      };
      
      await settingApi.save(apiPayload);
      
      // Persist UI-only fields to localStorage (cache for offline/fast boot — DB remains source of truth)
      saveUiSettings(s);
      
      set({ saving: false });
      return { success: true };
    } catch (e) {
      const errorMsg = e.message || 'Failed to save settings';
      set({ error: errorMsg, saving: false });
      return { success: false, error: errorMsg };
    }
  },

  updateSettings: async (newSettings) => {
    // Check if any module visibility key changed
    const hasVisibilityChange = Object.keys(newSettings).some(
      k => MODULE_VISIBILITY_KEYS.includes(k)
    );

    // Update local state immediately (optimistic update)
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      if (newSettings.currency) {
        updated.currencySymbol = getCurrencySymbol(newSettings.currency);
      }
      return {
        settings: updated,
        moduleVisibilityVersion: hasVisibilityChange
          ? state.moduleVisibilityVersion + 1
          : state.moduleVisibilityVersion,
      };
    });
    
    // Auto-save UI-only keys to localStorage
    saveUiSettings(newSettings);
    
    // Return resolved promise for backward compatibility with other pages that await it
    return Promise.resolve();
  },

  // ── Business Mode: auto-configure multiple visibility toggles ─────────────
  applyBusinessMode: async (mode) => {
    const preset = BUSINESS_MODE_PRESETS[mode];
    if (!preset) return;
    // Apply all preset settings at once
    const { updateSettings } = get();
    await updateSettings({
      businessMode: mode,
      ...preset.settings,
    });
  },

  updateBranding: async (brandingUpdates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        branding: { ...state.settings.branding, ...brandingUpdates },
      },
    }));
    // Persist logo to backend immediately
    const { settings } = get();
    try {
      await settingApi.save({
        restaurantName: settings.branding.restaurantName,
        logo: settings.branding.logo || settings.branding.sidebarLogo,
      });
    } catch (e) {
      set({ error: e.message });
    }
  },

  uploadLogo: async (file) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const resp = await settingApi.uploadLogo(formData);
      if (resp.logo) {
        // Update all logo references
        set((state) => ({
          settings: {
            ...state.settings,
            branding: {
              ...state.settings.branding,
              logo: resp.logo,
              loginLogo: resp.logo,
              sidebarLogo: resp.logo,
              receiptLogo: resp.logo,
              invoiceLogo: resp.logo,
            },
          },
        }));
        return { success: true, url: resp.logo };
      }
      return { success: false, error: 'Upload failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  deleteLogo: async () => {
    try {
      await settingApi.deleteLogo();
      set((state) => ({
        settings: {
          ...state.settings,
          branding: {
            ...state.settings.branding,
            logo: '',
            loginLogo: '',
            sidebarLogo: '',
            receiptLogo: '',
            invoiceLogo: '',
          },
        },
      }));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  addPrinter: (printer) => {
    set((state) => ({
      settings: {
        ...state.settings,
        printers: [...state.settings.printers, printer],
      },
    }));
  },

  removePrinter: (id) => {
    set((state) => ({
      settings: {
        ...state.settings,
        printers: state.settings.printers.filter((p) => p.id !== id),
      },
    }));
  },

  updatePrinter: (id, updates) => {
    set((state) => ({
      settings: {
        ...state.settings,
        printers: state.settings.printers.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      },
    }));
  },

  testPrinter: (printerId) => {
    set((state) => ({
      settings: {
        ...state.settings,
        printers: state.settings.printers.map((p) =>
          p.id === printerId ? { ...p, status: 'Online' } : p
        ),
      },
    }));
    return Promise.resolve(`Test print initiated on printer: ${printerId}`);
  },

  resetSettings: () => {
    clearUiSettings();
    const defaults = { ...defaultSettings };
    defaults.currencySymbol = getCurrencySymbol(defaults.currency);
    set({ settings: defaults, error: null });
  },

  restoreDefaults: () => {
    clearUiSettings();
    const defaults = { ...defaultSettings };
    defaults.currencySymbol = getCurrencySymbol(defaults.currency);
    set({ settings: defaults, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useSettingsStore;
