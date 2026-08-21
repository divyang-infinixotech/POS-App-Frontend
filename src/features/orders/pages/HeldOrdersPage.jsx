import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Clock, Users, Coffee, Check, Trash2, Printer, DollarSign,
  RefreshCw, Loader2, AlertTriangle, Phone, User, ChefHat,
  ArrowRight, Ban, X, RotateCcw
} from 'lucide-react';
import { useUiStore, useCartStore, useSettingsStore } from '../../../store';
import { orderApi } from '../../../api/order.api';
import { kotApi } from '../../../api/kot.api';
import { billApi } from '../../../api/bill.api';
import { tableApi } from '../../../api/table.api';
import { openKotPrintPreview } from '../../../services/printService';

// ── Module-level cache ──────────────────────────────────────────────────────
let cachedHeldOrders = [];
let lastFetchTime = 0;
const CACHE_TTL = 15000;

export default function HeldOrdersPage() {
  const { setScreen, setCheckoutOrderId, addToast, showTakeOrderWizard, setShowTakeOrderWizard } = useUiStore();
  const { addOrder } = useCartStore();
  const { settings } = useSettingsStore();

  const [orders, setOrders] = useState(cachedHeldOrders);
  const [loading, setLoading] = useState(cachedHeldOrders.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // orderId being acted upon
  const [confirmDelete, setConfirmDelete] = useState(null);
  const mountedRef = useRef(true);

  const fetchHeldOrders = useCallback(async () => {
    try {
      const resp = await orderApi.getAll();
      const allOrders = resp.data || [];
      const held = allOrders.filter(o => o.status === 'HOLD');
      // Map backend format to frontend
      const mapped = held.map(o => ({
        id: `ord-${o.id}`,
        orderNumber: `#${o.orderNo || o.id}`,
        tableName: o.table?.tableNo ? `Table ${o.table.tableNo}` : 'Takeaway',
        guestsCount: o.guestCount || 1,
        timestamp: new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
        serverName: o.user?.name || o.notes?.replace('Waiter: ', '') || 'Staff',
        status: 'HOLD',
        items: (o.orderItems || []).map(oi => ({
          itemId: `menu-${oi.menuItemId}`,
          name: oi.menuItem?.name || 'Item',
          price: Number(oi.price),
          quantity: oi.quantity,
          status: 'Pending',
          notes: oi.notes,
        })),
        orderType: o.orderType === 'DINE_IN' ? 'Dine In' :
                   o.orderType === 'DELIVERY' ? 'Parcel' : 'Takeaway',
        customerName: o.customer?.name || '',
        customerPhone: o.customer?.phone || '',
        discountAmount: Number(o.discount || 0),
        paymentStatus: 'Pending',
        totalAmount: Number(o.totalAmount || o.subtotal || 0),
        subtotal: Number(o.subtotal || 0),
        kotCount: o.kot ? 1 : 0,
      }));
      setOrders(mapped);
      cachedHeldOrders = mapped;
      lastFetchTime = Date.now();
    } catch (e) {
      console.error('Failed to fetch held orders:', e);
      if (!cachedHeldOrders.length) {
        addToast('Failed to load held orders. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    mountedRef.current = true;
    if (Date.now() - lastFetchTime > CACHE_TTL) {
      fetchHeldOrders();
    } else {
      setOrders(cachedHeldOrders);
      setLoading(false);
    }
    return () => { mountedRef.current = false; };
  }, [fetchHeldOrders]);

  // ── Actions ──

  const handleResume = async (orderId) => {
    setActionLoading(orderId);
    try {
      const backendId = parseInt(orderId.replace('ord-', ''));
      const resp = await orderApi.resume(backendId);
      if (resp.success) {
        addToast('Order resumed. You can now modify it.', 'success');
        setOrders(prev => prev.filter(o => o.id !== orderId));
        cachedHeldOrders = cachedHeldOrders.filter(o => o.id !== orderId);
        // Navigate to open the order in POS
        setScreen('active_orders');
      }
    } catch (e) {
      addToast(e.message || 'Failed to resume order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintKot = async (orderId) => {
    setActionLoading(orderId);
    try {
      const backendId = parseInt(orderId.replace('ord-', ''));
      
      // Find the held order from state
      const heldOrder = orders.find(o => o.id === orderId);
      if (!heldOrder) {
        addToast('Order data not found.', 'warning');
        setActionLoading(null);
        return;
      }
      
      // Try to create KOT via backend
      let kotNo = '';
      try {
        const resp = await kotApi.create({ orderId: backendId, items: [] });
        if (resp?.data?.kotNo) kotNo = resp.data.kotNo;
      } catch { /* non-critical */ }
      
      // Open KOT print preview with actual order data
      const items = heldOrder.items || [];
      openKotPrintPreview({
        restaurantName: settings?.branding?.restaurantName || '',
        kotNo: kotNo,
        orderNo: (heldOrder.orderNumber || String(backendId)).replace('#', ''),
        tableNo: heldOrder.tableName || '',
        orderType: heldOrder.orderType || 'DINE_IN',
        waiterName: heldOrder.serverName || '',
        customerName: heldOrder.customerName || '',
        customerPhone: heldOrder.customerPhone || '',
        guestCount: heldOrder.guestsCount || 1,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, notes: i.notes })),
        footer: settings?.receiptFooterMessage || 'Thank You!',
        date: new Date()
      });
      addToast('KOT printed successfully!', 'success');
    } catch (e) {
      addToast('Unable to print KOT. Please check your printer settings and try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async (orderId) => {
    setCheckoutOrderId(orderId);
  };

  const handleDelete = async (orderId) => {
    setActionLoading(orderId);
    try {
      const backendId = parseInt(orderId.replace('ord-', ''));
      const resp = await orderApi.cancel(backendId, 'Deleted from held orders');
      if (resp.success) {
        addToast('Held order deleted.', 'success');
        setOrders(prev => prev.filter(o => o.id !== orderId));
        cachedHeldOrders = cachedHeldOrders.filter(o => o.id !== orderId);
      }
    } catch (e) {
      addToast(e.message || 'Failed to delete order', 'error');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  // ── Filtering ──
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return o.orderNumber.toLowerCase().includes(q) ||
      o.tableName.toLowerCase().includes(q) ||
      o.serverName.toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q);
  });

  const getElapsedMinutes = (createdAt) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  const formatElapsed = (mins) => {
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs font-semibold">Loading held orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#191c1e] flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-500" /> Held Orders
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            {orders.length} order{orders.length !== 1 ? 's' : ''} on hold
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search by order, table, service staff..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-8.5 bg-white border border-slate-200 focus:border-[#16A34A] rounded-xl text-xs outline-none" />
          </div>
          <button onClick={fetchHeldOrders}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shrink-0"
            title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {orders.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Coffee className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-sm font-bold text-slate-300">No held orders</p>
          <p className="text-xs text-slate-300 mt-1">Orders saved to hold will appear here.</p>
        </div>
      )}

      {/* Held Orders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredOrders.map((order) => {
          const elapsed = getElapsedMinutes(order.createdAt);
          const itemCount = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
          const total = order.totalAmount || order.subtotal ||
            order.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;
          const isLoading = actionLoading === order.id;

          return (
            <div key={order.id}
              className="bg-white rounded-[18px] border border-slate-200 p-4 shadow-xs space-y-3 hover:shadow-md transition-all">
              {/* Top: Order Number & Status */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-[#C85A32] font-mono">{order.orderNumber}</span>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-700">
                      HOLD
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    {order.tableName}
                    {order.customerName && <span className="text-[10px] text-slate-500 font-medium">· {order.customerName}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {formatElapsed(elapsed)}
                </div>
              </div>

              {/* Info Bar */}
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                <span className="flex items-center gap-0.5">
                  <ChefHat className="w-3 h-3" /> {order.serverName}
                </span>
                <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span className="ml-auto font-mono font-bold text-slate-800">₹{total.toFixed(0)}</span>
              </div>

              {/* Action Buttons */}
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C85A32]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5">
                  <button onClick={() => handleResume(order.id)}
                    className="h-8 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Resume
                  </button>
                  <button onClick={() => handlePrintKot(order.id)}
                    className="h-8 text-[10px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> KOT
                  </button>
                  <button onClick={() => handleCheckout(order.id)}
                    className="h-8 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
                    <DollarSign className="w-3.5 h-3.5" /> Checkout
                  </button>
                  <button onClick={() => setConfirmDelete(order.id)}
                    className="h-8 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredOrders.length === 0 && orders.length > 0 && (
        <div className="text-center py-12 text-slate-400 text-xs italic">
          No orders match your search.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
                className="h-8.5 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="h-8.5 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer">
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
