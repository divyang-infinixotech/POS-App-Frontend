import { useEffect, useState } from 'react';
import { Printer, RefreshCw, Play, Trash2, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { printerApi } from '../../../api/printer.api';

/**
 * Phase H — Server printer configuration panel.
 *
 * Shows the Windows printers installed on the POS SERVER PC (discovered via
 * the backend — LAN terminals never need printer drivers or configuration),
 * lets the manager assign each printer a purpose (RECEIPT / KITCHEN / BAR),
 * copies, paper width and optional kitchen/bar category routing, then save,
 * test and re-test. Nothing is hard-coded: printer names come from Windows
 * discovery, roles/categories from this restaurant's own data.
 */

const ROLES = [
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'BAR', label: 'Bar' },
  { value: 'REPORT', label: 'Report' },
];

const emptyDraft = () => ({ name: '', role: 'KITCHEN', copies: 1, paperWidth: 80, categories: '' });

export default function ServerPrinterPanel({ addToast }) {
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [showDraft, setShowDraft] = useState(false);

  const load = async (withDiscovery = true) => {
    if (withDiscovery) setDiscovering(true);
    setLoading(true);
    try {
      const [discRes, cfgRes] = await Promise.all([
        withDiscovery ? printerApi.discover() : Promise.resolve({ data: { data: systemPrinters } }),
        printerApi.getConfig(),
      ]);
      setSystemPrinters(discRes?.data || []);
      setConfig(cfgRes?.data?.printers || []);
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Could not load printer configuration', 'error');
    } finally {
      setLoading(false);
      setDiscovering(false);
    }
  };

  useEffect(() => { load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const statusOf = (name) => systemPrinters.find((p) => p.name === name) || null;

  const addDraft = () => {
    if (!draft.name) { addToast?.('Select a printer first', 'error'); return; }
    if (config.some((p) => p.name === draft.name)) { addToast?.('Printer already configured', 'error'); return; }
    setConfig([...config, {
      id: `printer-${Date.now()}`,
      name: draft.name,
      role: draft.role,
      enabled: true,
      isDefault: false,
      copies: Number(draft.copies) || 1,
      paperWidth: Number(draft.paperWidth) || 80,
      categories: draft.categories.split(',').map((c) => c.trim()).filter(Boolean),
    }]);
    setDraft(emptyDraft());
    setShowDraft(false);
  };

  const patch = (idx, field, value) => {
    const next = config.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    // Only one default at a time.
    if (field === 'isDefault' && value === true) {
      return next.map((p) => ({ ...p, isDefault: p === next[idx] }));
    }
    return next;
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await printerApi.saveConfig(config);
      setConfig(res?.data?.printers || []);
      addToast?.('Printer configuration saved', 'success');
    } catch (err) {
      addToast?.(err.response?.data?.message || 'Could not save printer configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testPrinter = async (name) => {
    setTesting(name);
    try {
      await printerApi.test(name);
      addToast?.(`Test page sent to "${name}"`, 'success');
    } catch (err) {
      const code = err.response?.status;
      const msg = err.response?.data?.message || 'Test print failed';
      addToast?.(code === 409 ? `${msg} — power it on / reconnect, then re-test` : msg, 'error');
    } finally {
      setTesting(null);
    }
  };

  const remove = (idx) => setConfig(config.filter((_, i) => i !== idx));

  const roleBadge = (role) => ({
    RECEIPT: 'bg-emerald-100 text-emerald-800',
    KITCHEN: 'bg-amber-100 text-amber-800',
    BAR: 'bg-sky-100 text-sky-800',
    REPORT: 'bg-slate-200 text-slate-700',
  }[role] || 'bg-slate-100 text-slate-700');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          Printers are installed on the <b>POS server PC</b> — terminals only need a browser.
          Assign a purpose to each printer, then save.
        </p>
        <button onClick={() => load(true)} disabled={discovering}
          className="h-8 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50" type="button">
          {discovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Configured printers */}
      {config.length === 0 && !loading && (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
          <Printer className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">No printers configured</p>
          <p className="text-[10px] text-slate-400 mt-1">Assign a purpose to a discovered printer below</p>
        </div>
      )}

      {config.map((p, idx) => {
        const sys = statusOf(p.name);
        const online = sys ? sys.available : null; // null = unknown (not discovered this session)
        return (
          <div key={p.id || p.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${online === false ? 'bg-red-100' : online === true ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {online === false ? <XCircle className="w-4 h-4 text-red-600" /> : online === true ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Printer className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {p.paperWidth}mm · {p.copies} cop{p.copies > 1 ? 'ies' : 'y'}
                    {p.categories?.length ? ` · ${p.categories.join(', ')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select value={p.role} onChange={(e) => patch(idx, 'role', e.target.value)}
                  className="h-7 text-[10px] font-bold uppercase rounded-lg border border-slate-200 bg-white px-1.5" aria-label={`Purpose for ${p.name}`}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => testPrinter(p.name)} disabled={testing === p.name} title="Test print"
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50" type="button">
                  {testing === p.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => remove(idx)} title="Remove"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" type="button">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 pl-12">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <input type="checkbox" checked={p.enabled !== false} onChange={(e) => patch(idx, 'enabled', e.target.checked)} /> Enabled
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <input type="checkbox" checked={p.isDefault === true} onChange={(e) => patch(idx, 'isDefault', e.target.checked)} /> Default fallback
              </label>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                Copies
                <input type="number" min={1} max={5} value={p.copies} onChange={(e) => patch(idx, 'copies', Number(e.target.value))}
                  className="w-12 h-6 text-[10px] rounded-lg border border-slate-200 px-1" />
              </label>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                Paper
                <select value={p.paperWidth} onChange={(e) => patch(idx, 'paperWidth', Number(e.target.value))}
                  className="h-6 text-[10px] rounded-lg border border-slate-200 bg-white px-1">
                  <option value={80}>80mm</option>
                  <option value={58}>58mm</option>
                </select>
              </label>
              <input value={(p.categories || []).join(', ')}
                onChange={(e) => patch(idx, 'categories', e.target.value.split(',').map((c) => c.trim()).filter(Boolean))}
                placeholder="Categories for KOT routing (e.g. Drinks, Cocktails) — empty = all items"
                className="flex-1 min-w-[180px] h-7 text-[10px] rounded-lg border border-slate-200 px-2" />
            </div>
            {online === false && (
              <p className="text-[10px] text-red-600 font-bold mt-1 pl-12">Printer is currently offline — re-test after reconnecting.</p>
            )}
          </div>
        );
      })}

      {/* Add from discovered printers */}
      <div className="pt-1">
        {!showDraft ? (
          <button onClick={() => setShowDraft(true)} className="h-8 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm" type="button">
            <Plus className="w-3.5 h-3.5" /> Add Printer
          </button>
        ) : (
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-slate-600">
                Printer (discovered on server PC)
                <select value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full h-8 text-[11px] rounded-lg border border-slate-200 px-2 mt-0.5">
                  <option value="">— select —</option>
                  {systemPrinters.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}{p.default ? ' (Windows default)' : ''}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-bold text-slate-600">
                Purpose
                <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  className="w-full h-8 text-[11px] rounded-lg border border-slate-200 px-2 mt-0.5">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-slate-600">
                Copies (1–5)
                <input type="number" min={1} max={5} value={draft.copies}
                  onChange={(e) => setDraft({ ...draft, copies: e.target.value })}
                  className="w-full h-8 text-[11px] rounded-lg border border-slate-200 px-2 mt-0.5" />
              </label>
              <label className="text-[10px] font-bold text-slate-600">
                Paper width
                <select value={draft.paperWidth} onChange={(e) => setDraft({ ...draft, paperWidth: e.target.value })}
                  className="w-full h-8 text-[11px] rounded-lg border border-slate-200 px-2 mt-0.5">
                  <option value={80}>80mm</option>
                  <option value={58}>58mm</option>
                </select>
              </label>
            </div>
            <label className="block text-[10px] font-bold text-slate-600">
              Categories for KOT routing (comma-separated, empty = this printer takes all items of its purpose)
              <input value={draft.categories} onChange={(e) => setDraft({ ...draft, categories: e.target.value })}
                placeholder="e.g. Drinks, Cocktails"
                className="w-full h-8 text-[11px] rounded-lg border border-slate-200 px-2 mt-0.5" />
            </label>
            <div className="flex items-center gap-2">
              <button onClick={addDraft} className="h-8 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl text-[10px] uppercase" type="button">Add</button>
              <button onClick={() => { setShowDraft(false); setDraft(emptyDraft()); }} className="h-8 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase text-slate-600" type="button">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving} className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider disabled:opacity-50" type="button">
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
    </div>
  );
}
