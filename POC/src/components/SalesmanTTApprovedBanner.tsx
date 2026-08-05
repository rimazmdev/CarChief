import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  XCircle,
  Landmark, 
  Paperclip, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Coins, 
  ArrowRight,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { CustomerPayment, Customer } from '../customer/types';

export function getRelevantApprovedTTs(
  customerPayments: CustomerPayment[],
  customers: Customer[],
  currentUserEmail?: string,
  currentUserName?: string,
  currentUserId?: string,
  dismissedIds: string[] = []
): CustomerPayment[] {
  const email = currentUserEmail?.toLowerCase().trim() || '';
  const name = currentUserName?.toLowerCase().trim() || '';
  const uid = currentUserId || '';

  const assignedCustomerMap = new Map<string, Customer>();
  customers.forEach(c => {
    let isAssigned = false;
    if (uid && c.assignedSalesPersonId === uid) isAssigned = true;
    if (name && c.assignedSalesPersonName && c.assignedSalesPersonName.toLowerCase().trim() === name) isAssigned = true;
    if (email && c.assignedSalesPersonName && c.assignedSalesPersonName.toLowerCase().trim().includes(email)) isAssigned = true;

    if (isAssigned) {
      assignedCustomerMap.set(c.id, c);
      if (c.customerId) assignedCustomerMap.set(c.customerId, c);
    }
  });

  const isSuperAdmin = email === 'charith3ny@gmail.com' || name.includes('admin') || !email;

  return customerPayments.filter(p => {
    if (p.status !== 'Approved' && p.status !== 'Rejected') return false;
    if (dismissedIds.includes(p.id) || dismissedIds.includes(p.paymentId)) return false;

    if (p.status === 'Approved') {
      // Must have remaining unallocated credit > 0
      const remBal = p.remainingBalance !== undefined ? Number(p.remainingBalance) : Number(p.amount || 0);
      if (remBal <= 0) return false;
    }

    const isBySalesman = 
      Boolean(p.allocatedBySalesman) ||
      (Boolean(p.createdBySalesmanName) && p.createdBySalesmanName!.toLowerCase().includes(name)) ||
      (Boolean((p as any).createdBySalesmanEmail) && (p as any).createdBySalesmanEmail.toLowerCase() === email) ||
      (Boolean((p as any).salesmanEmail) && (p as any).salesmanEmail.toLowerCase() === email) ||
      (Boolean((p as any).salesmanName) && (p as any).salesmanName.toLowerCase().includes(name));

    const isForAssignedCustomer = p.customerId ? assignedCustomerMap.has(p.customerId) : false;

    return isBySalesman || isForAssignedCustomer || isSuperAdmin;
  });
}

interface SalesmanTTApprovedBannerProps {
  customerPayments: CustomerPayment[];
  customers: Customer[];
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserId?: string;
  dismissedIds?: string[];
  onDismiss?: (id: string) => void;
  onViewTTSlip?: (slipUrl: string, title: string) => void;
  onOpenApprovedTTLogs?: (customerId?: string) => void;
}

