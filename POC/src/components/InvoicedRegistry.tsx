/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  FileText, User, Ship, DollarSign, Search, ChevronDown, ChevronUp, 
  Image as ImageIcon, Building2, Mail, MapPin, Eye, Link, Edit, 
  Check, FileSpreadsheet, Coins
} from 'lucide-react';
import { Vehicle, ProformaInvoice, RoleConfig } from '../types';
import { CustomerPayment } from '../customer/types';
import { VehicleSpecifications } from './VehicleSpecifications';
import VehiclePaymentAllocations from './VehiclePaymentAllocations';

interface InvoicedRegistryProps {
  vehicles: Vehicle[];
  proformaInvoices: ProformaInvoice[];
  customerPayments: CustomerPayment[];
  invSearch: string;
  setInvSearch: (val: string) => void;
  expandedVehicleId: string | null;
  setExpandedVehicleId: (val: string | null) => void;
  activeExpandedTab: Record<string, 'specs' | 'payments'>;
  setActiveExpandedTab: React.Dispatch<React.SetStateAction<Record<string, 'specs' | 'payments'>>>;
  setPreviewingInvoice: (inv: ProformaInvoice | null) => void;
  setPreviewingVehicle: (v: Vehicle | null) => void;
  setPreviewingInvoiceEditMode: (val: boolean) => void;
  setSlideshowVehicle: (v: Vehicle | null) => void;
  setSlideshowIndex: (idx: number) => void;
  showToClientStates: Record<string, boolean>;
  setShowToClientStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentRole: RoleConfig;
  onUpdateVehicle: (vehicleId: string, updatedData: Partial<Vehicle>) => Promise<void>;
  onViewDetails?: (vehicleId: string, isBackend: boolean) => void;
  setSelectedPiVehicle: (v: Vehicle | null) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  isVehicleVisible: (v: Vehicle) => boolean;
}

