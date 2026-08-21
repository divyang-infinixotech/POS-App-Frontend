import React, { useState, useEffect, useCallback, useRef } from 'react';
import { superAdminApi } from '../../../api/superAdmin.api';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import { useUiStore } from '../../../store';
import {
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Eye,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  PlayCircle,
  XCircle,
  CalendarDays,
} from 'lucide-react';
import RestaurantForm from '../components/RestaurantForm';
import RestaurantDetail from './RestaurantDetail';
import PlanChangeDialog from '../components/PlanChangeDialog';

export default function RestaurantList() {
  const { addToast } = useUiStore();
  const [restaurants, setRestaurants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editRestaurant, setEditRestaurant] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [planDialog, setPlanDialog] = useState(null); // { restaurant, mode }
  // Confirm dialog state: { type: 'delete' | 'suspend', restaurant }
  const [confirmAction, setConfirmAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const statusRef = useRef(false);

  const loadPlans = useCallback(async () => {
    try {
      const resp = await superAdminApi.getPlans();
      if (resp.success) setPlans(resp.data || []);
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const loadRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;
      const resp = await superAdminApi.getRestaurants(params);
      if (resp.success) {
        setRestaurants(resp.data.restaurants || []);
        setPagination(resp.data.pagination);
      }
    } catch (e) {
      console.error('Failed to load restaurants:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) loadRestaurants();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = async (id, status) => {
    if (statusRef.current) return; // double-click guard
    statusRef.current = true;
    try {
      await superAdminApi.updateRestaurantStatus(id, status);
      loadRestaurants();
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      statusRef.current = false;
    }
  };

  const handleDelete = (restaurant) => {
    setConfirmAction({ type: 'delete', restaurant });
  };

  const handleConfirm = async () => {
    if (!confirmAction || busy) return; // guard against duplicate requests
    setBusy(true);
    const { type, restaurant } = confirmAction;
    try {
      if (type === 'delete') {
        await superAdminApi.deleteRestaurant(restaurant.id);
        addToast(`Restaurant "${restaurant.name}" deleted (soft).`, 'success');
      } else {
        await superAdminApi.suspendSubscription(restaurant.id, 'Suspended by Super Admin');
        addToast(`Restaurant "${restaurant.name}" suspended.`, 'success');
      }
      setConfirmAction(null);
      loadRestaurants();
    } catch (e) {
      addToast(e.message || 'Action failed', 'error');
      setConfirmAction(null);
    } finally {
      setBusy(false);
    }
  };

  const handlePlanAction = async (restaurant, mode) => {
    const sub = { plan: restaurant.plan, planName: restaurant.planName, status: restaurant.subscriptionStatus, expiryDate: restaurant.expiryDate, billingCycle: restaurant.billingCycle };
    setPlanDialog({ restaurant, subscription: sub, mode });
  };

  const handleSuspend = (r) => {
    setConfirmAction({ type: 'suspend', restaurant: r });
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-green-50 text-green-600 border-green-200',
      INACTIVE: 'bg-slate-50 text-slate-500 border-slate-200',
      SUSPENDED: 'bg-red-50 text-red-600 border-red-200',
    };
    return styles[status] || 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const getSubStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-green-50 text-green-600',
      TRIAL: 'bg-blue-50 text-blue-600',
      EXPIRED: 'bg-red-50 text-red-600',
      CANCELLED: 'bg-slate-100 text-slate-500',
      SUSPENDED: 'bg-amber-50 text-amber-600',
    };
    return styles[status] || 'bg-slate-50 text-slate-500';
  };

  const getPlanBadge = (plan) => {
    const styles = {
      TRIAL: 'bg-blue-50 text-blue-600',
      BASIC: 'bg-green-50 text-green-600',
      PRO: 'bg-purple-50 text-purple-600',
      PREMIUM: 'bg-amber-50 text-amber-600',
      ENTERPRISE: 'bg-slate-900 text-white',
    };
    return styles[plan] || 'bg-slate-100 text-slate-700';
  };

  const daysRemainingColor = (days) => {
    if (days === null || days === undefined) return 'text-slate-400';
    if (days <= 3) return 'text-red-600 font-extrabold';
    if (days <= 10) return 'text-amber-600 font-extrabold';
    return 'text-green-600 font-bold';
  };

  if (viewDetail) {
    return (
      <RestaurantDetail
        restaurantId={viewDetail}
        onBack={() => setViewDetail(null)}
        onPlanChanged={() => loadRestaurants()}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Restaurant Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage all restaurants, subscriptions and plans on the platform</p>
        </div>
        <button
          onClick={() => { setEditRestaurant(null); setShowForm(true); }}
          className="h-9 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Restaurant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search restaurants..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A]"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A]"
        >
          <option value="">All Plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.code}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={() => { loadRestaurants(); loadPlans(); }}
          className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Restaurant</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Owner</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Contact</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Plan</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Sub. Status</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Start</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Expiry</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Days Left</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Users</th>
                <th className="text-right font-extrabold text-slate-600 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mx-auto" />
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-medium">
                    No restaurants found
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#16A34A]/10 to-[#15803D]/10 border border-[#16A34A]/20 flex items-center justify-center text-xs font-extrabold text-[#16A34A] shrink-0">
                          {r.name?.charAt(0)?.toUpperCase() || 'R'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{r.name}</p>
                          {r.city && <p className="text-[10px] text-slate-400">{r.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-600">{r.ownerName || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {r.email && <p className="text-slate-500">{r.email}</p>}
                        {r.phone && <p className="text-slate-400 text-[10px]">{r.phone}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPlanBadge(r.plan)}`}>
                          {r.planName || r.plan}
                        </span>
                        {r.billingCycle && <span className="text-[9px] text-slate-400 uppercase">{r.billingCycle}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {r.subscriptionStatus ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getSubStatusBadge(r.subscriptionStatus)}`}>
                          {r.subscriptionStatus}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[10px]">
                      {r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[10px]">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.daysRemaining !== null && r.daysRemaining !== undefined ? (
                        <span className={`text-[11px] ${daysRemainingColor(r.daysRemaining)}`}>{r.daysRemaining}d</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-700">{r.activeUsers}<span className="text-slate-400 font-medium">/{r.totalUsers}</span></p>
                    </td>
                    <td className="py-3 px-4 text-right relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === r.id ? null : r.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {actionMenu === r.id && (
                        <div className="absolute right-4 top-10 bg-white border border-slate-200 rounded-xl shadow-xl z-10 py-1 min-w-[190px]">
                          <button onClick={() => { setViewDetail(r.id); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={() => { setEditRestaurant(r); setShowForm(true); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <hr className="my-1 border-slate-100" />
                          <button onClick={() => { handlePlanAction(r, 'upgrade'); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50">
                            <TrendingUp className="w-3.5 h-3.5" /> Upgrade Plan
                          </button>
                          <button onClick={() => { handlePlanAction(r, 'downgrade'); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50">
                            <TrendingDown className="w-3.5 h-3.5" /> Downgrade Plan
                          </button>
                          <button onClick={() => { handlePlanAction(r, 'renew'); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Renew
                          </button>
                          <hr className="my-1 border-slate-100" />
                          {r.subscriptionStatus === 'SUSPENDED' || r.subscriptionStatus === 'CANCELLED' || r.subscriptionStatus === 'EXPIRED' ? (
                            <button onClick={() => { handlePlanAction(r, 'activate'); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50">
                              <PlayCircle className="w-3.5 h-3.5" /> Activate
                            </button>
                          ) : (
                            <button onClick={() => { handleSuspend(r); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50">
                              <AlertTriangle className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                          {r.subscriptionStatus !== 'CANCELLED' && (
                            <button onClick={() => { handlePlanAction(r, 'cancel'); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                              <XCircle className="w-3.5 h-3.5" /> Cancel Subscription
                            </button>
                          )}
                          <hr className="my-1 border-slate-100" />
                          <button onClick={() => { handleDelete(r); setActionMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" /> Delete (Soft)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restaurant Form Modal */}
      {showForm && (
        <RestaurantForm
          restaurant={editRestaurant}
          onClose={() => { setShowForm(false); setEditRestaurant(null); }}
          onSaved={() => { setShowForm(false); setEditRestaurant(null); loadRestaurants(); }}
        />
      )}

      {/* Plan Change Dialog */}
      {planDialog && (
        <PlanChangeDialog
          restaurant={planDialog.restaurant}
          subscription={planDialog.subscription}
          plans={plans}
          mode={planDialog.mode}
          onClose={() => setPlanDialog(null)}
          onDone={() => { setPlanDialog(null); loadRestaurants(); }}
        />
      )}

      {/* Confirm Delete / Suspend Restaurant */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={!!confirmAction}
          onClose={() => { if (!busy) setConfirmAction(null); }}
          onConfirm={handleConfirm}
          title={confirmAction.type === 'delete' ? 'Delete Restaurant?' : 'Suspend Restaurant?'}
          message={confirmAction.type === 'delete'
            ? `Soft-delete "${confirmAction.restaurant?.name}"? All data is preserved but the restaurant and its users will be deactivated. This can be restored by a Super Admin.`
            : `Suspend "${confirmAction.restaurant?.name}"? All users will be deactivated until the subscription is reactivated.`}
          confirmLabel={confirmAction.type === 'delete' ? 'Delete' : 'Suspend'}
          cancelLabel="Cancel"
          variant="danger"
          isLoading={busy}
        />
      )}
    </div>
  );
}