export default function SalesmanTTApprovedBanner({
  customerPayments,
  customers,
  currentUserEmail,
  currentUserName,
  currentUserId,
  dismissedIds,
  onDismiss,
  onViewTTSlip,
  onOpenApprovedTTLogs
}: SalesmanTTApprovedBannerProps) {
  // Local state for dismissed payment IDs
  const [localDismissedIds, setLocalDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_approved_tt_banner_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const effectiveDismissedIds = dismissedIds !== undefined ? dismissedIds : localDismissedIds;

  // Current active index in carousel
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter approved & rejected payments
  const relevantTTs = useMemo(() => {
    return getRelevantApprovedTTs(
      customerPayments,
      customers,
      currentUserEmail,
      currentUserName,
      currentUserId,
      effectiveDismissedIds
    );
  }, [customerPayments, customers, currentUserEmail, currentUserName, currentUserId, effectiveDismissedIds]);

  if (relevantTTs.length === 0) {
    return null;
  }

  const activeTT = relevantTTs[currentIndex] || relevantTTs[0];
  const totalCount = relevantTTs.length;

  const targetCust = customers.find(c => c.id === activeTT.customerId || c.customerId === activeTT.customerId);
  const custName = targetCust?.customerName || activeTT.customerName || 'Valued Customer';
  const companyName = targetCust?.companyName;

  const isRejected = activeTT.status === 'Rejected';
  const origAmount = Number(activeTT.amount || 0);
  const remBalance = activeTT.remainingBalance !== undefined ? Number(activeTT.remainingBalance) : origAmount;
  const currency = activeTT.currency || 'USD';
  const refCode = activeTT.reference || activeTT.ttNumber || activeTT.paymentId || 'TT-WIRE';
  const rejectionReason = activeTT.rejectionReason || activeTT.remarks || 'Rejected by finance audit.';

  const handleDismiss = (idToDismiss: string) => {
    if (onDismiss) {
      onDismiss(idToDismiss);
    }
    const updated = [...localDismissedIds, idToDismiss];
    setLocalDismissedIds(updated);
    try {
      localStorage.setItem('dismissed_approved_tt_banner_ids', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save dismissed banner id:", err);
    }
    if (currentIndex >= relevantTTs.length - 1) {
      setCurrentIndex(Math.max(0, relevantTTs.length - 2));
    }
  };

  return (
    <div className={`relative overflow-hidden bg-slate-900 border rounded-xl p-3 sm:p-3.5 my-2.5 shadow-lg shadow-slate-950/30 text-white animate-in fade-in slide-in-from-top-2 duration-300 ${
      isRejected ? 'border-rose-500/70' : 'border-amber-500/60'
    }`}>
      
      {/* Background Accent Glow */}
      <div className={`absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-xl pointer-events-none ${
        isRejected ? 'bg-rose-500/10' : 'bg-amber-500/10'
      }`} />

      {/* Header Bar */}
      <div className="flex flex-row items-center justify-between gap-2 pb-2 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-1.5 rounded-lg font-black shrink-0 shadow-xs ${
            isRejected ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
          }`}>
            {isRejected ? (
              <XCircle className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isRejected ? (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.2 h-1.2 rounded-full bg-rose-500 animate-ping" />
                  Finance Rejected TT Remittance
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.2 h-1.2 rounded-full bg-amber-400 animate-ping" />
                  Finance Approved TT Remittance
                </span>
              )}

              {totalCount > 1 && (
                <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full border border-slate-700">
                  {currentIndex + 1} of {totalCount} TT Alerts
                </span>
              )}
            </div>
            <h3 className="text-xs font-bold text-slate-100 tracking-tight truncate mt-0.5">
              {isRejected 
                ? "Telegraphic Transfer (TT) Wire Remittance Rejected ✕"
                : "Telegraphic Transfer (TT) Confirmed & Cleared ✓"
              }
            </h3>
          </div>
        </div>

        {/* Navigation & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          {totalCount > 1 && (
            <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : totalCount - 1))}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Previous TT Alert"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9.5px] font-mono font-bold text-slate-300 px-1">
                {currentIndex + 1}/{totalCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev < totalCount - 1 ? prev + 1 : 0))}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Next TT Alert"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleDismiss(activeTT.id)}
            className="p-1 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider"
            title="Acknowledge & Dismiss"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Acknowledge</span>
          </button>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="mt-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center relative z-10 text-xs">
        
        {/* Customer & Ref Info */}
        <div className="md:col-span-7 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1">
              <UserCheck className={`w-3.5 h-3.5 ${isRejected ? 'text-rose-400' : 'text-amber-400'}`} />
              {custName}
            </span>
            {companyName && (
              <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {companyName}
              </span>
            )}
            {activeTT.createdBySalesmanName && (
              <span className="text-[9.5px] text-sky-300 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded font-mono">
                Agent: {activeTT.createdBySalesmanName}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-300 font-mono">
            <span className="flex items-center gap-1">
              <Landmark className={`w-3 h-3 ${isRejected ? 'text-rose-400' : 'text-amber-400'}`} />
              Ref/SWIFT: <strong className="text-white font-bold">{refCode}</strong>
            </span>
            <span>
              Bank: <strong className="text-slate-200">{activeTT.bank || 'Wire Transfer'}</strong>
            </span>
            <span>
              Date: <strong className="text-slate-200">{activeTT.paymentDate || 'Recent'}</strong>
            </span>
          </div>

          {isRejected ? (
            <div className="flex items-start gap-1.5 text-[10px] text-rose-200 bg-rose-950/60 px-2 py-1.5 rounded border border-rose-800/80 max-w-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300 font-bold uppercase tracking-wider text-[9px] block">Rejection Reason:</strong>
                <span>{rejectionReason}</span>
              </div>
            </div>
          ) : (
            activeTT.remarks && (
              <p className="text-[10px] text-slate-300 italic bg-slate-950/50 px-2 py-1 rounded border border-slate-800/80 truncate max-w-lg">
                "{activeTT.remarks}"
              </p>
            )
          )}
        </div>

        {/* Amount & Actions */}
        <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          
          <div className="text-left md:text-right">
            <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              {isRejected ? 'Rejected TT Wire' : 'Audited TT Deposit'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-black font-mono leading-none ${isRejected ? 'text-rose-400' : 'text-amber-400'}`}>
                {currency} ${origAmount.toLocaleString()}
              </span>
              <span className={`text-[8.5px] font-bold px-1 py-0.5 rounded font-mono uppercase ${
                isRejected ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
              }`}>
                {isRejected ? 'Rejected' : 'Approved'}
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-slate-300 block mt-0.5">
              {isRejected 
                ? 'Finance Audit Decision: Declined'
                : <>Available TT Credit: <strong>${remBalance.toLocaleString()} {currency}</strong></>
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
            {activeTT.slipUrl && onViewTTSlip && (
              <button
                type="button"
                onClick={() => onViewTTSlip(activeTT.slipUrl!, `${isRejected ? 'Rejected' : 'Approved'} TT Receipt (Ref: ${refCode})`)}
                className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-slate-600 cursor-pointer"
                title="View SWIFT Receipt Slip"
              >
                <Paperclip className={`w-3 h-3 ${isRejected ? 'text-rose-400' : 'text-amber-400'}`} />
                <span>TT Slip</span>
              </button>
            )}

            {onOpenApprovedTTLogs && (
              <button
                type="button"
                onClick={() => onOpenApprovedTTLogs(targetCust?.id || activeTT.customerId)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow ${
                  isRejected 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title={isRejected ? "Review Customer Invoices & TT Details" : "Navigate to Invoice Vehicle Tab & Allocate TT Funds"}
              >
                <Coins className="w-3 h-3 stroke-[2.5]" />
                <span>{isRejected ? 'Review TT' : 'Allocate Funds'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
