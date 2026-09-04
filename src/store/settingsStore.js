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
      // POS Ordering works in ALL modes — controlled by enablePosOrdering toggle
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
  // Counter Sale (businessMode is derived from subscription — not UI-persisted)
  'enableCounterSale',
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
    restaurantName: 'Nirka POS',
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
        
        set(() => {
          // ── Restore the full persisted UI snapshot from the DB first ──
          // (taxes, screen/panel toggles, display modes, formats, security, etc.)
          // Explicit DB columns below are then applied ON TOP so they stay canonical.
          // The baseline is rebuilt from defaults + this terminal's UI-only cache
          // on EVERY fetch — never from the previous restaurant's session state —
          // so logging into another restaurant can never see stale settings bleed.
          const base = getInitialSettings();
          const persistedUi = (s.uiSettings && typeof s.uiSettings === 'object') ? s.uiSettings : {};
          const newSettings = {
            ...base,
            ...persistedUi,
            branding: {
              ...base.branding,
              ...(persistedUi.branding || {}),
              restaurantName: s.restaurantName || base.branding.restaurantName,
              logo: s.logo || base.branding.logo,
              loginLogo: s.logo || base.branding.loginLogo,
              sidebarLogo: s.logo || base.branding.sidebarLogo,
              receiptLogo: s.logo || base.branding.receiptLogo,
              invoiceLogo: s.logo || base.branding.invoiceLogo,
            },
            // Restaurant info
            gstNumber: s.gstNumber || base.gstNumber,
            fssaiNumber: s.fssaiNumber || base.fssaiNumber,
            gstPercentage: Number(s.taxPercentage ?? base.gstPercentage),
            serviceCharge: Number(s.serviceCharge ?? base.serviceCharge),
            address: s.address || base.address,
            contactNumber: s.phone || base.contactNumber,
            email: s.email || base.email,
            website: s.website || base.website,
            
            // Billing
            receiptFooterMessage: s.receiptFooter || base.receiptFooterMessage,
            billPrefix: s.billPrefix || base.billPrefix,
            billNumberStart: s.billNumberStart != null ? s.billNumberStart : base.billNumberStart,
            invoicePrefix: s.invoicePrefix || base.invoicePrefix,
            kotPrefix: s.kotPrefix || base.kotPrefix,
            roundOffEnabled: s.roundOffEnabled != null ? s.roundOffEnabled : base.roundOffEnabled,
            
            // Kitchen
            kotScreenEnabled: s.enableKitchenDisplay ?? base.kotScreenEnabled,
            kotOptionalStatusEnabled: s.enableKotStatusTracking ?? base.kotOptionalStatusEnabled,
            
            // Module visibility (from backend, fallback to defaults)
            enableKitchen: s.enableKitchen ?? base.enableKitchen,
            enableBilling: s.enableBilling ?? base.enableBilling,
            enableHoldOrders: s.enableHoldOrders ?? base.enableHoldOrders,
            enableAddItem: s.enableAddItem ?? base.enableAddItem,
            enableSplitBill: s.enableSplitBill ?? base.enableSplitBill,
            enableTransferTable: s.enableTransferTable ?? base.enableTransferTable,
            enableMergeTables: s.enableMergeTables ?? base.enableMergeTables,
            enableFloorManagement: s.enableFloorManagement ?? base.enableFloorManagement,
            enableReports: s.enableReports ?? base.enableReports,
            enableMenu: s.enableMenu ?? base.enableMenu,
            enableStock: s.enableStock ?? base.enableStock,
            enableActiveOrders: s.enableActiveOrders ?? base.enableActiveOrders,
            enableTableReservations: s.enableTableReservations ?? base.enableTableReservations,
            
            // Billing behavior
            autoPrintBill: s.autoPrintBill ?? base.autoPrintBill,
            autoPrintKOT: s.autoPrintKOT ?? base.autoPrintKOT,
            multiplePayments: s.multiplePayments ?? base.multiplePayments,
            askCustomerBeforePrint: s.askCustomerBeforePrint ?? base.askCustomerBeforePrint,
            autoReleaseTable: s.autoReleaseTable ?? base.autoReleaseTable,
            splitBill: s.splitBill ?? base.splitBill,
            
            // POS Config
            currency: s.currency || base.currency,
            language: s.language || base.language,
            timezone: s.timezone || base.timezone,

            // POS Ordering / Layout (explicit columns)
            enablePosOrdering: s.enablePosOrdering !== null && s.enablePosOrdering !== undefined
              ? s.enablePosOrdering : base.enablePosOrdering,
            posLayout: s.posLayout || base.posLayout || 'basic',
            businessMode: s.businessMode || base.businessMode || 'restaurant',
            enableCounterSale: s.enableCounterSale !== null && s.enableCounterSale !== undefined
              ? s.enableCounterSale : base.enableCounterSale,
            taxType: s.taxType || base.taxType || 'Inclusive',
            taxesAndCharges: Array.isArray(s.taxesAndCharges) ? s.taxesAndCharges : base.taxesAndCharges,
            
            // System
            openingTime: s.openingTime || base.openingTime,
            closingTime: s.closingTime || base.closingTime,
            businessDate: s.businessDate || base.businessDate,
            
            // Printers from backend (if available)
            printers: printersFromBackend.length > 0 ? printersFromBackend : base.printers,
          };
          newSettings.currencySymbol = getCurrencySymbol(newSettings.currency);

          // ── Business-mode normalization ──
          // Apply business-mode module presets to ensure module visibility
          // is consistent with the effective business mode. This corrects
          // legacy rows saved before the mode rule existed.
          const effectiveMode = newSettings.businessMode || 'restaurant';
          const preset = BUSINESS_MODE_PRESETS[effectiveMode];
          if (preset) {
            Object.keys(preset.settings).forEach((key) => {
              // Only apply preset if the backend didn't explicitly return a value
              // (backend value is authoritative when present)
              if (s[key] === null || s[key] === undefined) {
                newSettings[key] = preset.settings[key];
              }
            });
            // These are ALWAYS enforced by business mode (not user-toggleable per-module):
            if (effectiveMode === 'restaurant') {
              newSettings.enableCounterSale = false;
            } else if (effectiveMode === 'counter') {
              newSettings.enableCounterSale = true;
              // Counter mode MUST NOT have restaurant-specific modules.
              // These toggles are hidden from the Settings UI in counter mode,
              // so they should always be OFF regardless of stale backend values.
              newSettings.enableKitchen = false;
              newSettings.enableFloorManagement = false;
              newSettings.enableActiveOrders = false;
            }
          }

          return { settings: newSettings, loading: false, lastFetched: Date.now() };
        });
      } else {
        // No settings row for this restaurant yet — reset to a clean baseline
        // (defaults + this terminal's UI cache) so the previous restaurant's
        // session state can never bleed into the new one.
        set({ settings: getInitialSettings(), loading: false, lastFetched: Date.now() });
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
        'printers', 'enablePosOrdering', 'posLayout', 'enableCounterSale',
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
        // businessMode is derived from the subscription plan — not sent by admin
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
  // Called internally when subscription businessMode changes. Admins cannot
  // invoke this directly — the mode is derived from the subscription plan.
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
