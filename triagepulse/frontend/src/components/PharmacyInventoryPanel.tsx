import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Truck, 
  Search, 
  DollarSign, 
  Calendar, 
  Droplet,
  Pill,
  ShieldAlert
} from 'lucide-react';
import { PharmacyItem } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

export const PharmacyInventoryPanel: React.FC = () => {
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const data = await api.getPharmacyInventory();
      setItems(data);
    } catch (err) {
      console.error('Failed to load pharmacy inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRestock = async (itemId: string, name: string, quantity: number = 20) => {
    setProcessingId(itemId);
    try {
      await api.restockInventory(itemId, quantity);
      sounds.playSuccessChime();
      setActionSuccessMsg(`Restocked +${quantity} units of ${name}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchInventory();
    } catch (err) {
      console.error('Failed to restock item', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeduct = async (itemId: string, name: string, quantity: number = 1) => {
    setProcessingId(itemId);
    try {
      await api.deductInventory(itemId, quantity);
      sounds.playSuccessChime();
      setActionSuccessMsg(`Dispensed 1 unit of ${name} to ward`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchInventory();
    } catch (err) {
      console.error('Failed to deduct item', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.item_name.toLowerCase().includes(q) ||
        item.item_id.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = items.filter(i => i.current_stock <= i.min_reorder_level).length;
  const totalValuation = items.reduce((acc, item) => acc + (item.current_stock * item.unit_price), 0);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-violet-100 text-violet-800">
              <Package className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Pharmacy & Ward Consumables Supply Chain
              </h2>
              <p className="text-xs text-slate-500">
                Live pharmaceutical inventory & automated reorder tracking adapted from Frappe Health & OpenEMR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInventory}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stock</span>
            </button>
          </div>
        </div>

        {/* Stock KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block">Total Active SKUs</span>
            <span className="text-xl font-bold font-mono text-slate-900">{items.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Formulary Products</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-[11px] font-medium text-rose-700 block">Below Reorder Level</span>
            <span className={`text-xl font-bold font-mono ${lowStockCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {lowStockCount}
            </span>
            <span className="text-[10px] text-rose-600 block mt-0.5">Urgent PO Required</span>
          </div>

          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200">
            <span className="text-[11px] font-medium text-teal-700 block">Ward Inventory Valuation</span>
            <span className="text-xl font-bold font-mono text-teal-800">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-teal-600 block mt-0.5">On-Hand Stock</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-medium text-emerald-700 block">Stock Integrity</span>
            <span className="text-xl font-bold font-mono text-emerald-800">
              {items.length > 0 ? Math.round(((items.length - lowStockCount) / items.length) * 100) : 100}%
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Adequate Supply</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, medication, batch..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-semibold text-slate-700 whitespace-nowrap">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="IV Fluids">IV Fluids & Electrolytes</option>
            <option value="Antibiotics">Antibiotics & Antimicrobials</option>
            <option value="Emergency Drugs">Emergency & Critical Care</option>
            <option value="Consumables">Ward Consumables & Sets</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Code & Name</th>
                <th className="py-3 px-4">Category & Location</th>
                <th className="py-3 px-4">Current Stock / Reorder</th>
                <th className="py-3 px-4">Unit Price / Value</th>
                <th className="py-3 px-4">Batch & Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isBelowMin = item.current_stock <= item.min_reorder_level;
                const isCritical = item.current_stock <= Math.floor(item.min_reorder_level * 0.5);
                const stockPct = Math.min(100, Math.round((item.current_stock / (item.min_reorder_level * 2)) * 100));

                return (
                  <tr key={item.item_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                          {item.category.includes('IV') ? <Droplet className="w-3.5 h-3.5 text-teal-600" /> : <Pill className="w-3.5 h-3.5 text-violet-600" />}
                        </span>
                        <div>
                          <strong className="text-slate-900 block text-xs">{item.item_name}</strong>
                          <span className="text-[10px] font-mono text-slate-500">{item.item_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{item.category}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.location}</span>
                    </td>

                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className={`font-mono font-bold ${isBelowMin ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Min: {item.min_reorder_level}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCritical ? 'bg-rose-500' : isBelowMin ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-800 block">${item.unit_price.toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Total: ${(item.current_stock * item.unit_price).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-slate-800 block">{item.batch_number}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Exp: {item.expiry_date}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isBelowMin
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isCritical ? 'Critical' : isBelowMin ? 'Low Stock' : 'Adequate'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDeduct(item.item_id, item.item_name, 1)}
                          disabled={processingId === item.item_id || item.current_stock <= 0}
                          title="Dispense 1 unit to ward"
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-0.5 transition-all disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3 text-slate-500" />
                          <span>Dispense</span>
                        </button>
                        <button
                          onClick={() => handleRestock(item.item_id, item.item_name, 20)}
                          disabled={processingId === item.item_id}
                          title="Restock +20 units"
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-[11px] font-semibold flex items-center gap-0.5 transition-all disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3 text-teal-600" />
                          <span>+20 Restock</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
