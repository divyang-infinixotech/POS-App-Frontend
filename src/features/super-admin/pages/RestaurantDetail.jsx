import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../../api/superAdmin.api';
import { useUiStore } from '../../../store';
import { FEATURE_LABELS } from '../../../utils/permissions';
import {
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  ShoppingCart,
  Activity,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  PlayCircle,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle as XCircleIcon,
  History,
} from 'lucide-react';
import PlanChangeDialog from '../components/PlanChangeDialog';

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders Summary', icon: ShoppingCart },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

const CHANGE_TYPE_BADGES = {
  CREATION: 'bg-blue-50 text-blue-600',
  UPGRADE: 'bg-green-50 text-green-600',
  DOWNGRADE: 'bg-amber-50 text-amber-600',
  RENEWAL: 'bg-blue-50 text-blue-600',
  SUSPENSION: 'bg-amber-50 text-amber-600',
  REACTIVATION: 'bg-green-50 text-green-600',
  CANCELLATION: 'bg-red-50 text-red-600',
  EXPIRATION: 'bg-red-50 text-red-600',
};

const LIMIT_ITEMS = [
  { key: 'maxUsers', label: 'Max Users' },
  { key: 'maxTables', label: 'Max Tables' },
  { key: 'maxFloors', label: 'Max Floors' },
  { key: 'maxMenuItems', label: 'Max Menu Items' },
  { key: 'maxPrinters', label: 'Max Printers' },
  { key: 'maxBranches', label: 'Max Branches' },
  { key: 'maxOrdersPerMonth', label: 'Max Orders/Month' },
  { key: 'storageLimitMB', label: 'Storage (MB)' },
];

