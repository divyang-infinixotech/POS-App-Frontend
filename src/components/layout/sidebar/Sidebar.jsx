import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  Clock,
  FileSpreadsheet,
  Users,
  FileText,
  Settings as SettingsIcon,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Lock,
} from 'lucide-react';
import AppLogo from '../../common/AppLogo';
import { cn } from '../../../lib/utils';
import { useAuthStore, useUiStore, useSettingsStore, useCartStore } from '../../../store';
import { canAccessScreen, SCREEN_FEATURES, hasFeature, isScreenAllowedForBusinessMode } from '../../../utils/permissions';

// Static sidebar items (order-creation entry is inserted dynamically per business mode)
const navItemsBase = [
  { screen: 'orders', label: 'Kitchen Tickets', icon: UtensilsCrossed, setting: 'enableKitchen' },
  { screen: 'tables', label: 'Floors & Tables', icon: Layers, setting: 'enableFloorManagement' },
  { screen: 'active_orders', label: 'Active Orders', icon: Clock, setting: 'enableActiveOrders' },
  { screen: 'menu', label: 'Menu & Stock', icon: FileSpreadsheet, setting: 'enableMenu' },
  { screen: 'staff', label: 'Staff Roster', icon: Users },
  { screen: 'reports', label: 'Reports & Sales', icon: FileText, setting: 'enableReports' },
  { screen: 'settings', label: 'POS Settings', icon: SettingsIcon },
];

/**
 * Determine the order-creation sidebar item based on the current settings.
 *
 * POS Ordering toggle ON (any mode) → "POS Ordering"
 * POS Ordering toggle OFF + Restaurant mode → "New Order" (TakeOrderWizard)
 * POS Ordering toggle OFF + Basic POS → null (no order creation item)
 */
function getOrderNavItem(businessMode, enablePosOrdering) {
  if (enablePosOrdering) {
    // Restaurant mode: POS Ordering opens the TakeOrderWizard (full restaurant flow)
    if (businessMode === 'restaurant') {
      return { screen: 'new_order', label: 'POS Ordering', icon: ShoppingCart, setting: 'enablePosOrdering' };
    }
    // Counter/Hybrid mode: POS Ordering opens Basic POS (quick billing)
    return { screen: 'order_taking', label: 'POS Ordering', icon: ShoppingCart, setting: 'enablePosOrdering' };
  }
  // POS Ordering is OFF
  if (businessMode === 'restaurant') {
    return { screen: 'new_order', label: 'New Order', icon: ShoppingCart };
  }
  // Basic POS with POS Ordering OFF — no order creation sidebar item
  return null;
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, currentScreen, setScreen } = useUiStore();
  const { user, subscription, logout, lockTerminal } = useAuthStore();
  const { settings } = useSettingsStore();
  const { setOrders } = useCartStore();

  const handleLogout = () => {
    setScreen('login');
    setOrders([]);
    logout();
  };

  const userRole = (user?.role || '').toUpperCase();

  // When the subscription has expired the POS is locked server-side; hide the
  // module navigation so the sidebar matches the backend state (never only a
  // frontend hint — the API blocks these routes regardless).
  const isExpired =
    subscription?.status === 'EXPIRED' ||
    (typeof subscription?.daysRemaining === 'number' && subscription.daysRemaining <= 0);

  // Build the full nav list: Dashboard → order-creation item (mode-dependent) → rest
  const orderNav = getOrderNavItem(settings?.businessMode, settings?.enablePosOrdering);
  const navItems = [
    { screen: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    ...(orderNav ? [orderNav] : []),
    ...navItemsBase,
  ];

  const filteredNav = isExpired ? [] : navItems.filter((item) => {
    // Role-based permission check
    if (!canAccessScreen(userRole, item.screen)) return false;
    // Business-mode applicability (e.g. POS Ordering is counter/hybrid only,
    // New Order is restaurant-only) — controlled by BUSINESS_MODE_SCREENS.
    if (!isScreenAllowedForBusinessMode(item.screen, settings.businessMode)) return false;
    // Module visibility from POS Settings
    if (item.setting && settings[item.setting] === false) return false;
    // Plan feature access (hide modules not included in the subscription plan)
    const requiredFeature = SCREEN_FEATURES[item.screen];
    if (requiredFeature && !hasFeature(subscription, requiredFeature)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'bg-[#111827] border-r border-slate-800 shadow-[2px_0_12px_rgba(0,0,0,0.15)] h-screen sticky top-0 py-4 flex flex-col justify-between z-30 transition-all duration-300 shrink-0',
        // On small screens (< lg) always render the compact icon rail so tablet
        // portrait & mobile keep maximum space for content; full width only on lg+
        sidebarCollapsed ? 'w-16' : 'w-16 lg:w-56'
      )}
    >
      <div className="space-y-4">
        {/* Logo & Collapse */}
        <div className="px-3 flex items-center justify-between gap-2 overflow-hidden h-10">
          <div className="flex items-center gap-2 min-w-0">
            <AppLogo
              src={settings.branding.sidebarLogo}
              name={settings.branding.restaurantName || 'POS'}
              size="sm"
            />
            {!sidebarCollapsed && (
              <span className="hidden lg:block font-extrabold text-xs text-white tracking-tight truncate uppercase leading-none">
                {settings.branding.restaurantName || 'POS'}
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="hidden lg:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-2">
          {filteredNav.map((item) => (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen)}
              title={item.label}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-3 text-xs font-semibold rounded-lg transition-all min-h-11',
                currentScreen === item.screen
                  ? 'bg-[#16A34A] text-white font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span className="hidden lg:block truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="px-2 space-y-1">
        <button
          onClick={() => lockTerminal(currentScreen)}
          title="Lock Screen"
          className="w-full flex items-center gap-2.5 px-3 py-3 min-h-11 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <Lock className="w-4.5 h-4.5 shrink-0" />
          {!sidebarCollapsed && <span className="hidden lg:block">Lock Screen</span>}
        </button>
        <button
          onClick={handleLogout}
          title="Log Out"
          className="w-full flex items-center gap-2.5 px-3 py-3 min-h-11 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!sidebarCollapsed && <span className="hidden lg:block">Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
