/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { firestoreCache, getFallbackPresets } from '../lib/firestoreCache';
import { ExchangeRate, ExchangeRateHistory, RoleConfig } from '../types';
import { 
  RefreshCw, Plus, Edit, Check, X, Shield, History, DollarSign, ArrowRightLeft, AlertCircle, Eye
} from 'lucide-react';
import { auditedAddDoc, auditedUpdateDoc } from '../lib/firestoreAudit';

interface ExchangeRateMasterProps {
  currentRole?: RoleConfig;
  triggerToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ExchangeRateMaster({ currentRole, triggerToast }: ExchangeRateMasterProps) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [history, setHistory] = useState<ExchangeRateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRateForHistory, setSelectedRateForHistory] = useState<ExchangeRate | null>(null);

  // Form states: Create Rate
  const [fromCurrency, setFromCurrency] = useState('JPY');
  const [toCurrency, setToCurrency] = useState('USD');
  const [rateValue, setRateValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeStatus, setActiveStatus] = useState<'Active' | 'Inactive'>('Active');

  // Edit Rate states
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const currentUser = auth.currentUser;
  const isFinanceOrAdmin = currentRole?.id === 'Admin' || currentRole?.id === 'Dealer' || currentRole?.id === 'Guest' || currentUser?.email === 'charith3ny@gmail.com';
  // Sales users only have read access
  const isReadOnly = !isFinanceOrAdmin;

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      let ratesList = await firestoreCache.fetchCollection('exchangeRates', false, 'ExchangeRateMaster', 'fetchExchangeRates');

      if (!ratesList || ratesList.length === 0) {
        ratesList = getFallbackPresets('exchangeRates');
        firestoreCache.set('exchangeRates', ratesList);
      }

      setRates(ratesList);

      let historyList = await firestoreCache.fetchCollection('exchangeRateHistory', false, 'ExchangeRateMaster', 'fetchExchangeRates');
      setHistory(historyList || []);
    } catch (err) {
      console.error("Failed loading exchange rates:", err);
      const cachedRates = firestoreCache.get('exchangeRates') || getFallbackPresets('exchangeRates');
      setRates(cachedRates);
      const cachedHistory = firestoreCache.get('exchangeRateHistory') || [];
      setHistory(cachedHistory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();

    const handleCacheUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.colName === 'exchangeRates' || customEvent.detail?.colName === 'exchangeRateHistory') {
        fetchExchangeRates();
      }
    };

    window.addEventListener('firestore-cache-updated', handleCacheUpdated);
    return () => {
      window.removeEventListener('firestore-cache-updated', handleCacheUpdated);
    };
  }, []);

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCurrency || !toCurrency || !rateValue || Number(rateValue) <= 0) {
      triggerToast?.("Please enter valid currencies and a positive exchange rate.", "error");
      return;
    }

    setSaving(true);
    try {
      const numRate = parseFloat(rateValue);
      const userEmail = currentUser?.email || 'Finance Admin';
      const nowStr = new Date().toISOString();

      const newRateData = {
        fromCurrency: fromCurrency.toUpperCase().trim(),
        toCurrency: toCurrency.toUpperCase().trim(),
        rate: numRate,
        effectiveDate,
        activeStatus,
        updatedBy: userEmail,
        updatedAt: nowStr
      };

      let docId = 'fx_' + Date.now();
      if (!firestoreCache.isFallbackMode()) {
        try {
          const docRef = await auditedAddDoc(
            collection(db, 'exchangeRates'),
            newRateData,
            'ExchangeRateMaster',
            'handleCreateRate',
            `Created exchange rate ${fromCurrency} -> ${toCurrency} = ${numRate}`
          );
          if (docRef?.id) {
            docId = docRef.id;
          }
        } catch (err) {
          console.warn("Firestore save failed, saving to local cache:", err);
        }
      }

      // Always update local cache so state is updated instantly
      firestoreCache.mutateLocalCollection('exchangeRates', 'add', docId, newRateData);

      // Add to history
      const historyEntry = {
        exchangeRateId: docId,
        fromCurrency: fromCurrency.toUpperCase().trim(),
        toCurrency: toCurrency.toUpperCase().trim(),
        oldRate: 0,
        newRate: numRate,
        changedBy: userEmail,
        changedAt: nowStr,
        reason: 'Initial rate setup'
      };

      const histId = 'hist_' + Date.now();
      if (!firestoreCache.isFallbackMode()) {
        try {
          await auditedAddDoc(
            collection(db, 'exchangeRateHistory'),
            historyEntry,
            'ExchangeRateMaster',
            'handleCreateRate',
            'Log initial rate setup in history'
          );
        } catch (err) {
          console.warn("Firestore history save failed, saving to local cache:", err);
        }
      }

      firestoreCache.mutateLocalCollection('exchangeRateHistory', 'add', histId, historyEntry);

      triggerToast?.(`Exchange rate ${fromCurrency} -> ${toCurrency} (${numRate}) saved successfully!`, "success");
      
      setShowAddModal(false);
      setRateValue('');
      await fetchExchangeRates();
    } catch (err) {
      console.error("Failed creating rate:", err);
      triggerToast?.("Failed to create exchange rate.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRate = async (rateObj: ExchangeRate) => {
    if (!editRateValue || Number(editRateValue) <= 0) {
      triggerToast?.("Please enter a valid rate greater than 0.", "error");
      return;
    }

    setSaving(true);
    try {
      const numRate = parseFloat(editRateValue);
      const userEmail = currentUser?.email || 'Finance Admin';
      const nowStr = new Date().toISOString();

      const updateData = {
        rate: numRate,
        updatedBy: userEmail,
        updatedAt: nowStr
      };

      if (!firestoreCache.isFallbackMode()) {
        try {
          await auditedUpdateDoc(
            doc(db, 'exchangeRates', rateObj.id),
            updateData,
            'ExchangeRateMaster',
            'handleUpdateRate',
            `Updated rate from ${rateObj.rate} to ${numRate}`
          );
        } catch (err) {
          console.warn("Firestore update failed, updating local cache:", err);
        }
      }

      firestoreCache.mutateLocalCollection('exchangeRates', 'update', rateObj.id, updateData);

      // Record in History
      const historyEntry = {
        exchangeRateId: rateObj.id,
        fromCurrency: rateObj.fromCurrency,
        toCurrency: rateObj.toCurrency,
        oldRate: rateObj.rate,
        newRate: numRate,
        changedBy: userEmail,
        changedAt: nowStr,
        reason: editReason.trim() || 'Finance rate update'
      };

      const histId = 'hist_' + Date.now();
      if (!firestoreCache.isFallbackMode()) {
        try {
          await auditedAddDoc(
            collection(db, 'exchangeRateHistory'),
            historyEntry,
            'ExchangeRateMaster',
            'handleUpdateRate',
            'Record exchange rate change'
          );
        } catch (err) {
          console.warn("Firestore history log failed, saving locally:", err);
        }
      }

      firestoreCache.mutateLocalCollection('exchangeRateHistory', 'add', histId, historyEntry);

      triggerToast?.(`Exchange rate for ${rateObj.fromCurrency} -> ${rateObj.toCurrency} updated to ${numRate}!`, "success");

      setEditingRateId(null);
      setEditRateValue('');
      setEditReason('');
      await fetchExchangeRates();
    } catch (err) {
      console.error("Failed updating rate:", err);
      triggerToast?.("Failed to update exchange rate.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (rateObj: ExchangeRate) => {
    if (isReadOnly) return;
    const newStatus = rateObj.activeStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const userEmail = currentUser?.email || 'Finance Admin';
      const nowStr = new Date().toISOString();
      const updateData = {
        activeStatus: newStatus,
        updatedBy: userEmail,
        updatedAt: nowStr
      };

      if (!firestoreCache.isFallbackMode()) {
        try {
          await auditedUpdateDoc(
            doc(db, 'exchangeRates', rateObj.id),
            updateData,
            'ExchangeRateMaster',
            'handleToggleStatus',
            `Toggled rate status to ${newStatus}`
          );
        } catch (err) {
          console.warn("Firestore toggle status failed, updating local cache:", err);
        }
      }

      firestoreCache.mutateLocalCollection('exchangeRates', 'update', rateObj.id, updateData);
      triggerToast?.(`Rate ${rateObj.fromCurrency}->${rateObj.toCurrency} is now ${newStatus}.`, "info");
      await fetchExchangeRates();
    } catch (err) {
      console.error("Error toggling status:", err);
      triggerToast?.("Failed to update rate status.", "error");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-xs overflow-hidden p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            FINANCE EXCHANGE RATE MASTER
          </div>
          <h3 className="text-base font-bold text-neutral-900">Currency Exchange Rates</h3>
          <p className="text-xs text-neutral-500">
            {isReadOnly 
              ? "Read-only view for Sales. Active rates are automatically applied during TT allocation."
              : "Maintained strictly by Finance & Admin. Used for converting invoice currency to TT deduction."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExchangeRates}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            title="Refresh Rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {!isReadOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Currency Pair</span>
            </button>
          )}
        </div>
      </div>

      {/* Rates Table */}
      <div className="overflow-x-auto border border-neutral-200/60 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-neutral-500 font-mono text-[10px] uppercase font-bold tracking-wider border-b border-neutral-200/60">
              <th className="py-3 px-4">From Currency</th>
              <th className="py-3 px-4">To Currency</th>
              <th className="py-3 px-4">Exchange Rate</th>
              <th className="py-3 px-4">Effective Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Updated By</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-sans text-neutral-700">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-400 font-medium">
                  No exchange rates configured yet.
                </td>
              </tr>
            ) : (
              rates.map((rate) => {
                const isEditing = editingRateId === rate.id;
                return (
                  <tr key={rate.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">{rate.fromCurrency}</td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">{rate.toCurrency}</td>
                    <td className="py-3 px-4 font-mono">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.000001"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            placeholder="e.g. 0.0061"
                            className="w-28 p-1 text-xs border border-neutral-300 rounded focus:outline-none focus:border-red-500 bg-white font-mono"
                          />
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="w-36 p-1 text-xs border border-neutral-300 rounded focus:outline-none focus:border-red-500 bg-white font-sans text-[11px]"
                          />
                        </div>
                      ) : (
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          1 {rate.fromCurrency} = {rate.rate} {rate.toCurrency}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500">{rate.effectiveDate}</td>
                    <td className="py-3 px-4">
                      <button
                        disabled={isReadOnly}
                        onClick={() => handleToggleStatus(rate)}
                        className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                          rate.activeStatus === 'Active' 
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                        } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {rate.activeStatus}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-neutral-500">
                      <div>{rate.updatedBy || 'Finance Staff'}</div>
                      <div className="text-[9.5px] text-neutral-400 font-mono">{rate.updatedAt ? new Date(rate.updatedAt).toLocaleDateString() : ''}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdateRate(rate)}
                              disabled={saving}
                              className="bg-green-600 text-white p-1 rounded hover:bg-green-700 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                              title="Save Rate"
                            >
                              <Check className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={() => setEditingRateId(null)}
                              className="bg-neutral-200 text-neutral-700 p-1 rounded hover:bg-neutral-300 text-xs cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setEditingRateId(rate.id);
                                  setEditRateValue(String(rate.rate));
                                  setEditReason('');
                                }}
                                className="p-1 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Edit Rate"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRateForHistory(rate);
                                setShowHistoryModal(true);
                              }}
                              className="p-1 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                              title="View History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Rate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-neutral-200 shadow-xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Add Exchange Rate Pair</h3>
              <p className="text-xs text-neutral-500">Configure new conversion pair for TT payment allocations.</p>
            </div>

            <form onSubmit={handleCreateRate} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">From Currency *</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="JPY">JPY (Japanese Yen)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="AUD">AUD (Australian Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">To Currency *</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="USD">USD (US Dollar)</option>
                    <option value="JPY">JPY (Japanese Yen)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="AUD">AUD (Australian Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">
                  Exchange Rate (1 {fromCurrency} = ? {toCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="e.g. 0.0061 for JPY to USD"
                  className="w-full border border-neutral-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Status *</label>
                  <select
                    value={activeStatus}
                    onChange={(e: any) => setActiveStatus(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors uppercase tracking-wider text-[11px] cursor-pointer"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Audit Modal */}
      {showHistoryModal && selectedRateForHistory && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 shadow-xl relative">
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedRateForHistory(null);
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Rate Audit History: {selectedRateForHistory.fromCurrency} → {selectedRateForHistory.toCurrency}
                </h3>
                <p className="text-xs text-neutral-500">Full immutable audit trail of exchange rate modifications.</p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-xs">
              {history.filter(h => h.fromCurrency === selectedRateForHistory.fromCurrency && h.toCurrency === selectedRateForHistory.toCurrency).length === 0 ? (
                <div className="p-6 text-center text-neutral-400">No modification history recorded yet for this pair.</div>
              ) : (
                history
                  .filter(h => h.fromCurrency === selectedRateForHistory.fromCurrency && h.toCurrency === selectedRateForHistory.toCurrency)
                  .map((item) => (
                    <div key={item.id} className="p-3 hover:bg-neutral-50 transition-colors space-y-1">
                      <div className="flex justify-between font-mono font-bold text-neutral-900">
                        <span>
                          {item.oldRate ? `${item.oldRate} → ` : ''} <span className="text-red-600">{item.newRate}</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {item.changedAt ? new Date(item.changedAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-500">
                        <span>By: {item.changedBy || 'Finance'}</span>
                        {item.reason && <span className="italic text-neutral-400">"{item.reason}"</span>}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedRateForHistory(null);
                }}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 font-bold rounded-lg hover:bg-neutral-200 transition-colors text-xs cursor-pointer"
              >
                Close Audit History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
