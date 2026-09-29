import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Database, Printer, ShieldCheck, Store, KeyRound, RefreshCw } from 'lucide-react';
import { printerApi } from '../../api/printer.api';
import apiClient from '../../api/axios';

/**
 * Phase J — First-run wizard (localhost-only bootstrap UI).
 *
 * Appears ONLY while the installation is uninitialized (firstRun=true from
 * GET /api/system/first-run-status). Steps: Welcome → System check →
 * Database → Restaurant+Admin → License → Printers (skippable) → Finish.
 * Bootstrap APIs are localhost-only server-side; after onboarding the
 * backend disables them and the wizard redirects to normal login.
 */

const TOTAL_STEPS = 8;
const { Card, StepDots } = (() => {
  const Card = ({ title, children }) => (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6">{title && (
      <h2 className="text-sm font-bold text-slate-800 mb-3">{title}</h2>)}
      {children}
    </div>);
  const StepDots = ({ current }) => (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i < current ? 'w-6 bg-emerald-500' : i === current ? 'w-6 bg-emerald-600' : 'w-3 bg-slate-200'}`} />
      ))}
      <span className="ml-2 text-[10px] font-bold text-slate-400">Step {Math.min(current + 1, TOTAL_STEPS)} / {TOTAL_STEPS}</span>
    </div>);
  return { Card, StepDots };
})();

const Row = ({ ok, label }) => (
  <div className="flex items-center gap-2 py-1">
    {ok === true ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      : ok === false ? <XCircle className="w-4 h-4 text-red-500" />
      : <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />}
    <span className={`text-xs ${ok === false ? 'text-red-600 font-bold' : 'text-slate-600'}`}>{label}</span>
  </div>
);

const inputCls = 'w-full h-9 text-xs rounded-lg border border-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

export default function FirstRunWizard({ onFinished }) {
  const [step, setStep] = useState(0); // 0 welcome, 1 check, 2 database, 3 restaurant+admin, 4 license, 5 printers, 6 finish
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    restaurantName: '', ownerName: '', phone: '', email: '', address: '', city: '', state: '', country: 'India', pincode: '',
    gstNumber: '', fssaiNumber: '', businessType: 'RESTAURANT', timezone: 'Asia/Kolkata', currency: 'INR',
    adminName: '', adminEmail: '', password: '',
  });
  const [printers, setPrinters] = useState([]);
  const [printerCfg, setPrinterCfg] = useState({ receipt: '', kitchen: '', bar: '' });
  const [licenseKey, setLicenseKey] = useState('');

  const refresh = async () => {
    try {
      const r = await apiClient.get('/system/first-run-status');
      const data = r?.data || r;
      setStatus(data);
      if (data?.ready) { onFinished?.(); }
    } catch (err) {
      if (err?.response?.status === 403) { onFinished?.(); } // setup complete elsewhere
    }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const bootstrapDatabase = async () => {
    setBusy(true); setError('');
    try {
      await apiClient.post('/system/bootstrap/database');
      await apiClient.post('/system/bootstrap/migrate');
      await refresh();
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Database initialization failed');
    } finally { setBusy(false); }
  };

  const submitOnboarding = async () => {
    setBusy(true); setError('');
    try {
      await apiClient.post('/system/onboarding', form);
      setStep(4);
    } catch (err) {
      setError(err?.response?.data?.message || 'Onboarding failed');
    } finally { setBusy(false); }
  };

  const activateLicense = async () => {
    setBusy(true); setError('');
    try {
      await apiClient.post('/license/activate', { licenseKey });
      setStep(5);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Activation failed';
      // Offline is expected sometimes — allow skipping to printers with a note.
      setError(`${msg} — License activation requires Internet during first setup. You can continue and activate later from Settings.`);
      setStep(5);
    } finally { setBusy(false); }
  };

  const loadPrinters = async () => {
    setBusy(true);
    try {
      const r = await printerApi.discover();
      setPrinters(r?.data || []);
    } catch (_) { setPrinters([]); } finally { setBusy(false); }
  };
  useEffect(() => { if (step === 5) loadPrinters(); /* eslint-disable-next-line */ }, [step]);

  const savePrinters = async (skip = false) => {
    if (skip) return finish();
    setBusy(true); setError('');
    try {
      const list = [];
      const pick = (name, role) => name ? list.push({ name, role, enabled: true, copies: 1, paperWidth: 80, categories: [] }) : null;
      pick(printerCfg.receipt, 'RECEIPT'); pick(printerCfg.kitchen, 'KITCHEN'); pick(printerCfg.bar, 'BAR');
      if (list.length > 0) await printerApi.saveConfig(list);
      finish();
    } catch (err) {
      setError(err?.response?.data?.message || 'Printer configuration failed');
    } finally { setBusy(false); }
  };

  const finish = () => { setStep(6); setTimeout(() => onFinished?.(), 2500); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex flex-col items-center justify-center p-4 gap-4">
      <StepDots current={step} />
      {error && <div className="max-w-lg w-full text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

      {step === 0 && (
        <Card>
          <div className="text-center space-y-3">
            <Store className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-extrabold text-slate-800">Welcome to your POS terminal</h1>
            <p className="text-xs text-slate-500">This appears only once — we'll set up the database, your restaurant, an admin account, license and printers.</p>
            <button onClick={() => { setStep(1); refresh(); }} className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider" type="button">Get started</button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="System check">
          <Row ok={status ? true : null} label="Backend server reachable (you are connected)" />
          <Row ok={status?.database?.installed} label="PostgreSQL installed" />
          <Row ok={status?.database?.reachable} label="PostgreSQL reachable (localhost)" />
          <Row ok={status?.database?.initialized} label="Database schema initialized" />
          <Row ok={status?.printers?.available === true ? true : status?.printers?.available === false ? null : null} label="Printers detectable (optional now)" />
          <button onClick={() => setStep(2)} disabled={!status?.database?.reachable}
            className="mt-4 w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase" type="button">Continue</button>
        </Card>
      )}

      {step === 2 && (
        <Card title="Database setup">
          {status?.database?.initialized ? (
            <div className="space-y-3">
              <Row ok={true} label="Database already initialized — nothing to do" />
              <button onClick={() => setStep(3)} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase" type="button">Continue</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Creates the <b>pos_local</b> database if missing and applies Prisma migrations. Existing data is never touched or reset.</p>
              <button onClick={bootstrapDatabase} disabled={busy}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2" type="button">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {busy ? 'Working…' : 'Initialize database'}
              </button>
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card title="Restaurant & admin account">
          <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
            <input className={inputCls} placeholder="Restaurant name *" value={form.restaurantName} onChange={set('restaurantName')} />
            <input className={inputCls} placeholder="Owner name *" value={form.ownerName} onChange={set('ownerName')} />
            <input className={inputCls} placeholder="Phone * (e.g. 9876543210)" value={form.phone} onChange={set('phone')} />
            <input className={inputCls} placeholder="Email" value={form.email} onChange={set('email')} />
            <input className={inputCls} placeholder="Address" value={form.address} onChange={set('address')} />
            <div className="grid grid-cols-3 gap-2">
              <input className={inputCls} placeholder="City" value={form.city} onChange={set('city')} />
              <input className={inputCls} placeholder="State" value={form.state} onChange={set('state')} />
              <input className={inputCls} placeholder="Pincode" value={form.pincode} onChange={set('pincode')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="GSTIN (optional)" value={form.gstNumber} onChange={set('gstNumber')} />
              <input className={inputCls} placeholder="FSSAI (optional)" value={form.fssaiNumber} onChange={set('fssaiNumber')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Timezone" value={form.timezone} onChange={set('timezone')} />
              <input className={inputCls} placeholder="Currency" value={form.currency} onChange={set('currency')} />
            </div>
            <hr className="border-slate-100" />
            <input className={inputCls} placeholder="Admin name *" value={form.adminName} onChange={set('adminName')} />
            <input className={inputCls} placeholder="Admin email (login) *" value={form.adminEmail} onChange={set('adminEmail')} />
            <input className={inputCls} type="password" placeholder="Admin password * (min 8 chars)" value={form.password} onChange={set('password')} />
          </div>
          <button onClick={submitOnboarding} disabled={busy}
            className="mt-3 w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2" type="button">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {busy ? 'Creating…' : 'Create restaurant & admin'}
          </button>
        </Card>
      )}

      {step === 4 && (
        <Card title="License activation">
          <div className="space-y-3">
            <Row ok={status?.license?.activated} label="License activated" />
            <p className="text-xs text-slate-500">Paste your license key (or activate later from Settings). <b>License activation requires Internet during first setup.</b></p>
            <input className={inputCls} placeholder="License key / license.lic contents" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} />
            <button onClick={activateLicense} disabled={busy || !licenseKey.trim()}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2" type="button">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Activate now
            </button>
            <button onClick={() => setStep(5)} className="w-full h-8 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase text-slate-500" type="button">Skip — activate later</button>
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card title="Printer setup (optional)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Printers installed on this server PC:</p>
              <button onClick={loadPrinters} className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1" type="button"><RefreshCw className="w-3 h-3" /> Refresh</button>
            </div>
            {printers.length === 0 && <p className="text-[11px] text-slate-400">No printers discovered yet — you can skip and configure later.</p>}
            {[['receipt', 'Receipt'], ['kitchen', 'Kitchen'], ['bar', 'Bar']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-14 font-bold">{label}</span>
                <select className={inputCls} value={printerCfg[key]} onChange={(e) => setPrinterCfg({ ...printerCfg, [key]: e.target.value })}>
                  <option value="">— none —</option>
                  {printers.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </label>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => savePrinters(false)} disabled={busy} className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase" type="button">Save & finish</button>
              <button onClick={() => savePrinters(true)} className="h-9 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase text-slate-500" type="button">Skip</button>
            </div>
          </div>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-extrabold text-slate-800">Your POS is ready</h1>
            <p className="text-xs text-slate-500">Redirecting to login…</p>
            <Printer className="w-4 h-4 text-slate-200 mx-auto" />
          </div>
        </Card>
      )}
    </div>
  );
}
