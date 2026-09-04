import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronRight, Check, ShoppingCart, Users,
  UtensilsCrossed, Search, Plus, Minus, Trash2,
  CreditCard, Smartphone, AlertTriangle,
  Clock, Printer, FileText, Save, Play, Ban,
  ArrowRight, ArrowLeft, Building2, ChefHat,
  User, Coffee, DollarSign, Loader2,
  RotateCcw, UserPlus, LayoutGrid, Package
} from 'lucide-react';
import { useUiStore, useCartStore, useSettingsStore, useAuthStore } from '../../../../store';
import { menuApi } from '../../../../api/menu.api';
import { tableApi } from '../../../../api/table.api';
import { orderApi } from '../../../../api/order.api';
import { kotApi } from '../../../../api/kot.api';
import { categoryApi } from '../../../../api/category.api';
import { userApi } from '../../../../api/user.api';
import { customerApi } from '../../../../api/customer.api';
import { floorApi } from '../../../../api/floor.api';
import { openKotPrintPreview } from '../../../../services/printService';
import { PLACEHOLDER_IMAGE } from '../../../../lib/imagePlaceholder';
import { canHandleBilling } from '../../../../utils/permissions';

const STEP_LABELS = ['Order Type', 'Floor', 'Table', 'Menu', 'Review'];

const ORDER_TYPE_OPTIONS = [
  {
    value: 'dine_in', label: 'Dine In', desc: 'Customer eats at the restaurant',
    icon: UtensilsCrossed, color: '#16A34A', bg: 'bg-emerald-50',
  },
  {
    value: 'takeaway', label: 'Take Away', desc: 'Customer takes food to go',
    icon: ShoppingCart, color: '#C85A32', bg: 'bg-orange-50',
  },
];

// ── Confirmation Dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, confirmLabel, confirmVariant, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 p-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            confirmVariant === 'danger' ? 'bg-red-50' :
            confirmVariant === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              confirmVariant === 'danger' ? 'text-red-500' :
              confirmVariant === 'warning' ? 'text-amber-500' : 'text-emerald-500'
            }`} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">{title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer ${
              confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
              confirmVariant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#16A34A] hover:bg-[#15803D]'
            }`}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard Component ───────────────────────────────────────────────────