export default function RestaurantDetail({ restaurantId, onBack, onPlanChanged }) {
  const { setScreen } = useUiStore();
  const [restaurant, setRestaurant] = useState(null);
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [planDialog, setPlanDialog] = useState(null);

  useEffect(() => {
    loadDetails();
    loadPlans();
  }, [restaurantId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [restResp, histResp, payResp] = await Promise.all([
        superAdminApi.getRestaurant(restaurantId),
        superAdminApi.getSubscriptionHistory(restaurantId).catch(() => null),
        superAdminApi.getSubscriptionPayments(restaurantId).catch(() => null),
      ]);
      if (restResp.success) setRestaurant(restResp.data);
      if (histResp && histResp.success) setHistory(histResp.data || []);
      if (payResp && payResp.success) setPayments(payResp.data || []);
    } catch (e) {
      console.error('Failed to load restaurant details:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const resp = await superAdminApi.getPlans();
      if (resp.success) setPlans(resp.data || []);
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  const refresh = async () => {
    await loadDetails();
    if (onPlanChanged) onPlanChanged();
  };

  const sub = restaurant?.subscription;
  const features = Array.isArray(sub?.features) ? sub.features : [];
  const daysRemaining = sub?.expiryDate
    ? Math.max(0, Math.ceil((new Date(sub.expiryDate) - new Date()) / 86400000))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 font-medium">Restaurant not found</p>
        <button onClick={onBack} className="mt-4 text-sm text-[#16A34A] font-bold">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button & header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">{restaurant.name}</h1>
          <p className="text-xs text-slate-500">{restaurant.ownerName} • {restaurant.city || 'No city'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: restaurant.statistics?.totalUsers || 0, icon: Users, color: 'blue' },
          { label: 'Total Orders', value: restaurant.statistics?.totalOrders || 0, icon: ShoppingCart, color: 'emerald' },
          { label: 'Total Revenue', value: `₹${(restaurant.statistics?.totalRevenue || 0).toLocaleString()}`, icon: CreditCard, color: 'amber' },
          { label: 'Menu Items', value: restaurant.statistics?.totalMenuItems || 0, icon: FileText, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
            </div>
            <p className="text-lg font-extrabold text-slate-800">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'border-[#16A34A] text-[#16A34A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Contact</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400" /> {restaurant.email || '—'}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400" /> {restaurant.phone || '—'}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {restaurant.address || '—'}</div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Details</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <p><span className="font-bold text-slate-500">GST:</span> {restaurant.gstNumber || '—'}</p>
                  <p><span className="font-bold text-slate-500">FSSAI:</span> {restaurant.fssaiNumber || '—'}</p>
                  <p><span className="font-bold text-slate-500">Timezone:</span> {restaurant.timezone}</p>
                  <p><span className="font-bold text-slate-500">Currency:</span> {restaurant.currency}</p>
                  <p><span className="font-bold text-slate-500">Language:</span> {restaurant.language}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {!sub ? (
                <p className="text-xs text-slate-400 text-center py-8">No subscription found for this restaurant.</p>
              ) : (
                <>
                  {/* Status banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${
                    sub.status === 'ACTIVE' ? 'bg-green-50/60 border-green-200' :
                    sub.status === 'TRIAL' ? 'bg-blue-50/60 border-blue-200' :
                    sub.status === 'EXPIRED' ? 'bg-red-50/60 border-red-200' :
                    sub.status === 'CANCELLED' ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/60 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          {sub.plan} {sub.status === 'ACTIVE' && daysRemaining !== null ? `· ${daysRemaining} days left` : `· ${sub.status}`}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sub.billingCycle} billing {sub.autoRenew ? '· Auto-renew pref (manual renewal)' : ''} {sub.amount ? `· ₹${sub.amount}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setPlanDialog({ mode: 'upgrade' })} className="h-7 px-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"><TrendingUp className="w-3 h-3" /> Upgrade</button>
                      <button onClick={() => setPlanDialog({ mode: 'downgrade' })} className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"><TrendingDown className="w-3 h-3" /> Downgrade</button>
                      <button onClick={() => setPlanDialog({ mode: 'renew' })} className="h-7 px-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"><RotateCcw className="w-3 h-3" /> Renew</button>
                      {sub.status !== 'ACTIVE' && sub.status !== 'TRIAL' && (
                        <button onClick={() => setPlanDialog({ mode: 'activate' })} className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PlayCircle className="w-3 h-3" /> Activate</button>
                      )}
                      {sub.status !== 'CANCELLED' && (
                        <button onClick={() => setPlanDialog({ mode: 'cancel' })} className="h-7 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"><XCircle className="w-3 h-3" /> Cancel</button>
                      )}
                    </div>
                  </div>

                  {/* Key dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Start Date</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Next Renewal</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Days Remaining</p>
                      <p className={`text-sm font-extrabold mt-1 ${daysRemaining !== null && daysRemaining <= 10 ? 'text-red-600' : 'text-slate-800'}`}>
                        {daysRemaining !== null ? `${daysRemaining} days` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Limits */}
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Plan Limits</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {LIMIT_ITEMS.map((item) => (
                        <div key={item.key} className="bg-white border border-slate-100 rounded-xl p-2.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</p>
                          <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                            {sub[item.key] === null || sub[item.key] === undefined ? 'Unlimited' : sub[item.key]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Enabled Features ({features.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {features.length === 0 && <span className="text-[10px] text-slate-400">No features snapshot</span>}
                      {features.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                          <CheckCircle2 className="w-3 h-3" /> {FEATURE_LABELS[f] || f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* History */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Plan History</p>
                    </div>
                    {history.length === 0 ? (
                      <p className="text-[10px] text-slate-400">No plan changes recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {history.map((h) => (
                          <div key={h.id} className="flex items-start gap-3 p-2.5 bg-slate-50/60 rounded-xl">
                            <div className="flex flex-col items-center mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${CHANGE_TYPE_BADGES[h.changeType] || 'bg-slate-100 text-slate-600'}`}>{h.changeType}</span>
                                <span className="text-[10px] font-bold text-slate-600">
                                  {h.previousPlan || '—'} → {h.newPlan || '—'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                                {h.changedBy ? ' · by Super Admin' : ' · system'}
                                {h.notes ? ` · ${h.notes}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments — real gateway records (never generated) */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 mt-4">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment History</p>
                    </div>
                    {payments.length === 0 ? (
                      <p className="text-[10px] text-slate-400">No gateway payments recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-start gap-3 p-2.5 bg-slate-50/60 rounded-xl">
                            <div className="flex flex-col items-center mt-0.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'PAID' ? 'bg-[#16A34A]' : p.status === 'FAILED' ? 'bg-red-500' : 'bg-slate-300'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${p.status === 'PAID' ? 'bg-[#16A34A]/10 text-[#16A34A]' : p.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                                <span className="text-[10px] font-bold text-slate-600">
                                  {p.planName || p.planCode} · {p.action || '—'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500">₹{Number(p.amount || 0).toFixed(2)}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                                {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                                {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                                {p.razorpayPaymentId ? ` · ${p.razorpayPaymentId}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left font-bold text-slate-500 py-2 px-3">Name</th>
                    <th className="text-left font-bold text-slate-500 py-2 px-3">Email</th>
                    <th className="text-left font-bold text-slate-500 py-2 px-3">Role</th>
                    <th className="text-left font-bold text-slate-500 py-2 px-3">Status</th>
                    <th className="text-left font-bold text-slate-500 py-2 px-3">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {(restaurant.users || []).map(u => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="py-2 px-3 font-semibold text-slate-700">{u.name}</td>
                      <td className="py-2 px-3 text-slate-500">{u.email}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{u.role}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[10px]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Orders', value: restaurant.statistics?.totalOrders || 0 },
                { label: 'Total Bills', value: restaurant.statistics?.totalBills || 0 },
                { label: 'Total Customers', value: restaurant.statistics?.totalCustomers || 0 },
                { label: 'Total Payments', value: restaurant.statistics?.totalPayments || 0 },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <p className="text-xs text-slate-400 text-center py-8">
              Activity log for this restaurant can be viewed in the Audit Logs section.
            </p>
          )}
        </div>
      </div>

      {/* Plan change dialog */}
      {planDialog && (
        <PlanChangeDialog
          restaurant={{ id: restaurant.id, name: restaurant.name }}
          subscription={sub}
          plans={plans}
          mode={planDialog.mode}
          onClose={() => setPlanDialog(null)}
          onDone={() => { setPlanDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}
