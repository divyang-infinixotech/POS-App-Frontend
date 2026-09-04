import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUiStore, useCartStore, useSettingsStore, useAuthStore } from '../../../store';
import { 
  Clock, Users, Search, Ban, RefreshCw, Loader2, X, AlertTriangle, 
  Plus, Printer, CreditCard, ArrowRight, UtensilsCrossed, 
  Coffee, CheckCircle2, RotateCcw, DollarSign, Trash2, ChefHat,
  Eye, Play, SplitSquareVertical
} from 'lucide-react';
import orderApi from '../../../api/order.api';
import { kotApi } from '../../../api/kot.api';
import { tableApi } from '../../../api/table.api';
import { useSocketEvent } from '../../../hooks/useSocket';
import { openBillPrintPreview, openKotPrintPreview } from '../../../services/printService';
import API_BASE_URL from '../../../config/apiConfig';
import { canHandleBilling } from '../../../utils/permissions';

// ── Color status mapping ──
const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Pending' },
  PREPARING: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Preparing' },
  READY: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Ready' },
  SERVED: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Served' },
  HOLD: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'On Hold' },
  COMPLETED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
};

const CANCEL_REASONS = ['Customer Cancelled', 'Wrong Order', 'Duplicate Order', 'Kitchen Issue', 'Other'];

// ── Helper: Calculate elapsed time ──
const getElapsed = (createdAt) => {
  if (!createdAt) return '0m';
  const time = new Date(createdAt).getTime();
  if (isNaN(time)) return '0m'; // missing/invalid timestamp must never render NaN
  const diffMins = Math.floor((Date.now() - time) / 60000);
  if (diffMins < 0) return '0m';
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
};