export default function InvoicedRegistry({
  vehicles,
  proformaInvoices,
  customerPayments,
  invSearch,
  setInvSearch,
  expandedVehicleId,
  setExpandedVehicleId,
  activeExpandedTab,
  setActiveExpandedTab,
  setPreviewingInvoice,
  setPreviewingVehicle,
  setPreviewingInvoiceEditMode,
  setSlideshowVehicle,
  setSlideshowIndex,
  showToClientStates,
  setShowToClientStates,
  currentRole,
  onUpdateVehicle,
  onViewDetails,
  setSelectedPiVehicle,
  triggerToast,
  isVehicleVisible
}: InvoicedRegistryProps) {

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const j = day % 10, k = day % 100;
      let suffix = "th";
      if (j === 1 && k !== 11) suffix = "st";
      else if (j === 2 && k !== 12) suffix = "nd";
      else if (j === 3 && k !== 13) suffix = "rd";
      return `${day}${suffix} ${month}, ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Filter invoiced vehicles
  const invoicedVehicles = useMemo(() => vehicles.filter(v => {
    if (v.status !== 'Invoice Created' && v.status !== 'Invoiced') return false;
    if (!isVehicleVisible(v)) return false;
    if (!invSearch) return true;

    const searchLower = invSearch.toLowerCase().trim();
    if (v.make.toLowerCase().includes(searchLower) || v.model.toLowerCase().includes(searchLower)) return true;
    if (v.stkNumber?.toLowerCase().includes(searchLower) || v.chassis?.toLowerCase().includes(searchLower)) return true;
    if (v.referenceNo?.toLowerCase().includes(searchLower) || v.etdDate?.toLowerCase().includes(searchLower)) return true;

    const matchingInvoice = proformaInvoices.find(inv => inv.vehicleDetails?.vehicleId === v.id);
    if (matchingInvoice) {
      const matchInvoiceNo = matchingInvoice.proformaNo.toLowerCase().includes(searchLower);
      const matchBuyerName = matchingInvoice.buyer?.consigneeName?.toLowerCase().includes(searchLower) || false;
      const matchBuyerCompany = matchingInvoice.buyer?.companyName?.toLowerCase().includes(searchLower) || false;
      const matchBuyerEmail = matchingInvoice.buyer?.email?.toLowerCase().includes(searchLower) || false;
      const matchSalesPerson = matchingInvoice.financials?.salesPerson?.toLowerCase().includes(searchLower) || false;
      const matchGTerm = matchingInvoice.financials?.gTotalTerm?.toLowerCase().includes(searchLower) || false;
      
      return matchInvoiceNo || matchBuyerName || matchBuyerCompany || matchBuyerEmail || matchSalesPerson || matchGTerm;
    }
    return false;
  }), [vehicles, isVehicleVisible, invSearch, proformaInvoices]);

  // Calculate portfolio metrics
  const { totalValInvoiced, totalPaidInvoiced, totalBalanceInvoiced, collectionRatePercent } = useMemo(() => {
    let totalVal = 0;
    let totalPaid = 0;
    invoicedVehicles.forEach(v => {
      const inv = proformaInvoices.find(invoice => invoice.vehicleDetails?.vehicleId === v.id);
      if (inv) {
        totalVal += (inv.financials?.grandTotal || inv.financials?.vehicleTotal || 0);
        totalPaid += (inv.financials?.paidAmount || 0);
      }
    });
    const balance = Math.max(0, totalVal - totalPaid);
    const rate = totalVal > 0 ? Math.round((totalPaid / totalVal) * 100) : 0;
    return {
      totalValInvoiced: totalVal,
      totalPaidInvoiced: totalPaid,
      totalBalanceInvoiced: balance,
      collectionRatePercent: rate
    };
  }, [invoicedVehicles, proformaInvoices]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] w-full bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden font-sans">
      
      {/* Sleek Compact Header Bar with Metrics & Search */}
      <div className="bg-gradient-to-r from-neutral-900 via-slate-900 to-indigo-950 text-white px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800">
        
        {/* Left: View Title & Unit Counter */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                Invoiced Vehicles Registry
              </h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {invoicedVehicles.length} {invoicedVehicles.length === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 hidden sm:block">
              Commercial invoice ledger database and active settlement tracker
            </p>
          </div>
        </div>

        {/* Center: Integrated Ultra-Compact KPI Metric Badges */}
        <div className="hidden lg:flex items-center gap-2 bg-neutral-950/60 p-1.5 rounded-xl border border-white/10 text-xs">
          {/* Secured Value */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
            <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="text-left">
              <span className="text-[8.5px] uppercase font-mono font-bold text-neutral-400 block leading-tight">Total Secured</span>
              <span className="text-xs font-black font-mono text-emerald-400">
                ${totalValInvoiced.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cleared / Remitted */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div className="text-left">
              <span className="text-[8.5px] uppercase font-mono font-bold text-neutral-400 block leading-tight">Paid Deposits</span>
              <span className="text-xs font-black font-mono text-blue-300">
                ${totalPaidInvoiced.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[8.5px] uppercase font-mono font-bold text-neutral-400 leading-tight">Ledger Balance</span>
                <span className="text-[8.5px] font-mono font-bold text-indigo-300 bg-indigo-500/20 px-1 py-0.2 rounded">
                  {collectionRatePercent}% Cleared
                </span>
              </div>
              <span className="text-xs font-black font-mono text-amber-300">
                ${totalBalanceInvoiced.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Integrated Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="absolute left-3 top-2.5 text-neutral-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search invoice, vehicle, client..."
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white/10 hover:bg-white/15 focus:bg-neutral-900 border border-white/15 focus:border-indigo-400 rounded-xl text-white placeholder-neutral-400 outline-none transition-all"
          />
        </div>

      </div>

      {/* Fully Aligned Single-Screen Scrollable Table Viewport */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 bg-neutral-50/30">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead className="sticky top-0 z-10 bg-neutral-100 text-neutral-600 text-[9.5px] font-extrabold uppercase tracking-widest border-b border-neutral-200/90 shadow-2xs">
            <tr>
              <th className="py-2.5 px-4 min-w-[260px] text-left">Vehicle Details</th>
              <th className="py-2.5 px-4 min-w-[190px] text-left">Invoice Specs</th>
              <th className="py-2.5 px-4 min-w-[200px] text-left">Buyer Record</th>
              <th className="py-2.5 px-4 min-w-[210px] text-left">Logistics & Shipping</th>
              <th className="py-2.5 px-4 min-w-[180px] text-left">Remittance Status</th>
              <th className="py-2.5 px-4 text-center min-w-[170px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150 text-neutral-800 bg-white">
            {invoicedVehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-neutral-400 bg-white">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    <div className="p-3 bg-neutral-100 text-neutral-400 rounded-2xl border border-neutral-200">
                      <Check className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <h4 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider">No Invoiced Records Found</h4>
                    <p className="text-[10.5px] text-neutral-500">
                      Convert active Proforma Invoices inside "Reserved with PI" tab to populate this commercial ledger.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              invoicedVehicles.map((v) => {
                const invoice = proformaInvoices
                  .filter(inv => inv.vehicleDetails?.vehicleId === v.id)
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

                return (
                  <React.Fragment key={v.id}>
                    <tr className="hover:bg-indigo-50/20 transition-colors border-b border-neutral-100">
                      
                      {/* Column 1: Vehicle Details */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-2.5">
                          {/* Toggle spec expand button */}
                          <button
                            onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 mt-0.5 ${
                              expandedVehicleId === v.id 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-300'
                            }`}
                            title={expandedVehicleId === v.id ? "Collapse specifications" : "Explore specifications"}
                          >
                            {expandedVehicleId === v.id ? (
                              <ChevronUp className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <ChevronDown className="w-3 h-3 stroke-[2]" />
                            )}
                          </button>

                          {/* Thumbnail Image */}
                          {(v.images && v.images.length > 0) || (v.totalPicturesCount !== undefined && v.totalPicturesCount > 0) ? (
                            <div
                              onClick={() => {
                                setSlideshowVehicle(v);
                                setSlideshowIndex(0);
                              }}
                              className="w-16 h-11 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden cursor-pointer shadow-2xs relative group shrink-0"
                              title="Click to launch gallery"
                            >
                              <img
                                src={v.images?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'}
                                alt={v.model}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[7.5px] font-mono font-bold px-1 py-0.2 rounded-xs">
                                {v.totalPicturesCount !== undefined ? v.totalPicturesCount : (v.images?.length || 0)}P
                              </span>
                            </div>
                          ) : (
                            <div className="w-16 h-11 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0 text-neutral-300">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}

                          {/* Descriptive Labels */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[8px] uppercase font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.2 rounded-xs">
                                {v.make}
                              </span>
                              <span className="font-black text-neutral-900 text-xs truncate" title={`${v.make} ${v.model}`}>
                                {v.model}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-neutral-500 font-mono block">
                              {v.year} Model • <span className="font-bold text-neutral-700">ID: {v.id.slice(0, 8)}</span>
                            </span>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              <span className="text-[8.5px] font-mono font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded">
                                STK: {v.stkNumber || 'N/A'}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded">
                                CHAS: {v.chassis || 'N/A'}
                              </span>
                              {v.referenceNo && (
                                <span className="text-[8.5px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">
                                  Ref: {v.referenceNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Invoice Specs */}
                      <td className="py-3 px-4 align-top">
                        {invoice ? (
                          <div className="bg-indigo-50/20 rounded-xl p-2.5 border border-indigo-100/60 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 pb-1 border-b border-indigo-100/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewingInvoice(invoice);
                                  setPreviewingVehicle(v);
                                  setPreviewingInvoiceEditMode(false);
                                }}
                                className="bg-white hover:bg-indigo-50 text-indigo-700 font-mono font-black text-[9.5px] px-2 py-0.5 rounded border border-indigo-200 hover:underline flex items-center gap-1 transition-all cursor-pointer"
                                title="View commercial invoice ledger"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                {invoice.proformaNo.replace('P-', 'INV-')}
                              </button>
                              <span className="font-extrabold bg-neutral-900 text-white px-1.5 py-0.2 rounded text-[8px] uppercase font-mono">
                                {invoice.financials?.gTotalTerm || 'C&F'}
                              </span>
                            </div>

                            <div className="space-y-0.5 text-[10.5px]">
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Total:</span>
                                <span className="font-bold text-neutral-900 font-mono">
                                  {invoice.currency || 'USD'} {(invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Due Limit:</span>
                                <span className="font-bold text-red-600 font-mono text-[9.5px]">
                                  {invoice.paymentDue || 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Sales Rep profile */}
                            <div className="pt-1 border-t border-indigo-100/60 flex items-center justify-between">
                              <span className="text-[9.5px] font-bold text-neutral-600 truncate max-w-[100px]" title={invoice.financials?.salesPerson}>
                                Rep: {invoice.financials?.salesPerson || 'Sales Rep'}
                              </span>
                              <label className="flex items-center gap-1 cursor-pointer select-none" title="Toggle visibility in Client Portal">
                                <input
                                  type="checkbox"
                                  checked={showToClientStates[v.id] ?? true}
                                  onChange={(e) => setShowToClientStates(prev => ({ ...prev, [v.id]: e.target.checked }))}
                                  className="rounded border-neutral-300 text-indigo-600 h-3 w-3 cursor-pointer"
                                />
                                <span className="text-[8.5px] text-neutral-500 font-bold">Portal</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="text-neutral-400 text-[10px] italic text-center p-2">No Invoice Mapped</div>
                        )}
                      </td>

                      {/* Column 3: Buyer Record */}
                      <td className="py-3 px-4 align-top">
                        {invoice ? (
                          <div className="bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-200/60 space-y-1">
                            <div className="flex items-center gap-1 text-neutral-900 font-extrabold text-[11px]">
                              <User className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]" title={invoice.buyer?.consigneeName || 'N/A'}>
                                {invoice.buyer?.consigneeName || 'N/A'}
                              </span>
                            </div>

                            <div className="space-y-0.5 text-[10px] text-neutral-600">
                              {invoice.buyer?.companyName && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span className="truncate max-w-[130px] font-bold" title={invoice.buyer.companyName}>
                                    {invoice.buyer.companyName}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                                <span className="truncate max-w-[130px] text-neutral-500 font-mono text-[9px]" title={invoice.buyer?.email}>
                                  {invoice.buyer?.email || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                                <span className="truncate max-w-[130px] text-neutral-500">
                                  {invoice.buyer?.city ? `${invoice.buyer.city}, ` : ''}{invoice.buyer?.country || 'N/A'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const text = `Consignee: ${invoice.buyer?.consigneeName || ''}\nCompany: ${invoice.buyer?.companyName || ''}\nEmail: ${invoice.buyer?.email || ''}\nLocation: ${invoice.buyer?.city || ''}, ${invoice.buyer?.country || ''}`;
                                navigator.clipboard.writeText(text);
                                triggerToast("Buyer details copied!", "success");
                              }}
                              className="text-[8.5px] font-extrabold text-indigo-600 hover:underline pt-1 border-t border-neutral-100 w-full text-center block cursor-pointer"
                            >
                              Copy Buyer Info
                            </button>
                          </div>
                        ) : (
                          <div className="text-neutral-400 text-[10px] italic text-center p-2">No Buyer Record</div>
                        )}
                      </td>

                      {/* Column 4: Shipping Details */}
                      <td className="py-3 px-4 align-top">
                        <div className="bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-200/60 space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Ship className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-extrabold text-neutral-900 text-[11px] truncate max-w-[130px]" title={v.departureVessel || v.arrivalVessel}>
                              {v.departureVessel || v.arrivalVessel || 'Awaiting Vessel'}
                            </span>
                          </div>

                          <div className="space-y-0.5 text-[10px] text-neutral-600">
                            <div className="flex justify-between">
                              <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Carrier:</span>
                              <span className="font-bold text-neutral-800 truncate max-w-[100px]">{v.shippingCompany || 'MAERSK'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-400 font-mono text-[8.5px] uppercase">B/L:</span>
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded text-[8.5px]">
                                {v.blNumber || 'Pending'}
                              </span>
                            </div>
                          </div>

                          {/* Shipping Progress */}
                          {(() => {
                            const getShippingProgress = () => {
                              if (!v.etdDate || !v.etaDate) return 40; 
                              const start = new Date(v.etdDate).getTime();
                              const end = new Date(v.etaDate).getTime();
                              const now = Date.now();
                              if (now <= start) return 5;
                              if (now >= end) return 100;
                              return Math.min(95, Math.max(10, Math.round(((now - start) / (end - start)) * 100)));
                            };
                            const shipProgress = getShippingProgress();
                            return (
                              <div className="space-y-1 pt-1 border-t border-neutral-100">
                                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${shipProgress}%` }} 
                                    className={`h-full rounded-full ${shipProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-bold">
                                  <span className="text-neutral-400 font-mono">ETD: {v.etdDate ? formatDate(v.etdDate) : 'Pending'}</span>
                                  <span className={shipProgress === 100 ? 'text-emerald-600' : 'text-indigo-600'}>
                                    {shipProgress === 100 ? 'Delivered ✓' : `${shipProgress}%`}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Column 5: Payment Status */}
                      <td className="py-3 px-4 align-top">
                        {invoice ? (
                          (() => {
                            const gTotal = invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || 0;
                            const pAmount = invoice.financials?.paidAmount || 0;
                            const bal = invoice.financials?.balance ?? (gTotal - pAmount);
                            const payProgress = gTotal > 0 ? Math.min(100, Math.round((pAmount / gTotal) * 100)) : 0;
                            return (
                              <div className="bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-200/60 space-y-1.5">
                                <div className="space-y-0.5 text-[10px] font-medium">
                                  <div className="flex justify-between items-center">
                                    <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Ledger:</span>
                                    <span className="font-extrabold text-neutral-900">${gTotal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-emerald-600">
                                    <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Remitted:</span>
                                    <span className="font-extrabold">${pAmount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-0.5 border-t border-neutral-100">
                                    <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Balance:</span>
                                    <span className={`font-black text-xs ${bal <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      ${bal.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-0.5">
                                  {bal <= 0 ? (
                                    <span className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1">
                                      Fully Settled ✓
                                    </span>
                                  ) : pAmount > 0 ? (
                                    <span className="w-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1">
                                      Partial • {payProgress}%
                                    </span>
                                  ) : (
                                    <span className="w-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1">
                                      Unpaid
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedVehicleId(v.id);
                                    setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'payments' }));
                                    triggerToast("TT payment allocation drawer opened below.", "info");
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-extrabold py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Allocate TT</span>
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-neutral-400 text-[10px] italic text-center p-2">No Details</div>
                        )}
                      </td>

                      {/* Column 6: Action Center */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col space-y-1.5 w-full max-w-[140px] mx-auto">
                          {/* 3x2 Action Grid */}
                          <div className="grid grid-cols-3 gap-1">
                            {/* Showcase */}
                            <button
                              onClick={() => {
                                if (onViewDetails) {
                                  onViewDetails(v.id, true);
                                } else {
                                  window.open(`?vehicleId=${v.id}&backend=true`, '_blank');
                                }
                              }}
                              className="bg-white hover:bg-indigo-50 text-neutral-700 hover:text-indigo-700 p-1.5 rounded-lg border border-neutral-200 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="Open Live Public Vehicle Details Page"
                            >
                              <Eye className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600" />
                              <span className="text-[7.5px] font-bold">Showcase</span>
                            </button>

                            {/* Invoice */}
                            <button
                              onClick={() => {
                                if (invoice) {
                                  setPreviewingInvoice(invoice);
                                  setPreviewingVehicle(v);
                                  setPreviewingInvoiceEditMode(false);
                                }
                              }}
                              className="bg-white hover:bg-indigo-50 text-neutral-700 hover:text-indigo-700 p-1.5 rounded-lg border border-neutral-200 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="View & Print Commercial Invoice"
                            >
                              <FileText className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600" />
                              <span className="text-[7.5px] font-bold">Invoice</span>
                            </button>

                            {/* Dispatch Email */}
                            <button
                              onClick={() => {
                                if (invoice) {
                                  triggerToast(`Invoice ${invoice.proformaNo.replace('P-', 'INV-')} dispatched to ${invoice.buyer?.email || 'customer'}!`, 'success');
                                }
                              }}
                              className="bg-white hover:bg-indigo-50 text-neutral-700 hover:text-indigo-700 p-1.5 rounded-lg border border-neutral-200 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="Dispatch Email Notification"
                            >
                              <Mail className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600" />
                              <span className="text-[7.5px] font-bold">Dispatch</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                              onClick={() => {
                                if (invoice) {
                                  const phone = invoice.buyer?.tel1 || invoice.buyer?.tel2 || '';
                                  window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
                                } else {
                                  triggerToast("No buyer phone number found for WhatsApp.", "error");
                                }
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200/60 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="Ping buyer on WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5 fill-current text-emerald-600" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.29 1.91 13.81 1.88 11.173 1.88c-5.438 0-9.863 4.42-9.867 9.86-.001 1.733.46 3.424 1.332 4.926L1.611 21.87l5.036-1.716zM17.486 14.12c-.3-.15-1.771-.875-2.046-.975-.276-.1-.477-.15-.677.15-.2.3-.777.975-.951 1.174-.174.2-.349.225-.649.075-.3-.15-1.264-.467-2.41-1.485-.89-.795-1.492-1.778-1.666-2.078-.174-.3-.019-.462.13-.61.135-.133.3-.349.45-.525.15-.175.2-.299.3-.499.1-.2.05-.375-.025-.525-.075-.15-.677-1.631-.927-2.23-.243-.584-.49-.504-.677-.514-.174-.01-.375-.01-.576-.01H8.05c-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.224 5.113 4.525.714.31 1.272.495 1.708.634.717.228 1.37.195 1.885.118.574-.085 1.771-.724 2.022-1.424.25-.7.25-1.3 1.75-1.425z"/>
                              </svg>
                              <span className="text-[7.5px] font-bold">WhatsApp</span>
                            </button>

                            {/* Link */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}?vehicleId=${v.id}`);
                                triggerToast("Direct vehicle link copied!", "success");
                              }}
                              className="bg-white hover:bg-indigo-50 text-neutral-700 hover:text-indigo-700 p-1.5 rounded-lg border border-neutral-200 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="Copy Direct Link"
                            >
                              <Link className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600" />
                              <span className="text-[7.5px] font-bold">Link</span>
                            </button>

                            {/* Specs */}
                            <button
                              onClick={() => setSelectedPiVehicle(v)}
                              className="bg-white hover:bg-indigo-50 text-neutral-700 hover:text-indigo-700 p-1.5 rounded-lg border border-neutral-200 transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                              title="Edit Specs / Proforma Invoice"
                            >
                              <Edit className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-600" />
                              <span className="text-[7.5px] font-bold">Specs</span>
                            </button>
                          </div>

                          {/* Primary Detail Drawer Toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                            className="w-full bg-neutral-900 hover:bg-indigo-600 text-white font-extrabold text-[9px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Search className="w-3 h-3" />
                            <span>{expandedVehicleId === v.id ? "Close Specs" : "Explore Detail"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Drawer Container */}
                    {expandedVehicleId === v.id && (
                      <tr className="bg-neutral-50/80">
                        <td colSpan={6} className="py-4 px-6 border-b border-neutral-200 bg-neutral-50/50">
                          <div className="flex items-center space-x-6 border-b border-neutral-200 mb-4 pb-2">
                            <button
                              type="button"
                              onClick={() => setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'specs' }))}
                              className={`pb-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                                (activeExpandedTab[v.id] || 'specs') === 'specs'
                                  ? 'border-indigo-600 text-indigo-600'
                                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
                              }`}
                            >
                              Vehicle Specifications
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'payments' }))}
                              className={`pb-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeExpandedTab[v.id] === 'payments'
                                  ? 'border-indigo-600 text-indigo-600'
                                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
                              }`}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Money / TT Allocations
                              <span className="ml-1 bg-neutral-200 text-neutral-700 rounded-full px-2 py-0.2 text-[9.5px] font-mono font-bold">
                                {customerPayments.filter(p => p.invoiceId === invoice?.id).length}
                              </span>
                            </button>
                          </div>

                          {(activeExpandedTab[v.id] || 'specs') === 'specs' ? (
                            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                              <VehicleSpecifications vehicle={v} />
                            </div>
                          ) : (
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs">
                              <VehiclePaymentAllocations 
                                vehicle={v} 
                                invoice={invoice} 
                                payments={customerPayments.filter(p => p.invoiceId === invoice?.id)} 
                                triggerToast={triggerToast}
                                currentRole={currentRole}
                                onUpdateVehicle={onUpdateVehicle}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
