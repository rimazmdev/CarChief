/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerTier, DynamicDiscountRule } from '../customer/types';
import { Plus, Edit, Trash2, KeyRound, Check, AlertCircle, X, RefreshCw, Layers } from 'lucide-react';

export default function AdminCustomerTiers() {
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomerTier | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [badgeColor, setBadgeColor] = useState('bg-red-500/10 text-red-500');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountRules, setDiscountRules] = useState<DynamicDiscountRule[]>([]);
  const [maxOnlineReservations, setMaxOnlineReservations] = useState(3);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'customerTiers'), orderBy('priority', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerTier));
      setTiers(list);
    } catch (err) {
      console.error("Failed loading tiers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const addRule = () => {
    setDiscountRules([...discountRules, { startWeek: discountRules.length + 1, endWeek: null, discountPercentage: 0 }]);
  };

  const removeRule = (index: number) => {
    setDiscountRules(discountRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, key: keyof DynamicDiscountRule, value: any) => {
    const updated = [...discountRules];
    updated[index] = { ...updated[index], [key]: value };
    setDiscountRules(updated);
  };

  const handleOpenCreate = () => {
    setEditingTier(null);
    setName('');
    setDescription('');
    setPriority(1);
    setBadgeColor('bg-red-500/10 text-red-500');
    setCreditLimit(100000);
    setPaymentTerms('Net 30');
    setDiscountPercentage(0);
    setDiscountRules([
      { startWeek: 1, endWeek: 1, discountPercentage: 10 },
      { startWeek: 2, endWeek: 3, discountPercentage: 5 },
      { startWeek: 4, endWeek: null, discountPercentage: 2 }
    ]);
    setMaxOnlineReservations(3);
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (tier: CustomerTier) => {
    setEditingTier(tier);
    setName(tier.name);
    setDescription(tier.description);
    setPriority(tier.priority);
    setBadgeColor(tier.badgeColor);
    setCreditLimit(tier.creditLimit);
    setPaymentTerms(tier.paymentTerms);
    setDiscountPercentage(tier.discountPercentage);
    setDiscountRules(tier.discountRules || [
      { startWeek: 1, endWeek: 1, discountPercentage: 10 },
      { startWeek: 2, endWeek: 3, discountPercentage: 5 },
      { startWeek: 4, endWeek: null, discountPercentage: 2 }
    ]);
    setMaxOnlineReservations(tier.maxOnlineReservations !== undefined ? tier.maxOnlineReservations : 3);
    setStatus(tier.status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      description: description.trim(),
      priority: Number(priority),
      badgeColor,
      creditLimit: Number(creditLimit),
      paymentTerms,
      discountPercentage: Number(discountPercentage),
      discountRules,
      maxOnlineReservations: Number(maxOnlineReservations),
      status,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingTier) {
        await updateDoc(doc(db, 'customerTiers', editingTier.id), data);
      } else {
        const payload = {
          ...data,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'customerTiers'), payload);
      }
      setShowModal(false);
      fetchTiers();
    } catch (err) {
      console.error(err);
      alert("Failed saving customer tier.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this customer tier master record?")) return;
    try {
      await deleteDoc(doc(db, 'customerTiers', id));
      fetchTiers();
    } catch (err) {
      console.error(err);
      alert("Failed to delete customer tier.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header Controls */}
      <div className="flex justify-between items-center bg-white border border-neutral-200/60 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-mono font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" /> Customer Tier configurations
          </h3>
          <p className="text-[11px] text-neutral-500 font-light mt-1 font-mono leading-relaxed">Configure client prioritization, custom credit limits, and badge tags.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold py-2.5 px-5 rounded-lg flex items-center gap-1.5 transition-all uppercase tracking-widest cursor-pointer shadow-lg shadow-red-600/10 hover:shadow-red-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Tier</span>
        </button>
      </div>

      {/* Tiers List */}
      {loading ? (
        <div className="text-center py-10 text-neutral-500 font-mono text-xs animate-pulse">
          Refreshing customer tiers master list...
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl font-mono text-neutral-500 text-xs shadow-xs">
          No custom customer tiers declared yet. Click 'New Tier' to establish.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiers.map((t) => {
            return (
              <div key={t.id} className="bg-white border border-neutral-200/60 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-300 transition-all shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] uppercase font-mono font-black tracking-widest px-2.5 py-1 rounded-md border border-neutral-100 ${t.badgeColor || 'bg-red-500/10 text-red-500'}`}>
                      {t.name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Priority Rank: {t.priority}</span>
                  </div>
                  <p className="text-xs font-light text-neutral-600 leading-relaxed min-h-8">{t.description}</p>
                  
                  {/* Stats table */}
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] font-mono text-neutral-500 pt-3 border-t border-neutral-100">
                    <span>Credit limit:</span>
                    <span className="text-neutral-800 text-right font-semibold">${t.creditLimit?.toLocaleString()}</span>
                    <span>Payment Terms:</span>
                    <span className="text-neutral-800 text-right font-medium">{t.paymentTerms || 'Net 30'}</span>
                    <span>Max Reservations:</span>
                    <span className="text-neutral-800 text-right font-medium">{t.maxOnlineReservations !== undefined ? t.maxOnlineReservations : 3} units</span>
                    {t.discountRules && t.discountRules.length > 0 && (
                      <div className="col-span-2 pt-2 mt-1 text-[10px] space-y-1 text-neutral-500 border-t border-neutral-100">
                        <div className="font-bold text-neutral-600 uppercase tracking-wider text-[9px] mb-1">Dynamic Week Discounts:</div>
                        {t.discountRules.map((rule, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>Week {rule.startWeek}{rule.endWeek ? ` - ${rule.endWeek}` : '+'}:</span>
                            <span className="text-neutral-800 font-semibold">{rule.discountPercentage}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span>Status:</span>
                    <span className={`text-right font-bold ${t.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>{t.status}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-neutral-100">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded border border-neutral-200 transition-colors cursor-pointer shadow-xs"
                    title="Edit Tier parameters"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 bg-neutral-50 hover:bg-red-50 text-neutral-600 hover:text-red-600 rounded border border-neutral-200 transition-colors cursor-pointer shadow-xs"
                    title="Delete Tier master"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-neutral-800 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-800 mb-4 pb-2 border-b border-neutral-100">
              {editingTier ? 'Update Tier Config' : 'Create Custom Tier'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Tier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate VIP, Premium Dealer"
                  className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sourcing partners managing above 10 units per financial cycle."
                  className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 h-20 resize-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Priority rank (1-10) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Max Reservations Limit *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={maxOnlineReservations}
                    onChange={(e) => setMaxOnlineReservations(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Credit Limit (USD) *</label>
                  <input
                    type="number"
                    required
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Payment Terms *</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Immediate">Immediate Cash</option>
                    <option value="50/50 Sourcing">50% Deposit, 50% BL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Badge Design *</label>
                  <select
                    value={badgeColor}
                    onChange={(e) => setBadgeColor(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  >
                    <option value="bg-red-500/10 text-red-500">Red Highlight</option>
                    <option value="bg-yellow-500/10 text-yellow-500">Gold Accent</option>
                    <option value="bg-blue-500/10 text-blue-500">Silver Accent</option>
                    <option value="bg-green-500/10 text-green-600">Green Highlight</option>
                    <option value="bg-purple-500/10 text-purple-600">Premium Purple</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Status *</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-xs"
                  >
                    <option value="active">Active Sourcing</option>
                    <option value="inactive">Inactive Sourcing</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Week Discount Rules Sub-form */}
              <div className="space-y-2 border-t border-neutral-100 pt-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                    Dynamic Week Discount Rules
                  </label>
                  <button
                    type="button"
                    onClick={addRule}
                    className="text-red-600 hover:text-red-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Rule
                  </button>
                </div>
                
                <p className="text-[10px] text-neutral-400 leading-normal mb-2">
                  Set dynamic discount percentages based on the weeks elapsed since the vehicle's purchased date.
                </p>

                {discountRules.length === 0 ? (
                  <div className="text-[11px] text-neutral-400 italic py-3 text-center border border-dashed border-neutral-200 rounded-lg">
                    No dynamic week discounts configured.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {discountRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-neutral-400">Start Week</span>
                            <input
                              type="number"
                              min="1"
                              required
                              value={rule.startWeek}
                              onChange={(e) => updateRule(idx, 'startWeek', Number(e.target.value))}
                              className="w-full bg-white border border-neutral-200 rounded p-1 text-[11px] text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-neutral-400">End Week</span>
                            <div className="flex gap-1 items-center">
                              <input
                                type="number"
                                min="1"
                                disabled={rule.endWeek === null}
                                value={rule.endWeek || ''}
                                onChange={(e) => updateRule(idx, 'endWeek', e.target.value ? Number(e.target.value) : null)}
                                placeholder="∞"
                                className="w-full bg-white border border-neutral-200 rounded p-1 text-[11px] text-neutral-900 focus:outline-none disabled:opacity-50"
                              />
                              <button
                                type="button"
                                title={rule.endWeek === null ? "Set finite end week" : "Set as onwards (no limit)"}
                                onClick={() => updateRule(idx, 'endWeek', rule.endWeek === null ? rule.startWeek : null)}
                                className={`text-[9px] px-1 py-1 rounded border font-sans cursor-pointer transition-colors ${
                                  rule.endWeek === null 
                                    ? 'bg-red-50 text-red-600 border-red-200' 
                                    : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:text-neutral-900'
                                  }`}
                              >
                                {rule.endWeek === null ? 'Onwards' : 'Finite'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-neutral-400">Discount %</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={rule.discountPercentage}
                              onChange={(e) => updateRule(idx, 'discountPercentage', Number(e.target.value))}
                              className="w-full bg-white border border-neutral-200 rounded p-1 text-[11px] text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeRule(idx)}
                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors self-end mb-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold py-3 px-5 rounded-lg transition-all uppercase tracking-widest cursor-pointer mt-3 shadow-lg shadow-red-600/10 hover:shadow-red-600/20"
              >
                {editingTier ? 'Update config' : 'Launch custom tier'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
