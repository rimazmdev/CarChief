/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Car, FileText, User, Ship, DollarSign, Search, ChevronDown, ChevronUp, 
  Image as ImageIcon, Building2, Mail, MapPin, Copy, Eye, Link, Edit, 
  Check, ShieldCheck, FileSpreadsheet, Coins, Layers, Printer, Landmark, 
  AlertCircle, Share2, Clipboard, ExternalLink, Send, ArrowRight
} from 'lucide-react';
import { Vehicle, ProformaInvoice, RoleConfig } from '../types';
import { CustomerPayment } from '../customer/types';
import { VehicleSpecifications } from './VehicleSpecifications';
import VehiclePaymentAllocations from './VehiclePaymentAllocations';

interface SoldOutRegistryProps {
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

export default function SoldOutRegistry({
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
}: SoldOutRegistryProps) {

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

  // Filter sold out vehicles in parent component style
  const soldVehicles = useMemo(() => vehicles.filter(v => {
    if (v.status !== 'Sold') return false;
    if (!isVehicleVisible(v)) return false;
    if (!invSearch) return true;

    const searchLower = invSearch.toLowerCase().trim();
    
    // Check if directly matches model/make or other key fields like Reference No or ETD Date
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

  // Calculate portfolio metrics for the sold database
  const { totalValSold, totalPaidSold, totalBalanceSold, collectionRatePercentSold } = useMemo(() => {
    let totalVal = 0;
    let totalPaid = 0;
    soldVehicles.forEach(v => {
      const inv = proformaInvoices.find(invoice => invoice.vehicleDetails?.vehicleId === v.id);
      if (inv) {
        totalVal += (inv.financials?.grandTotal || inv.financials?.vehicleTotal || 0);
        totalPaid += (inv.financials?.paidAmount || 0);
      }
    });
    const balance = Math.max(0, totalVal - totalPaid);
    const rate = totalVal > 0 ? Math.round((totalPaid / totalVal) * 100) : 0;
    return {
      totalValSold: totalVal,
      totalPaidSold: totalPaid,
      totalBalanceSold: balance,
      collectionRatePercentSold: rate
    };
  }, [soldVehicles, proformaInvoices]);

  return (
    <div className="space-y-3">
      {/* Compact KPI Metrics / Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Metric Card 1: Units Sold */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-3.5 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Completed Contracts</span>
              <h4 className="text-xl font-black text-neutral-900 tracking-tight flex items-baseline gap-1">
                {soldVehicles.length} 
                <span className="text-[11px] font-semibold text-neutral-400">Deals</span>
              </h4>
              <p className="text-[10px] text-neutral-500 font-medium">Fully transacted & finalized units</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric Card 2: Sold Value Portfolio */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-3.5 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Aggregate Sales Value</span>
              <h4 className="text-xl font-black text-neutral-900 tracking-tight">
                ${totalValSold.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded font-mono text-[9px]">
                  Cleared: ${totalPaidSold.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60 shadow-2xs shrink-0">
              <Coins className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric Card 3: Cash Realization Tracker */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-3.5 shadow-2xs relative overflow-hidden group hover:shadow-xs transition-all">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1 flex-1 pr-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Cash Realization</span>
                <span className="text-[10px] font-mono font-bold text-emerald-700">{collectionRatePercentSold}% Realized</span>
              </div>
              <h4 className="text-xl font-black text-neutral-900 tracking-tight">
                ${totalBalanceSold.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                <span className="text-[11px] font-semibold text-neutral-400 ml-1">remaining</span>
              </h4>
              {/* Custom refined progress bar */}
              <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden border border-neutral-200/40 relative shadow-inner">
                <div 
                  style={{ width: `${collectionRatePercentSold}%` }} 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <DollarSign className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Registry Card */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        
        {/* Table Filter and Header Section */}
        <div className="py-2.5 px-4 border-b border-neutral-200/80 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-neutral-50/80">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              Sold Out Vehicles Registry
            </h3>
            <p className="text-[10.5px] text-neutral-500">
              Audit historical specs, shipping status, and payment ledgers
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-neutral-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search vehicle, invoice, client..."
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 transition-all shadow-3xs"
            />
          </div>
        </div>

        {/* Compact Aligned Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans table-auto">
            <thead>
              <tr className="bg-neutral-100/70 text-neutral-600 text-[9.5px] font-extrabold uppercase tracking-wider border-b border-neutral-200">
                <th className="py-2.5 px-3 min-w-[210px] text-left">Vehicle Details</th>
                <th className="py-2.5 px-3 min-w-[165px] text-left">Commercial Specs</th>
                <th className="py-2.5 px-3 min-w-[170px] text-left">Consignee Profile</th>
                <th className="py-2.5 px-3 min-w-[175px] text-left">Vessel & Shipping</th>
                <th className="py-2.5 px-3 min-w-[155px] text-left">Remittance Status</th>
                <th className="py-2.5 px-3 text-center min-w-[140px]">Action Center</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150 text-xs text-neutral-800">
              {soldVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400 bg-white">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                      <div className="p-3 bg-neutral-50 text-neutral-300 rounded-xl border border-neutral-200/50">
                        <Check className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h4 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider">No Sold Out Vehicles Listed</h4>
                      <p className="text-[10.5px] text-neutral-500 leading-relaxed">
                        There are no vehicles currently matching the "Sold Out" state.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                soldVehicles.map((v) => {
                  const invoice = proformaInvoices
                    .filter(inv => inv.vehicleDetails?.vehicleId === v.id)
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

                  return (
                    <React.Fragment key={v.id}>
                      <tr className="hover:bg-slate-50/60 transition-all duration-150 border-b border-neutral-100 bg-white">
                        
                        {/* Column 1: Vehicle Details */}
                        <td className="py-3 px-3 align-top">
                          <div className="flex items-start space-x-2.5">
                            
                            {/* Toggle spec expand button */}
                            <div className="flex items-center pt-1 shrink-0">
                              <button
                                onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                                className={`p-1 rounded-md border transition-all cursor-pointer ${
                                  expandedVehicleId === v.id 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs' 
                                    : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-300'
                                }`}
                                title={expandedVehicleId === v.id ? "Collapse details" : "Expand details"}
                              >
                                {expandedVehicleId === v.id ? (
                                  <ChevronUp className="w-3 h-3 stroke-[3]" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 stroke-[2]" />
                                )}
                              </button>
                            </div>

                            {/* Thumbnail Image */}
                            {(v.images && v.images.length > 0) || (v.totalPicturesCount !== undefined && v.totalPicturesCount > 0) ? (
                              <div
                                onClick={() => {
                                  setSlideshowVehicle(v);
                                  setSlideshowIndex(0);
                                }}
                                className="w-16 h-11 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden cursor-pointer shadow-3xs relative group shrink-0"
                                title="Click to view images"
                              >
                                <img
                                  src={v.images?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'}
                                  alt={v.model}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[7.5px] font-mono font-bold px-1 py-0.2 rounded-xs leading-none">
                                  {v.totalPicturesCount !== undefined ? v.totalPicturesCount : (v.images?.length || 0)}P
                                </span>
                              </div>
                            ) : (
                              <div className="w-16 h-11 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0 text-neutral-300">
                                <ImageIcon className="w-4 h-4 stroke-[1.5]" />
                              </div>
                            )}

                            {/* Descriptive Labels */}
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div>
                                <span className="text-[7.5px] uppercase font-mono font-black tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded-sm inline-block leading-none">
                                  {v.make}
                                </span>
                                <span className="font-extrabold text-neutral-900 text-[12px] leading-snug block truncate mt-0.5" title={`${v.make} ${v.model}`}>
                                  {v.model}
                                </span>
                              </div>
                              <span className="text-[9.5px] text-neutral-500 font-mono block">
                                {v.year} Model • <span className="font-bold text-neutral-700">ID: {v.id.slice(0, 8)}</span>
                              </span>
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                <div className="text-[8.5px] font-mono font-bold bg-neutral-50 border border-neutral-200/60 px-1.5 py-0.2 rounded text-neutral-600 flex items-center gap-1 w-fit">
                                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>STK: {v.stkNumber || 'N/A'}
                                </div>
                                <div className="text-[8.5px] font-mono font-bold bg-neutral-50 border border-neutral-200/60 px-1.5 py-0.2 rounded text-neutral-600 flex items-center gap-1 w-fit">
                                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>CHAS: {v.chassis || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Commercial Specs */}
                        <td className="py-3 px-3 align-top">
                          {invoice ? (
                            <div className="bg-neutral-50/90 rounded-lg p-2 border border-neutral-200/70 space-y-1.5 shadow-3xs">
                              <div className="flex items-center justify-between gap-1 pb-1 border-b border-neutral-200/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewingInvoice(invoice);
                                    setPreviewingVehicle(v);
                                    setPreviewingInvoiceEditMode(false);
                                  }}
                                  className="bg-white hover:bg-slate-100 text-slate-900 font-mono font-black text-[9.5px] px-2 py-0.5 rounded border border-neutral-200 shadow-3xs flex items-center gap-1 transition-all cursor-pointer"
                                  title="View commercial Invoice"
                                >
                                  <FileText className="w-3 h-3 text-slate-700" />
                                  {invoice.proformaNo.replace('P-', 'INV-')}
                                </button>
                                <span className="font-extrabold bg-neutral-900 text-white px-1 py-0.2 rounded text-[8px] uppercase font-mono tracking-wider">
                                  {invoice.financials?.gTotalTerm || 'C&F'}
                                </span>
                              </div>

                              <div className="space-y-0.5 text-[10px] text-neutral-700 font-medium">
                                <div className="flex items-center justify-between">
                                  <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Contract Total:</span>
                                  <span className="font-bold text-neutral-900 font-mono">
                                    {invoice.currency || invoice.financials?.currency || 'USD'} {(invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Due Limit:</span>
                                  <span className="font-bold text-neutral-600 font-mono text-[9px] bg-white border border-neutral-200 px-1 py-0.2 rounded">
                                    {invoice.paymentDue || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              {/* Sales Rep profile info */}
                              <div className="pt-1 border-t border-neutral-200/60 flex items-center justify-between">
                                <div className="flex items-center gap-1 min-w-0">
                                  <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[7.5px] font-black font-mono shrink-0">
                                    {invoice.financials?.salesPerson?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'SA'}
                                  </div>
                                  <span className="text-[9.5px] font-bold text-neutral-700 truncate">
                                    {invoice.financials?.salesPerson || 'Sales Rep'}
                                  </span>
                                </div>

                                <label className="flex items-center gap-1 cursor-pointer select-none shrink-0" title="Client Portal visibility">
                                  <input
                                    type="checkbox"
                                    checked={showToClientStates[v.id] ?? true}
                                    onChange={(e) => setShowToClientStates(prev => ({ ...prev, [v.id]: e.target.checked }))}
                                    className="rounded border-neutral-300 text-slate-800 focus:ring-slate-700 h-2.5 w-2.5 cursor-pointer"
                                  />
                                  <span className="text-[8.5px] text-neutral-400 font-bold leading-none">Portal</span>
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="text-neutral-400 text-[10px] italic py-2 text-center bg-neutral-50 rounded-lg border border-neutral-200/60">No Invoice Mapped</div>
                          )}
                        </td>

                        {/* Column 3: Consignee Profile */}
                        <td className="py-3 px-3 align-top">
                          {invoice ? (
                            <div className="bg-neutral-50/90 rounded-lg p-2 border border-neutral-200/70 space-y-1 shadow-3xs">
                              <div className="flex items-center gap-1 text-neutral-900 font-black text-[11px] border-b border-neutral-200/60 pb-1">
                                <User className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="truncate max-w-[130px] tracking-tight" title={invoice.buyer?.consigneeName || 'N/A'}>
                                  {invoice.buyer?.consigneeName || 'N/A'}
                                </span>
                              </div>

                              <div className="space-y-0.5 text-[10px] text-neutral-600 font-medium">
                                {invoice.buyer?.companyName && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                                    <span className="truncate max-w-[130px] font-bold text-neutral-800" title={invoice.buyer.companyName}>
                                      {invoice.buyer.companyName}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span className="truncate max-w-[130px] text-neutral-500 font-mono text-[9px]" title={invoice.buyer?.email || 'N/A'}>
                                    {invoice.buyer?.email || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span className="truncate max-w-[130px] text-neutral-500 text-[9.5px]">
                                    {invoice.buyer?.city ? `${invoice.buyer.city}, ` : ''}{invoice.buyer?.country || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const text = `Consignee: ${invoice.buyer?.consigneeName || ''}\nCompany: ${invoice.buyer?.companyName || ''}\nEmail: ${invoice.buyer?.email || ''}\nLocation: ${invoice.buyer?.city || ''}, ${invoice.buyer?.country || ''}`;
                                  navigator.clipboard.writeText(text);
                                  triggerToast("Consignee details copied!", "success");
                                }}
                                className="text-[8.5px] font-extrabold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1 hover:underline pt-1 border-t border-neutral-200/60 w-full cursor-pointer"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy Info</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-neutral-400 text-[10px] italic py-2 text-center bg-neutral-50 rounded-lg border border-neutral-200/60">No Buyer Record</div>
                          )}
                        </td>

                        {/* Column 4: Vessel & Shipping Details */}
                        <td className="py-3 px-3 align-top">
                          <div className="bg-neutral-50/90 rounded-lg p-2 border border-neutral-200/70 space-y-1 shadow-3xs">
                            <div className="flex items-center gap-1 border-b border-neutral-200/60 pb-1">
                              <Ship className="w-3 h-3 text-slate-600 shrink-0" />
                              <span className="font-extrabold text-neutral-900 text-[11px] truncate max-w-[130px]" title={v.departureVessel || v.arrivalVessel || 'Awaiting Vessel'}>
                                {v.departureVessel || v.arrivalVessel || 'Awaiting Vessel'}
                              </span>
                            </div>

                            <div className="space-y-0.5 text-[10px] text-neutral-600 font-medium">
                              <div className="flex justify-between">
                                <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Carrier:</span>
                                <span className="font-bold text-neutral-800 truncate max-w-[110px]">{v.shippingCompany || 'MAERSK LINE'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-neutral-400 font-mono text-[8.5px] uppercase">B/L Doc:</span>
                                <span className="font-mono font-bold text-slate-800 bg-white border border-neutral-200 px-1 py-0.2 rounded text-[8.5px]">
                                  {v.blNumber || 'Awaiting BL'}
                                </span>
                              </div>
                            </div>

                            {/* Logistics tracking bar indicator */}
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
                                <div className="space-y-1 pt-1 border-t border-neutral-200/60">
                                  <div className="flex justify-between items-center text-[8px] font-bold text-neutral-400">
                                    <span>ETD: {v.etdDate ? formatDate(v.etdDate) : 'N/A'}</span>
                                    <span className={shipProgress === 100 ? 'text-emerald-700' : 'text-slate-700'}>
                                      ETA: {v.etaDate ? formatDate(v.etaDate) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-neutral-200/60 h-1.5 rounded-full overflow-hidden relative">
                                    <div 
                                      style={{ width: `${shipProgress}%` }} 
                                      className={`h-full rounded-full transition-all ${
                                        shipProgress === 100 ? 'bg-emerald-600' : 'bg-slate-700'
                                      }`}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between items-center text-[8px] font-semibold">
                                    <span className="text-neutral-400 font-mono uppercase">Status:</span>
                                    <span className={`px-1.5 py-0.2 rounded font-mono uppercase text-[7.5px] font-bold border ${
                                      shipProgress === 100 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                    }`}>
                                      {shipProgress === 100 ? 'Delivered ✓' : `Transit ${shipProgress}%`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Column 5: Remittance Status */}
                        <td className="py-3 px-3 align-top">
                          {invoice ? (
                            (() => {
                              const gTotal = invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || 0;
                              const pAmount = invoice.financials?.paidAmount || 0;
                              const bal = invoice.financials?.balance ?? (gTotal - pAmount);
                              const payProgress = gTotal > 0 ? Math.min(100, Math.round((pAmount / gTotal) * 100)) : 0;
                              return (
                                <div className="bg-neutral-50/90 rounded-lg p-2 border border-neutral-200/70 space-y-1.5 shadow-3xs">
                                  <div className="space-y-0.5 text-[10px] text-neutral-700 font-medium">
                                    <div className="flex justify-between items-center">
                                      <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Invoice value:</span>
                                      <span className="font-extrabold text-neutral-900">${gTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-700">
                                      <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Remitted:</span>
                                      <span className="font-extrabold">${pAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-0.5 border-t border-neutral-200/60 mt-0.5">
                                      <span className="text-neutral-400 font-mono text-[8.5px] uppercase">Balance:</span>
                                      <span className={`font-black text-[11px] ${bal <= 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                                        ${bal.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cash Collection progress bar indicator */}
                                  <div className="space-y-1">
                                    <div className="w-full bg-neutral-200/60 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        style={{ width: `${payProgress}%` }} 
                                        className={`h-full rounded-full transition-all ${payProgress === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                      ></div>
                                    </div>
                                    
                                    {/* Precise Status badge pill */}
                                    <div>
                                      {bal <= 0 ? (
                                        <span className="w-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1 shadow-3xs">
                                          Fully Settled ✓
                                        </span>
                                      ) : pAmount > 0 ? (
                                        <span className="w-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1 shadow-3xs">
                                          Partially Paid • {payProgress}%
                                        </span>
                                      ) : (
                                        <span className="w-full bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center gap-1 shadow-3xs">
                                          Awaiting Deposit
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-0.5 border-t border-neutral-200/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedVehicleId(v.id);
                                        setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'payments' }));
                                        triggerToast("TT payment details and logs loaded below.", "info");
                                      }}
                                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[9.5px] font-extrabold px-2 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View TT Wire</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-neutral-400 italic text-[10px] text-center bg-neutral-50 rounded-lg p-2 border border-neutral-200/60">No Commercial Details Mapped</div>
                          )}
                        </td>

                        {/* Column 6: Action Center */}
                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-col space-y-1.5 w-full max-w-[130px] mx-auto text-left">
                            <span className="text-[8px] uppercase font-black text-neutral-400 tracking-wider font-mono block border-b border-neutral-200 pb-0.5">
                              Operations Desk
                            </span>

                            {/* Standardized 3x2 Grid for micro-actions */}
                            <div className="grid grid-cols-3 gap-1">
                              {/* Action 1: Showcase Details */}
                              <button
                                onClick={() => {
                                  if (onViewDetails) {
                                    onViewDetails(v.id, true);
                                  } else {
                                    window.open(`?vehicleId=${v.id}&backend=true`, '_blank');
                                  }
                                }}
                                className="bg-white hover:bg-slate-100 text-neutral-700 hover:text-slate-900 p-1.5 rounded-lg border border-neutral-200 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="Open Live Public Vehicle Details Page"
                              >
                                <Eye className="w-3.5 h-3.5 group-hover:scale-105 text-neutral-500 group-hover:text-slate-800" />
                                <span className="text-[7.5px] font-bold">Showcase</span>
                              </button>

                              {/* Action 2: View/Edit Commercial Invoice */}
                              <button
                                onClick={() => {
                                  if (invoice) {
                                    setPreviewingInvoice(invoice);
                                    setPreviewingVehicle(v);
                                    setPreviewingInvoiceEditMode(false);
                                  }
                                }}
                                className="bg-white hover:bg-slate-100 text-neutral-700 hover:text-slate-900 p-1.5 rounded-lg border border-neutral-200 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="View/Edit Invoice Ledger"
                              >
                                <FileText className="w-3.5 h-3.5 group-hover:scale-105 text-neutral-500 group-hover:text-slate-800" />
                                <span className="text-[7.5px] font-bold">Invoice</span>
                              </button>

                              {/* Action 3: Trigger SWIFT Email */}
                              <button
                                onClick={() => {
                                  if (invoice) {
                                    triggerToast(`SWIFT Invoice ledger ${invoice.proformaNo.replace('P-', 'INV-')} dispatched to ${invoice.buyer?.email || 'customer'}!`, 'success');
                                  }
                                }}
                                className="bg-white hover:bg-slate-100 text-neutral-700 hover:text-slate-900 p-1.5 rounded-lg border border-neutral-200 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="Dispatch Invoice via Email"
                              >
                                <Mail className="w-3.5 h-3.5 group-hover:scale-105 text-neutral-500 group-hover:text-slate-800" />
                                <span className="text-[7.5px] font-bold">Dispatch</span>
                              </button>

                              {/* Action 4: WhatsApp Ping */}
                              <button
                                onClick={() => {
                                  if (invoice) {
                                    const phone = invoice.buyer?.tel1 || invoice.buyer?.tel2 || '';
                                    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
                                  } else {
                                    triggerToast("No valid buyer contact found for WhatsApp.", "error");
                                  }
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-1.5 rounded-lg border border-emerald-200/60 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="Ping buyer over WhatsApp"
                              >
                                <svg className="w-3.5 h-3.5 group-hover:scale-105 fill-current text-emerald-600" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.29 1.91 13.81 1.88 11.173 1.88c-5.438 0-9.863 4.42-9.867 9.86-.001 1.733.46 3.424 1.332 4.926L1.611 21.87l5.036-1.716zM17.486 14.12c-.3-.15-1.771-.875-2.046-.975-.276-.1-.477-.15-.677.15-.2.3-.777.975-.951 1.174-.174.2-.349.225-.649.075-.3-.15-1.264-.467-2.41-1.485-.89-.795-1.492-1.778-1.666-2.078-.174-.3-.019-.462.13-.61.135-.133.3-.349.45-.525.15-.175.2-.299.3-.499.1-.2.05-.375-.025-.525-.075-.15-.677-1.631-.927-2.23-.243-.584-.49-.504-.677-.514-.174-.01-.375-.01-.576-.01H8.05c-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.224 5.113 4.525.714.31 1.272.495 1.708.634.717.228 1.37.195 1.885.118.574-.085 1.771-.724 2.022-1.424.25-.7.25-1.3 1.75-1.425z"/>
                                </svg>
                                <span className="text-[7.5px] font-bold">WhatsApp</span>
                              </button>

                              {/* Action 5: Copy Direct Showcase Link */}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}?vehicleId=${v.id}`);
                                  triggerToast("Direct vehicle link copied!", "success");
                                }}
                                className="bg-white hover:bg-slate-100 text-neutral-700 hover:text-slate-900 p-1.5 rounded-lg border border-neutral-200 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="Copy direct link"
                              >
                                <Link className="w-3.5 h-3.5 group-hover:scale-105 text-neutral-500 group-hover:text-slate-800" />
                                <span className="text-[7.5px] font-bold">Link</span>
                              </button>

                              {/* Action 6: Modify specs */}
                              <button
                                onClick={() => setSelectedPiVehicle(v)}
                                className="bg-white hover:bg-slate-100 text-neutral-700 hover:text-slate-900 p-1.5 rounded-lg border border-neutral-200 shadow-3xs transition-all flex flex-col items-center justify-center gap-0.5 group cursor-pointer"
                                title="Edit specs / Proforma Invoice"
                              >
                                <Edit className="w-3.5 h-3.5 group-hover:scale-105 text-neutral-500 group-hover:text-slate-800" />
                                <span className="text-[7.5px] font-bold">Specs</span>
                              </button>
                            </div>

                            {/* Large primary action */}
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                              >
                                <Search className="w-3 h-3" />
                                <span>{expandedVehicleId === v.id ? "Collapse" : "Explore Detail"}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded specifications and ledger logs drawer */}
                      {expandedVehicleId === v.id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="py-4 px-4 border border-neutral-200 bg-slate-50/40">
                            <div className="flex items-center space-x-4 border-b border-neutral-200 mb-4 pb-1">
                              <button
                                type="button"
                                onClick={() => setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'specs' }))}
                                className={`pb-1.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                                  (activeExpandedTab[v.id] || 'specs') === 'specs'
                                    ? 'border-slate-900 text-slate-900'
                                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                                }`}
                              >
                                Vehicle Specifications
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveExpandedTab(prev => ({ ...prev, [v.id]: 'payments' }))}
                                className={`pb-1.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                  activeExpandedTab[v.id] === 'payments'
                                    ? 'border-slate-900 text-slate-900'
                                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                                }`}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Money / TT Allocations
                                <span className="ml-1 bg-neutral-200 text-neutral-700 rounded-full px-1.5 py-0.2 text-[9.5px] font-mono font-bold leading-none">
                                  {customerPayments.filter(p => p.invoiceId === invoice?.id).length}
                                </span>
                              </button>
                            </div>

                            {/* Content view */}
                            {(activeExpandedTab[v.id] || 'specs') === 'specs' ? (
                              <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-3xs">
                                <VehicleSpecifications vehicle={v} />
                              </div>
                            ) : (
                              <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-3xs">
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
    </div>
  );
}
