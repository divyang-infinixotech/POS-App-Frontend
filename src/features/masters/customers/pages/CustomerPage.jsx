import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { customerApi } from '../../../../api/customer.api';

export default function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const resp = await customerApi.getAll();
      setCustomers(resp.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-extrabold text-[#191c1e]">Customers</h3>
          <p className="text-[11px] text-slate-500 font-medium">Manage your customer database</p>
        </div>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Search customers..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 h-8.5 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
      </div>

      <div className="bg-white rounded-[18px] border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase text-slate-500">Name</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase text-slate-500">Phone</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase text-slate-500">Email</th>
              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase text-slate-500">Total Visits</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id || idx} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-800">{c.name || 'Walk-in Customer'}</td>
                <td className="py-3 px-4 text-slate-600">{c.phone || '-'}</td>
                <td className="py-3 px-4 text-slate-600">{c.email || '-'}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-600">{c.totalOrders || c.visitCount || 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-xs italic">No customers found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
