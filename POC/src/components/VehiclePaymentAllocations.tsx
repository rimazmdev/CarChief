/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, DollarSign, Calendar, Building, FileText, AlertCircle, 
  RefreshCw, Check, X, Paperclip, Eye, ArrowRightLeft, Layers, Shield, CheckCircle
} from 'lucide-react';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { firestoreCache } from '../lib/firestoreCache';
import { auditedAddDoc, auditedUpdateDoc } from '../lib/firestoreAudit';
import { Vehicle, ProformaInvoice, RoleConfig, PaymentAllocation, ExchangeRate } from '../types';
import { CustomerPayment } from '../customer/types';

interface VehiclePaymentAllocationsProps {
  vehicle: Vehicle;
  invoice: ProformaInvoice | undefined;
  payments: CustomerPayment[];
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentRole?: RoleConfig;
  onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<void>;
}

export default function VehiclePaymentAllocations({
  vehicle,
  invoice,
  payments,
  triggerToast,
  currentRole,
  onUpdateVehicle
}: VehiclePaymentAllocationsProps) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Allocations loaded from paymentAllocations collection
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  // Approved TTs available for allocation
  const [approvedTTs, setApprovedTTs] = useState<CustomerPayment[]>([]);
  // Exchange rates loaded from exchangeRates collection
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  // Modals and preview states
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedTT, setSelectedTT] = useState<CustomerPayment | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  // Form states for TT Allocation
  const [allocateAmountInVehicleCurrency, setAllocateAmountInVehicleCurrency] = useState('');
  const [allocationRemark, setAllocationRemark] = useState('');

  const currentUser = auth.currentUser;

  // Determine Customer ID associated with invoice
  const customerId = vehicle.reservedCustomerId || invoice?.customerId || '';

  // 1. Fetch Allocations, Approved TTs, and Exchange Rates
  const fetchData = async () => {
    if (!invoice?.id) return;
    setLoading(true);
    try {
      // Fetch Allocations for this invoice
      const allocSnap = await getDocs(query(collection(db, 'paymentAllocations'), where('invoiceId', '==', invoice.id)));
      const allocList = allocSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAllocation));
      setAllocations(allocList);

      // Fetch Exchange Rates
      const ratesSnap = await getDocs(collection(db, 'exchangeRates'));
      let ratesList = ratesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExchangeRate));
      if (ratesList.length === 0) {
        ratesList = firestoreCache.get('exchangeRates') || [];
      }
      setExchangeRates(ratesList);

      // Fetch Approved Customer TTs with remainingBalance > 0
      const paymentsSnap = await firestoreCache.fetchCollection('customerPayments', false, 'VehiclePaymentAllocations', 'fetchData');
      
      const availableTTs = paymentsSnap.filter(p => {
        const isApproved = p.status === 'Approved';
        const remBal = p.remainingBalance !== undefined ? p.remainingBalance : p.amount;
        const hasBalance = remBal > 0.01;
        // Match customer by ID or name/email
        const isSameCustomer = customerId 
          ? p.customerId === customerId 
          : invoice?.buyer?.email && p.customerId; // fallback allow if same customer
        return isApproved && hasBalance;
      });

      setApprovedTTs(availableTTs);
    } catch (err) {
      console.error("Failed fetching allocation dependencies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [invoice?.id, customerId]);

  if (!invoice) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Invoice Missing</h4>
          <p className="text-xs text-red-700">
            A payment allocation can only be created once the vehicle has an active Commercial or Proforma Invoice.
          </p>
        </div>
      </div>
    );
  }

  // Calculate invoice totals
  const invoiceCurrency = invoice.currency || vehicle.currency || 'JPY';
  const invoiceTotal = Number(invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || vehicle.price || 0);

  // Calculate total allocated in vehicle/invoice currency from paymentAllocations
  const totalAllocatedVehicleAmount = allocations.reduce((sum, a) => sum + Number(a.vehicleAmount || 0), 0);
  const outstandingInvoiceBalance = Math.max(0, invoiceTotal - totalAllocatedVehicleAmount);

  // Determine active Exchange Rate from Invoice Currency -> Selected TT Currency
  const getExchangeRateForCurrencies = (invCurr: string, ttCurr: string): number => {
    const fromC = invCurr.toUpperCase().trim();
    const toC = ttCurr.toUpperCase().trim();

    if (fromC === toC) return 1.0;

    // Direct match: From Invoice Currency -> To TT Currency
    const directMatch = exchangeRates.find(r => r.fromCurrency === fromC && r.toCurrency === toC && r.activeStatus === 'Active');
    if (directMatch) return directMatch.rate;

    // Reverse match: From TT Currency -> To Invoice Currency
    const reverseMatch = exchangeRates.find(r => r.fromCurrency === toC && r.toCurrency === fromC && r.activeStatus === 'Active');
    if (reverseMatch && reverseMatch.rate > 0) {
      return 1 / reverseMatch.rate;
    }

    // Standard fallback defaults if not explicitly found in DB
    if (fromC === 'JPY' && toC === 'USD') return 0.0061;
    if (fromC === 'USD' && toC === 'JPY') return 163.93;
    if (fromC === 'EUR' && toC === 'USD') return 1.08;
    if (fromC === 'USD' && toC === 'EUR') return 0.925;

    return 1.0; // fallback ratio 1:1
  };

  // Live calculations for Allocate TT Popup
  const selectedTTCurrency = selectedTT?.currency || 'USD';
  const selectedTTRemainingBefore = selectedTT ? (selectedTT.remainingBalance !== undefined ? selectedTT.remainingBalance : selectedTT.amount) : 0;
  
  const currentRate = selectedTT ? getExchangeRateForCurrencies(invoiceCurrency, selectedTTCurrency) : 1.0;
  const typedInvoiceAllocAmount = parseFloat(allocateAmountInVehicleCurrency) || 0;
  
  // Calculate TT Currency Deduction = Invoice Allocation * Exchange Rate
  const calculatedTTDeduction = typedInvoiceAllocAmount * currentRate;
  const selectedTTRemainingAfter = selectedTTRemainingBefore - calculatedTTDeduction;

  // Validation checks
  const isAllocAmountExceedsInvoice = typedInvoiceAllocAmount > (outstandingInvoiceBalance + 0.01);
  const isTTDeductionExceedsTTBalance = calculatedTTDeduction > (selectedTTRemainingBefore + 0.01);
  const isInvalidAmount = typedInvoiceAllocAmount <= 0;
  const isAllocationFormValid = selectedTT && !isInvalidAmount && !isAllocAmountExceedsInvoice && !isTTDeductionExceedsTTBalance;

  // Handle Save Allocation
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTT) {
      triggerToast("Please select an approved TT for allocation.", "error");
      return;
    }
    if (typedInvoiceAllocAmount <= 0) {
      triggerToast("Please enter a positive allocation amount in invoice currency.", "error");
      return;
    }
    if (isAllocAmountExceedsInvoice) {
      triggerToast(`Allocation amount cannot exceed Outstanding Balance (${invoiceCurrency} ${outstandingInvoiceBalance.toLocaleString()}).`, "error");
      return;
    }
    if (isTTDeductionExceedsTTBalance) {
      triggerToast(`Calculated TT deduction (${selectedTTCurrency} ${calculatedTTDeduction.toLocaleString()}) exceeds TT Remaining Balance (${selectedTTCurrency} ${selectedTTRemainingBefore.toLocaleString()}).`, "error");
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = currentUser?.email || currentRole?.name || 'Sales Staff';
      const ttNum = selectedTT.ttNumber || selectedTT.reference || selectedTT.paymentId;
      const invoiceNo = invoice.proformaNo || 'INV-' + invoice.id.substring(0, 5);

      // 1. Create Allocation Record in paymentAllocations (Never overwrite existing ones)
      const newAllocationData = {
        ttId: selectedTT.id,
        ttNumber: ttNum,
        invoiceId: invoice.id,
        invoiceNumber: invoiceNo,
        vehicleId: vehicle.id,
        customerId: selectedTT.customerId,
        customerName: selectedTT.customerName || invoice.buyer?.consigneeName || 'Customer',
        vehicleCurrency: invoiceCurrency,
        vehicleAmount: typedInvoiceAllocAmount,
        ttCurrency: selectedTTCurrency,
        ttAmountDeducted: calculatedTTDeduction,
        exchangeRateUsed: currentRate,
        allocatedBy: userEmail,
        allocationDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      await auditedAddDoc(
        collection(db, 'paymentAllocations'),
        newAllocationData,
        'VehiclePaymentAllocations',
        'handleSaveAllocation',
        `Allocated ${invoiceCurrency} ${typedInvoiceAllocAmount} from TT ${ttNum}`
      );

      // 2. Update TT Remaining Balance in customerPayments
      const newTTRemainingBalance = Math.max(0, selectedTTRemainingBefore - calculatedTTDeduction);
      await auditedUpdateDoc(
        doc(db, 'customerPayments', selectedTT.id),
        {
          remainingBalance: newTTRemainingBalance,
          updatedAt: new Date().toISOString()
        },
        'VehiclePaymentAllocations',
        'handleSaveAllocation',
        `Updated TT remaining balance to ${selectedTTCurrency} ${newTTRemainingBalance}`
      );

      // 3. Update Invoice Paid Amount and Balance
      const newInvoicePaidTotal = totalAllocatedVehicleAmount + typedInvoiceAllocAmount;
      const newInvoiceBalance = Math.max(0, invoiceTotal - newInvoicePaidTotal);

      await updateDoc(doc(db, 'proformaInvoices', invoice.id), {
        'financials.paidAmount': newInvoicePaidTotal,
        'financials.balance': newInvoiceBalance
      });

      // Update customerInvoices query
      const q = query(collection(db, 'customerInvoices'), where('invoiceId', '==', invoice.id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'customerInvoices', docSnap.id), {
            paidAmount: newInvoicePaidTotal,
            balance: newInvoiceBalance,
            status: newInvoiceBalance <= 0.01 ? 'Fully Paid' : 'Partially Paid'
          });
        }
      }

      // 4. Mark Vehicle as Sold if fully paid
      if (newInvoiceBalance <= 0.01) {
        if (onUpdateVehicle) {
          await onUpdateVehicle(vehicle.id, { status: 'Sold' });
        } else {
          await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'Sold' });
        }
      }

      firestoreCache.invalidate('customerPayments');
      firestoreCache.invalidate('paymentAllocations');
      firestoreCache.invalidate('proformaInvoices');
      firestoreCache.invalidate('vehicles');

      triggerToast(`TT Allocation of ${invoiceCurrency} ${typedInvoiceAllocAmount.toLocaleString()} saved successfully!`, "success");
      
      setShowAllocateModal(false);
      setSelectedTT(null);
      setAllocateAmountInVehicleCurrency('');
      fetchData();
    } catch (err) {
      console.error("Failed saving allocation:", err);
      triggerToast("Failed to save TT payment allocation.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Invoice Total</span>
            <span className="text-lg font-black text-neutral-900 font-mono">
              {invoiceCurrency} {invoiceTotal.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 bg-neutral-100 text-neutral-700 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Paid Allocated</span>
            <span className="text-lg font-black text-green-600 font-mono">
              {invoiceCurrency} {totalAllocatedVehicleAmount.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-lg font-black text-red-600 font-mono">
              {invoiceCurrency} {outstandingInvoiceBalance.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/60">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-600" />
            Invoice TT Payment Allocations
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Allocate approved customer TT wire deposits directly to this invoice.
          </p>
        </div>

        {outstandingInvoiceBalance > 0 ? (
          <button
            onClick={() => setShowAllocateModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-red-600/15 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Allocate TT</span>
          </button>
        ) : (
          <div className="bg-green-100 border border-green-300 text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Invoice Fully Paid</span>
          </div>
        )}
      </div>

      {/* Invoice Payment Allocation History Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200/60 bg-neutral-50/50 flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
            Payment History Journal ({allocations.length})
          </h4>
          <button
            onClick={fetchData}
            className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 flex items-center gap-1 uppercase tracking-wider"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold tracking-wider border-b border-neutral-200/60">
                <th className="py-3 px-4">TT Number</th>
                <th className="py-3 px-4">TT Currency</th>
                <th className="py-3 px-4 text-right">TT Amount Deducted</th>
                <th className="py-3 px-4 text-right">Vehicle Currency</th>
                <th className="py-3 px-4 text-right">Vehicle Amount Allocated</th>
                <th className="py-3 px-4 text-center">Exchange Rate Used</th>
                <th className="py-3 px-4">Allocation Date</th>
                <th className="py-3 px-4">Allocated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11.5px] text-neutral-700 bg-white">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-400 font-medium">
                    No TT allocations linked to this invoice yet. Click "Allocate TT" above to apply customer wire credits.
                  </td>
                </tr>
              ) : (
                allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">{alloc.ttNumber}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">{alloc.ttCurrency}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                      {alloc.ttCurrency} {alloc.ttAmountDeducted?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-600">{alloc.vehicleCurrency}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-green-600">
                      {alloc.vehicleCurrency} {alloc.vehicleAmount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[10px] text-neutral-500">
                      1 {alloc.vehicleCurrency} = {alloc.exchangeRateUsed} {alloc.ttCurrency}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500">{alloc.allocationDate}</td>
                    <td className="py-3 px-4 text-[11px] text-neutral-600">{alloc.allocatedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate TT Popup Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-neutral-200 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAllocateModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                ALLOCATE TT WIRE TO INVOICE
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Select Approved TT & Enter Allocation
              </h3>
              <p className="text-xs text-neutral-500">
                Invoice Outstanding: <strong className="text-red-600 font-mono">{invoiceCurrency} {outstandingInvoiceBalance.toLocaleString()}</strong>
              </p>
            </div>

            {/* Step 1: Select Approved TT */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                1. Select Customer Approved TT Remittance *
              </label>

              {approvedTTs.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                  <p className="font-bold">No Approved Customer TT Available with Remaining Balance.</p>
                  <p className="text-[11px] text-amber-700">
                    Ensure the customer has uploaded a TT and Finance has approved it in the Finance Audit Desk before allocation.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-xs">
                  {approvedTTs.map((tt) => {
                    const isSelected = selectedTT?.id === tt.id;
                    const remBal = tt.remainingBalance !== undefined ? tt.remainingBalance : tt.amount;
                    const curr = tt.currency || 'USD';

                    return (
                      <div
                        key={tt.id}
                        onClick={() => setSelectedTT(tt)}
                        className={`p-3 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected ? 'bg-red-50/70 border-l-4 border-red-600' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-neutral-900 flex items-center gap-2">
                            <span>TT #{tt.ttNumber || tt.reference || tt.paymentId}</span>
                            <span className="text-[10px] font-normal text-neutral-500">({tt.bank})</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            TT Date: {tt.paymentDate} | Orig Amount: {curr} {tt.amount.toLocaleString()}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-[9px] font-bold text-neutral-400 uppercase">Remaining Balance</span>
                          <span className="block font-mono font-bold text-green-600 text-sm">
                            {curr} {remBal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Allocation Inputs & Live Rate Calculation */}
            {selectedTT && (
              <form onSubmit={handleSaveAllocation} className="space-y-4 pt-2 border-t border-neutral-200">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-1">
                        Amount to Allocate in Invoice Currency ({invoiceCurrency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={allocateAmountInVehicleCurrency}
                        onChange={(e) => setAllocateAmountInVehicleCurrency(e.target.value)}
                        placeholder={`e.g. 300000 ${invoiceCurrency}`}
                        className="w-full border border-neutral-300 rounded-lg p-2.5 font-mono text-sm font-bold text-neutral-900 focus:outline-none focus:border-red-500 bg-white"
                      />
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Max allowed: {invoiceCurrency} {outstandingInvoiceBalance.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-1">
                        Applied Exchange Rate (Read Only)
                      </label>
                      <div className="p-2.5 bg-neutral-200/60 border border-neutral-300 rounded-lg font-mono text-xs font-bold text-neutral-800">
                        1 {invoiceCurrency} = {currentRate} {selectedTTCurrency}
                      </div>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Retrieved from Finance Exchange Rate Master
                      </span>
                    </div>
                  </div>

                  {/* Live Calculation Display */}
                  <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-neutral-600">
                      <span>Invoice Allocation:</span>
                      <span className="font-bold text-neutral-900">{invoiceCurrency} {typedInvoiceAllocAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>TT Currency Deduction:</span>
                      <span className="font-bold text-red-600">{selectedTTCurrency} {calculatedTTDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>TT Remaining Before:</span>
                      <span>{selectedTTCurrency} {selectedTTRemainingBefore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-neutral-800 font-bold border-t border-neutral-100 pt-1">
                      <span>TT Remaining After:</span>
                      <span className={selectedTTRemainingAfter < 0 ? 'text-red-600 font-black' : 'text-green-600 font-black'}>
                        {selectedTTCurrency} {selectedTTRemainingAfter.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Validation Warnings */}
                  {isAllocAmountExceedsInvoice && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Allocation amount exceeds Outstanding Invoice Balance ({invoiceCurrency} {outstandingInvoiceBalance.toLocaleString()}).</span>
                    </div>
                  )}

                  {isTTDeductionExceedsTTBalance && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>TT Deduction ({selectedTTCurrency} {calculatedTTDeduction.toLocaleString()}) exceeds TT Remaining Balance ({selectedTTCurrency} {selectedTTRemainingBefore.toLocaleString()}).</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !isAllocationFormValid}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs shadow-md shadow-red-600/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Confirm TT Allocation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {activePreviewUrl && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-3xl w-full p-4 space-y-3 relative text-white">
            <button
              onClick={() => setActivePreviewUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-neutral-950 text-neutral-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-mono font-bold text-sm uppercase">{activePreviewTitle}</h4>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-neutral-950 rounded-lg p-2">
              <img src={activePreviewUrl} alt="TT Proof" className="max-w-full max-h-[60vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