export default function TakeOrderWizard({ mode = 'modal' } = {}) {
  const { showTakeOrderWizard, setShowTakeOrderWizard, setScreen, addToast, activeOrderTakingId, setActiveOrderTakingId, setOrdersActiveTab, currentScreen, incrementRefreshTrigger, setCheckoutOrderId } = useUiStore();
  const { addOrder } = useCartStore();
  const { settings } = useSettingsStore();
  const currency = settings?.currencySymbol || '₹';
  const { user } = useAuthStore();
  const isServiceStaff = (user?.role || '').toUpperCase() === 'WAITER';
  // Save & Pay opens the payment overlay — restricted to billing-capable roles
  const canBill = canHandleBilling(user?.role);

  // ── Step State ──
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(null); // null | 'hold' | 'kot' | 'bill' | 'update'
  // Synchronous re-entrancy guard: React state alone is async — a rapid
  // double-tap on Place Order / Print KOT / Hold / Update would fire two
  // order-creation requests (duplicate order + double stock deduction).
  const submittingRef = useRef(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const mountedRef = useRef(true);
  const previousScreenRef = useRef(null);

  // ── Step 1: Order Type ──
  const [orderType, setOrderType] = useState(null);

  // ── Step 2: Floor ──
  const [floors, setFloors] = useState([]);
  const [floorLoading, setFloorLoading] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  // ── Step 3: Table ──
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

  // ── Waiter ──
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  const [waiterLoading, setWaiterLoading] = useState(false);
  const [waiterError, setWaiterError] = useState(false);

  // ── Customer ──
  const [customers, setCustomers] = useState([]);
  const [customerError, setCustomerError] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // ── Step 4: Menu ──
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [notesForItem, setNotesForItem] = useState(null);
  const [notesText, setNotesText] = useState('');

  // ── Clear floor/table when switching to Take Away ──
  useEffect(() => {
    if (orderType === 'takeaway') {
      setSelectedFloor(null);
      setSelectedTable(null);
    }
  }, [orderType]);

  // ── Force Service Staff to Dine In ──
  useEffect(() => {
    if (isServiceStaff && orderType !== 'dine_in') {
      setOrderType('dine_in');
    }
  }, [isServiceStaff, orderType]);

  // ── Edit Mode ──
  const [editingOrder, setEditingOrder] = useState(null);
  const [editExistingItems, setEditExistingItems] = useState([]);

  // ── Guest Count ──
  const [guestCount, setGuestCount] = useState(2);

  // ── Is editing existing order? ──
  const isEditing = !!activeOrderTakingId && !!editingOrder;

  // ── Load Data ──
  const [dataLoading, setDataLoading] = useState(false);

  const isPageMode = mode === 'page';

  // ── Takeaway-only fast path ──
  // When Floor Management is OFF there is exactly one order type (Take Away), so
  // skip the single-option Order Type step and drop the cashier straight onto
  // the Menu step — no pointless extra tap. Only applies to NEW orders; the
  // edit flow positions its own step in loadInitialData().
  useEffect(() => {
    if (
      (isPageMode || showTakeOrderWizard) &&
      settings.enableFloorManagement === false &&
      !isEditing &&
      !dataLoading &&
      currentStep === 0 &&
      orderType === null
    ) {
      setOrderType('takeaway');
      setCurrentStep(1);
    }
  }, [isPageMode, showTakeOrderWizard, settings.enableFloorManagement, isEditing, dataLoading, currentStep, orderType]);

  useEffect(() => {
    mountedRef.current = true;
    // In page mode, always initialize (the page controls visibility)
    if (!isPageMode && !showTakeOrderWizard) return;
    // Capture the screen that opened the wizard so we can return there
    previousScreenRef.current = currentScreen;
    loadInitialData();
    return () => { mountedRef.current = false; };
  }, [isPageMode, showTakeOrderWizard]);

  const loadInitialData = async () => {
    resetWizard();
    setDataLoading(true);
    try {
      // Load every dataset independently — each loader already isolates its own
      // errors, and Promise.allSettled guarantees an optional failure (waiters,
      // customers, floors…) can never abort menu/table/order initialization.
      await Promise.allSettled([
        loadMenu(),
        loadCategories(),
        loadTables(),
        loadFloors(),
        loadWaiters(),
        loadCustomers(),
      ]);
      // If editing existing order, load it and pre-populate
      if (activeOrderTakingId) {
        try {
          const backendOrderId = parseInt(activeOrderTakingId.replace('ord-', ''), 10);
          if (!Number.isSafeInteger(backendOrderId) || backendOrderId <= 0) {
            addToast('Invalid order ID — cannot load order.', 'error');
            setActiveOrderTakingId(null);
            return;
          }
          const resp = await orderApi.getById(backendOrderId);
          if (resp?.data) {
            const orderData = resp.data;

            // ── Cancelled order guard ──
            if (orderData.status === 'CANCELLED' || orderData.cancelledAt) {
              addToast('This order has been cancelled and cannot be modified.', 'error');
              setShowTakeOrderWizard(false);
              setActiveOrderTakingId(null);
              return;
            }

            setEditingOrder(orderData);
            // Set order type
            const resolvedOrderType = orderData.orderType === 'DINE_IN' ? 'dine_in' : 'takeaway';
            setOrderType(resolvedOrderType);
            // Set guest count
            if (orderData.guestCount) setGuestCount(orderData.guestCount);
            // Set customer info
            if (orderData.customer) {
              setCustomerName(orderData.customer.name || '');
              setCustomerPhone(orderData.customer.phone || '');
            }
            // Pre-populate existing order items (as read-only reference)
            const existingItems = (orderData.orderItems || []).map(oi => ({
              itemId: `menu-${oi.menuItemId}`,
              name: oi.menuItem?.name || 'Item',
              price: Number(oi.price || oi.rate || 0),
              qty: oi.quantity || 1,
              notes: oi.notes || ''
            }));
            setEditExistingItems(existingItems);
            // Pre-populate waiter if available
            if (orderData.user) {
              const matchedWaiter = waiters.find(w => w.id === orderData.user.id);
              if (matchedWaiter) setSelectedWaiter(matchedWaiter);
            }
            // Skip to Menu step (step 3 = Menu for dine-in, step 1 = Menu for takeaway)
            setCurrentStep(resolvedOrderType === 'takeaway' ? 1 : 3);
          }
        } catch (e) {
          console.error('Failed to load existing order:', e);
          addToast('Failed to load order details', 'error');
        }
      }
    } finally {
      setDataLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setEditingOrder(null);
    setEditExistingItems([]);
    setOrderType(null);
    setSelectedFloor(null);
    setSelectedTable(null);
    setSelectedCat('All');
    setSearchQuery('');
    setCart([]);
    setGuestCount(2);
    setSelectedWaiter(null);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setWaiterError(false);
    setCustomerError(false);
    setSubmitting(null);
    setActionSuccess(null);
    setConfirmDialog(null);
    setFloors([]);
  };

  const loadMenu = async () => {
    try {
      const resp = await menuApi.getAll();
      const items = (resp.items || []).map((m) => ({
        id: `menu-${m.id}`,
        name: m.name,
        price: Number(m.price),
        category: m.category?.name || 'Main Course',
        description: m.description || '',
        image: m.image || '',
        isLive: m.isAvailable !== false,
        isVeg: m.isVeg !== false,
        stockStatus: m.isAvailable === false ? 'Out of Stock' : 'Available',
        prepTime: m.preparationTime || 15,
      }));
      setMenuItems(items.filter(m => m.isLive));
    } catch (e) {
      console.error('Failed to load menu:', e);
    }
  };

  const loadCategories = async () => {
    try {
      const resp = await categoryApi.getAll();
      const cats = (resp.categories || [])
        .filter(c => c.isActive !== false)
        .map((c) => ({ id: `cat-${c.id}`, name: c.name, sortOrder: c.sortOrder || 0 }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  };

  const loadTables = async () => {
    setTableLoading(true);
    try {
      const resp = await tableApi.getAll();
      const mapped = (resp.tables || []).map((t) => ({
        id: `t-${t.id}`,
        number: parseInt(t.tableNo) || t.id,
        name: `Table ${String(t.tableNo).padStart(2, '0')}`,
        seats: t.capacity || 4,
        status: t.status === 'OCCUPIED' ? 'Occupied' :
                t.status === 'RESERVED' ? 'Reserved' :
                t.status === 'CLEANING' ? 'Cleaning' : 'Available',
        floorId: t.floorId ? `floor-${t.floorId}` : null,
      }));
      setTables(mapped);
    } catch (e) {
      console.error('Failed to load tables:', e);
    } finally {
      setTableLoading(false);
    }
  };

  const loadWaiters = async () => {
    setWaiterLoading(true);
    try {
      // Dedicated waiter directory — works for every order-placing role,
      // unlike GET /users which is staff-management only (403 for cashiers).
      const resp = await userApi.getWaiters();
      const waiters = Array.isArray(resp?.data?.users)
        ? resp.data.users
        : Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp?.users)
            ? resp.users
            : [];
      const mapped = waiters.map((u) => ({
        id: u.id,
        name: u.name || 'Staff',
        role: u.role || '',
      }));
      setWaiters(mapped);
      setWaiterError(false);
    } catch (e) {
      // Scoped failure: the rest of the wizard keeps working; the Service Staff
      // selector shows an inline retry instead of blocking the order.
      setWaiters([]);
      setWaiterError(true);
      console.warn('Failed to load waiters:', e);
    } finally {
      setWaiterLoading(false);
    }
  };

  const loadFloors = async () => {
    setFloorLoading(true);
    try {
      const resp = await floorApi.getAll();
      if (resp.floors?.length) {
        const mapped = resp.floors.map((f) => ({
          id: `floor-${f.id}`,
          name: f.name,
        }));
        setFloors(mapped);
      } else {
        setFloors([]);
      }
    } catch (e) {
      console.error('Failed to load floors:', e);
      setFloors([]);
    } finally {
      setFloorLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const resp = await customerApi.getAll();
      const mapped = (resp.data || resp.customers || []).map((c) => ({
        id: `cust-${c.id}`,
        name: c.name,
        phone: c.phone || '',
      }));
      setCustomers(mapped);
      setCustomerError(false);
    } catch (e) {
      // Customer API is optional — gracefully show empty list on failure.
      // Scoped, non-blocking: the customer search shows an inline retry.
      setCustomers([]);
      setCustomerError(true);
    }
  };

  // ── Cart Operations ──
  const addToCart = useCallback((item) => {
    setCart(prev => {
      const exists = prev.find(c => c.itemId === item.id);
      if (exists) return prev.map(c => c.itemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { itemId: item.id, name: item.name, price: item.price, qty: 1, notes: '' }];
    });
  }, []);

  const updateCartQty = useCallback((itemId, delta) => {
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(c => c.itemId !== itemId));
  }, []);

  const setItemNotes = useCallback((itemId, notes) => {
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, notes } : c));
    setNotesForItem(null);
    setNotesText('');
  }, []);

  // ── Computed Totals ──
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const gstRate = settings?.gstPercentage || 5;
  const taxAmount = settings?.taxType === 'Exclusive' ? Number(((subtotal) * gstRate / 100).toFixed(2)) : 0;
  const serviceCharge = settings?.serviceCharge || 0;
  const serviceChargeAmount = serviceCharge > 0 ? Number(((subtotal) * serviceCharge / 100).toFixed(2)) : 0;
  const grandTotal = Number((subtotal + taxAmount + serviceChargeAmount).toFixed(2));

  // ── Helpers ──
  const isTakeaway = orderType === 'takeaway';
  const needsTable = orderType === 'dine_in';
  const skipFloorMgmt = settings.enableFloorManagement === false;
  // When floor management is disabled, skip floor & table steps (Quick Order mode)
  // For takeaway: 3 steps (Order Type → Menu → Review) → maxStep = 2
  // For dine-in with floor mgmt: 5 steps → maxStep = 4
  // For dine-in without floor mgmt: 4 steps (skip floor&table) → maxStep = 3
  const maxStep = isTakeaway ? 2 : (skipFloorMgmt ? 3 : 4);

  const getBackendId = (prefixedId, prefix) => {
    const id = parseInt((prefixedId || '').replace(prefix, ''));
    return isNaN(id) ? null : id;
  };

  // ── Build order payload helper ──
  const buildOrderPayload = () => {
    const itemsPayload = cart.map(c => ({
      menuItemId: getBackendId(c.itemId, 'menu-'),
      quantity: c.qty,
      notes: c.notes || undefined,
    })).filter(i => i.menuItemId);

    const backendOrderType = orderType === 'dine_in' ? 'DINE_IN' : 'TAKEAWAY';

    return {
      tableId: selectedTable ? getBackendId(selectedTable.id, 't-') : undefined,
      customerId: selectedCustomer ? getBackendId(selectedCustomer.id, 'cust-') : undefined,
      orderType: backendOrderType,
      items: itemsPayload,
      notes: selectedWaiter ? `Waiter: ${selectedWaiter.name}` : undefined,
    };
  };

  // ── Action: Hold Order ─────────────────────────────────────────────────────
  const handleHoldOrder = async () => {
    if (cart.length === 0) return;
    if (submittingRef.current) return; // double-tap guard
    submittingRef.current = true;
    setSubmitting('hold');
    try {
      const payload = buildOrderPayload();
      const resp = await orderApi.create({
        ...payload,
        notes: (payload.notes ? payload.notes + '; ' : '') + 'Placed on hold',
      });
      const orderData = resp?.success ? resp.data : resp;
      if (orderData && orderData.id) {
        await orderApi.hold(orderData.id);

        // KOT is auto-created by backend during order creation — nothing more needed

        // Add to local store
        addOrder({
          id: `ord-${orderData.id}`,
          orderNumber: `#${orderData.orderNo || orderData.id}`,
          tableName: selectedTable?.name || 'Takeaway',
          guestsCount: guestCount,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          serverName: selectedWaiter?.name || 'Staff',
          status: 'HOLD',
          items: cart.map(c => ({ itemId: c.itemId, name: c.name, price: c.price, quantity: c.qty, status: 'Pending', notes: c.notes })),
          orderType: orderType === 'dine_in' ? 'Dine In' : 'Takeaway',
          discountAmount: 0,
          paymentStatus: 'Pending',
        });
        incrementRefreshTrigger();
        addToast(`Order ${orderData.orderNo || orderData.id} placed on hold.`, 'success');
        setActionSuccess('hold');
        setShowTakeOrderWizard(false);
        const prevScreen = previousScreenRef.current;
        if (prevScreen && prevScreen !== 'order_taking') setScreen(prevScreen);
        setOrdersActiveTab('Hold');
      }
    } catch (e) {
      addToast(e.message || 'Failed to hold order', 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(null);
    }
  };

  // ── Action: Print KOT (Create Order + Generate KOT) ────────────────────────
  const handlePrintKot = async () => {
    if (cart.length === 0) return;
    if (needsTable && !selectedTable) {
      addToast('Please select a table for Dine In orders.', 'warning');
      return;
    }
    if (submittingRef.current) return; // double-tap guard
    submittingRef.current = true;
    setSubmitting('kot');
    try {
      const payload = buildOrderPayload();
      const resp = await orderApi.create(payload);
      const orderData = resp?.success ? resp.data : resp;
      if (!orderData || !orderData.id) {
        throw new Error('Order creation failed — no order data returned');
      }

      // Update table status if dine-in
      if (needsTable && selectedTable) {
        const tableBackendId = getBackendId(selectedTable.id, 't-');
        if (tableBackendId) {
          try { await tableApi.updateStatus(tableBackendId, 'OCCUPIED'); } catch {}
        }
      }

      // KOT is auto-created by backend during order creation.
      // The response includes order.kot[] with the auto-KOT.
      // NEVER create a second KOT — the backend will reject it as "no new items".
      const autoKot = orderData.kot?.[0] || null;
      const kotNo = autoKot?.kotNo || null;

      // Open KOT print preview using shared service
      // For new orders, print from cart items (the auto-KOT contains ALL items)
      try {
        openKotPrintPreview({
          restaurantName: settings?.branding?.restaurantName || '',
          kotNo: kotNo || 'N/A',
          orderNo: orderData.orderNo || String(orderData.id),
          tableNo: selectedTable?.name || '',
          orderType: orderType === 'dine_in' ? 'DINE_IN' : 'TAKEAWAY',
          waiterName: selectedWaiter?.name || '',
          customerName: customerName || '',
          customerPhone: customerPhone || '',
          guestCount: guestCount || 1,
          notes: '',
          items: cart.map(c => ({ name: c.name, quantity: c.qty, notes: c.notes })),
          footer: settings?.receiptFooterMessage || 'Thank You!',
          date: new Date()
        });
      } catch (printErr) {
        // KOT print preview failed — non-critical
        addToast('KOT created but print preview failed. You can reprint from Active Orders.', 'warning');
      }

      // Add to local store
      addOrder({
        id: `ord-${orderData.id}`,
        orderNumber: `#${orderData.orderNo || orderData.id}`,
        tableName: selectedTable?.name || 'Takeaway',
        guestsCount: guestCount,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        serverName: selectedWaiter?.name || 'Staff',
        status: 'PREP',
        items: cart.map(c => ({ itemId: c.itemId, name: c.name, price: c.price, quantity: c.qty, status: 'Pending', notes: c.notes })),
        orderType: orderType === 'dine_in' ? 'Dine In' : 'Takeaway',
        discountAmount: 0,
        paymentStatus: 'Pending',
      });

      incrementRefreshTrigger();
      setActionSuccess('kot');
      addToast(`KOT created for Order ${orderData.orderNo || orderData.id}!`, 'success');
      setShowTakeOrderWizard(false);
      const prevScreen = previousScreenRef.current;
      if (prevScreen && prevScreen !== 'order_taking') setScreen(prevScreen);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create order';
      addToast(msg, 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(null);
    }
  };

  // ── Action: Save & Pay (Save Order → Navigate to Payment Screen) ──────────
  const handleSaveAndPay = async () => {
    if (cart.length === 0) return;
    if (submittingRef.current) return; // double-tap guard
    submittingRef.current = true;
    setSubmitting('bill');
    try {
      const payload = buildOrderPayload();
      const resp = await orderApi.create(payload);
      const orderData = resp?.success ? resp.data : resp;
      if (orderData && orderData.id) {

        // KOT is auto-created by backend during order creation — nothing more needed

        // Update table status
        if (needsTable && selectedTable) {
          const tableBackendId = getBackendId(selectedTable.id, 't-');
          if (tableBackendId) {
            try { await tableApi.updateStatus(tableBackendId, 'OCCUPIED'); } catch {}
          }
        }

        // Add to local store
        addOrder({
          id: `ord-${orderData.id}`,
          orderNumber: `#${orderData.orderNo || orderData.id}`,
          tableName: selectedTable?.name || 'Takeaway',
          guestsCount: guestCount,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          serverName: selectedWaiter?.name || 'Staff',
          status: 'PREP',
          items: cart.map(c => ({ itemId: c.itemId, name: c.name, price: c.price, quantity: c.qty, status: 'Pending', notes: c.notes })),
          orderType: orderType === 'dine_in' ? 'Dine In' : 'Takeaway',
          discountAmount: 0,
          paymentStatus: 'Pending',
        });

        incrementRefreshTrigger();
        setActionSuccess('bill');
        if (canBill) {
          // Billing-capable roles continue straight into the payment overlay
          setCheckoutOrderId(orderData.id);
          addToast(`Order ${orderData.orderNo || orderData.id} created. Proceed to payment.`, 'success');
        } else {
          // WAITER (or any non-billing role) never sees the payment overlay —
          // the order is saved and the wizard closes without opening checkout.
          addToast(`Order ${orderData.orderNo || orderData.id} created successfully.`, 'success');
        }
        setShowTakeOrderWizard(false);
      }
    } catch (e) {
      addToast(e.message || 'Failed to process order', 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(null);
    }
  };

  // ── Action: Cancel ─────────────────────────────────────────────────────────
  const handleCancelOrder = () => {
    setShowTakeOrderWizard(false);
    const prevScreen = previousScreenRef.current;
    if (prevScreen && prevScreen !== 'order_taking') setScreen(prevScreen);
  };

  // ── Action: Update Order (for editing existing orders) ─────────────────────
  const handleUpdateOrder = async () => {
    if (cart.length === 0 || !activeOrderTakingId) return;
    if (submittingRef.current) return; // double-tap guard
    submittingRef.current = true;
    setSubmitting('update');
    try {
      const backendId = parseInt(activeOrderTakingId.replace('ord-', ''));
      if (isNaN(backendId)) throw new Error('Invalid order ID');

      // ── Cancelled order guard ──
      if (editingOrder && (editingOrder.status === 'CANCELLED' || editingOrder.cancelledAt)) {
        addToast('This order has been cancelled and cannot be modified.', 'error');
        setShowTakeOrderWizard(false);
        setActiveOrderTakingId(null);
        return;
      }
      
      // Add each new item to the existing order
      for (const item of cart) {
        const menuBackendId = parseInt(item.itemId.replace('menu-', ''));
        if (menuBackendId) {
          try {
            await orderApi.addItem(backendId, {
              menuItemId: menuBackendId,
              quantity: item.qty,
              notes: item.notes || undefined,
            });
          } catch (addItemErr) {
            console.error('Failed to add item:', addItemErr);
            addToast(`Failed to add ${item.name}: ${addItemErr.message || 'unknown error'}`, 'error');
          }
        }
      }
      
      // Generate new KOT with only the newly added items.
      // Backend calculates delta from KOTItem history, so only unsent items are included.
      try {
        if (cart.length > 0 && settings.enableKitchen !== false) {
          const kotResp = await kotApi.create({ orderId: backendId });
          // Backend returns { success: true, data: { created, kot, kotItems } }
          const kotData = kotResp?.data || kotResp;
          // If no new items, backend returns created=false — this is normal, not an error
          if (kotData?.created === false || !kotData?.kotNo) {
            addToast('No new items to send to kitchen.', 'info');
          } else {
            const kotNo = kotData?.kotNo || null;
            // Print KOT using KOTItems from response (only delta items)
            try {
              openKotPrintPreview({
                restaurantName: settings?.branding?.restaurantName || '',
                kotNo: kotNo || 'N/A',
                orderNo: String(backendId),
                tableNo: '',
                orderType: 'DINE_IN',
                waiterName: '',
                customerName: '',
                customerPhone: '',
                guestCount: 1,
                notes: '',
                items: (kotData?.kotItems || []).map(ki => ({
                  name: ki.menuItem?.name || 'Item',
                  quantity: ki.quantity || 1,
                  notes: ki.notes || ''
                })),
                footer: settings?.receiptFooterMessage || 'Thank You!',
                date: new Date()
              });
            } catch (printErr) {
              // KOT print preview failed — non-critical
            }
          }
        }
      } catch (kotErr) {
        const msg = kotErr?.message || '';
        // Real errors only — 'No new items' is now handled as a 200 success above
        // KOT generation failed — toast already shown
        addToast('Items added but KOT generation failed. You can reprint from Active Orders.', 'warning');
      }

      incrementRefreshTrigger();
      addToast('Items added successfully! Order updated.', 'success');
      setShowTakeOrderWizard(false);
      setActiveOrderTakingId(null);
      const prevScreen = previousScreenRef.current;
      if (prevScreen && prevScreen !== 'order_taking') setScreen(prevScreen);
    } catch (e) {
      addToast(e.message || 'Failed to update order', 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(null);
    }
  };

  // ── Close Handler ──
  const handleClose = () => {
    setShowTakeOrderWizard(false);
    if (isPageMode) {
      setScreen('dashboard');
    } else {
      const prevScreen = previousScreenRef.current;
      if (prevScreen && prevScreen !== 'order_taking') setScreen(prevScreen);
    }
  };

  // ── Navigation ──
  const goNext = () => { if (currentStep < maxStep) setCurrentStep(s => s + 1); };
  const goBack = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  // ── Filtered Data ──
  const filteredItems = menuItems.filter(item => {
    if (!item.isLive) return false;
    const matchesCat = selectedCat === 'All' || item.category === selectedCat;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredTables = tables.filter(t => {
    if (selectedFloor) return t.floorId === selectedFloor.id;
    return true;
  }).sort((a, b) => a.number - b.number);

  // ── Render: Step Indicator ──
  // Takeaway: just 3 steps (Order Type → Menu → Review), no floor/table
  // When floor management is disabled, skip floor/table steps
  // For dine-in with floor mgmt disabled: currentStep 0→1→2→3→4 but display only 3 steps
  // For takeaway: currentStep 0→1→2, all mapped 1:1
  const activeSteps = isTakeaway
    ? ['Order Type', 'Menu', 'Review']
    : skipFloorMgmt
      ? STEP_LABELS.filter((_, i) => i !== 1 && i !== 2)
      : STEP_LABELS;

  const stepMap = isTakeaway
    ? { 0: 0, 1: 1, 2: 2 }
    : skipFloorMgmt
      ? { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2 }
      : { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 };

  const displayStep = stepMap[currentStep] || 0;

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
      {activeSteps.map((label, idx) => {
        const isCompleted = idx < displayStep;
        const isCurrent = idx === displayStep;
        return (
          <React.Fragment key={idx}>
            <div className={`flex items-center gap-1.5 transition-all ${isCurrent ? 'scale-100' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 transition-all ${
                isCompleted ? 'bg-[#16A34A] text-white' :
                isCurrent ? 'bg-[#16A34A] text-white shadow-sm ring-2 ring-[#16A34A]/20' :
                'bg-slate-200 text-slate-500'
              }`}>
                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                isCurrent ? 'text-[#16A34A]' : isCompleted ? 'text-slate-600' : 'text-slate-400'
              }`}>{label}</span>
            </div>
            {idx < activeSteps.length - 1 && (
              <div className={`w-4 sm:w-5 h-px shrink-0 ${isCompleted ? 'bg-[#16A34A]/40' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Render: Step 0 - Order Type ──
  // When Floor Management is OFF, only Take Away / Basic POS ordering is allowed.
  const availableOrderTypes = isServiceStaff
    ? ORDER_TYPE_OPTIONS.filter(opt => opt.value === 'dine_in')
    : skipFloorMgmt
      ? ORDER_TYPE_OPTIONS.filter(opt => opt.value === 'takeaway')
      : ORDER_TYPE_OPTIONS;

  const renderOrderType = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-8">
      <div className="text-center mb-4 sm:mb-5">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-800 mb-0.5">Choose Order Type</h3>
        <p className="text-[10px] sm:text-xs text-slate-400">Select how the customer will receive their order</p>
      </div>
      {skipFloorMgmt && (
        <div className="mb-4 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-semibold text-amber-800 max-w-sm w-full">
          Floor Management is turned OFF — only Take Away / Basic POS ordering is available.
        </div>
      )}
      <div className={`grid ${availableOrderTypes.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-xs'} gap-3 w-full max-w-md`}>
        {availableOrderTypes.map(opt => (
          <button key={opt.value} onClick={() => setOrderType(opt.value)}
            className={`p-4 sm:p-5 border-2 rounded-2xl transition-all text-center cursor-pointer min-h-[110px] sm:min-h-[130px] flex flex-col items-center justify-center ${
              orderType === opt.value
                ? 'border-[#16A34A] bg-[#16A34A]/5 shadow-lg scale-[1.02]'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${opt.bg} flex items-center justify-center mb-2 sm:mb-2.5`}>
              <opt.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${orderType === opt.value ? `text-[${opt.color}]` : 'text-slate-400'}`} />
            </div>
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">{opt.label}</h4>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render: Step 1 (Dine In) - Floor ──
  const renderFloor = () => (
    <div className="flex-1 p-6 overflow-y-auto">
      <h3 className="text-sm font-extrabold text-slate-800 mb-1">Select Floor / Area</h3>
      <p className="text-[10px] text-slate-400 mb-4">Choose the floor where the customer is seated</p>
      {floorLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading floors...</div>
      ) : floors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600 mb-1">No floors have been created yet.</p>
          <p className="text-[10px] text-slate-400 mb-4">Create a floor in Floor Management to get started.</p>
          <a
            href="/settings"
            onClick={(e) => { e.preventDefault(); setShowTakeOrderWizard(false); setScreen('settings'); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] text-white rounded-xl text-[10px] font-bold hover:bg-[#15803D] transition-all cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            Create Floor
          </a>
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {floors.map(floor => (
          <button key={floor.id} onClick={() => setSelectedFloor(floor)}
            className={`p-5 border-2 rounded-2xl transition-all text-center cursor-pointer ${
              selectedFloor?.id === floor.id
                ? 'border-[#16A34A] bg-[#16A34A]/5 shadow-md'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
            <Building2 className={`w-6 h-6 mx-auto mb-2 ${selectedFloor?.id === floor.id ? 'text-[#16A34A]' : 'text-slate-400'}`} />
            <p className="font-extrabold text-xs text-slate-800">{floor.name}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{tables.filter(t => t.floorId === floor.id && t.status === 'Available').length} tables free</p>
          </button>
        ))}
      </div>
      )}
    </div>
  );

  // ── Render: Step 2 (Dine In) - Table ──
  const renderTable = () => (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Select Table</h3>
          <p className="text-[10px] text-slate-400">
            {selectedFloor ? `Floor: ${selectedFloor.name}` : 'All tables'} · {tableLoading ? 'Loading...' : `${filteredTables.filter(t => t.status === 'Available').length} available`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Occupied</span>
        </div>
      </div>
      {tableLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading tables...</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {filteredTables.map(table => {
            const isAvailable = table.status === 'Available';
            const isSelected = selectedTable?.id === table.id;
            return (
              <button key={table.id} disabled={!isAvailable}
                onClick={() => setSelectedTable(table)}
                className={`aspect-square p-2 border-2 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isSelected ? 'border-[#16A34A] bg-[#16A34A]/5 shadow-md ring-2 ring-[#16A34A]/30' :
                  isAvailable ? 'border-emerald-500 bg-emerald-50 hover:border-[#16A34A] hover:shadow-sm' :
                  'border-red-300 bg-red-50 opacity-60 cursor-not-allowed'
                }`}>
                <span className="font-mono font-extrabold text-sm text-slate-800">{table.name.replace('Table ', 'T')}</span>
                <span className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5"><Users className="w-3 h-3" />{table.seats}</span>
                <span className={`text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                  table.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                  table.status === 'Occupied' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'
                }`}>{table.status}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* Guest Count */}
      <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">Number of Guests</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setGuestCount(p => Math.max(1, p - 1))}
            className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 cursor-pointer">
            <Minus className="w-4 h-4 text-slate-600" />
          </button>
          <span className="w-10 text-center font-extrabold text-sm text-slate-800">{guestCount}</span>
          <button onClick={() => setGuestCount(p => p + 1)}
            className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 cursor-pointer">
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
      {/* Waiter Selection */}
      <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5 text-[#C85A32]" /> Service Staff
          </span>
          {selectedWaiter && (
            <button onClick={() => setSelectedWaiter(null)} className="text-[9px] text-red-500 font-bold hover:underline cursor-pointer">Clear</button>
          )}
        </div>
        {waiterLoading ? (
          <div className="text-[10px] text-slate-400 italic">Loading staff...</div>
        ) : waiterError && waiters.length === 0 ? (
          <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-red-500 italic">Staff list unavailable.</span>
            <button onClick={loadWaiters} className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer">Retry</button>
          </div>
        ) : waiters.length === 0 ? (
          <div className="text-[10px] text-slate-400 italic">No service staff found.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {waiters.map(w => (
              <button key={w.id} onClick={() => setSelectedWaiter(w)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  selectedWaiter?.id === w.id
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#C85A32]'
                }`}>{w.name}</button>
            ))}
          </div>
        )}
      </div>
      {/* Customer Selection */}
      <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500" /> Customer
          </span>
          <button onClick={() => setShowCustomerSearch(true)} className="text-[9px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
            <UserPlus className="w-3 h-3" /> {selectedCustomer ? 'Change' : 'Add Customer'}
          </button>
        </div>
        {selectedCustomer ? (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <User className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-[11px] font-bold text-slate-800">{selectedCustomer.name}</p>
              {selectedCustomer.phone && <p className="text-[9px] text-slate-500">{selectedCustomer.phone}</p>}
            </div>
          </div>
        ) : customerName ? (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <User className="w-4 h-4 text-blue-500" />
            <p className="text-[11px] font-bold text-slate-800">{customerName}{customerPhone ? ` (${customerPhone})` : ''}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name (optional)"
              className="flex-1 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none focus:border-blue-400" />
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone"
              className="w-28 h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none focus:border-blue-400 font-mono" />
          </div>
        )}
      </div>
    </div>
  );

  // ── Menu Step (Shared) ──
  const renderMenu = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search dishes, categories..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]/20" />
        </div>
      </div>

      {/* Horizontal category selector — matching POS Ordering style */}
      <div className="shrink-0 border-b border-slate-100 bg-white">
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
          <button onClick={() => setSelectedCat('All')}
            className={`shrink-0 h-10 px-4 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCat === 'All'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <LayoutGrid className="w-3.5 h-3.5" />
            All
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-0.5 ${selectedCat === 'All' ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
              {filteredItems.length}
            </span>
          </button>
          {categories.map(cat => {
            const catCount = menuItems.filter(i => i.category === cat.name).length;
            return (
              <button key={cat.id} onClick={() => setSelectedCat(cat.name)}
                className={`shrink-0 h-10 px-4 text-[11px] font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedCat === cat.name
                    ? 'text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={selectedCat === cat.name ? { backgroundColor: cat.color || '#16A34A' } : undefined}>
                {cat.name}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-1.5 ${selectedCat === cat.name ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Items grid — large POS-style cards */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredItems.map(item => {
            const inCart = cart.find(c => c.itemId === item.id);
            const outOfStock = item.stockStatus === 'Out of Stock';
            return (
              <div key={item.id}
                onClick={() => !outOfStock && addToCart(item)}
                className={`bg-white border rounded-2xl overflow-hidden transition-all active:scale-[0.97] ${
                  inCart ? 'border-[#16A34A] shadow-sm ring-1 ring-[#16A34A]/20' :
                  outOfStock ? 'opacity-50 border-slate-200 cursor-not-allowed grayscale' :
                  'border-slate-200 hover:border-[#16A34A] hover:shadow-md cursor-pointer'
                }`}>
                {/* Image section — larger for POS touch */}
                <div className="relative h-24 bg-slate-100 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl">{item.isVeg ? '🥗' : '🍖'}</span>
                    </div>
                  )}
                  {/* Veg / Non-veg indicator */}
                  <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-sm border-2 flex items-center justify-center bg-white/90">
                    <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600 border-emerald-600' : 'bg-red-600 border-red-600'}`} />
                  </span>
                  {/* Price badge */}
                  <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {currency}{item.price}
                  </span>

                  {/* In-cart quantity badge */}
                  {inCart && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shadow-md">
                      {inCart.qty}
                    </div>
                  )}
                </div>
                {/* Info section */}
                <div className="p-2.5">
                  <p className="text-[12px] font-extrabold text-slate-800 truncate leading-tight mb-1">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#16A34A] font-mono">{currency}{item.price}</span>
                    {outOfStock ? (
                      <span className="text-[9px] font-bold text-red-500">Sold Out</span>
                    ) : item.stockStatus === 'Available' ? (
                      <span className="text-[9px] font-bold text-slate-400">In Stock</span>
                    ) : null}
                  </div>
                </div>
                {/* In-cart quantity controls */}
                {inCart && (
                  <div className="flex items-center justify-between px-2.5 pb-2.5">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, -1); }} className="px-2.5 py-1.5 hover:bg-slate-100 cursor-pointer transition-colors">
                        <Minus className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <span className="px-2.5 py-1.5 font-extrabold text-xs text-slate-800">{inCart.qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, 1); }} className="px-2.5 py-1.5 hover:bg-slate-100 cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); setNotesForItem(item.id); setNotesText(inCart.notes || ''); }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 cursor-pointer" title="Add note">
                        <span className="text-[11px]">📝</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">No menu items found</p>
            <p className="text-[11px] text-slate-400">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search.`
                : selectedCat !== 'All'
                  ? `No items available in ${selectedCat}. Try another category.`
                  : 'No menu items available. Add items in Menu Management.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Review / Actions ──
  const renderReview = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-800">Review Order</h3>
        <p className="text-[10px] text-slate-400">
          {isTakeaway ? 'Take Away' : `Table: ${selectedTable?.name || '-'} · ${guestCount} guest(s)`} · {cart.reduce((s, c) => s + c.qty, 0)} items
          {!isTakeaway && selectedWaiter ? ` · Service Staff: ${selectedWaiter.name}` : ''}
        </p>

        {/* Order Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Type</p>
            <p className="text-[11px] font-extrabold text-slate-800 mt-0.5 capitalize">{orderType?.replace('_', ' ') || '-'}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">{needsTable ? 'Table' : 'Method'}</p>
            <p className="text-[11px] font-extrabold text-slate-800 mt-0.5">{selectedTable?.name || (isTakeaway ? 'Take Away' : '-')}</p>
          </div>
          {!isTakeaway && (
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-wider">Guests</p>
            <p className="text-[11px] font-extrabold text-slate-800 mt-0.5">{guestCount}</p>
          </div>
          )}
          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-[8px] font-bold text-purple-600 uppercase tracking-wider">Items</p>
            <p className="text-[11px] font-extrabold text-slate-800 mt-0.5">{cart.reduce((s, c) => s + c.qty, 0)}</p>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Items</p>
          {cart.map((item) => (
            <div key={item.itemId} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#16A34A] shrink-0">{item.qty}x</span>
                  <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                </div>
                {item.notes && <p className="text-[9px] text-amber-700 font-semibold mt-0.5">📝 {item.notes}</p>}
              </div>
              <span className="font-mono font-bold text-xs text-slate-700 shrink-0 ml-2">{currency}{(item.price * item.qty).toFixed(0)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono font-bold">{currency}{subtotal.toFixed(0)}</span></div>
          {settings?.taxType === 'Exclusive' && (
            <div className="flex justify-between text-slate-500"><span>GST ({gstRate}%)</span><span className="font-mono">{currency}{taxAmount.toFixed(0)}</span></div>
          )}
          {serviceCharge > 0 && (
            <div className="flex justify-between text-slate-500"><span>Service Charge ({serviceCharge}%)</span><span className="font-mono">{currency}{serviceChargeAmount.toFixed(0)}</span></div>
          )}
          <div className="flex justify-between font-extrabold text-sm text-slate-800 border-t border-slate-200 pt-2 mt-2">
            <span>Grand Total</span><span className="font-mono text-[#16A34A]">{currency}{grandTotal.toFixed(0)}</span>
          </div>
          {settings?.taxType === 'Inclusive' && gstRate > 0 && (
            <div className="text-[9px] text-slate-400 italic text-right">(incl. GST {gstRate}%)</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">{isEditing ? 'Add Additional Items' : 'Choose Action'}</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Show existing items when editing */}
            {isEditing && editExistingItems.length > 0 && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" /> Existing Items on Order
                </p>
                {editExistingItems.map((item) => (
                  <div key={item.itemId} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono font-bold text-blue-600 shrink-0">{item.qty}x</span>
                      <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-600 shrink-0 ml-1">{currency}{(item.price * item.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hold Order - hidden when editing, always hidden if module disabled */}
            {!isEditing && settings.enableHoldOrders !== false && (
            <button onClick={handleHoldOrder} disabled={submitting !== null}
              className="p-3 border-2 border-amber-200 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Coffee className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-[10px] font-extrabold text-amber-700">Hold Order</p>
              <p className="text-[8px] text-amber-500 mt-0.5">Save & resume later</p>
            </button>
            )}
            {isEditing ? (
              /* Update Order (for editing existing orders) */
              <button onClick={handleUpdateOrder} disabled={submitting !== null || cart.length === 0}
                className="p-3 border-2 border-[#16A34A] rounded-2xl bg-[#16A34A]/5 hover:bg-[#16A34A]/10 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed col-span-2">
                {submitting === 'update' ? (
                  <Loader2 className="w-5 h-5 text-[#16A34A] mx-auto mb-1 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 text-[#16A34A] mx-auto mb-1" />
                )}
                <p className="text-[10px] font-extrabold text-[#16A34A]">{submitting === 'update' ? 'Updating...' : 'Update Order'}</p>
                <p className="text-[8px] text-emerald-600 mt-0.5">Add {cart.reduce((s, c) => s + c.qty, 0)} new item(s) to order</p>
              </button>
            ) : (
            <>
            {/* Print KOT - always hidden if kitchen module disabled */}
            {settings.enableKitchen !== false && (
            <button onClick={handlePrintKot} disabled={submitting !== null || (needsTable && !selectedTable)}
              className="p-3 border-2 border-orange-200 rounded-2xl hover:border-[#C85A32] hover:bg-orange-50 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Printer className="w-5 h-5 text-[#C85A32] mx-auto mb-1" />
              <p className="text-[10px] font-extrabold text-[#C85A32]">Print KOT</p>
              <p className="text-[8px] text-orange-500 mt-0.5">Send to kitchen</p>
            </button>
            )}
            {/* Save & Pay */}
            </>
            )}
            {/* Save & Pay - hidden if billing module disabled or for non-billing roles (WAITER/KITCHEN) */}
            {settings.enableBilling !== false && canBill && (
            <button onClick={handleSaveAndPay} disabled={submitting !== null}
              className="p-3 border-2 border-emerald-200 rounded-2xl hover:border-[#16A34A] hover:bg-emerald-50 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-[10px] font-extrabold text-emerald-700">Save & Pay</p>
              <p className="text-[8px] text-emerald-500 mt-0.5">Proceed to payment, {currency}{grandTotal.toFixed(0)}</p>
            </button>
            )}
          </div>
        </div>

        {/* Cancel Order - hidden when editing */}
        {!isEditing && (
        <div className="pt-1">
          <button onClick={handleCancelOrder} disabled={submitting !== null}
            className="w-full py-2.5 border border-red-200 rounded-xl text-[10px] font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
            <Ban className="w-3.5 h-3.5" /> Cancel Order
          </button>
        </div>
        )}
      </div>

      {/* Submitting overlay */}
      {submitting && (
        <div className="px-4 py-2.5 bg-[#16A34A]/10 border-t border-[#16A34A]/20 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#16A34A]" />
          <span className="text-[11px] font-bold text-[#16A34A]">
            {submitting === 'hold' ? 'Placing on hold...' :
             submitting === 'kot' ? 'Printing KOT...' :
             submitting === 'bill' ? 'Saving order...' :
             submitting === 'update' ? 'Updating order...' : 'Processing...'}
          </span>
        </div>
      )}

      {/* Success Banner */}
      {actionSuccess && (
        <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="text-[11px] font-bold text-emerald-700">
            {actionSuccess === 'hold' ? 'Order on hold!' :
             actionSuccess === 'kot' ? 'KOT printed!' : actionSuccess === 'bill' ? 'Order created!' : 'Order completed!'}
          </span>
        </div>
      )}

    </div>
  );

  // ── Main Render ──
  if (!isPageMode && !showTakeOrderWizard) return null;

  // Show loading spinner while initial data loads (placed after ALL hooks)
  if (dataLoading) {
    if (isPageMode) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
            <p className="text-xs font-bold text-slate-500">Loading...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
          <p className="text-xs font-bold text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const wizardContent = (
    <>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            {!isPageMode && (
              <>
                <button onClick={handleClose} aria-label="Close order wizard" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200" />
              </>
            )}
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{isEditing ? `Edit Order #${editingOrder.orderNo || editingOrder.id}` : 'New Order'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <span className="bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> {cart.length}
              </span>
            )}
            {editExistingItems.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1">
                {editExistingItems.reduce((s, i) => s + i.qty, 0)} existing
              </span>
            )}
            {orderType && (
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-[9px] font-bold capitalize">{orderType.replace('_', ' ')}</span>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Step 0: Order Type */}
          {currentStep === 0 && renderOrderType()}

          {/* Dine In Steps */}
          {orderType === 'dine_in' && currentStep === 1 && renderFloor()}
          {orderType === 'dine_in' && currentStep === 2 && renderTable()}
          {orderType === 'dine_in' && currentStep === 3 && renderMenu()}
          {orderType === 'dine_in' && currentStep === 4 && renderReview()}

          {/* Takeaway Steps - skip Order Details, open directly on Menu */}
          {isTakeaway && currentStep === 1 && renderMenu()}
          {isTakeaway && currentStep === 2 && renderReview()}
        </div>

        {/* Footer Navigation */}
        {!actionSuccess && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
            <button onClick={goBack} disabled={currentStep === 0}
              className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] sm:text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            {currentStep < maxStep && (
              <button onClick={goNext}
                disabled={(!orderType && currentStep === 0) || (needsTable && !selectedTable && currentStep === 2) || (cart.length === 0 && currentStep === (isTakeaway ? 1 : 3))}
                className={`h-9 px-4 font-bold rounded-xl text-[10px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  (currentStep === 0 && !orderType) || (currentStep === maxStep - 1 && cart.length === 0)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                }`}>
                {currentStep === (isTakeaway ? 1 : 3) ? `Review (${cart.reduce((s, c) => s + c.qty, 0)} items)` : `Continue`} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

      {/* Notes Modal */}
      {notesForItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xs rounded-xl shadow-xl border border-slate-100 p-4 space-y-3 animate-fade-in">
            <h4 className="text-xs font-extrabold text-slate-800">Add Note</h4>
            <input value={notesText} onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g., Less spicy, extra cheese..."
              className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#16A34A]" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setNotesForItem(null)}
                className="flex-1 h-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
              <button onClick={() => setItemNotes(notesForItem, notesText)}
                className="flex-[2] h-8 bg-[#16A34A] text-white rounded-lg text-xs font-bold hover:bg-[#15803D] cursor-pointer transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-100 p-4 space-y-3 animate-fade-in">
            <h4 className="text-xs font-extrabold text-slate-800">Find or Add Customer</h4>
            <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customers by name or phone..."
              className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" autoFocus />
            {customerError && (
              <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mb-2">
                <span className="text-[10px] text-red-500 italic">Couldn't load customer list.</span>
                <button onClick={loadCustomers} className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer">Retry</button>
              </div>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                  className="w-full p-2 flex items-center gap-2 hover:bg-blue-50 rounded-lg transition-all text-left cursor-pointer">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.name}</p>
                    {c.phone && <p className="text-[9px] text-slate-500">{c.phone}</p>}
                  </div>
                </button>
              ))}
              {customerSearch && !customers.find(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())) && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No matching customers found. Enter name below.</p>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowCustomerSearch(false)}
                className="flex-1 h-8 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer">Close</button>
              <button onClick={() => {
                // Use manually entered name/phone
                if (customerSearch) {
                  const parts = customerSearch.split(' ');
                  setCustomerName(parts[0]);
                  if (parts.length > 1) setCustomerPhone(parts.slice(1).join(' '));
                }
                setShowCustomerSearch(false);
              }} className="flex-[2] h-8 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 cursor-pointer">
                Add as New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog !== null && !confirmDialog?.children}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        confirmVariant={confirmDialog?.confirmVariant}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={confirmDialog?.onCancel || (() => {})}
      />
    </>
  );

  if (isPageMode) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        {wizardContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full h-full sm:h-[95vh] sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl sm:mx-4 flex flex-col overflow-hidden">
        {wizardContent}
      </div>
    </div>
  );
}