// ── Cancel Reason Modal ──
function CancelReasonModal({ isOpen, orderNumber, onBack, onConfirm, isLoading }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  if (!isOpen) return null;
  const handleConfirm = () => {
    if (isLoading) return;
    if (!selectedReason) { setError('Please select a cancellation reason'); return; }
    onConfirm(selectedReason, notes);
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Ban className="w-5 h-5 text-red-600" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800">Cancellation Reason</h3>
            <p className="text-xs text-slate-500 mt-1">Order: <span className="font-mono font-bold text-slate-700">{orderNumber}</span></p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Reason *</label>
          <div className="space-y-1">
            {CANCEL_REASONS.map(reason => (
              <button key={reason} disabled={isLoading} onClick={() => { setSelectedReason(reason); setError(''); }}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${selectedReason === reason ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedReason === reason ? 'border-red-500' : 'border-slate-300'}`}>
                    {selectedReason === reason && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  {reason}
                </div>
              </button>
            ))}
          </div>
          {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes about cancellation..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 resize-none h-16 font-medium" />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button onClick={onBack} disabled={isLoading}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50">Back</button>
          <button onClick={handleConfirm} disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {isLoading ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function ActiveOrdersPage() {
  const { setCheckoutOrderId, setActiveOrderTakingId, setShowTakeOrderWizard, addToast, ordersActiveTab, setOrdersActiveTab, refreshTrigger, incrementRefreshTrigger } = useUiStore();
  const { orders, setOrders } = useCartStore();
  const { settings } = useSettingsStore();
  const currency = settings?.currencySymbol || '₹';
  const { user } = useAuthStore();
  const isServiceStaff = (user?.role || '').toUpperCase() === 'WAITER';
  // Bill checkout / payment actions are restricted to billing-capable roles
  // (ADMIN/MANAGER/CASHIER). WAITER and KITCHEN must never see them.
  const canBill = canHandleBilling(user?.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cancel flow state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Held orders state (for Hold tab)
  const [heldOrders, setHeldOrders] = useState([]);
  const [heldLoading, setHeldLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Transfer table state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringOrder, setTransferringOrder] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Hold button loading per order
  const [holdLoading, setHoldLoading] = useState(null);

  // KOT button loading per order (double-click protection)
  const [kotLoading, setKotLoading] = useState(null);

  // Split merged-order button loading per merge group
  const [splitLoading, setSplitLoading] = useState(null);

  // Completed orders
  const [completedOrders, setCompletedOrders] = useState([]);

  // Cancelled orders state
  const [cancelledOrders, setCancelledOrders] = useState([]);

  // ── Helper: extract order array from API response ──
  const extractOrders = (res) => {
    if (!res) return [];
    // Axios wraps body in res.data. Backend may return:
    //   { success: true, data: [...] }  → res.data.data is the array
    //   { success: true, orders: [...] } → res.data.orders is the array
    //   { data: [...] }                 → res.data is already the array
    //   [...]                           → res is the raw array
    const body = res.data || res;
    if (Array.isArray(body)) return body;
    if (body?.data && Array.isArray(body.data)) return body.data;
    if (body?.orders && Array.isArray(body.orders)) return body.orders;
    if (Array.isArray(res)) return res;
    return [];
  };

  // ── Fetch Active Orders ──
  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await orderApi.getActive();
      const orderList = extractOrders(res);
      setOrders(orderList);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch active orders:', err);
      setError('Unable to load orders. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [setOrders]);

  // ── Fetch Held + Completed + Cancelled Orders (Single consolidated call) ──
  const fetchHeldAndCompleted = useCallback(async () => {
    setHeldLoading(true);
    try {
      const resp = await orderApi.getAll();
      const allOrders = extractOrders(resp);
      setHeldOrders(allOrders.filter(o => o.status === 'HOLD'));
      setCompletedOrders(allOrders.filter(o => o.status === 'COMPLETED'));
      setCancelledOrders(allOrders.filter(o => o.status === 'CANCELLED'));
    } catch (e) {
      console.error('Failed to fetch held/completed/cancelled orders:', e);
    } finally {
      setHeldLoading(false);
    }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    fetchActiveOrders();
    fetchHeldAndCompleted();
  }, []);

  // Re-fetch when data changes (triggered by TakeOrderWizard)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchActiveOrders();
      fetchHeldAndCompleted();
    }
  }, [refreshTrigger]);

  // ── Real-time updates via WebSocket ──
  useSocketEvent({
    event: 'order:created', handler: (data) => {
      setOrders((prev) => { const exists = prev.some((o) => o.id === data.order?.id); return exists ? prev : [data.order, ...prev]; });
      setLoading(false);
    }, pollFn: fetchActiveOrders, pollInterval: 30000,
  });
  useSocketEvent({ event: 'order:updated', handler: (data) => {
    setOrders((prev) => prev.map((o) => (o.id === data.order?.id ? { ...o, ...data.order } : o)));
    setLoading(false);
  }});
  useSocketEvent({ event: 'order:cancelled', handler: (data) => {
    setOrders((prev) => prev.filter((o) => o.id !== data.order?.id));
    setLoading(false);
    addToast(`Order #${data.order?.orderNo || data.order?.id} has been cancelled`, 'info');
  }});
  useSocketEvent({ event: 'order:deleted', handler: (data) => {
    setOrders((prev) => prev.filter((o) => o.id !== data.order?.id));
    setLoading(false);
  }});

  // ── Filter active orders (exclude HOLD, COMPLETED, CANCELLED) ──
  const activeOrders = (orders || []).filter(o => {
    if (o.status === 'HOLD' || o.status === 'COMPLETED' || o.status === 'CANCELLED') return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (o.orderNo || '').toLowerCase().includes(q) ||
      (o.table?.tableNo || '').toString().toLowerCase().includes(q) ||
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.user?.name || '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'All' || (o.orderType || '') === typeFilter;
    return matchesSearch && matchesType;
  });

  // ── Filter completed orders ──
  const filteredCompleted = completedOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (o.orderNo || '').toLowerCase().includes(q) ||
      (o.table?.tableNo || '').toString().toLowerCase().includes(q) ||
      (o.customer?.name || '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'All' || (o.orderType || '') === typeFilter;
    return matchesSearch && matchesType;
  });

  // ── Filter held orders ──
  const filteredHeld = heldOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    return !q || (o.orderNo || '').toString().toLowerCase().includes(q) ||
      (o.table?.tableNo || '').toString().toLowerCase().includes(q) ||
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.user?.name || '').toLowerCase().includes(q);
  });

  // ── Filter cancelled orders ──
  const filteredCancelled = cancelledOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    return !q || (o.orderNo || '').toString().toLowerCase().includes(q) ||
      (o.table?.tableNo || '').toString().toLowerCase().includes(q) ||
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.cancelReason || '').toLowerCase().includes(q);
  });

  // ── Cancelled Order Guard ──
  const isOrderCancelled = (order) => order?.status === 'CANCELLED' || order?.cancelledAt;

  // ── Handlers ──
  const handleAddItem = (order) => {
    if (isOrderCancelled(order)) {
      addToast('This order has been cancelled and cannot be modified.', 'error');
      return;
    }
    if (settings.enableAddItem === false) {
      addToast('Adding items is disabled in POS Settings', 'warning');
      return;
    }
    setActiveOrderTakingId(`ord-${order.id}`);
    setShowTakeOrderWizard(true);
  };

  const handlePrintKOT = async (order) => {
    if (kotLoading) return; // double-click protection
    if (isOrderCancelled(order)) {
      addToast('This order has been cancelled and cannot be printed.', 'error');
      return;
    }
    if (settings.enableKitchen === false) {
      addToast('Kitchen module is disabled in POS Settings', 'warning');
      return;
    }
    setKotLoading(order.id);
    try {
      // Create a DELTA KOT — only items not yet sent to kitchen.
      // The backend calculates quantity − sentQuantity and returns only the delta.
      const kotResp = await kotApi.create({ orderId: order.id });
      // Backend returns { success: true, data: { created, kot, kotItems, kotNo } }
      const kotData = kotResp?.data || kotResp;

      // If no new items, backend returns created=false — this is normal, not an error
      if (kotData?.created === false || !kotData?.kotNo) {
        addToast('No new items to send to kitchen.', 'info');
        return;
      }

      const kotNo = kotData?.kotNo || '';
      // KOTItems from the response contain ONLY the delta items for this KOT.
      // Never fall back to order.orderItems — that would print all items, defeating incremental KOT.
      const items = kotData?.kotItems || [];

      openKotPrintPreview({
        restaurantName: settings?.branding?.restaurantName || '',
        kotNo: kotNo,
        orderNo: order.orderNo || String(order.id),
        tableNo: order.table?.tableNo || '',
        orderType: order.orderType || 'DINE_IN',
        waiterName: order.user?.name || '',
        customerName: order.customer?.name || '',
        customerPhone: order.customer?.phone || '',
        guestCount: order.guestCount || 1,
        notes: order.notes || '',
        items: items,
        footer: settings?.receiptFooterMessage || 'Thank You!',
        date: new Date()
      });
      addToast(`KOT ${kotNo} created for Order ${order.orderNo || order.id}`, 'success');
      incrementRefreshTrigger();
    } catch (e) {
      const msg = e?.message || 'Unable to connect to the printer. Please check your printer settings and try again.';
      addToast(msg, 'error');
    } finally {
      setKotLoading(null);
    }
  };

  const handlePrintBill = (order) => {
    if (isOrderCancelled(order)) {
      addToast('This order has been cancelled and cannot be billed.', 'error');
      return;
    }
    if (settings.enableBilling === false) {
      addToast('Billing module is disabled in POS Settings', 'warning');
      return;
    }
    setCheckoutOrderId(order.id);
  };

  // Reprint Bill — for completed orders ONLY: opens HTML print preview
  const handleReprintBill = async (order) => {
    let billData = order.bill || null;
    
    if (!billData?.id && !order.billId) {
      try {
        const resp = await orderApi.getById(order.id);
        const fullOrder = resp?.data || resp;
        billData = fullOrder.bill || null;
        if (!billData?.id) {
          billData = fullOrder.billId ? { id: fullOrder.billId } : null;
        }
      } catch {}
    }
    
    const billId = billData?.id || order.billId;
    if (!billId) {
      addToast('Bill not found for this order.', 'warning');
      return;
    }

    // Open HTML-based print preview instead of PDF
    try {
      const items = order.orderItems || [];
      openBillPrintPreview({
        restaurantName: settings?.branding?.restaurantName || '',
        address: settings?.address || '',
        phone: settings?.contactNumber || '',
        email: settings?.email || '',
        gstNumber: settings?.gstNumber || '',
        fssaiNumber: settings?.fssaiNumber || '',
        logo: settings?.branding?.logo || '',
        receiptFooter: settings?.receiptFooterMessage || 'Thank you for your business!',
        billNo: billData?.billNo || String(billId),
        orderNo: order.orderNo || String(order.id),
        tableNo: order.table?.tableNo || '',
        orderType: order.orderType || 'DINE_IN',
        customerName: order.customer?.name || '',
        date: order.createdAt || new Date(),
        items: items,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        serviceCharge: order.serviceCharge || 0,
        taxAmount: order.taxAmount || 0,
        roundOff: order.roundOff || 0,
        grandTotal: order.grandTotal || order.subtotal || 0,
        payments: billData?.payments || [],
        paperSize: '80mm'
      });
      addToast(`Bill #${billData?.billNo || billId} sent to printer.`, 'success');
    } catch (e) {
      addToast('Failed to print bill preview', 'error');
    }
  };

  // Cancel flow
  const handleCancelClick = (order) => {
    if (isOrderCancelled(order)) {
      addToast('This order has already been cancelled.', 'info');
      return;
    }
    setCancellingOrderId(order.id);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    setShowCancelReason(true);
  };

  const handleCancelWithReason = async (reason, notes) => {
    if (!cancellingOrderId || cancelSubmitting) {
      setShowCancelReason(false);
      return;
    }
    setCancelSubmitting(true);
    const cancelId = cancellingOrderId;
    // Capture table info from local state BEFORE API call
    const orderToCancel = (orders || []).find(o => o.id === cancelId);
    const tableId = orderToCancel?.tableId || orderToCancel?.table?.id;
    try {
      await orderApi.cancel(cancelId, reason);
      // Cancel all associated KOTs by order ID
      try { await kotApi.cancelByOrder(cancelId, reason); } catch {}
      // Release the table
      if (tableId) {
        try { await tableApi.updateStatus(tableId, 'AVAILABLE'); } catch {}
      }
      addToast(`Order cancelled successfully`, 'success');
      incrementRefreshTrigger(); // triggers refreshTrigger useEffect (fetches active, held, completed)
    } catch (e) {
      addToast('Failed to cancel order', 'error');
    }
    setShowCancelReason(false);
    setCancellingOrderId(null);
    setCancelSubmitting(false);
  };

  // ── Split handler ──
  // Splits an ACTIVE merged-table group back into separate tables/orders.
  // splitLoading state lives at component level so the card buttons that
  // reference it (below) can disable while the split request is in flight.
  const handleSplit = async (mergeGroupId) => {
    if (!mergeGroupId || splitLoading) return;
    setSplitLoading(mergeGroupId);
    try {
      await orderApi.splitOrders(mergeGroupId);
      addToast("Tables split successfully", "success");
      fetchActiveOrders();
      fetchHeldAndCompleted();
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to split", "error");
    } finally {
      setSplitLoading(null);
    }
  };

  const handleCancelBack = () => {
    setShowCancelReason(false);
    setShowCancelConfirm(true);
  };

  // ── Transfer Table ──
  const handleOpenTransfer = async (order) => {
    if (isOrderCancelled(order)) {
      addToast('This order has been cancelled and cannot be transferred.', 'error');
      return;
    }
    if (settings.enableTransferTable === false) {
      addToast('Table transfer is disabled in POS Settings', 'warning');
      return;
    }
    setTransferringOrder(order);
    setShowTransferModal(true);
    setTablesLoading(true);
    try {
      const resp = await tableApi.getAll();
      // resp is the body directly (axios interceptor returns response.data)
      const tableList = resp?.tables || resp?.data || [];
      if (tableList.length) {
        const currentTableId = order.tableId || order.table?.id;
        const available = tableList.filter(t => t.status === 'AVAILABLE' && t.id !== currentTableId);
        setAvailableTables(available);
      }
    } catch (e) {
      addToast('Failed to load available tables', 'error');
      setAvailableTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleConfirmTransfer = async (newTableId) => {
    if (!transferringOrder || !newTableId) return;
    try {
      await orderApi.changeTable(transferringOrder.id, newTableId);
      // Release old table
      const oldTableId = transferringOrder.tableId || transferringOrder.table?.id;
      if (oldTableId) {
        try { await tableApi.updateStatus(oldTableId, 'AVAILABLE'); } catch {}
      }
      // Mark new table as occupied
      try { await tableApi.updateStatus(newTableId, 'OCCUPIED'); } catch {}
      addToast(`Order transferred to new table successfully`, 'success');
      setShowTransferModal(false);
      setTransferringOrder(null);
      incrementRefreshTrigger();
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to transfer table', 'error');
    }
  };

  // ── Hold Order ──
  const handleHoldOrder = async (order) => {
    if (isOrderCancelled(order)) {
      addToast('This order has been cancelled and cannot be placed on hold.', 'error');
      return;
    }
    if (settings.enableHoldOrders === false) {
      addToast('Hold orders is disabled in POS Settings', 'warning');
      return;
    }
    setHoldLoading(order.id);
    try {
      await orderApi.hold(order.id);
      addToast(`Order ${order.orderNo || order.id} placed on hold.`, 'success');
      incrementRefreshTrigger(); // triggers refreshTrigger useEffect (fetches active, held, completed)
    } catch (e) {
      addToast(e?.response?.data?.message || 'Failed to hold order', 'error');
    } finally {
      setHoldLoading(null);
    }
  };

  // ── Held Orders Handlers ──

  const handleResumeHold = async (orderId) => {
    setActionLoading(orderId);
    try {
      const backendId = parseInt(orderId.toString());
      const resp = await orderApi.resume(backendId);
      if (resp.success) {
        addToast('Order resumed. You can now modify it.', 'success');
        setHeldOrders(prev => prev.filter(o => o.id !== backendId));
        setOrdersActiveTab('Active');
        // Open the Take Order Wizard as overlay (stays on Active Orders)
        setActiveOrderTakingId(`ord-${backendId}`);
        setShowTakeOrderWizard(true);
        incrementRefreshTrigger(); // triggers refreshTrigger useEffect
      }
    } catch (e) {
      addToast(e.message || 'Failed to resume order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintKotHeld = async (orderId) => {
    if (kotLoading) return; // double-click protection
    const heldOrder = heldOrders.find(o => o.id === parseInt(orderId.toString()));
    if (heldOrder && isOrderCancelled(heldOrder)) {
      addToast('This order has been cancelled and cannot be printed.', 'error');
      return;
    }
    if (settings.enableKitchen === false) {
      addToast('Kitchen module is disabled in POS Settings', 'warning');
      return;
    }
    setKotLoading(orderId);
    const backendId = parseInt(orderId.toString());
    try {
      // Create a DELTA KOT for held orders too
      const kotResp = await kotApi.create({ orderId: backendId });
      // Backend returns { success: true, data: { created, kot, kotItems, kotNo } }
      const kotData = kotResp?.data || kotResp;

      // If no new items, backend returns created=false — this is normal, not an error
      if (kotData?.created === false || !kotData?.kotNo) {
        addToast('No new items to send to kitchen.', 'info');
        return;
      }

      const kotNo = kotData?.kotNo || '';
      // KOTItems from the response contain ONLY the delta items for this KOT.
      // Never fall back to order.orderItems — that would print all items.
      const items = kotData?.kotItems || [];

      openKotPrintPreview({
        restaurantName: settings?.branding?.restaurantName || '',
        kotNo: kotNo,
        orderNo: heldOrder?.orderNo || String(backendId),
        tableNo: heldOrder?.table?.tableNo || '',
        orderType: heldOrder?.orderType || 'DINE_IN',
        waiterName: heldOrder?.user?.name || '',
        customerName: heldOrder?.customer?.name || '',
        customerPhone: heldOrder?.customer?.phone || '',
        guestCount: heldOrder?.guestCount || 1,
        notes: heldOrder?.notes || '',
        items: items,
        footer: settings?.receiptFooterMessage || 'Thank You!',
        date: new Date()
      });
      addToast(`KOT ${kotNo} created successfully!`, 'success');
      incrementRefreshTrigger();
    } catch (e) {
      const msg = e?.message || 'Unable to connect to the printer. Please check your printer settings and try again.';
      addToast(msg, 'error');
    } finally {
      setKotLoading(null);
    }
  };

  const handleCheckoutHeld = async (orderId) => {
    const heldOrder = heldOrders.find(o => o.id === parseInt(orderId.toString()));
    if (heldOrder && isOrderCancelled(heldOrder)) {
      addToast('This order has been cancelled and cannot be billed.', 'error');
      return;
    }
    if (settings.enableBilling === false) {
      addToast('Billing module is disabled in POS Settings', 'warning');
      return;
    }
    setCheckoutOrderId(orderId);
  };

  const handleDeleteHeld = async (orderId) => {
    if (!orderId) {
      setConfirmDelete(null);
      return;
    }
    setActionLoading(orderId);
    const backendId = parseInt(orderId.toString());
    // Capture table info from local state BEFORE API call
    const heldOrder = heldOrders.find(o => o.id === backendId);
    const tableId = heldOrder?.tableId || heldOrder?.table?.id;
    try {
      await orderApi.cancel(backendId, 'Deleted from held orders');
      // Release the table
      if (tableId) {
        try { await tableApi.updateStatus(tableId, 'AVAILABLE'); } catch {}
      }
      addToast('Held order deleted.', 'success');
      setHeldOrders(prev => prev.filter(o => o.id !== backendId));
      incrementRefreshTrigger();
    } catch (e) {
      addToast(e.message || 'Failed to delete order', 'error');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  // ── Helpers ──
  const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const getItemCount = (order) => (order.orderItems || []).reduce((s, i) => s + (i.quantity || 0), 0);
  const getOrderTotal = (order) => {
    if (order.grandTotal != null) return order.grandTotal;
    if (order.subtotal != null) return order.subtotal;
    return (order.orderItems || []).reduce((s, i) => s + Number(i.total || i.price || 0), 0);
  };

  const cancellingOrder = (orders || []).find(o => o.id === cancellingOrderId);

  const tabs = [
    { key: 'Active', label: 'Active', icon: Play, count: activeOrders.length },
    { key: 'Hold', label: 'Hold', icon: Coffee, count: filteredHeld.length, setting: 'enableHoldOrders' },
    { key: 'Completed', label: 'Completed', icon: CheckCircle2, count: filteredCompleted.length },
    { key: 'Cancelled', label: 'Cancelled', icon: Ban, count: cancelledOrders.length },
  ];

  const renderActiveOrderCard = (order) => {
    const itemsCount = getItemCount(order);
    const total = getOrderTotal(order);
    const elapsed = getElapsed(order.createdAt);
    const sStyle = getStatusStyle(order.status);
    const waiterName = order.user?.name || '—';
    const customerName = order.customer?.name || '—';
    const tableName = order.table ? `Table ${order.table.tableNo || order.table.name}` : 'Takeaway';

    return (
      <div key={order.id}
        className="bg-white hover:bg-slate-50/50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(44,62,80,0.06)] transition-all relative group">
        
        {/* Top row: order number + running time */}
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-mono font-black text-[#16A34A] text-sm">#{order.orderNo || order.id}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[9px] flex items-center gap-1 font-bold bg-slate-50 px-1.5 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-[#16A34A]" /> {elapsed}
            </span>
            <span className="text-slate-400 text-[9px] font-mono font-bold">
              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`} /> {sStyle.label}
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase ml-auto">{order.orderType?.replace('_', ' ')}</span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2.5">
          <div className="flex items-center gap-1 text-slate-500">
            <UtensilsCrossed className="w-3 h-3 text-slate-400" />
            <span className="font-semibold truncate">{tableName}</span>
            {order.isMerged && order.mergedTables && order.mergedTables.length > 1 && (
              <span className="text-[8px] text-amber-600 font-bold ml-1">(Merged: {order.mergedTables.map(t => t.tableNo).join(" + ")})</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span className="font-semibold">👤</span>
            <span className="font-semibold truncate">{customerName}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span className="font-semibold">🛎️</span>
            <span className="font-semibold truncate">{waiterName}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span className="font-semibold">📦</span>
            <span className="font-semibold">{itemsCount} items</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 mt-0.5 mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          <span className="font-mono text-sm font-black text-[#16A34A]">{currency}{Number(total).toLocaleString('en-IN')}</span>
        </div>

        {/* Simplified Action Buttons: Add Item, Print KOT (if enabled), Bill (if enabled), Transfer (if enabled), Cancel */}
        {/* h-10 min touch targets (≈40px) — no hover-only actions */}
        <div className={`grid ${isServiceStaff ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
          <button onClick={() => handleAddItem(order)}
            className="h-10 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer">
            <Plus className="w-3 h-3" /> Add Item
          </button>
          {settings.enableKitchen !== false && (
            <button onClick={() => handlePrintKOT(order)} disabled={kotLoading === order.id}
              className="h-10 bg-white border border-slate-200 hover:bg-slate-50 text-[#111827] font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {kotLoading === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />} KOT
            </button>
          )}
          {settings.enableBilling !== false && canBill && (
            <button onClick={() => handlePrintBill(order)}
              className="h-10 bg-white border border-slate-200 hover:bg-slate-50 text-[#111827] font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer">
              <CreditCard className="w-3 h-3" /> Bill
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {settings.enableTransferTable !== false && (order.tableId || order.table?.id) && (
            <button onClick={() => handleOpenTransfer(order)}
              className="h-10 bg-white border border-slate-200 hover:bg-slate-50 text-[#111827] font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer">
              <ArrowRight className="w-3 h-3" /> Transfer
            </button>
          )}
          {settings.enableHoldOrders !== false && (
            <button onClick={() => handleHoldOrder(order)} disabled={holdLoading === order.id}
              className={`h-10 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}>
              {holdLoading === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coffee className="w-3 h-3" />}
              Hold
            </button>
          )}
          {order.isMerged && order.mergeGroupId && (
            <button onClick={() => handleSplit(order.mergeGroupId)} disabled={splitLoading === order.mergeGroupId}
              className="h-10 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50">
              {splitLoading === order.mergeGroupId ? <Loader2 className="w-3 h-3 animate-spin" /> : <SplitSquareVertical className="w-3 h-3" />}
              Split
            </button>
          )}
          <button onClick={() => handleCancelClick(order)}
            className="h-10 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer">
            <Ban className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderHoldCard = (order) => {
    const elapsed = getElapsed(order.createdAt);
    const itemCount = (order.orderItems || []).reduce((s, i) => s + (i.quantity || 0), 0);
    const total = order.grandTotal || order.subtotal || 
      (order.orderItems || []).reduce((s, i) => s + Number(i.total || i.price || 0) * (i.quantity || 1), 0);
    const isLoading = actionLoading === order.id;
    const tableName = order.table ? `Table ${order.table.tableNo || order.table.name}` : 'Takeaway';
    const waiterName = order.user?.name || 'Staff';

    return (
      <div key={order.id}
        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3 hover:shadow-md transition-all">
        {/* Top: Order Number & Status */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-amber-700 font-mono">#{order.orderNo || order.id}</span>
              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-700">HOLD</span>
            </div>
            <p className="text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              {tableName}
              {order.customer?.name && <span className="text-[10px] text-slate-500 font-medium">· {order.customer.name}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {elapsed}
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
          <span className="flex items-center gap-0.5"><ChefHat className="w-3 h-3" /> {waiterName}</span>
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>              <span className="ml-auto font-mono font-bold text-slate-800">{currency}{Number(total).toFixed(0)}</span>
        </div>

        {/* Actions */}
        {isLoading ? (
          <div className="flex items-center justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-amber-600" /></div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-2.5">
            <button onClick={() => handleResumeHold(order.id)}
              className="h-10 text-[9px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
              <RotateCcw className="w-3 h-3" /> Resume
            </button>
            {settings.enableKitchen !== false && (
              <button onClick={() => handlePrintKotHeld(order.id)} disabled={kotLoading === order.id}
                className="h-10 text-[9px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50">
                {kotLoading === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />} KOT
              </button>
            )}
            {settings.enableBilling !== false && canBill && (
              <button onClick={() => handleCheckoutHeld(order.id)}
                className="h-10 text-[9px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
                <DollarSign className="w-3 h-3" /> Checkout
              </button>
            )}
            <button onClick={() => setConfirmDelete(order.id)}
              className="col-span-3 h-10 text-[9px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCompletedCard = (order) => {
    const total = getOrderTotal(order);
    const sStyle = getStatusStyle(order.status);
    const tableName = order.table ? `Table ${order.table.tableNo || order.table.name}` : 'Takeaway';
    const itemsCount = getItemCount(order);
    const customerName = order.customer?.name || '—';

    return (
      <div key={order.id}
        className="bg-white rounded-xl border border-slate-200 p-3.5 hover:shadow-sm transition-all opacity-80 hover:opacity-100">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono font-black text-sm text-slate-500">#{order.orderNo || order.id}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`} /> {sStyle.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 mb-2">
          <span className="font-semibold">{tableName}</span>
          <span className="font-semibold text-right">{customerName}</span>
        </div>
        <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2">
          <span className="text-[9px] font-bold text-slate-400">{itemsCount} items</span>              <span className="font-mono font-black text-slate-700">{currency}{Number(total).toLocaleString('en-IN')}</span>
        </div>
        {settings.enableBilling !== false && canBill && (
          <button onClick={() => handleReprintBill(order)}
            className="mt-2 w-full h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer">
            <Printer className="w-3 h-3" /> Reprint Bill
          </button>
        )}
      </div>
    );
  };

  // ── Cancelled Order Card (Read-only, only View Details allowed) ──
  const renderCancelledCard = (order) => {
    const total = getOrderTotal(order);
    const tableName = order.table ? `Table ${order.table.tableNo || order.table.name}` : 'Takeaway';
    const itemsCount = getItemCount(order);
    const cancelledTime = order.cancelledAt
      ? new Date(order.cancelledAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })
      : '—';
    const cancelReason = order.cancelReason || '—';
    const cancelledBy = order.cancelledBy || order.user?.name || '—';
    const customerName = order.customer?.name || '—';

    return (
      <div key={order.id}
        className="bg-white rounded-xl border border-red-100 p-3.5 hover:shadow-sm transition-all opacity-85 hover:opacity-100">
        {/* Top: Order Number + Cancelled badge */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono font-black text-sm text-red-500 line-through">#{order.orderNo || order.id}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border bg-red-50 border-red-200 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Cancelled
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 mb-2">
          <span className="font-semibold truncate">{tableName}</span>
          <span className="font-semibold text-right">{customerName}</span>
          <span className="font-semibold">🗓️ {cancelledTime}</span>
          <span className="font-semibold text-right">🗑️ {cancelledBy}</span>
        </div>

        {/* Items + Reason + Total */}
        <div className="border-t border-dashed border-red-100 pt-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Items:</span>
            <span className="font-bold text-slate-600">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Reason:</span>
            <span className="font-bold text-red-600 text-right max-w-[60%] truncate">{cancelReason}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Total:</span>              <span className="font-mono font-black text-slate-500 line-through">{currency}{Number(total).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Single allowed action: View Details */}
        <div className="mt-2 pt-2 border-t border-red-50">
          <button onClick={() => {
            addToast(`Order #${order.orderNo || order.id}
Table: ${order.table?.tableNo || 'Takeaway'}
Customer: ${customerName}
Cancelled: ${cancelledTime}
By: ${cancelledBy}
Reason: ${cancelReason}             Total: ₹${Number(total).toLocaleString('en-IN')}
Items: ${itemsCount}`, 'info');
          }}
            className="w-full h-10 bg-white border border-slate-200 hover:bg-red-50 text-slate-500 font-bold rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer">
            <Eye className="w-3 h-3" /> View Details
          </button>
        </div>
      </div>
    );
  };

  // Show the spinner only when there is nothing cached to render yet.
  // If orders already exist in the store (previous visit / realtime update),
  // show them immediately and refresh in the background — never blank the page.
  if (loading && ordersActiveTab === 'Active' && (orders || []).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-semibold">Loading orders...</span>
      </div>
    );
  }

  return (
    <div id="active-orders-screen" className="bg-white rounded-[20px] border border-slate-200 shadow-xs p-5 h-[calc(100vh-100px)] min-h-[500px] flex flex-col overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#16A34A]" /> Orders
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {ordersActiveTab === 'Active' ? 'Active tickets and tables' :
               ordersActiveTab === 'Hold' ? 'Orders saved for later' :
               ordersActiveTab === 'Completed' ? 'Completed orders' : 'Cancelled orders'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              if (ordersActiveTab === 'Active') fetchActiveOrders();
              else fetchHeldAndCompleted();
            }}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-xl">
          {tabs.filter(t => t.setting ? settings[t.setting] !== false : true).map(tab => (
            <button key={tab.key} onClick={() => setOrdersActiveTab(tab.key)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                ordersActiveTab === tab.key 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <tab.icon className="w-3 h-3" />
              {tab.label}
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                ordersActiveTab === tab.key ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-slate-200 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder={`Search ${ordersActiveTab.toLowerCase()} orders by #, table, customer...`}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#16A34A] focus:bg-white transition-colors" />
        </div>
      </div>

      {error && ordersActiveTab === 'Active' && (
        <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 font-semibold">
          {error}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto py-3 no-scrollbar pr-1">
        
        {/* ── ACTIVE TAB ── */}
        {ordersActiveTab === 'Active' && (
          activeOrders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeOrders.map(renderActiveOrderCard)}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed p-8">
              <Play className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No active orders. Start by placing an order from POS.
            </div>
          )
        )}

        {/* ── HOLD TAB ── */}
        {ordersActiveTab === 'Hold' && (
          heldLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-xs font-semibold">Loading held orders...</span>
            </div>
          ) : filteredHeld.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredHeld.map(renderHoldCard)}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed p-8">
              <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No held orders. Hold an order from POS to see it here.
            </div>
          )
        )}

        {/* ── COMPLETED TAB ── */}
        {ordersActiveTab === 'Completed' && (
          filteredCompleted.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCompleted.map(renderCompletedCard)}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed p-8">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No completed orders yet.
            </div>
          )
        )}

        {/* ── CANCELLED TAB ── */}
        {ordersActiveTab === 'Cancelled' && (
          filteredCancelled.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCancelled.map(renderCancelledCard)}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed p-8">
              <Ban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No cancelled orders.
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Dialog for Held Orders */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 p-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Delete Held Order</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Are you sure you want to delete this held order? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="h-8.5 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => handleDeleteHeld(confirmDelete)}
                className="h-8.5 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer">Delete Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-800">Cancel Order</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Are you sure you want to cancel this order? This action cannot be undone.</p>
                {cancellingOrder && (
                  <div className="bg-slate-50 rounded-lg p-2.5 mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Order No:</span>
                      <span className="font-mono font-black text-slate-800">#{cancellingOrder.orderNo || cancellingOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Table:</span>
                      <span className="font-bold text-slate-800">{cancellingOrder.table?.tableNo ? `Table ${cancellingOrder.table.tableNo}` : 'Takeaway'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Items:</span>
                      <span className="font-bold text-slate-800">{getItemCount(cancellingOrder)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button onClick={() => { setShowCancelConfirm(false); setCancellingOrderId(null); }}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer">Keep Order</button>
              <button onClick={handleCancelConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancellingOrder && (
        <CancelReasonModal
          isOpen={showCancelReason}
          orderNumber={`#${cancellingOrder.orderNo || cancellingOrder.id}`}
          onBack={handleCancelBack}
          onConfirm={handleCancelWithReason}
          isLoading={cancelSubmitting} />
      )}

      {/* Transfer Table Modal */}
      {showTransferModal && transferringOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Transfer Table</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Order <span className="font-mono font-bold">#{transferringOrder.orderNo || transferringOrder.id}</span> — {transferringOrder.table ? `Table ${transferringOrder.table.tableNo}` : 'Takeaway'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Select Available Table</label>
              {tablesLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-xs font-semibold">Loading tables...</span>
                </div>
              ) : availableTables.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                  {availableTables.map(tbl => (
                    <button key={tbl.id} onClick={() => handleConfirmTransfer(tbl.id)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left cursor-pointer">
                      <p className="text-xs font-extrabold text-slate-700">Table {tbl.tableNo || tbl.name}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                        Capacity: {tbl.capacity || '—'}
                        {tbl.floor?.name && <span> · {tbl.floor.name}</span>}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No available tables to transfer to.
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button onClick={() => { setShowTransferModal(false); setTransferringOrder(null); }}
                className="h-8.5 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
