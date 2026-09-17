import React, { useState, useEffect, useRef } from 'react';
import { superAdminApi } from '../../../api/superAdmin.api';
import { Loader2, Save, RefreshCw, RotateCcw, Shield, AlertTriangle, Mail, Send, CheckCircle2, XCircle } from 'lucide-react';
import ConfirmationDialog from '../../../components/ConfirmationDialog';

// Backend masks configured secrets with this marker — the UI treats it as
// "preserved": typing nothing keeps the stored (encrypted) value.
const SECRET_MASK = '********';

const SETTING_FIELDS = [
  { key: 'platform_name', label: 'Platform Name', type: 'text', default: 'Nirka POS' },
  { key: 'default_trial_days', label: 'Default Trial Days', type: 'number', default: 15 },
  { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean', default: false },
  { key: 'max_file_upload_mb', label: 'Max File Upload (MB)', type: 'number', default: 5 },
  // SMTP host/port/user/pass/from removed — the dedicated "Email (Microsoft
  // Graph) Configuration" section below is the single email config surface.
  { key: 'payment_gateway', label: 'Payment Gateway', type: 'select', options: ['RAZORPAY', 'CASHFREE', 'PHONEPE', 'PAYTM', 'STRIPE', 'NONE'], default: 'NONE' },
  { key: 'razorpay_key', label: 'Razorpay Key', type: 'text', default: '' },
  { key: 'razorpay_secret', label: 'Razorpay Secret', type: 'password', default: '' },
  { key: 'tax_percentage', label: 'Default Tax %', type: 'number', default: 5 },
  { key: 'currency', label: 'Default Currency', type: 'text', default: 'INR' },
];

// Normalized equality for dirty tracking: numbers compare numerically (a loaded
// "5" and a typed 5 are the same), everything else strictly.
const sameValue = (a, b) => {
  if (a === b) return true;
  if (a === null || a === undefined || a === '') return (b === null || b === undefined || b === '');
  if (b === null || b === undefined || b === '') return false;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return false;
};

export default function SystemSettings() {
  const [original, setOriginal] = useState({}); // last loaded/saved values
  const [settings, setSettings] = useState({}); // live form values
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const savingRef = useRef(false);

  // ── Email (SMTP) settings state ──
  // Loaded from the dedicated /super-admin/email/* endpoints — separate from
  // the generic key-value SystemSetting list. The password is ALWAYS rendered
  // masked; submitting the mask preserves the stored encrypted secret.
  const [emailCfg, setEmailCfg] = useState(null);
  const [emailOriginal, setEmailOriginal] = useState(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');

  useEffect(() => { loadEmailSettings(); return () => clearTimeout(toastTimer.current); }, []);

  const loadEmailSettings = async () => {
    try {
      setEmailLoading(true);
      const resp = await superAdminApi.getEmailSettings();
      const data = resp?.data || resp || {};
      // Render the mask when a password exists — never the secret itself.
      const view = { ...data, password: data.passwordConfigured ? SECRET_MASK : '' };
      setEmailOriginal(view);
      setEmailCfg(view);
    } catch (e) {
      showToast(e.message || 'Unable to load email settings', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailField = (key, value) => {
    setEmailCfg((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveEmail = async () => {
    if (emailSaving || !emailCfg) return;
    // Only send changed fields; the masked password is sent as-is (preserved).
    const payload = {};
    ['enabled', 'host', 'port', 'secure', 'user', 'password', 'fromName', 'fromEmail', 'replyTo', 'superAdminNotificationEmails'].forEach((k) => {
      if (JSON.stringify(emailCfg[k]) !== JSON.stringify(emailOriginal?.[k])) payload[k] = emailCfg[k];
    });
    if (Object.keys(payload).length === 0) { showToast('No email changes to save.'); return; }
    setEmailSaving(true);
    try {
      await superAdminApi.updateEmailSettings(payload);
      showToast('Email settings saved.');
      await loadEmailSettings();
    } catch (e) {
      showToast(e.message || 'Unable to save email settings', 'error');
    } finally {
      setEmailSaving(false);
    }
  };

  // Connection check — message reflects the ACTIVE transport (backend decides;
  // Graph mode verifies config + token acquisition, never sends mail).
  const handleVerifySmtp = async () => {
    if (emailTesting) return;
    setEmailTesting(true);
    try {
      const resp = await superAdminApi.verifyEmailSettings();
      const data = resp?.data || resp || {};
      showToast(data.ok ? 'Email transport verified successfully.' : (data.error || 'Email transport verification failed.'), data.ok ? 'success' : 'error');
    } catch (e) {
      showToast(e.message || 'Email transport verification failed', 'error');
    } finally {
      setEmailTesting(false);
    }
  };

  const handleSendTest = async () => {
    if (emailTesting) return;
    if (!testRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)) {
      showToast('Enter a valid test recipient email.', 'error');
      return;
    }
    setEmailTesting(true);
    try {
      const resp = await superAdminApi.sendTestEmail(testRecipient);
      const data = resp?.data || resp || {};
      // Phase 5: 202 = ACCEPTED, not delivered — never claim delivery.
      if (data?.provider === 'microsoft-graph') {
        showToast(`Test email accepted by Microsoft Graph (recipient: ${testRecipient}).`, 'success');
      } else {
        showToast(`Test email sent to ${testRecipient}.`, 'success');
      }
    } catch (e) {
      // Backend error strings are already sanitized & human-readable
      // ("Graph authentication failed…", "Graph permission denied…", etc.).
      showToast(e.message || 'Test email failed', 'error');
    } finally {
      setEmailTesting(false);
    }
  };

  useEffect(() => { loadSettings(); return () => clearTimeout(toastTimer.current); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const resp = await superAdminApi.getSettings();
      if (resp.success) {
        const data = resp.data || {};
        setOriginal(data);
        setSettings(data);
      } else {
        showToast(resp.message || 'Failed to load settings', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Unable to connect to the server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const dirty = SETTING_FIELDS.some(f => !sameValue(settings[f.key], original[f.key]));

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Build the payload of CHANGED fields only. Unchanged secrets stay out of the
  // request entirely, so the backend preserves the stored (encrypted) value.
  const buildPayload = () => {
    const payload = {};
    SETTING_FIELDS.forEach(f => {
      const cur = settings[f.key];
      const orig = original[f.key];
      if (sameValue(cur, orig)) return; // unchanged — never send back
      if (f.type === 'password' && cur === SECRET_MASK) return; // masked placeholder → preserve
      payload[f.key] = cur;
    });
    return payload;
  };

  const handleSave = async () => {
    if (savingRef.current) return; // double-click guard
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const resp = await superAdminApi.updateSettings(payload);
      if (resp.success) {
        // Server returns the sanitized settings map — that becomes the new baseline.
        const data = resp.data || {};
        setOriginal(data);
        setSettings(data);
        showToast('Settings saved successfully.');
      } else {
        showToast(resp.message || 'Unable to save settings', 'error');
      }
    } catch (e) {
      // Keep the user's entered values — never silently revert the form.
      const status = e.status;
      const msg = e.message || 'Unable to save settings';
      let mapped;
      if (status === 400) mapped = msg; // backend validation message
      else if (status === 401) mapped = 'Your session has expired. Please log in again.';
      else if (status === 403) mapped = 'You do not have permission to change settings';
      else if (status === 404 || status === 409) mapped = 'Unable to save settings';
      else if (status === 0) mapped = 'Unable to connect to the server';
      else if (status === undefined && /timed out|ECONNABORTED/i.test(msg)) mapped = 'The server took too long to respond';
      else if (status === undefined && /failed to fetch|network|ECONN/i.test(msg)) mapped = 'Unable to connect to the server';
      else if (status >= 500) mapped = 'Unable to save settings';
      else mapped = msg;
      showToast(mapped, 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!dirty) return;
    setSettings(original); // restore last loaded/saved values — no API call
  };

  const handleRefresh = () => {
    if (dirty) {
      setConfirmRefresh(true);
      return;
    }
    loadSettings();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">System Settings</h1>
          <p className="text-xs text-slate-500 mt-1">Platform-wide configuration</p>
        </div>
        <button
          onClick={handleRefresh}
          title="Refresh"
          disabled={saving}
          className="h-11 w-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${saving ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        {SETTING_FIELDS.map(field => {
          const value = settings[field.key] ?? field.default;
          return (
            <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-xs font-bold text-slate-600 sm:w-44 shrink-0">{field.label}</label>
              <div className="flex-1 min-w-0">
                {field.type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer h-11">
                    <input type="checkbox" checked={!!value} onChange={e => handleChange(field.key, e.target.checked)} disabled={saving} className="w-5 h-5 accent-[#16A34A]" />
                    <span className="text-xs text-slate-500">{value ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : field.type === 'select' ? (
                  <select value={value} onChange={e => handleChange(field.key, e.target.value)} disabled={saving} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50">
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={value}
                    onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    disabled={saving}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50"
                  />
                )}
                {field.type === 'password' && value === SECRET_MASK && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Stored secret is preserved — leave as-is to keep it.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Single global save area — the only Save action on this page */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-h-6">
          {dirty ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes
            </span>
          ) : (
            <span className="text-xs text-slate-400">All changes saved</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={!dirty || saving}
            className="h-11 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="h-11 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ─── Email (Microsoft Graph) Configuration — dedicated section ─── */}
      {/* Transport details (Graph vs SMTP) stay backend-only; this screen shows
          the server-resolved Graph status + non-secret identifiers + the
          platform-wide notification settings. Secrets are NEVER returned. */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Email (Microsoft Graph) Configuration</h2>
              <p className="text-[10px] font-semibold text-slate-400">
                Used for verification codes, application updates and admin notifications.
                Email verification for onboarding is always mandatory and never disabled.
              </p>
            </div>
          </div>
          {/* Status badge — derived from the BACKEND configuration/status response.
              ENABLED = flag on + all four values present; INCOMPLETE = flag on
              but configuration missing; DISABLED = legacy SMTP transport. */}
          {emailCfg?.graph && (
            <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border ${
              emailCfg.graph.status === 'ENABLED' ? 'bg-green-50 border-green-200 text-green-700'
              : emailCfg.graph.status === 'INCOMPLETE' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              {emailCfg.graph.status === 'ENABLED' ? 'Microsoft Graph Enabled'
                : emailCfg.graph.status === 'INCOMPLETE' ? 'Configuration Incomplete'
                : 'Microsoft Graph Disabled'}
            </span>
          )}
        </div>

        {emailCfg && (
          <>
            {/* ── Microsoft Graph (read-only, masked) ── */}
            {emailCfg.graph && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Sender Email</label>
                  <div className="h-11 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                    {emailCfg.graph.senderEmail || '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Tenant ID</label>
                  <div className="h-11 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                    {emailCfg.graph.tenantIdConfigured ? 'Configured' : 'Not configured'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Client ID</label>
                  <div className="h-11 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                    {emailCfg.graph.clientIdConfigured ? 'Configured' : 'Not configured'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">Client Secret</label>
                  <div className="h-11 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      {emailCfg.graph.clientSecretConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Graph credentials are environment-only (backend) — never editable or visible here.</p>
                </div>
              </div>
            )}

            {/* ── Platform-wide notification settings (transport-independent) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">From Name</label>
                <input value={emailCfg.fromName || ''} onChange={(e) => handleEmailField('fromName', e.target.value)} disabled={emailSaving}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">Reply-To (optional)</label>
                <input type="email" value={emailCfg.replyTo || ''} onChange={(e) => handleEmailField('replyTo', e.target.value)} disabled={emailSaving}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">Super Admin Notification Emails (comma-separated)</label>
                <input value={(emailCfg.superAdminNotificationEmails || []).join(', ')}
                  onChange={(e) => handleEmailField('superAdminNotificationEmails', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  disabled={emailSaving}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">General Notification Emails</label>
                <label className="flex items-center gap-2 cursor-pointer h-11">
                  <input type="checkbox" checked={emailCfg.generalNotificationsEnabled !== false}
                    onChange={(e) => handleEmailField('generalNotificationsEnabled', e.target.checked)} disabled={emailSaving}
                    className="w-5 h-5 accent-[#16A34A]" />
                  <span className="text-xs text-slate-500">{emailCfg.generalNotificationsEnabled !== false ? 'Enabled' : 'Disabled'} — verification codes are ALWAYS sent</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <button onClick={handleSaveEmail} disabled={emailSaving}
                className="h-10 px-5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
                {emailSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {emailSaving ? 'Saving...' : 'Save Email Settings'}
              </button>
              <button onClick={handleVerifySmtp} disabled={emailTesting}
                className="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
                {emailTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Verify Connection
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Send Test Email</label>
                <input type="email" placeholder="recipient@example.com" value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)} disabled={emailTesting}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#16A34A] disabled:opacity-50" />
              </div>
              <button onClick={handleSendTest} disabled={emailTesting}
                className="h-10 px-4 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
                {emailTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Test
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmRefresh}
        onClose={() => setConfirmRefresh(false)}
        onConfirm={() => { setConfirmRefresh(false); loadSettings(); }}
        title="Discard unsaved changes?"
        message="You have unsaved changes. Refresh will reload settings from the server and discard them."
        confirmLabel="Discard & Refresh"
        cancelLabel="Keep Editing"
        variant="warning"
      />

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 text-xs font-bold shadow-lg animate-slide-up ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
