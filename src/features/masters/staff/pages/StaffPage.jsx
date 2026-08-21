import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Edit, Trash, RefreshCw, AlertTriangle, Loader2, Key } from 'lucide-react';
import { useUiStore } from '../../../../store';
import { userApi } from '../../../../api/user.api';
import ConfirmationDialog from '../../../../components/ConfirmationDialog';

const avatarColors = [
  'bg-[#16A34A] text-white', 'bg-[#06B6D4] text-white', 'bg-[#DCFCE7] text-emerald-900',
  'bg-cyan-100 text-cyan-900', 'bg-slate-100 text-slate-800', 'bg-indigo-100 text-indigo-900',
  'bg-amber-100 text-amber-900', 'bg-blue-100 text-blue-900',
];

const getRandomColor = () => avatarColors[Math.floor(Math.random() * avatarColors.length)];

// Module-level cache to prevent refetch on remount
let cachedStaff = null;
let cachedStaffFetched = 0;
const CACHE_TTL = 60000; // 1 minute

export default function StaffPage() {
  const { addToast } = useUiStore();
  const [staff, setStaff] = useState(cachedStaff || []);
  const [loading, setLoading] = useState(!cachedStaff);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStaffMember, setResetStaffMember] = useState(null);
  const [resetPass, setResetPass] = useState('');
  const [resetPassConfirm, setResetPassConfirm] = useState('');
  const [resetPassError, setResetPassError] = useState('');
  const [resetPassSuccess, setResetPassSuccess] = useState('');
  const [resetPassSubmitting, setResetPassSubmitting] = useState(false);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Service Staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const now = Date.now();
    if (!cachedStaff || now - cachedStaffFetched > CACHE_TTL) {
      loadStaff();
    }
  }, []);

  const loadStaff = async (showRetryToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await userApi.getAll();
      if (!resp.data || !Array.isArray(resp.data)) {
        throw new Error('Invalid response format from server');
      }
      const mapped = resp.data.map((u) => ({
        id: `staff-${u.id}`,
        firstName: u.name?.split(' ')[0] || u.name || 'User',
        lastName: u.name?.split(' ').slice(1).join(' ') || '',
        role: mapRoleFromBackend(u.role),
        email: u.email || '',
        status: u.isActive ? 'On Shift' : 'Off Shift',
        initials: (u.name || 'U').charAt(0).toUpperCase(),
        avatarColor: getRandomColor(),
        phone: u.phone || '',
      }));
      setStaff(mapped);
      cachedStaff = mapped;
      cachedStaffFetched = Date.now();
      if (showRetryToast) {
        addToast('Staff data loaded successfully.', 'success');
      }
    } catch (e) {
      console.error('Failed to load staff:', e);
      setError(e.message || 'Failed to load staff data. Please try again.');
      addToast(e.message || 'Failed to load staff data.', 'error');
    }
    finally { setLoading(false); }
  };

  const mapRoleFromBackend = (role) => {
    const map = { ADMIN: 'Admin', MANAGER: 'Manager', CASHIER: 'Cashier', WAITER: 'Service Staff', KITCHEN: 'Kitchen Staff' };
    return map[role] || 'Service Staff';
  };

  const mapRoleToBackend = (role) => {
    const map = { Admin: 'ADMIN', Manager: 'MANAGER', Cashier: 'CASHIER', 'Service Staff': 'WAITER', 'Kitchen Staff': 'KITCHEN' };
    return map[role] || 'WAITER';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // guard against duplicate submits
    setSaving(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      if (editingId) {
        const id = parseInt(editingId.replace('staff-', ''));
        await userApi.update(id, { name, role: mapRoleToBackend(role), phone });
        addToast('Staff updated successfully.', 'success');
      } else {
        await userApi.create({
          name,
          email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@restaurant.com`,
          password: password || 'password123',
          role: mapRoleToBackend(role),
          phone,
        });
        addToast('Staff added successfully.', 'success');
      }
      cachedStaffFetched = 0; // Invalidate cache
      loadStaff();
      setShowModal(false);
      resetForm();
    } catch (e) {
      console.error(e);
      addToast(e.message || 'Failed to save staff member.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setRole('Service Staff');
    setEmail('');
    setPassword('');
    setPhone('');
  };

  const resetResetModalState = () => {
    setShowResetModal(false);
    setResetPassError('');
    setResetPassSuccess('');
    setResetPass('');
    setResetPassConfirm('');
    setResetStaffMember(null);
    setResetPassSubmitting(false);
  };

  const handleOpenReset = (member) => {
    setResetStaffMember(member);
    setResetPass('');
    setResetPassConfirm('');
    setResetPassError('');
    setResetPassSuccess('');
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetPassError('');
    setResetPassSuccess('');

    // Validate: minimum 8 characters
    if (resetPass.length < 8) {
      setResetPassError('Password must be at least 8 characters long.');
      return;
    }

    // Validate: passwords match
    if (resetPass !== resetPassConfirm) {
      setResetPassError('Passwords do not match.');
      return;
    }

    setResetPassSubmitting(true);
    try {
      const backendId = parseInt(resetStaffMember.id.replace('staff-', ''));
      await userApi.changePassword(backendId, resetPass);
      setResetPassSuccess(`Password reset successfully for ${resetStaffMember.firstName} ${resetStaffMember.lastName}.`);
      setResetPass('');
      setResetPassConfirm('');
      // Auto-close after 2 seconds
      setTimeout(() => {
        resetResetModalState();
      }, 2000);
    } catch (e) {
      setResetPassError(e.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetPassSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleting) return; // guard against duplicate requests
    setDeleting(true);
    try {
      await userApi.delete(parseInt(deleteTarget.id.replace('staff-', '')));
      addToast(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`, 'success');
      cachedStaffFetched = 0;
      loadStaff();
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      addToast(e.message || 'Failed to delete staff member.', 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'On Shift' ? 'Off Shift' : 'On Shift';
    try {
      await userApi.changeStatus(parseInt(id.replace('staff-', '')), newStatus === 'On Shift');
      setStaff(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      addToast(`Status changed to ${newStatus}.`, 'success');
    } catch (e) {
      console.error(e);
      addToast(e.message || 'Failed to change status.', 'error');
    }
  };

  const filteredStaff = staff.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#191c1e]">Staff Roster</h3>
          <p className="text-[11px] text-slate-500 font-medium">Manage restaurant staff and their roles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { cachedStaffFetched = 0; loadStaff(true); }} className="p-2 hover:bg-slate-100 rounded-lg" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }}
            className="h-8.5 px-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search staff..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#16A34A]" />
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-[18px] p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-700 mb-1">Failed to Load Staff</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <button onClick={() => loadStaff(true)}
            className="h-8.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-[18px] border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A] mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading staff data...</p>
        </div>
      )}

      {/* Staff List */}
      {!loading && !error && (
      <div className="bg-white rounded-[18px] border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredStaff.length > 0 ? filteredStaff.map((member) => (
            <div key={member.id} className="border border-slate-200 rounded-2xl p-3.5 bg-white hover:border-[#16A34A] hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold border ${member.avatarColor || 'bg-slate-100 text-slate-800'}`}>
                  {member.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{member.firstName} {member.lastName}</p>
                  <p className="text-[9px] font-bold text-[#16A34A] uppercase tracking-wide">{member.role}</p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <button onClick={() => handleToggleStatus(member.id, member.status)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    member.status === 'On Shift' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                    member.status === 'On Break' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                  }`}>{member.status}</button>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(member.id); setFirstName(member.firstName); setLastName(member.lastName); setRole(member.role); setPhone(member.phone || ''); setShowModal(true); }}
                    className="p-1 bg-slate-100 hover:bg-emerald-100 rounded text-slate-500 cursor-pointer" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleOpenReset(member)}
                    className="p-1 bg-slate-100 hover:bg-amber-100 rounded text-slate-500 cursor-pointer" title="Reset Password"><Key className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteTarget(member)} className="p-1 bg-slate-100 hover:bg-red-100 text-slate-500 rounded cursor-pointer" title="Delete"><Trash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-16 text-slate-400">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs italic">
                {searchQuery ? 'No staff members match your search.' : 'No staff members found.'}
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetStaffMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs" onClick={() => {
          if (!resetPassSubmitting) resetResetModalState();
        }}>
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-xl">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Reset Password</h4>
              <button 
                onClick={() => resetResetModalState()}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                disabled={resetPassSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-4 space-y-3">
              
              {/* Staff Info Display */}
              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 mb-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold border ${resetStaffMember.avatarColor || 'bg-slate-100 text-slate-800'}`}>
                  {resetStaffMember.initials}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-800">{resetStaffMember.firstName} {resetStaffMember.lastName}</p>
                  <p className="text-[10px] text-slate-400">{resetStaffMember.role}</p>
                </div>
              </div>

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">New Password <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  value={resetPass} 
                  onChange={(e) => {
                    setResetPass(e.target.value);
                    setResetPassError('');
                    setResetPassSuccess('');
                  }}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className={`w-full h-8 px-2 bg-slate-50 border rounded-lg text-xs outline-none transition-colors ${
                    resetPass.length > 0 && resetPass.length < 8
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-200 focus:border-[#16A34A]'
                  }`}
                  required
                />
                {resetPass.length > 0 && resetPass.length < 8 && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                    <span>✕</span> Minimum 8 characters required ({resetPass.length}/8)
                  </p>
                )}
                {resetPass.length >= 8 && (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span>✓</span> Strong enough
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">Confirm Password <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  value={resetPassConfirm} 
                  onChange={(e) => {
                    setResetPassConfirm(e.target.value);
                    setResetPassError('');
                    setResetPassSuccess('');
                  }}
                  placeholder="Re-enter new password"
                  className={`w-full h-8 px-2 bg-slate-50 border rounded-lg text-xs outline-none transition-colors ${
                    resetPassConfirm.length > 0 && resetPass !== resetPassConfirm
                      ? 'border-red-300 focus:border-red-500'
                      : resetPassConfirm.length > 0 && resetPass === resetPassConfirm
                        ? 'border-emerald-300 focus:border-emerald-500'
                        : 'border-slate-200 focus:border-[#16A34A]'
                  }`}
                  required
                />
                {resetPassConfirm.length > 0 && resetPass !== resetPassConfirm && (
                  <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                    <span>✕</span> Passwords do not match
                  </p>
                )}
                {resetPassConfirm.length > 0 && resetPass === resetPassConfirm && (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span>✓</span> Passwords match
                  </p>
                )}
              </div>

              {/* Error Message */}
              {resetPassError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <span className="text-red-500 text-xs shrink-0 mt-0.5">⚠</span>
                  <p className="text-[11px] font-semibold text-red-700">{resetPassError}</p>
                </div>
              )}

              {/* Success Message */}
              {resetPassSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
                  <span className="text-emerald-500 text-xs shrink-0 mt-0.5">✓</span>
                  <p className="text-[11px] font-semibold text-emerald-700">{resetPassSuccess}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => resetResetModalState()}
                  className="flex-1 h-9 bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#111827] rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer"
                  disabled={resetPassSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={resetPassSubmitting || resetPass.length < 8 || resetPass !== resetPassConfirm}
                  className={`flex-[2] h-9 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                    resetPassSubmitting || resetPass.length < 8 || resetPass !== resetPassConfirm
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                  }`}
                >
                  {resetPassSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-100">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">{editingId ? 'Edit Staff' : 'Add Staff'}</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">First Name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-8 px-1 bg-slate-50 border rounded-lg outline-none">
                  {['Admin', 'Manager', 'Service Staff', 'Kitchen Staff', 'Cashier'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {!editingId && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none" />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border rounded-lg outline-none" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="flex-1 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-bold rounded-lg text-xs uppercase cursor-pointer disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-[2] h-9 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-lg text-xs uppercase transition-all cursor-pointer disabled:opacity-50">
                  {saving ? (
                    <span className="flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</span>
                  ) : (editingId ? 'Update' : 'Save Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff Member?"
        message={`Are you sure you want to delete ${deleteTarget?.firstName || 'this staff member'}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
