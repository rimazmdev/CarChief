/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, FileSpreadsheet, Users, Mail, Phone, RefreshCw, 
  Search, Check, AlertCircle, X, Download, Image as ImageIcon, Sparkles, Clock, ShieldAlert, ShieldCheck, KeyRound, ArrowRight,
  ArrowLeft, Star, Eye, EyeOff, Copy, FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Maximize2, Minimize2, Layers,
  Settings, DollarSign, Navigation, Ship, Globe, User, Link, Building2, MapPin, Bell, Coins, Paperclip, SlidersHorizontal, HelpCircle, Activity, Calendar, Car
} from 'lucide-react';
import { Vehicle, Lead, RoleConfig, VehicleCondition, TransmissionType, FuelType, VehicleStatus, ProformaInvoice, BrandingSettings, defaultBranding } from '../types';
import { auth, db, firebaseConfig } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, setDoc, addDoc, getDocs, where, deleteDoc } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import ProformaInvoiceGenerator from './ProformaInvoiceGenerator';
import { VehicleSpecifications } from './VehicleSpecifications';
import CategorizedImageManager from './CategorizedImageManager';
import { RichCountdownTimer } from './RichCountdownTimer';
import AdminMasterControls from './AdminMasterControls';
import FreightMappingManager from './FreightMappingManager';
import CityDeliveryManager from './CityDeliveryManager';
import AdminCustomerTiers from './AdminCustomerTiers';
import AdminCustomerManagement from './AdminCustomerManagement';
import CmsBrandingManager from './CmsBrandingManager';
import AdminFAQManager from './AdminFAQManager';
import { FirestoreAuditPanel } from './FirestoreAuditPanel';
import { Customer, CustomerPayment } from '../customer/types';
import VehiclePaymentAllocations from './VehiclePaymentAllocations';
import ExchangeRateMaster from './ExchangeRateMaster';
import InvoicedRegistry from './InvoicedRegistry';
import SoldOutRegistry from './SoldOutRegistry';
import UserSecurityMatrix from './UserSecurityMatrix';
import StaffDashboard from './StaffDashboard';
import SalesmanTTApprovedBanner, { getRelevantApprovedTTs } from './SalesmanTTApprovedBanner';
import { localHeuristicSearch } from '../utils/aiSearchLocal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ParsedShipmentRow {
  referenceNo: string;
  shipMethod?: string;
  shippingCompany?: string;
  departureVessel?: string;
  departureVoyage?: string;
  etdDate?: string;
  etaDate?: string;
  matchedVehicleId?: string;
  matchedVehicleName?: string;
}

interface BackendDashboardProps {
  vehicles: Vehicle[];
  leads: Lead[];
  currentRole: RoleConfig;
  availableRoles: RoleConfig[];
  reservationHours: number;
  onUpdateReservationHours: (hours: number) => Promise<void>;
  piReservationHours: number;
  onUpdatePiReservationHours: (hours: number) => Promise<void>;
  onAddVehicle: (v: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onImportVehicles: (vList: Omit<Vehicle, 'id' | 'createdAt'>[]) => Promise<void>;
  onUpdateLeadStatus: (id: string, status: Lead['status'], notes: string) => Promise<void>;
  onUpdateRolePermissions: (roleId: string, updatedPermissions: RoleConfig['permissions']) => void;
  onAddRole?: (role: RoleConfig) => void;
  onDeleteRole?: (roleId: string) => void;
  onViewDetails?: (vehicleId: string, isBackend: boolean) => void;
  branding?: BrandingSettings;
  onUpdateBranding?: (updatedBranding: BrandingSettings) => Promise<void>;
}

export default function BackendDashboard({
  vehicles,
  leads,
  currentRole,
  availableRoles,
  reservationHours,
  onUpdateReservationHours,
  piReservationHours,
  onUpdatePiReservationHours,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onImportVehicles,
  onUpdateLeadStatus,
  onUpdateRolePermissions,
  onAddRole,
  onDeleteRole,
  onViewDetails,
  branding,
  onUpdateBranding
}: BackendDashboardProps) {
  const [activeTab, setActiveTab] = useState<'staff_dashboard' | 'inventory' | 'roles' | 'leads' | 'csv' | 'masters' | 'freight_mapping' | 'city_delivery' | 'customer_tiers' | 'customer_management' | 'finance' | 'cms' | 'faq_mgmt' | 'firestore_audit'>(() => {
    const saved = localStorage.getItem('backend_active_tab');
    const validTabs = ['staff_dashboard', 'inventory', 'roles', 'leads', 'csv', 'masters', 'freight_mapping', 'city_delivery', 'customer_tiers', 'customer_management', 'finance', 'cms', 'faq_mgmt', 'firestore_audit'];
    if (saved && validTabs.includes(saved)) {
      return saved as any;
    }
    return 'staff_dashboard';
  });

  useEffect(() => {
    localStorage.setItem('backend_active_tab', activeTab);
  }, [activeTab]);

  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'All' | VehicleStatus>('All');
  const [lastUploadedVehicles, setLastUploadedVehicles] = useState<Omit<Vehicle, 'id' | 'createdAt'>[]>([]);
  
  const [financeSubTab, setFinanceSubTab] = useState<'customer_payments' | 'salesman_allocations' | 'exchange_rates'>(() => {
    const saved = localStorage.getItem('backend_finance_subtab');
    if (saved && ['customer_payments', 'salesman_allocations', 'exchange_rates'].includes(saved)) {
      return saved as any;
    }
    return 'customer_payments';
  });

  useEffect(() => {
    localStorage.setItem('backend_finance_subtab', financeSubTab);
  }, [financeSubTab]);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState<string>('');

  const currentUserEmail = auth.currentUser?.email;
  const restrictedStatuses = ['Reserved', 'Reserved with PI', 'Invoice Created', 'Invoiced', 'Sold'];

  const canAccessTab = (tabKey: string) => {
    if (!currentRole) return false;
    if (currentRole.id === 'Admin' || currentRole.name?.toLowerCase().includes('admin') || currentUserEmail === 'charith3ny@gmail.com') {
      return true;
    }
    const p = currentRole.permissions || {};
    switch (tabKey) {
      case 'staff_dashboard':
        return p.canViewDashboard !== false;
      case 'inventory':
        return Boolean(p.canViewInventory);
      case 'leads':
        return Boolean(p.canManageLeads);
      case 'finance':
        return Boolean(p.canManageFinance);
      case 'masters':
      case 'roles':
      case 'csv':
      case 'freight_mapping':
      case 'city_delivery':
      case 'customer_tiers':
      case 'customer_management':
      case 'cms':
      case 'faq_mgmt':
      case 'firestore_audit':
        return Boolean(p.canUploadCSV || p.canManageRoles || p.canManageMasters || p.canViewAuditLogs);
      default:
        return true;
    }
  };

  // Auto switch activeTab if currently selected tab is not permitted for currentRole
  useEffect(() => {
    if (currentRole && !canAccessTab(activeTab)) {
      const topTabsInOrder = ['staff_dashboard', 'finance', 'inventory', 'leads', 'masters'];
      const firstAllowed = topTabsInOrder.find(t => canAccessTab(t));
      if (firstAllowed) {
        setActiveTab(firstAllowed as any);
      }
    }
  }, [currentRole, activeTab]);


  const isVehicleVisible = (v: Vehicle) => {
    // Superadmin and Admins can see all restricted status vehicles
    if (currentRole?.id === 'Admin' || currentUserEmail === 'charith3ny@gmail.com') {
      return true;
    }
    if (restrictedStatuses.includes(v.status)) {
      if (v.reservedByEmail && v.reservedByEmail !== currentUserEmail) {
        return false;
      }
    }
    return true;
  };

  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [activeExpandedTab, setActiveExpandedTab] = useState<Record<string, 'specs' | 'payments'>>({});
  const [previewingInvoice, setPreviewingInvoice] = useState<ProformaInvoice | null>(null);
  const [previewingVehicle, setPreviewingVehicle] = useState<Vehicle | null>(null);
  const [previewingInvoiceEditMode, setPreviewingInvoiceEditMode] = useState<boolean>(false);
  const [showToClientStates, setShowToClientStates] = useState<Record<string, boolean>>({});

  // States for custom reservation popup
  const [reservingVehicle, setReservingVehicle] = useState<Vehicle | null>(null);
  const [reservationCustomerName, setReservationCustomerName] = useState<string>('');
  const [reservationMarket, setReservationMarket] = useState<string>('');
  const [reservationCustomerEmail, setReservationCustomerEmail] = useState<string>('');
  const [reservationCustomerId, setReservationCustomerId] = useState<string>('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>('');

  React.useEffect(() => {
    const unsubscribe = firestoreCache.subscribeToCollection('customers', (data) => {
      setCustomers(data as Customer[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = firestoreCache.subscribeToCollection('proformaInvoices', (data) => {
      setProformaInvoices(data as ProformaInvoice[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'proformaInvoices');
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = firestoreCache.subscribeToCollection('customerPayments', (data) => {
      setCustomerPayments(data as CustomerPayment[]);
    }, (error) => {
      console.error("Error subscribing to customerPayments:", error);
    });
    return () => unsubscribe();
  }, []);

  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [financeDateFrom, setFinanceDateFrom] = useState<string>(getTodayString);
  const [financeDateTo, setFinanceDateTo] = useState<string>(getTodayString);
  const [financeSearchQuery, setFinanceSearchQuery] = useState<string>('');
  const [financeStatusFilter, setFinanceStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');

  const getPaymentDateStr = (p: CustomerPayment): string => {
    const raw = p.paymentDate || (p as any).createdAt || (p as any).date || '';
    if (!raw) return '';
    if (raw.includes('T')) return raw.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return raw;
  };

  const [dismissedTTBannerIds, setDismissedTTBannerIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_approved_tt_banner_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissTTBanner = (idToDismiss: string) => {
    setDismissedTTBannerIds(prev => {
      if (prev.includes(idToDismiss)) return prev;
      const updated = [...prev, idToDismiss];
      try {
        localStorage.setItem('dismissed_approved_tt_banner_ids', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save dismissed banner id:", err);
      }
      return updated;
    });
  };

  const approvedTTCount = React.useMemo(() => {
    return getRelevantApprovedTTs(
      customerPayments,
      customers,
      currentUserEmail,
      auth.currentUser?.displayName || (currentUserEmail ? currentUserEmail.split('@')[0] : ''),
      auth.currentUser?.uid || '',
      dismissedTTBannerIds
    ).length;
  }, [customerPayments, customers, currentUserEmail, dismissedTTBannerIds]);

  const filteredFinancePayments = React.useMemo(() => {
    return customerPayments.filter(p => {
      // 1. Subtab filter
      const matchesSubTab = financeSubTab === 'customer_payments' 
        ? !p.allocatedBySalesman 
        : p.allocatedBySalesman;
      if (!matchesSubTab) return false;

      // 2. Status filter
      if (financeStatusFilter !== 'ALL' && p.status !== financeStatusFilter) {
        return false;
      }

      // 3. Date range filter
      const payDate = getPaymentDateStr(p);
      if (financeDateFrom) {
        if (payDate && payDate < financeDateFrom) return false;
      }
      if (financeDateTo) {
        if (payDate && payDate > financeDateTo) return false;
      }

      // 4. Search query
      if (financeSearchQuery.trim()) {
        const q = financeSearchQuery.toLowerCase().trim();
        const paymentCust = customers.find(c => c.id === p.customerId || c.customerId === p.customerId);
        const custName = (paymentCust?.customerName || p.customerName || '').toLowerCase();
        const custEmail = (paymentCust?.email || p.customerId || '').toLowerCase();
        const ref = (p.reference || p.ttNumber || '').toLowerCase();
        const inv = (p.invoiceNumber || '').toLowerCase();
        const salesman = (p.createdBySalesmanName || (p as any).salesmanName || '').toLowerCase();
        const pid = (p.paymentId || '').toLowerCase();
        const amount = String(p.amount || '');

        const matchesSearch = 
          custName.includes(q) ||
          custEmail.includes(q) ||
          ref.includes(q) ||
          inv.includes(q) ||
          salesman.includes(q) ||
          pid.includes(q) ||
          amount.includes(q);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [customerPayments, financeSubTab, financeStatusFilter, financeDateFrom, financeDateTo, financeSearchQuery, customers]);

  React.useEffect(() => {
    const unsubscribe = firestoreCache.subscribeToCollection('systemNotifications', (data) => {
      const sorted = [...data];
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSystemNotifications(sorted);
    }, (error) => {
      console.error("Error subscribing to systemNotifications:", error);
    });
    return () => unsubscribe();
  }, []);

  // Ticker for live remaining time displays
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveFinancePayment = async (payment: CustomerPayment) => {
    try {
      const payRef = doc(db, 'customerPayments', payment.id);
      const origAmount = Number(payment.amount || 0);
      await updateDoc(payRef, {
        status: 'Approved',
        remainingBalance: payment.remainingBalance !== undefined ? payment.remainingBalance : origAmount,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUserEmail || 'Finance Team'
      });

      // Recalculate invoice payment totals using local state to minimize read operations
      const invoicePayments = customerPayments
        .filter(p => p.invoiceId === payment.invoiceId)
        .map(p => p.id === payment.id ? { ...p, status: 'Approved' } : p);

      const targetPi = proformaInvoices.find(pi => pi.id === payment.invoiceId);
      let salesmanEmail = '';
      let salesmanName = '';

      if (targetPi) {
        const grandTotal = Number(targetPi.financials?.grandTotal || targetPi.financials?.vehicleTotal || 0);
        const approvedPaid = invoicePayments
          .filter(p => p.status === 'Approved')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const newRemainingBalance = Math.max(0, grandTotal - approvedPaid);

        await updateDoc(doc(db, 'proformaInvoices', targetPi.id), {
          'financials.paidAmount': approvedPaid,
          'financials.balance': newRemainingBalance
        });

        const qCi = query(collection(db, 'customerInvoices'), where('invoiceId', '==', targetPi.id));
        const snapCi = await getDocs(qCi);
        if (!snapCi.empty) {
          for (const docSnap of snapCi.docs) {
            await updateDoc(doc(db, 'customerInvoices', docSnap.id), {
              paidAmount: approvedPaid,
              balance: newRemainingBalance,
              status: newRemainingBalance <= 0 ? 'Fully Paid' : approvedPaid > 0 ? 'Partially Paid' : 'Unpaid'
            });
          }
        }

        // Find the vehicle to extract salesman email & name
        const vehicleId = targetPi.vehicleDetails?.vehicleId;
        const targetVehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
        salesmanEmail = targetVehicle?.reservedByEmail || targetPi.financials?.salesPerson || '';
        salesmanName = targetVehicle?.reservedByName || targetPi.financials?.salesPerson || 'Sales Staff';

        if (approvedPaid > 0 && (newRemainingBalance <= 0.01 || approvedPaid >= (grandTotal - 0.5)) && vehicleId) {
          await onUpdateVehicle(vehicleId, { status: 'Sold' });
        }
      }

      // 1. Resolve Customer & Salesman details for Notifications
      const targetCustomer = customers.find(c => 
        c.id === payment.customerId || 
        c.customerId === payment.customerId ||
        (payment.customerName && c.customerName?.toLowerCase() === payment.customerName.toLowerCase())
      );
      const custDisplayName = targetCustomer?.customerName || payment.customerName || 'Valued Customer';
      const customerDocId = targetCustomer?.id || payment.customerId;
      const customerCodeId = targetCustomer?.customerId || payment.customerId;

      // Extract or lookup salesman info if not already extracted from targetPi
      if (!salesmanEmail) {
        salesmanEmail = (payment as any).createdBySalesmanEmail || (payment as any).salesmanEmail || '';
      }
      if (!salesmanName || salesmanName === 'Sales Staff') {
        salesmanName = payment.createdBySalesmanName || (payment as any).salesmanName || salesmanName || '';
      }

      if (!salesmanEmail && targetPi) {
        const vehicleId = targetPi.vehicleDetails?.vehicleId;
        const targetVehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
        salesmanEmail = targetVehicle?.reservedByEmail || targetPi.financials?.salesPerson || '';
        salesmanName = targetVehicle?.reservedByName || targetPi.financials?.salesPerson || 'Sales Staff';
      }

      if (!salesmanEmail && targetCustomer) {
        if (targetCustomer.assignedSalesPersonName) {
          salesmanName = salesmanName || targetCustomer.assignedSalesPersonName;
          const foundUser = systemUsers.find(u => 
            (u.name && u.name.toLowerCase() === targetCustomer.assignedSalesPersonName?.toLowerCase()) ||
            (u.uid && u.uid === targetCustomer.assignedSalesPersonId) ||
            (u.id && u.id === targetCustomer.assignedSalesPersonId)
          );
          if (foundUser?.email) {
            salesmanEmail = foundUser.email;
          }
        }
      }

      const ttRefCode = payment.reference || payment.ttNumber || payment.paymentId || 'N/A';
      const remainingBal = payment.remainingBalance !== undefined ? payment.remainingBalance : origAmount;
      const formattedAmount = `$${origAmount.toLocaleString()} ${payment.currency || 'USD'}`;

      // 2. Dispatch Customer Notification(s)
      if (customerDocId) {
        await addDoc(collection(db, 'customerNotifications'), {
          notificationId: "CNOT-" + Math.floor(100000 + Math.random() * 900000),
          customerId: customerDocId,
          customerCode: customerCodeId,
          title: "TT Wire Payment Approved ✓",
          message: `Dear ${custDisplayName}, your Telegraphic Transfer (TT) wire transfer payment of ${formattedAmount} (Ref / Swift Code: ${ttRefCode}) has been audited and approved by the Finance Team.${payment.invoiceNumber ? ` Allocated to Invoice ${payment.invoiceNumber}.` : ` Available TT deposit balance: $${remainingBal.toLocaleString()} ${payment.currency || 'USD'}.`}`,
          type: "payment_approved",
          priority: "high",
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      if (customerCodeId && customerCodeId !== customerDocId) {
        await addDoc(collection(db, 'customerNotifications'), {
          notificationId: "CNOT-" + Math.floor(100000 + Math.random() * 900000),
          customerId: customerCodeId,
          title: "TT Wire Payment Approved ✓",
          message: `Dear ${custDisplayName}, your Telegraphic Transfer (TT) wire transfer payment of ${formattedAmount} (Ref / Swift Code: ${ttRefCode}) has been audited and approved by the Finance Team.${payment.invoiceNumber ? ` Allocated to Invoice ${payment.invoiceNumber}.` : ` Available TT deposit balance: $${remainingBal.toLocaleString()} ${payment.currency || 'USD'}.`}`,
          type: "payment_approved",
          priority: "high",
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      // 3. Dispatch Salesman / System Notification
      await addDoc(collection(db, 'systemNotifications'), {
        notificationId: "SNOT-" + Math.floor(100000 + Math.random() * 900000),
        type: 'payment_approved',
        title: salesmanEmail ? `Sale TT Approved: ${custDisplayName}` : `TT Remittance Approved: ${custDisplayName}`,
        message: `Finance Team approved wire transaction reference ${ttRefCode} (${formattedAmount}) for Customer "${custDisplayName}".${payment.invoiceNumber ? ` Allocated to Invoice ${payment.invoiceNumber}.` : ` Credit added to customer TT balance: $${remainingBal.toLocaleString()} ${payment.currency || 'USD'}.`} ${salesmanName ? `Assigned Representative: ${salesmanName}.` : ''}`,
        amount: origAmount,
        currency: payment.currency || 'USD',
        ttNumber: ttRefCode,
        reference: ttRefCode,
        invoiceId: payment.invoiceId || '',
        invoiceNumber: payment.invoiceNumber || 'Manual',
        customerId: customerDocId,
        customerName: custDisplayName,
        salesmanEmail: salesmanEmail || '',
        salesmanName: salesmanName || '',
        read: false,
        createdAt: new Date().toISOString()
      });

      firestoreCache.invalidate('customerPayments');
      firestoreCache.invalidate('proformaInvoices');
      firestoreCache.invalidate('systemNotifications');
      firestoreCache.invalidate('customerNotifications');

      triggerToast(`TT Payment ${ttRefCode} approved! Notifications sent to customer & salesman.`, 'success');
    } catch (err) {
      console.error("Error approving payment:", err);
      triggerToast("Failed to approve payment.", "error");
    }
  };

  const handleRejectFinancePayment = async (paymentId: string, remarks: string = '') => {
    try {
      const payment = customerPayments.find(p => p.id === paymentId);
      const payRef = doc(db, 'customerPayments', paymentId);
      const rejectionReason = remarks || 'Rejected by finance audit.';
      await updateDoc(payRef, {
        status: 'Rejected',
        remarks: rejectionReason,
        rejectionReason: rejectionReason
      });

      if (payment) {
        const targetCustomer = customers.find(c => 
          c.id === payment.customerId || 
          c.customerId === payment.customerId ||
          (payment.customerName && c.customerName?.toLowerCase() === payment.customerName.toLowerCase())
        );
        const custDisplayName = targetCustomer?.customerName || payment.customerName || 'Customer';
        const customerDocId = targetCustomer?.id || payment.customerId;

        // Customer notification for rejected TT
        const customerCodeId = targetCustomer?.customerId;
        if (customerDocId) {
          await addDoc(collection(db, 'customerNotifications'), {
            notificationId: "CNOT-" + Math.floor(100000 + Math.random() * 900000),
            customerId: customerDocId,
            customerCode: customerCodeId || '',
            title: "TT Wire Payment Rejection Notice ✕",
            message: `Dear ${custDisplayName}, your wire transfer payment (Ref: ${payment.reference || payment.ttNumber || 'N/A'}) was reviewed and rejected by the Finance Team. Reason: ${rejectionReason}. Please contact your sales representative or re-upload a valid TT slip.`,
            type: "payment_rejected",
            priority: "high",
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        if (customerCodeId && customerCodeId !== customerDocId) {
          await addDoc(collection(db, 'customerNotifications'), {
            notificationId: "CNOT-" + Math.floor(100000 + Math.random() * 900000),
            customerId: customerCodeId,
            customerCode: customerCodeId,
            title: "TT Wire Payment Rejection Notice ✕",
            message: `Dear ${custDisplayName}, your wire transfer payment (Ref: ${payment.reference || payment.ttNumber || 'N/A'}) was reviewed and rejected by the Finance Team. Reason: ${rejectionReason}. Please contact your sales representative or re-upload a valid TT slip.`,
            type: "payment_rejected",
            priority: "high",
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        // Salesman notification for rejected TT
        let salesmanEmail = (payment as any).createdBySalesmanEmail || (payment as any).salesmanEmail || '';
        let salesmanName = payment.createdBySalesmanName || (payment as any).salesmanName || '';

        if (!salesmanEmail && targetCustomer?.assignedSalesPersonName) {
          salesmanName = salesmanName || targetCustomer.assignedSalesPersonName;
          const foundUser = systemUsers.find(u => 
            u.name?.toLowerCase() === targetCustomer.assignedSalesPersonName?.toLowerCase()
          );
          if (foundUser?.email) salesmanEmail = foundUser.email;
        }

        await addDoc(collection(db, 'systemNotifications'), {
          notificationId: "SNOT-" + Math.floor(100000 + Math.random() * 900000),
          type: 'payment_rejected',
          title: `TT Payment Rejected: ${custDisplayName}`,
          message: `Finance Team rejected TT payment (Ref: ${payment.reference || payment.ttNumber || 'N/A'}) for Customer "${custDisplayName}". Reason: ${rejectionReason}. ${salesmanName ? `Assigned Representative: ${salesmanName}.` : ''}`,
          amount: payment.amount,
          customerId: customerDocId,
          customerName: custDisplayName,
          salesmanEmail: salesmanEmail || '',
          salesmanName: salesmanName || '',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      firestoreCache.invalidate('customerPayments');
      firestoreCache.invalidate('systemNotifications');
      firestoreCache.invalidate('customerNotifications');
      triggerToast("Payment transaction rejected by Finance audit.", "info");
    } catch (err) {
      console.error("Error rejecting payment:", err);
      triggerToast("Failed to reject payment.", "error");
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'systemNotifications', id), { read: true });
      firestoreCache.invalidate('systemNotifications');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!id) return;
    try {
      firestoreCache.mutateLocalCollection('systemNotifications', 'delete', id);
      await deleteDoc(doc(db, 'systemNotifications', id));
      firestoreCache.invalidate('systemNotifications');
      triggerToast("Notification removed", "info");
    } catch (err) {
      console.error("Error removing notification:", err);
      triggerToast("Failed to remove notification", "error");
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const unread = systemNotifications.filter(n => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'systemNotifications', n.id), { read: true });
      }
      firestoreCache.invalidate('systemNotifications');
      triggerToast("All system notifications marked as read", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const [adminHoursInput, setAdminHoursInput] = useState(reservationHours);
  
  // Security Role & Permission Matrix management states
  const [selectedRoleIdForMatrix, setSelectedRoleIdForMatrix] = useState<string>('Admin');
  const [isRoleCreateOpen, setIsRoleCreateOpen] = useState(false);
  const [newRoleIdInput, setNewRoleIdInput] = useState('');
  const [newRoleNameInput, setNewRoleNameInput] = useState('');
  const [newRoleDescInput, setNewRoleDescInput] = useState('');
  const [newRoleCopyFromInput, setNewRoleCopyFromInput] = useState<string>('none');
  
  // System users management states
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('Sales');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userCreationLoading, setUserCreationLoading] = useState(false);

  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserPassword(pass);
    triggerToast("New secure password auto-generated!", "info");
  };

  const handleClearPassword = () => {
    setNewUserPassword('');
    triggerToast("Password cleared. You can type a custom password now.", "info");
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      firestoreCache.invalidate('users');
      triggerToast(`User security role updated to '${newRole}'!`, "success");
    } catch (err: any) {
      console.error("Error updating user role:", err);
      triggerToast("Failed to update user security role.", "error");
    }
  };

  // Auto generate password on mount if empty
  React.useEffect(() => {
    if (!newUserPassword) {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setNewUserPassword(pass);
    }
  }, [newUserPassword]);

  // Real-time listener for users collection (Optimized with Cache)
  React.useEffect(() => {
    const unsub = firestoreCache.subscribeToCollection('users', (data) => {
      const list = [...data];
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setSystemUsers(list);
      setUsersLoading(false);
    }, (err) => {
      console.error("Error loading system users:", err);
      setUsersLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      triggerToast("Please fill in all required fields.", "error");
      return;
    }

    if (newUserPassword.trim().length < 6) {
      triggerToast("Password must be at least 6 characters long.", "error");
      return;
    }
    
    setUserCreationLoading(true);
    
    try {
      const secondaryAppName = `temp-user-creator-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail.trim(), newUserPassword.trim());
      const uid = userCredential.user.uid;
      
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      
      // Save user profile to Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        createdAt: new Date().toISOString()
      });
      firestoreCache.invalidate('users');
      
      triggerToast(`Successfully created user ${newUserName}!`, "success");
      
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Sales');
      
      // Generate next password
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setNewUserPassword(pass);
    } catch (err: any) {
      console.error("Error creating user:", err);
      triggerToast(err.message || "Failed to create user account.", "error");
    } finally {
      setUserCreationLoading(false);
    }
  };
  React.useEffect(() => {
    setAdminHoursInput(reservationHours);
  }, [reservationHours]);

  const [adminPiHoursInput, setAdminPiHoursInput] = useState(piReservationHours);
  React.useEffect(() => {
    setAdminPiHoursInput(piReservationHours);
  }, [piReservationHours]);

  const calculateTimeLeft = (reservedUntilStr?: string) => {
    if (!reservedUntilStr) return { text: 'No limit', isExpired: false, hours: 0, minutes: 0, seconds: 0 };
    const diff = new Date(reservedUntilStr).getTime() - Date.now();
    if (diff <= 0) {
      return { text: 'Expired', isExpired: true, hours: 0, minutes: 0, seconds: 0 };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');
    
    return {
      text: `${hStr}h ${mStr}m ${sStr}s left`,
      isExpired: false,
      hours,
      minutes,
      seconds
    };
  };

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

  const getCountdownBadges = (reservedUntilStr?: string) => {
    if (!reservedUntilStr) return null;
    const diff = new Date(reservedUntilStr).getTime() - Date.now();
    if (diff <= 0) {
      return (
        <div className="flex gap-1 flex-wrap mt-1">
          <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
            <div className="text-xs font-black leading-none">0</div>
            <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Days</div>
          </span>
          <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
            <div className="text-xs font-black leading-none">0</div>
            <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Hours</div>
          </span>
          <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
            <div className="text-xs font-black leading-none">0</div>
            <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Mins</div>
          </span>
          <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
            <div className="text-xs font-black leading-none">0</div>
            <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Secs</div>
          </span>
        </div>
      );
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return (
      <div className="flex gap-1 flex-wrap mt-1">
        <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
          <div className="text-xs font-black leading-none">{days}</div>
          <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Days</div>
        </span>
        <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
          <div className="text-xs font-black leading-none">{hours}</div>
          <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Hours</div>
        </span>
        <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
          <div className="text-xs font-black leading-none">{minutes}</div>
          <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Mins</div>
        </span>
        <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-sm text-center min-w-[38px]">
          <div className="text-xs font-black leading-none">{seconds}</div>
          <div className="text-[6px] uppercase tracking-wider opacity-90 mt-0.5">Secs</div>
        </span>
      </div>
    );
  };

  const handleConvertToInvoice = async (v: Vehicle, invoice: ProformaInvoice) => {
    try {
      // 1. Update vehicle status to 'Invoiced'
      await onUpdateVehicle(v.id, {
        status: 'Invoiced'
      });

      // 2. Mark the Proforma Invoice as converted
      if (invoice && invoice.id) {
        await updateDoc(doc(db, 'proformaInvoices', invoice.id), {
          invoiceCreated: true,
          convertedAt: new Date().toISOString()
        });
      }

      // 3. Create a corresponding Commercial Invoice in the customerInvoices collection
      let customerId = v.reservedCustomerId || '';
      const emailToSearch = (invoice.buyer?.email || v.reservedCustomerEmail || '').trim().toLowerCase();
      const nameToSearch = (invoice.buyer?.consigneeName || v.reservedCustomerName || '').trim().toLowerCase();
      const companyToSearch = (invoice.buyer?.companyName || '').trim().toLowerCase();

      if (!customerId && (emailToSearch || nameToSearch || companyToSearch)) {
        try {
          const customersRef = collection(db, 'customers');
          const allCustsSnap = await getDocs(customersRef);
          const match = allCustsSnap.docs.find(docSnap => {
            const c = docSnap.data();
            const cEmail = (c.email || '').trim().toLowerCase();
            const cName = (c.customerName || '').trim().toLowerCase();
            const cComp = (c.companyName || '').trim().toLowerCase();
            return (emailToSearch && cEmail === emailToSearch) ||
                   (nameToSearch && cName === nameToSearch) ||
                   (companyToSearch && cComp === companyToSearch) ||
                   (nameToSearch && cComp === nameToSearch) ||
                   (companyToSearch && cName === companyToSearch);
          });
          if (match) {
            customerId = match.id;
          }
        } catch (err) {
          console.error("Failed searching for customer ID to associate invoice:", err);
        }
      }

      // Fallback customer association
      if (!customerId) {
        customerId = 'default_customer';
      }

      const invoiceNumber = (invoice.proformaNo || '').replace('P-', 'INV-').replace('PI-', 'INV-') || `INV-${v.stkNumber || v.id.substring(0, 4)}`;
      const amount = Number(invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || v.price || 0);

      const customerInvoiceData = {
        invoiceId: invoice.id || doc(collection(db, 'proformaInvoices')).id,
        customerId: customerId,
        invoiceNumber: invoiceNumber,
        invoiceType: 'Commercial', // Can be 'Commercial' or 'Final'
        currency: invoice.currency || invoice.financials?.currency || 'USD',
        amount: amount,
        paidAmount: 0,
        balance: amount,
        status: 'Unpaid',
        dueDate: invoice.paymentDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'customerInvoices'), customerInvoiceData);

      triggerToast(`Successfully converted Proforma ${invoice?.proformaNo || ''} to Invoice and created Commercial Invoice ${invoiceNumber}! Moved vehicle to the "Invoiced" tab.`, 'success');
    } catch (err) {
      console.error("Failed to convert PI to Invoice:", err);
      triggerToast("Failed to convert PI to Invoice.", "error");
    }
  };

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Custom Toast Notification state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      isOpen: true,
      message,
      type
    });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  // Search & Filters
  const [invSearch, setInvSearch] = useState('');
  
  // AI Search States
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [aiMatchedVehicleIds, setAiMatchedVehicleIds] = useState<string[] | null>(null);

  const handleAiSearch = async (queryToSearch: string) => {
    const trimmedQuery = queryToSearch.trim();
    if (!trimmedQuery) {
      setAiMatchedVehicleIds(null);
      setAiSearchError(null);
      return;
    }

    setAiSearching(true);
    setAiSearchError(null);

    // Find all vehicles visible to the current user as candidates
    const searchCandidates = vehicles.filter(v => isVehicleVisible(v));

    // Run ultra-fast local heuristic search first
    const localResult = localHeuristicSearch(trimmedQuery, searchCandidates);

    // If local search is confident, use it instantly and completely bypass server API call!
    if (localResult.isConfident) {
      setAiMatchedVehicleIds(localResult.matchedIds);
      setAiSearching(false);
      return;
    }

    // Otherwise, progressively show local matches first for instant visual feedback, 
    // then query the backend Gemini API in parallel to fetch highly complex semantic matches.
    setAiMatchedVehicleIds(localResult.matchedIds);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuery,
          vehicles: searchCandidates,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete AI search query.");
      }

      const data = await response.json();
      setAiMatchedVehicleIds(data.matchedIds || []);
    } catch (err: any) {
      console.error("Staff AI search failed:", err);
      // Keep local search results if server failed but local search found items, otherwise report error
      if (!localResult.matchedIds || localResult.matchedIds.length === 0) {
        setAiSearchError(err?.message || "Our AI copilot is currently resolving. Please try again or switch to standard filters.");
        setAiMatchedVehicleIds([]);
      }
    } finally {
      setAiSearching(false);
    }
  };

  const handleResetAiSearch = () => {
    setAiSearchQuery('');
    setAiMatchedVehicleIds(null);
    setAiSearchError(null);
  };

  const [reservationTab, setReservationTab] = useState<'staff' | 'online'>('staff');
  const [leadFilter, setLeadFilter] = useState<Lead['status'] | 'All'>('All');

  // New States for Backend Row Expansion & Image Slideshow Lightbox
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [slideshowVehicle, setSlideshowVehicle] = useState<Vehicle | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);

  React.useEffect(() => {
    let active = true;
    if (!slideshowVehicle) {
      setSlideshowImages([]);
      return;
    }

    // Set immediate fallback/cover thumbnail first
    setSlideshowImages(slideshowVehicle.images || []);

    const fetchSlideshowImages = async () => {
      try {
        const q = query(
          collection(db, 'vehicleImages'),
          where('vehicleId', '==', slideshowVehicle.id)
        );
        const snap = await getDocs(q);
        if (!active) return;

        if (!snap.empty) {
          const docs = snap.docs.map(d => d.data());
          const categoryOrder = ['auctionPictures', 'auctionSheet', 'japanPictures', 'durbanPictures'];
          
          docs.sort((a, b) => {
            const catA = categoryOrder.indexOf(a.category);
            const catB = categoryOrder.indexOf(b.category);
            if (catA !== catB) return catA - catB;
            return (a.index || 0) - (b.index || 0);
          });

          const urls = docs.map(d => d.url).filter(Boolean);
          if (urls.length > 0) {
            setSlideshowImages(urls);
          }
        } else {
          // Fallback to legacy arrays
          const fallback: string[] = [];
          if (slideshowVehicle.auctionPictures?.length) fallback.push(...slideshowVehicle.auctionPictures);
          if (slideshowVehicle.auctionSheet?.length) fallback.push(...slideshowVehicle.auctionSheet);
          if (slideshowVehicle.japanPictures?.length) fallback.push(...slideshowVehicle.japanPictures);
          if (slideshowVehicle.durbanPictures?.length) fallback.push(...slideshowVehicle.durbanPictures);
          
          if (fallback.length > 0) {
            setSlideshowImages(fallback);
          }
        }
      } catch (err) {
        console.error("Error loading slideshow images:", err);
      }
    };

    fetchSlideshowImages();

    return () => {
      active = false;
    };
  }, [slideshowVehicle]);

  // Add / Edit form states
  const [isEditing, setIsEditing] = useState<string | null>(null); // 'new' or vehicle ID
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formType, setFormType] = useState('Sedan');
  const [formYear, setFormYear] = useState(2024);
  const [formPrice, setFormPrice] = useState(50000);
  const [formMileage, setFormMileage] = useState(0);
  const [formCondition, setFormCondition] = useState<VehicleCondition>('New');
  const [formColor, setFormColor] = useState('');
  const [formTransmission, setFormTransmission] = useState<TransmissionType>('Automatic');
  const [formFuelType, setFormFuelType] = useState<FuelType>('Petrol');
  const [formEngine, setFormEngine] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formAuctionPictures, setFormAuctionPictures] = useState<string[]>([]);
  const [formAuctionSheet, setFormAuctionSheet] = useState<string[]>([]);
  const [formJapanPictures, setFormJapanPictures] = useState<string[]>([]);
  const [formDurbanPictures, setFormDurbanPictures] = useState<string[]>([]);
  const [formShowAuctionPictures, setFormShowAuctionPictures] = useState(true);
  const [formShowJapanPictures, setFormShowJapanPictures] = useState(true);
  const [formShowDurbanPictures, setFormShowDurbanPictures] = useState(true);
  const [formStatus, setFormStatus] = useState<VehicleStatus>('Available');
  const [formExtra, setFormExtra] = useState<Partial<Vehicle>>({});
  const [showExtraFields, setShowExtraFields] = useState(false);

  // States for specification section minimization/maximization
  const [formSectionsExpanded, setFormSectionsExpanded] = useState({
    identity: true,
    commercial: true,
    engineering: true,
    powertrain: true,
    description: true,
    logistics: true,
    media: true,
  });

  const toggleFormSection = (section: keyof typeof formSectionsExpanded) => {
    setFormSectionsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const expandAllFormSections = () => {
    setFormSectionsExpanded({
      identity: true,
      commercial: true,
      engineering: true,
      powertrain: true,
      description: true,
      logistics: true,
      media: true,
    });
  };

  const collapseAllFormSections = () => {
    setFormSectionsExpanded({
      identity: false,
      commercial: false,
      engineering: false,
      powertrain: false,
      description: false,
      logistics: false,
      media: false,
    });
  };

  // Picture management helper
  const [newImgUrl, setNewImgUrl] = useState('');

  // CSV Drag and Drop / Selection states
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [parsedCsvCount, setParsedCsvCount] = useState<number | null>(null);
  const [parsedVehicles, setParsedVehicles] = useState<Omit<Vehicle, 'id' | 'createdAt'>[]>([]);
  const [editingCsvIndex, setEditingCsvIndex] = useState<number | null>(null);
  const [editingCsvVehicle, setEditingCsvVehicle] = useState<Omit<Vehicle, 'id' | 'createdAt'> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvUploadType, setCsvUploadType] = useState<'vehicles' | 'shipment'>('vehicles');
  const [parsedShipments, setParsedShipments] = useState<ParsedShipmentRow[]>([]);

  // Active Lead View / Editing notes
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadNotes, setLeadNotes] = useState('');

  // Proforma Invoice Generation state
  const [selectedPiVehicle, setSelectedPiVehicle] = useState<Vehicle | null>(null);

  // Form handling
  const resetForm = () => {
    setFormMake('');
    setFormModel('');
    setFormType('Sedan');
    setFormYear(2024);
    setFormPrice(50000);
    setFormMileage(0);
    setFormCondition('New');
    setFormColor('');
    setFormTransmission('Automatic');
    setFormFuelType('Petrol');
    setFormEngine('');
    setFormDescription('');
    setFormImages([]);
    setFormAuctionPictures([]);
    setFormAuctionSheet([]);
    setFormJapanPictures([]);
    setFormDurbanPictures([]);
    setFormShowAuctionPictures(true);
    setFormShowJapanPictures(true);
    setFormShowDurbanPictures(true);
    setFormStatus('Available');
    setFormExtra({});
    setShowExtraFields(false);
    setNewImgUrl('');
    setIsEditing(null);
  };

  const loadVehicleToForm = async (v: Vehicle) => {
    setFormMake(v.make);
    setFormModel(v.model);
    setFormType(v.type || 'Sedan');
    setFormYear(v.year);
    setFormPrice(v.price);
    setFormMileage(v.mileage);
    setFormCondition(v.condition);
    setFormColor(v.color);
    setFormTransmission(v.transmission);
    setFormFuelType(v.fuelType);
    setFormEngine(v.engine);
    setFormDescription(v.description);
    setFormImages(v.images || []);
    
    const hasCategorized = v.auctionPictures || v.japanPictures || v.durbanPictures || v.auctionSheet;
    setFormAuctionPictures(v.auctionPictures || (hasCategorized ? [] : (v.images || [])));
    setFormAuctionSheet(v.auctionSheet || []);
    setFormJapanPictures(v.japanPictures || []);
    setFormDurbanPictures(v.durbanPictures || []);
    setFormShowAuctionPictures(v.showAuctionPictures !== false);
    setFormShowJapanPictures(v.showJapanPictures !== false);
    setFormShowDurbanPictures(v.showDurbanPictures !== false);
    
    setFormStatus(v.status);
    const { 
      id, make, model, type, year, price, mileage, condition, color, transmission, fuelType, engine, description, images, status, 
      auctionPictures, auctionSheet, japanPictures, durbanPictures, showAuctionPictures, showJapanPictures, showDurbanPictures, 
      ...rest 
    } = v;
    setFormExtra(rest);
    setIsEditing(v.id);

    // Progressive fetch: try to load uncompressed high-fidelity images from 'vehicleImages' collection
    try {
      const q = query(collection(db, 'vehicleImages'), where('vehicleId', '==', v.id));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const fetchedPics: Record<string, string[]> = {
          auctionPictures: [],
          auctionSheet: [],
          japanPictures: [],
          durbanPictures: []
        };
        
        querySnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const cat = data.category;
          if (fetchedPics[cat]) {
            fetchedPics[cat].push(data.url);
          }
        });
        
        if (fetchedPics.auctionPictures.length > 0) setFormAuctionPictures(fetchedPics.auctionPictures);
        if (fetchedPics.auctionSheet.length > 0) setFormAuctionSheet(fetchedPics.auctionSheet);
        if (fetchedPics.japanPictures.length > 0) setFormJapanPictures(fetchedPics.japanPictures);
        if (fetchedPics.durbanPictures.length > 0) setFormDurbanPictures(fetchedPics.durbanPictures);
        
        const computed: string[] = [];
        if (v.showAuctionPictures !== false) computed.push(...fetchedPics.auctionPictures);
        if (v.showJapanPictures !== false) computed.push(...fetchedPics.japanPictures);
        if (v.showDurbanPictures !== false) computed.push(...fetchedPics.durbanPictures);
        if (computed.length > 0) setFormImages(computed);
      }
    } catch (err) {
      console.warn("Could not load high-quality vehicle images from subcollection:", err);
    }
  };

  const resizeBase64Image = (base64Str: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    if (!base64Str || !base64Str.startsWith('data:image/')) return Promise.resolve(base64Str);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole.permissions.canEditInventory) {
      triggerToast("Unauthorized role. You do not have permission to edit inventory.", "error");
      return;
    }

    triggerToast("Saving specifications and original high-fidelity images...", "info");

    const originalVehicle = isEditing && isEditing !== 'new' ? vehicles.find(v => v.id === isEditing) : null;
    const isRestrictedStatus = ['Reserved', 'Reserved with PI', 'Invoice Created', 'Invoiced', 'Sold'].includes(formStatus);

    const computedImages: string[] = [];
    if (formShowAuctionPictures && formAuctionPictures.length > 0) {
      computedImages.push(...formAuctionPictures);
    }
    if (formShowJapanPictures && formJapanPictures.length > 0) {
      computedImages.push(...formJapanPictures);
    }
    if (formShowDurbanPictures && formDurbanPictures.length > 0) {
      computedImages.push(...formDurbanPictures);
    }

    const vehicleData = {
      make: formMake,
      model: formModel,
      type: formType,
      year: Number(formYear),
      price: Number(formPrice),
      mileage: Number(formMileage),
      condition: formCondition,
      color: formColor,
      transmission: formTransmission,
      fuelType: formFuelType,
      engine: formEngine,
      description: formDescription,
      images: computedImages.length > 0 ? computedImages : (formAuctionPictures.length > 0 ? formAuctionPictures : ['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80']),
      status: formStatus,
      auctionPictures: formAuctionPictures,
      auctionSheet: formAuctionSheet,
      japanPictures: formJapanPictures,
      durbanPictures: formDurbanPictures,
      showAuctionPictures: formShowAuctionPictures,
      showJapanPictures: formShowJapanPictures,
      showDurbanPictures: formShowDurbanPictures,
      ...(isRestrictedStatus ? {
        reservedByEmail: originalVehicle?.reservedByEmail || auth.currentUser?.email || 'salesman@carchief.com',
        reservedByName: originalVehicle?.reservedByName || auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Sales Rep'),
      } : {}),
      ...formExtra
    };

    try {
      if (isEditing === 'new') {
        await onAddVehicle(vehicleData);
      } else if (isEditing) {
        await onUpdateVehicle(isEditing, vehicleData);
      }
      resetForm();
      triggerToast("Vehicle specifications successfully saved!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Error saving vehicle data.", "error");
    }
  };

  // Add picture URL to array
  const handleAddImgUrl = () => {
    if (newImgUrl.trim() && !formImages.includes(newImgUrl)) {
      setFormImages([...formImages, newImgUrl.trim()]);
      setNewImgUrl('');
    }
  };

  // Preset image generator shortcuts
  const generatePresetImg = (type: 'sports' | 'suv' | 'luxury') => {
    const presets = {
      sports: [
        'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80'
      ],
      suv: [
        'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=800&auto=format&fit=crop&q=80'
      ],
      luxury: [
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=800&auto=format&fit=crop&q=80'
      ]
    };
    setFormImages([...formImages, ...presets[type]]);
  };

  // Helper to parse a single CSV row, respecting quoted values
  const parseCSVRow = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const getPrestigeCarImages = (make: string, model: string): string[] => {
    const brand = make.toLowerCase();
    const name = model.toLowerCase();
    
    if (brand.includes('porsche')) {
      return [
        'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('ferrari')) {
      return [
        'https://images.unsplash.com/photo-1592853625527-415be547249e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('mclaren')) {
      return [
        'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1621135802920-133df287f89c?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('mercedes')) {
      return [
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1506016159991-dfe4f2746ad5?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('audi')) {
      return [
        'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('volkswagen') || brand.includes('vw') || brand.includes('golf')) {
      return [
        'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1627454820516-dc767bcb4d3e?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('toyota')) {
      if (name.includes('premio')) {
        return [
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=80'
        ];
      }
      if (name.includes('fielder') || name.includes('wagon')) {
        return [
          'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&auto=format&fit=crop&q=80'
        ];
      }
      return [
        'https://images.unsplash.com/photo-1617469767053-d3b508a0d825?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('volvo')) {
      return [
        'https://images.unsplash.com/photo-1486496146582-9ffcd0b2b2b7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop&q=80'
      ];
    }
    if (brand.includes('mazda')) {
      return [
        'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80'
      ];
    }
    return [
      'https://images.unsplash.com/photo-1525609004556-c46c7d6cf0a3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&fit=crop&q=80'
    ];
  };

  const estimatePrice = (make: string, model: string, year: number): number => {
    const brand = make.toLowerCase();
    const name = model.toLowerCase();
    
    let basePrice = 12000;
    
    if (brand.includes('porsche')) basePrice = 85000;
    else if (brand.includes('ferrari')) basePrice = 180000;
    else if (brand.includes('mclaren')) basePrice = 150000;
    else if (brand.includes('mercedes')) basePrice = 45000;
    else if (brand.includes('audi')) basePrice = 38000;
    else if (brand.includes('volkswagen') || brand.includes('vw')) basePrice = 14000;
    else if (brand.includes('toyota')) {
      if (name.includes('premio')) basePrice = 11800;
      else if (name.includes('fielder')) basePrice = 15500;
      else if (name.includes('axio')) basePrice = 12200;
      else basePrice = 13000;
    } else if (brand.includes('volvo')) {
      if (name.includes('v40')) basePrice = 13500;
      else basePrice = 16000;
    } else if (brand.includes('mazda')) basePrice = 9800;

    const ageDiff = year - 2018;
    const yearMultiplier = 1 + (ageDiff * 0.04);
    return Math.round(Math.max(3000, basePrice * yearMultiplier));
  };

  // CSV Parsing function
  const handleCsvFile = (file: File) => {
    if (!file) return;
    setCsvError('');
    setCsvSuccess('');
    setParsedCsvCount(null);
    setParsedVehicles([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvError("Empty file content");
        return;
      }

      try {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          setCsvError("Invalid CSV. File must contain headers and at least 1 record.");
          return;
        }

        const headers = parseCSVRow(lines[0]).map(h => h.replace(/['"]+/g, '').trim().toLowerCase());
        
        // Find positions of key headers
        const makeIdx = headers.findIndex(h => h === 'make');
        const modelIdx = headers.findIndex(h => h === 'model');
        
        if (makeIdx === -1 || modelIdx === -1) {
          setCsvError("Invalid CSV headers. Must contain at least 'Make' and 'Model' columns.");
          return;
        }

        const vehiclesList: Omit<Vehicle, 'id' | 'createdAt'>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const values = parseCSVRow(row).map(v => v.replace(/['"]+/g, '').trim());

          const rowData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            if (header) {
              const norm = header.toLowerCase().replace(/[.\/\s_-]+/g, '');
              rowData[norm] = values[index] || '';
            }
          });

          const rawMake = rowData['make'] || 'Unknown';
          const rawModel = rowData['model'] || 'Unknown';
          const rawYearStr = rowData['yearmonth'] || rowData['mfgyear'] || rowData['year'] || '2013';
          const yearNum = Number(rawYearStr.split('-')[0].split('/')[0]) || 2013;

          const rawPriceVal = Number(rowData['price'] || rowData['bottomprice'] || rowData['btmprice'] || rowData['pricedomestic']) || 0;
          const priceNum = rawPriceVal > 0 ? rawPriceVal : estimatePrice(rawMake, rawModel, yearNum);

          const mileageNum = Number(rowData['mileage']) || 0;
          const bodyStyle = rowData['bodystyle1'] || rowData['type'] || 'Sedan';
          const rawColor = rowData['exteriorcolor'] || rowData['color'] || 'Silver';
          const rawTransmission = rowData['transmission'] || 'Automatic';
          const rawFuel = rowData['fueltype'] || 'Petrol';
          const modelCode = rowData['modelcode'] || '';
          const vin = rowData['vinserialno'] || '';
          const rawAccessories = rowData['accessories'] || rowData['otheroptions'] || '';
          const stkNum = rowData['stknumber'] || '';
          const refNo = rowData['referenceno'] || '';
          const currentLoc = rowData['currentlocation'] || rowData['stocklocation'] || '';
          const destPort = rowData['port'] || '';

          let cond: VehicleCondition = 'Used';
          if (rowData['condition']) {
            const rawCond = rowData['condition'].toLowerCase();
            if (rawCond.includes('new')) cond = 'New';
            else if (rawCond.includes('certified')) cond = 'Certified Pre-Owned';
          }

          let trans: TransmissionType = 'Automatic';
          if (rawTransmission.toLowerCase().includes('manual')) trans = 'Manual';
          else if (rawTransmission.toLowerCase().includes('clutch') || rawTransmission.toLowerCase().includes('dct')) trans = 'Dual-Clutch';

          let fuel: FuelType = 'Petrol';
          const fLower = rawFuel.toLowerCase();
          if (fLower.includes('diesel')) fuel = 'Diesel';
          else if (fLower.includes('electric') || fLower.includes('ev')) fuel = 'Electric';
          else if (fLower.includes('hybrid')) fuel = 'Hybrid';

          const desc = rawAccessories 
            ? `Equipped with premium features: ${rawAccessories}. Sourced and verified by CarChief.`
            : `Highly reliable model imported via CarChief premium logistics channels. Ref: ${refNo || 'N/A'}.`;

          const parsedItem: Omit<Vehicle, 'id' | 'createdAt'> = {
            make: rawMake,
            model: rawModel,
            type: bodyStyle,
            year: yearNum,
            price: priceNum,
            mileage: mileageNum,
            condition: cond,
            color: rawColor,
            transmission: trans,
            fuelType: fuel,
            engine: modelCode || 'Standard Spec',
            description: desc,
            images: getPrestigeCarImages(rawMake, rawModel),
            status: 'Available',
            auctionPictures: getPrestigeCarImages(rawMake, rawModel),
            auctionSheet: [],
            japanPictures: [],
            durbanPictures: [],
            showAuctionPictures: true,
            showJapanPictures: true,
            showDurbanPictures: true,
            
            stkNumber: stkNum,
            referenceNo: refNo,
            modelCode: modelCode,
            vinSerialNo: vin,
            stockLocation: currentLoc,
            currentLocation: currentLoc,
            accessories: rawAccessories,
            port: destPort,

            commandType: rowData['commandtype'] || '',
            itemType: rowData['itemtype'] || '',
            domestic: rowData['domestic'] || '',
            overseas: rowData['overseas'] || '',
            title: rowData['title'] || '',
            yearMonth: rowData['yearmonth'] || '',
            versionClass: rowData['versionclass'] || '',
            gradeTrimDomestic: rowData['gradetrimdomestic'] || '',
            silverTierPrice: rowData['silvertierprice'] || '',
            goldTierPrice: rowData['goldtierprice'] || '',
            platinumTierPrice: rowData['platinumtierprice'] || '',
            currency: rowData['currency'] || '',
            priceDomestic: rowData['pricedomestic'] || '',
            payTrade: rowData['paytrade'] || '',
            bodyStyle1: rowData['bodystyle1'] || '',
            bodyStyle2: rowData['bodystyle2'] || '',
            steering: rowData['steering'] || '',
            door: rowData['door'] || '',
            displacement: rowData['displacement'] || '',
            passengers: rowData['passengers'] || '',
            driveType: rowData['drivetype'] || '',
            exteriorColor: rowData['exteriorcolor'] || '',
            interiorColor: rowData['interiorcolor'] || '',
            checkYearMonth: rowData['checkyearmonth'] || '',
            mechanicalProblem: rowData['mechanicalproblem'] || '',
            otherOptions: rowData['otheroptions'] || '',
            adminComments: rowData['admincomments'] || '',
            commentsDomestic: rowData['commentsdomestic'] || '',
            imageFiles: rowData['imagefiles'] || '',
            vehicleWidth: rowData['vehiclewidth'] || rowData['width'] || '',
            vehicleLength: rowData['vehiclelength'] || rowData['length'] || '',
            vehicleHeight: rowData['vehicleheight'] || rowData['height'] || '',
            mileageOption: rowData['mileageoption'] || '',
            staff: rowData['staff'] || '',
            layingDate: rowData['layingdate'] || '',
            layingCost: rowData['layingcost'] || '',
            layingCostCurrency: rowData['layingcostcurrency'] || '',
            layingSupplier: rowData['layingsupplier'] || '',
            isPostedOption: rowData['ispostedoption'] || '',
            bottomPrice: rowData['bottomprice'] || '',
            countryStock: rowData['countrystock'] || '',
            etdDate: rowData['etddate'] || '',
            etaDate: rowData['etadate'] || '',
            portStock: rowData['portstock'] || '',
            yardIn: rowData['yardin'] || '',
            ata: rowData['ata'] || '',
            stackDate: rowData['stackdate'] || '',
            bookingDate: rowData['bookingdate'] || '',
            loadEtd: rowData['loadetd'] || '',
            loadPlanReference: rowData['loadplanreference'] || '',
            bookingStatus: rowData['bookingstatus'] || '',
            tripPhase: rowData['tripphase'] || '',
            erpStockNo: rowData['erpstockno'] || '',
            btmPrice: rowData['btmprice'] || '',
            bookingDateApi: rowData['bookingdateapi'] || '',
            bookingStatusApi: rowData['bookingstatusapi'] || '',
            tripPhaseApi: rowData['tripphaseapi'] || '',
            loadEtdApi: rowData['loadetdapi'] || '',
            loadReferenceApi: rowData['loadreferenceapi'] || '',
            specialOffer: rowData['specialoffer'] || '',
            mfgYear: rowData['mfgyear'] || '',
            purchasedDate: rowData['purchaseddate'] || '',
            shipMethod: rowData['shipmethod'] || '',
            shippingCompany: rowData['shippingcompany'] || '',
            blNumber: rowData['blnumber'] || '',
            vanning: rowData['vanning'] || '',
            sealNo: rowData['sealno'] || '',
            shippingMark: rowData['shippingmark'] || '',
            shippingRemarks: rowData['shippingremarks'] || '',
            inspectionDate: rowData['inspectiondate'] || '',
            inspectionStatus: rowData['inspectionstatus'] || '',
            reInspectionDate: rowData['reinspectiondate'] || '',
            reInspectionStatus: rowData['reinspectionstatus'] || '',
            accessoriesRemark: rowData['accessoriesremark'] || '',
            customer: rowData['customer'] || '',
            dataSource: rowData['datasource'] || '',
            vehicleRemark: rowData['vehicleremark'] || '',
            soCutOffDate: rowData['socutoffdate'] || '',
            freightAdjustment: rowData['freightadjustment'] || '',
            departureVessel: rowData['departurevessel'] || '',
            arrivalVoyage: rowData['arrivalvoyage'] || '',
            departureVoyage: rowData['departurevoyage'] || '',
            arrivalVessel: rowData['arrivalvessel'] || '',
            carrierAtd: rowData['carrieratd'] || '',
            carrierEta: rowData['carriereta'] || '',
            engineCode: rowData['enginecode'] || '',
            labelStatus: rowData['labelstatus'] || '',
            source: rowData['source'] || '',
            destinationInspectionDate: rowData['destinationinspectiondate'] || rowData['inspectiondate'] || '',
            registerYear: rowData['registeryear'] || rowData['registeryearmonth'] || '',
            chassis: rowData['chassis'] || '',
            bodytype: rowData['bodytype'] || rowData['bodystyle1'] || '',
            enginesize: rowData['enginesize'] || rowData['displacement'] || '',
            salescomment: rowData['salescomment'] || rowData['salescomments'] || rowData['commentsdomestic'] || '',
            m3: rowData['m3'] || rowData['m³'] || rowData['m3size'] || rowData['m³size'] || rowData['volume'] || rowData['volumem3'] || rowData['m3volume'] || rowData['m3volumesize'] || rowData['volumesize'] || '',
          };

          vehiclesList.push(parsedItem);
        }

        setParsedVehicles(vehiclesList);
        setParsedCsvCount(vehiclesList.length);
        setCsvSuccess(`Successfully parsed ${vehiclesList.length} vehicles from CSV file! Review detail specifications below and click Import.`);

      } catch (err: any) {
        setCsvError(`CSV Parsing failed: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const triggerImportCsv = async () => {
    if (!currentRole.permissions.canUploadCSV) {
      triggerToast("Unauthorized role. You do not have permission to upload CSV.", "error");
      return;
    }
    if (parsedVehicles.length === 0) return;
    
    try {
      await onImportVehicles(parsedVehicles);
      setLastUploadedVehicles(parsedVehicles);
      setCsvSuccess(`Successfully imported all ${parsedVehicles.length} vehicles to the database!`);
      setParsedVehicles([]);
      setParsedCsvCount(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setCsvError("Firebase insertion failed. Check database connection/rules.");
    }
  };

  const handleShipmentCsvFile = (file: File) => {
    if (!file) return;
    setCsvError('');
    setCsvSuccess('');
    setParsedCsvCount(null);
    setParsedShipments([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvError("Empty file content");
        return;
      }

      try {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          setCsvError("Invalid CSV. File must contain headers and at least 1 record.");
          return;
        }

        const headers = parseCSVRow(lines[0]).map(h => h.replace(/['"]+/g, '').trim().toLowerCase());
        
        // Find Reference Number header
        const refIdx = headers.findIndex(h => h === 'referenceno' || h === 'referencenumber' || h === 'refno' || h === 'refnumber' || h.replace(/[\s_-]+/g, '') === 'referenceno');
        
        if (refIdx === -1) {
          setCsvError("Invalid CSV headers. Must contain a 'Reference No' or 'Reference Number' column as primary key mapping.");
          return;
        }

        const shipmentList: ParsedShipmentRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const values = parseCSVRow(row).map(v => v.replace(/['"]+/g, '').trim());

          const rowData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            if (header) {
              const norm = header.toLowerCase().replace(/[.\/\s_-]+/g, '');
              rowData[norm] = values[index] || '';
            }
          });

          const refNo = rowData['referenceno'] || rowData['referencenumber'] || rowData['refno'] || rowData['refnumber'] || '';
          if (!refNo) continue; // skip rows with empty reference number

          const shipMethod = rowData['shipmethod'] || rowData['shipmentmethod'] || '';
          const shippingCompany = rowData['shippingcompany'] || '';
          const departureVessel = rowData['departurevessel'] || '';
          const departureVoyage = rowData['departurevoyage'] || '';
          const etdDate = rowData['etddate'] || rowData['etd'] || '';
          const etaDate = rowData['etadate'] || rowData['eta'] || '';

          // Look for matched vehicle in existing list
          const matched = vehicles.find(v => 
            v.referenceNo && v.referenceNo.trim().toLowerCase() === refNo.trim().toLowerCase()
          );

          shipmentList.push({
            referenceNo: refNo,
            shipMethod,
            shippingCompany,
            departureVessel,
            departureVoyage,
            etdDate,
            etaDate,
            matchedVehicleId: matched?.id,
            matchedVehicleName: matched ? `${matched.make} ${matched.model}` : undefined,
          });
        }

        setParsedShipments(shipmentList);
        setParsedCsvCount(shipmentList.length);
        setCsvSuccess(`Successfully parsed ${shipmentList.length} shipment records! Review matches below and click Commit.`);

      } catch (err: any) {
        setCsvError(`CSV Parsing failed: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const commitShipmentDetails = async () => {
    if (!currentRole.permissions.canUploadCSV) {
      triggerToast("Unauthorized role. You do not have permission to upload CSV.", "error");
      return;
    }
    if (parsedShipments.length === 0) return;
    setCsvError('');
    setCsvSuccess('');
    
    let updatedCount = 0;
    try {
      for (const row of parsedShipments) {
        if (row.matchedVehicleId) {
          const updates: Partial<Vehicle> = {};
          if (row.shipMethod !== undefined) updates.shipMethod = row.shipMethod;
          if (row.shippingCompany !== undefined) updates.shippingCompany = row.shippingCompany;
          if (row.departureVessel !== undefined) updates.departureVessel = row.departureVessel;
          if (row.departureVoyage !== undefined) updates.departureVoyage = row.departureVoyage;
          if (row.etdDate !== undefined) updates.etdDate = row.etdDate;
          if (row.etaDate !== undefined) updates.etaDate = row.etaDate;
          
          await onUpdateVehicle?.(row.matchedVehicleId, updates);
          updatedCount++;
        }
      }
      setCsvSuccess(`Successfully updated shipment details for ${updatedCount} matched vehicles!`);
      setParsedShipments([]);
      setParsedCsvCount(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setCsvError(`Failed to update some vehicle shipment details: ${err.message || err}`);
    }
  };

  // Filter vehicles with full 37-field search support
  const filteredVehicles = useMemo(() => vehicles.filter(v => {
    if (!isVehicleVisible(v)) return false;

    // AI Search Mode Intercept
    if (searchMode === 'ai') {
      if (aiMatchedVehicleIds !== null) {
        return aiMatchedVehicleIds.includes(v.id);
      }
      // If AI search is active but empty, show all items
      if (!aiSearchQuery.trim()) {
        return true;
      }
      // If we are actively searching and don't have results yet, keep showing list
      if (aiSearching) {
        return true;
      }
      return false;
    }

    const query = invSearch.toLowerCase().trim();
    if (!query) return true;

    // Compile a list of all searchable textual values for this vehicle
    const searchTerms: (string | number | null | undefined)[] = [
      v.make,
      v.model,
      v.year,
      v.erpStockNo,
      v.stkNumber,
      v.chassis,
      v.yardIn,
      v.shipMethod,
      v.enginesize,
      v.displacement,
      v.stackDate,
      v.shippingCompany,
      v.mfgYear,
      v.yearMonth,
      v.registerYear,
      v.transmission,
      v.loadPlanReference,
      v.blNumber,
      v.exteriorColor,
      v.color,
      v.fuelType,
      v.btmPrice,
      v.bottomPrice,
      v.vanning,
      v.mileage,
      v.status,
      v.bookingStatus,
      v.sealNo,
      v.modelCode,
      v.bookingDate,
      v.shippingMark,
      v.engineCode,
      v.tripPhase,
      v.loadEtd,
      v.shippingRemarks,
      v.purchasedDate,
      v.labelStatus,
      v.specialOffer,
      v.source,
      v.dataSource,
      v.stockLocation,
      v.destinationInspectionDate,
      v.inspectionDate,
      v.soCutOffDate,
      v.departureVessel,
      v.departureVoyage,
      v.price,
      // Comprehensive logistics/shipping and secondary fields mapping
      v.referenceNo,
      v.etdDate,
      v.etaDate,
      v.vinSerialNo,
      v.currentLocation,
      v.accessories,
      v.port,
      v.bodytype,
      v.salescomment,
      v.versionClass,
      v.gradeTrimDomestic,
      v.silverTierPrice,
      v.goldTierPrice,
      v.platinumTierPrice,
      v.currency,
      v.priceDomestic,
      v.payTrade,
      v.bodyStyle1,
      v.bodyStyle2,
      v.steering,
      v.door,
      v.passengers,
      v.driveType,
      v.interiorColor,
      v.checkYearMonth,
      v.mechanicalProblem,
      v.otherOptions,
      v.adminComments,
      v.commentsDomestic,
      v.imageFiles,
      v.vehicleWidth,
      v.vehicleLength,
      v.vehicleHeight,
      v.mileageOption,
      v.staff,
      v.layingDate,
      v.layingCost,
      v.layingCostCurrency,
      v.layingSupplier,
      v.isPostedOption,
      v.countryStock,
      v.portStock,
      v.ata,
      v.bookingDateApi,
      v.bookingStatusApi,
      v.tripPhaseApi,
      v.loadEtdApi,
      v.loadReferenceApi,
      v.inspectionStatus,
      v.reInspectionDate,
      v.reInspectionStatus,
      v.accessoriesRemark,
      v.customer,
      v.vehicleRemark,
      v.freightAdjustment,
      v.arrivalVoyage,
      v.arrivalVessel,
      v.carrierAtd,
      v.carrierEta,
    ];

    const stringTerms = searchTerms
      .filter((val): val is string | number => val !== null && val !== undefined && val !== '')
      .map(val => val.toString());

    // Also include formatted dates / prices for matching user-friendly searches
    if (v.createdAt) {
      try {
        const dateObj = new Date(v.createdAt);
        if (!isNaN(dateObj.getTime())) {
          stringTerms.push(dateObj.toLocaleDateString());
          stringTerms.push(dateObj.toISOString());
        }
      } catch (e) {}
    }

    if (v.price) {
      stringTerms.push(`$${Number(v.price).toLocaleString()}`);
    }
    const btm = v.btmPrice || v.bottomPrice;
    if (btm) {
      stringTerms.push(`$${Number(btm).toLocaleString()}`);
    }

    return stringTerms.some(term => 
      term.toLowerCase().includes(query)
    );
  }), [vehicles, isVehicleVisible, searchMode, aiMatchedVehicleIds, aiSearchQuery, aiSearching, invSearch]);

  // Filter Leads
  const filteredLeads = leads.filter(l => 
    leadFilter === 'All' ? true : l.status === leadFilter
  );

  const salesmanUnreadNotifications = systemNotifications.filter(n => 
    !n.read && 
    (n.type === 'payment_approved' || n.type === 'online_reservation') &&
    n.salesmanEmail && 
    currentUserEmail && 
    n.salesmanEmail.toLowerCase() === currentUserEmail.toLowerCase()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="backend-portal">
      
      {/* Management Console Title Card */}
      <div className="bg-neutral-950 rounded-2xl border-l-4 border-red-600 p-6 shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center text-white gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500 bg-red-600/10 border border-red-500/20 px-3 py-1 rounded">
            CarChief HQ Administration
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight mt-2 text-white">
            Enterprise <span className="text-red-500">Logistics Portal</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Role: <b className="text-red-500 uppercase">{currentRole.name}</b> • Full database control of listings & client leads.
          </p>
        </div>

        {/* Modules Navigation tab pills */}
        <div className="flex flex-row overflow-x-auto scrollbar-none gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-full md:w-auto shrink-0 whitespace-nowrap">
          {canAccessTab('staff_dashboard') && (
            <button
              onClick={() => setActiveTab('staff_dashboard')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                activeTab === 'staff_dashboard'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5 justify-center">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                Staff Dashboard
              </span>
            </button>
          )}

          {canAccessTab('inventory') && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Inventory</span>
              {approvedTTCount > 0 && (
                <span className="bg-amber-500 text-neutral-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {approvedTTCount}
                </span>
              )}
            </button>
          )}

          {canAccessTab('leads') && (
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                activeTab === 'leads'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Leads ({leads.filter(l => l.status === 'New').length})</span>
            </button>
          )}

          {canAccessTab('finance') && (
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Finance</span>
              {(customerPayments.filter(p => p.status === 'Pending').length) > 0 && (
                <span className="bg-amber-500 text-neutral-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {customerPayments.filter(p => p.status === 'Pending').length}
                </span>
              )}
            </button>
          )}

          {canAccessTab('masters') && (
            <button
              onClick={() => setActiveTab('masters')}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                ['masters', 'roles', 'csv', 'freight_mapping', 'city_delivery', 'customer_tiers', 'customer_management', 'cms', 'faq_mgmt', 'firestore_audit'].includes(activeTab)
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/10'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Master Controls</span>
            </button>
          )}
        </div>
      </div>

      {/* Elegant Sub Tabs for Master Controls */}
      {['masters', 'roles', 'csv', 'freight_mapping', 'city_delivery', 'customer_tiers', 'customer_management', 'cms', 'faq_mgmt', 'firestore_audit'].includes(activeTab) && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-2 mb-8 animate-in fade-in duration-300">
          <div className="flex flex-row overflow-x-auto scrollbar-none gap-1 text-white p-1">
            <button
              onClick={() => setActiveTab('masters')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'masters'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Core Config</span>
            </button>

            <button
              onClick={() => setActiveTab('csv')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'csv'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>CSV Upload</span>
            </button>

            <button
              onClick={() => setActiveTab('freight_mapping')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'freight_mapping'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Freight Calculator</span>
            </button>

            <button
              onClick={() => setActiveTab('city_delivery')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'city_delivery'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>City Delivery</span>
            </button>

            <button
              onClick={() => setActiveTab('customer_tiers')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'customer_tiers'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Customer Tiers</span>
            </button>

            <button
              onClick={() => setActiveTab('customer_management')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'customer_management'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Customer Management</span>
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Roles Control</span>
            </button>

            <button
              onClick={() => setActiveTab('cms')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cms'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>CMS</span>
            </button>

            <button
              onClick={() => setActiveTab('faq_mgmt')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'faq_mgmt'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>FAQ Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('firestore_audit')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'firestore_audit'
                  ? 'bg-neutral-900 text-red-500 border border-neutral-800 shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Firestore Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* Salesperson Notification Center Alert Block */}
      {salesmanUnreadNotifications.length > 0 && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800/80 shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-2xl p-6 mb-8 text-neutral-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-80" />
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-[9px] uppercase font-mono font-black tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                  Sales Agent Alerts
                </span>
                <h3 className="text-xs font-black uppercase tracking-tight mt-2 text-white">
                  Finance approved TT payment for your {salesmanUnreadNotifications.length === 1 ? 'sale' : 'sales'}!
                </h3>
                <p className="text-[10.5px] text-neutral-400 mt-0.5">
                  The Finance audit team has completed and approved wire transfer funds allocation.
                </p>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800">
                {salesmanUnreadNotifications.map((n) => (
                  <div key={n.id} className="bg-neutral-900/60 border border-neutral-800/80 hover:border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs transition-all duration-300">
                    <div className="space-y-1">
                      <span className="font-bold text-white block">{n.title}</span>
                      <p className="text-[10.5px] text-neutral-400">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(n.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Remove Notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAFF CRM DASHBOARD MODULE */}
      {activeTab === 'staff_dashboard' && (
        <StaffDashboard
          vehicles={vehicles}
          leads={leads}
          customers={customers}
          proformaInvoices={proformaInvoices}
          customerPayments={customerPayments}
          currentRole={currentRole}
          onViewDetails={onViewDetails}
          onGenerateProforma={(v) => setSelectedPiVehicle(v)}
          onNavigateTab={(tab, filter) => {
            if (tab === 'inventory') {
              setActiveTab('inventory');
              if (filter?.status) {
                setInventoryStatusFilter(filter.status);
              }
            } else if (tab === 'finance') {
              setActiveTab('finance');
            } else if (tab === 'leads') {
              setActiveTab('leads');
            } else if (tab === 'customer_management') {
              setActiveTab('customer_management');
            } else {
              setActiveTab(tab as any);
            }
          }}
          onAddVehicle={currentRole.permissions.canEditInventory ? () => {
            resetForm();
            setIsEditing('new');
            setActiveTab('inventory');
          } : undefined}
          onReserveVehicle={currentRole.permissions.canReserveVehicle ? (v) => {
            setReservingVehicle(v);
            setReservationCustomerName('');
            setReservationCustomerEmail('');
            setReservationMarket('');
            setReservationCustomerId('');
          } : undefined}
          onEditVehicle={currentRole.permissions.canEditInventory ? (v) => {
            resetForm();
            setIsEditing(v.id);
            setActiveTab('inventory');
          } : undefined}
        />
      )}

      {/* INVENTORY CONTROL MODULE */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Elegant Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200/60 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-neutral-900 text-white">
                  <Layers className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                  Showroom Inventory Registry
                </h2>
              </div>
              <p className="text-xs text-neutral-500 mt-1.5">
                Monitor registered vehicles, edit commercial/technical specifications, update media, and manage agent reservations.
              </p>
            </div>
            {currentRole.permissions.canEditInventory && !isEditing && (
              <button
                onClick={() => {
                  resetForm();
                  setIsEditing('new');
                }}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 px-4.5 rounded-xl flex items-center gap-2 transition-all text-xs tracking-wider uppercase cursor-pointer shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Register New Vehicle</span>
              </button>
            )}
          </div>

          {/* FINANCE APPROVED TT COPY BANNER FOR SALESMAN IN INVENTORY */}
          <SalesmanTTApprovedBanner
            customerPayments={customerPayments}
            customers={customers}
            currentUserEmail={currentUserEmail}
            currentUserName={auth.currentUser?.displayName || (currentUserEmail ? currentUserEmail.split('@')[0] : '')}
            currentUserId={auth.currentUser?.uid || ''}
            dismissedIds={dismissedTTBannerIds}
            onDismiss={handleDismissTTBanner}
            onViewTTSlip={(slipUrl) => {
              setActivePreviewUrl(slipUrl);
            }}
            onOpenApprovedTTLogs={() => {
              setActiveTab('inventory');
              setInventoryStatusFilter('Invoice Created');
            }}
          />

          {isEditing ? (
            /* EXTREMELY PREMIUM EDITING & REGISTRATION Specification Panel */
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-neutral-900 text-white">
                    <Edit className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black uppercase text-neutral-900 tracking-wider">
                      {isEditing === 'new' ? 'Manually Register Model Specs' : 'Edit Listing Specifications'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {isEditing === 'new' ? 'Create a brand new specification record in the cloud registry' : `Modifying specifications for database entry ID: ${isEditing}`}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-bold flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200/80 px-4 py-2 rounded-xl transition-colors cursor-pointer border border-neutral-200/50"
                >
                  <X className="w-3.5 h-3.5" /> Cancel Specs Edit
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="space-y-6">
                {/* Expand / Minimize Form-Wide Master Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 sm:px-4 gap-2 mb-2">
                  <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                    Specification Groups
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={expandAllFormSections}
                      className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg border border-neutral-200 shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3 text-neutral-500" />
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllFormSections}
                      className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg border border-neutral-200 shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Minimize2 className="w-3 h-3 text-neutral-500" />
                      Minimize All
                    </button>
                  </div>
                </div>

                {/* Section 1: Core Specs */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('identity')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">01.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Identity & Classification
                      </h4>
                      {!formSectionsExpanded.identity && (formMake || formModel) && (
                        <span className="hidden md:inline-block text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded border border-red-100/50 truncate font-mono">
                          {formYear} {formMake} {formModel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.identity ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>
                  
                  {formSectionsExpanded.identity && (
                    <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                          <label htmlFor="form-make" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Make / Brand *</label>
                          <input
                            id="form-make"
                            type="text"
                            required
                            placeholder="e.g., Porsche"
                            value={formMake}
                            onChange={(e) => setFormMake(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                        <div>
                          <label htmlFor="form-model" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Model Name *</label>
                          <input
                            id="form-model"
                            type="text"
                            required
                            placeholder="e.g., 911 Carrera S"
                            value={formModel}
                            onChange={(e) => setFormModel(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                        <div>
                          <label htmlFor="form-year" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Manufacture Year *</label>
                          <input
                            id="form-year"
                            type="number"
                            required
                            value={formYear}
                            onChange={(e) => setFormYear(Number(e.target.value))}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Mechanical Specs */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('commercial')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">02.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Commercial Ledger & Condition
                      </h4>
                      {!formSectionsExpanded.commercial && (
                        <span className="hidden md:inline-block text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded border border-amber-100/50 truncate font-mono">
                          ${Number(formPrice || 0).toLocaleString()} | {Number(formMileage || 0).toLocaleString()} Miles | {formCondition}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.commercial ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.commercial && (
                    <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                          <label htmlFor="form-price" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">MSRP Price (USD) *</label>
                          <input
                            id="form-price"
                            type="number"
                            required
                            value={formPrice}
                            onChange={(e) => setFormPrice(Number(e.target.value))}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                        <div>
                          <label htmlFor="form-mileage" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Mileage (Miles) *</label>
                          <input
                            id="form-mileage"
                            type="number"
                            required
                            value={formMileage}
                            onChange={(e) => setFormMileage(Number(e.target.value))}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                        <div>
                          <label htmlFor="form-condition" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Condition Class *</label>
                          <select
                            id="form-condition"
                            value={formCondition}
                            onChange={(e) => setFormCondition(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 cursor-pointer"
                          >
                            <option value="New">New</option>
                            <option value="Used">Used</option>
                            <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Engineering Matrix */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('engineering')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">03.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Engineering Spec & Styling
                      </h4>
                      {!formSectionsExpanded.engineering && (
                        <span className="hidden md:inline-block text-[10px] bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded border border-purple-100/50 truncate font-mono">
                          {formType} | {formTransmission} | {formFuelType} | {formColor || 'Guards Red'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.engineering ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.engineering && (
                    <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                        <div>
                          <label htmlFor="form-type" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Vehicle Type *</label>
                          <select
                            id="form-type"
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 cursor-pointer"
                          >
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="Coupe">Coupe</option>
                            <option value="Hypercar">Hypercar</option>
                            <option value="Convertible">Convertible</option>
                            <option value="Hatchback">Hatchback</option>
                            <option value="Wagon">Wagon</option>
                            <option value="Truck">Truck</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="form-transmission" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Transmission *</label>
                          <select
                            id="form-transmission"
                            value={formTransmission}
                            onChange={(e) => setFormTransmission(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 cursor-pointer"
                          >
                            <option value="Automatic">Automatic</option>
                            <option value="Manual">Manual</option>
                            <option value="Dual-Clutch">Dual-Clutch</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="form-fuel-type" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Fuel Type *</label>
                          <select
                            id="form-fuel-type"
                            value={formFuelType}
                            onChange={(e) => setFormFuelType(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 cursor-pointer"
                          >
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="form-color" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Exterior Paint *</label>
                          <input
                            id="form-color"
                            type="text"
                            required
                            placeholder="e.g., Guards Red"
                            value={formColor}
                            onChange={(e) => setFormColor(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Engine Spec & Status */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('powertrain')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">04.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Powertrain Spec & Showroom Status
                      </h4>
                      {!formSectionsExpanded.powertrain && (
                        <span className="hidden md:inline-block text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded border border-blue-100/50 truncate font-mono">
                          {formEngine || '3.8 Twin-Turbo'} | Status: {formStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.powertrain ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.powertrain && (
                    <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="form-engine" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Engine Specification *</label>
                          <input
                            id="form-engine"
                            type="text"
                            required
                            placeholder="e.g., 3.8L Twin-Turbo Flat-6"
                            value={formEngine}
                            onChange={(e) => setFormEngine(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800"
                          />
                        </div>
                        <div>
                          <label htmlFor="form-status" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Showroom Status *</label>
                          <select
                            id="form-status"
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 cursor-pointer"
                          >
                            <option value="Available">Available</option>
                            <option value="Pending">Pending</option>
                            <option value="Sold">Sold</option>
                            <option value="Draft">Draft</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 5: Copied Description */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('description')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">05.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Commercial Presentation copy
                      </h4>
                      {!formSectionsExpanded.description && formDescription && (
                        <span className="hidden md:inline-block text-[10px] bg-neutral-50 text-neutral-500 font-bold px-2.5 py-0.5 rounded border border-neutral-200/60 truncate max-w-[200px] sm:max-w-xs font-mono">
                          {formDescription}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.description ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.description && (
                    <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label htmlFor="form-description" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">Full Description Specification *</label>
                        <textarea
                          id="form-description"
                          required
                          rows={4}
                          placeholder="Enter premium copy description of vehicle highlights..."
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-all font-medium text-neutral-800 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ALL CUSTOM SPECIFICATIONS FIELDS - FULLY DISPLAYED & EDITABLE */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('logistics')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">06.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Complete Logistics, Sourcing & Sourcing Spec Ledger
                      </h4>
                      {!formSectionsExpanded.logistics && (
                        <span className="hidden md:inline-block text-[10px] bg-neutral-50 text-neutral-500 font-bold px-2.5 py-0.5 rounded border border-neutral-200/60 truncate font-mono">
                          {Object.keys(formExtra || {}).filter(k => formExtra[k as keyof Vehicle] !== undefined && formExtra[k as keyof Vehicle] !== '').length} custom fields populated
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.logistics ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.logistics && (
                    <div className="p-5 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                      <ExtraFieldsEditorGrid
                        values={formExtra}
                        onChange={setFormExtra}
                      />
                    </div>
                  )}
                </div>

                {/* PICTURES / HIGH-QUALITY IMAGES MODULES */}
                <div className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all">
                  <div
                    onClick={() => toggleFormSection('media')}
                    className="flex justify-between items-center px-5 py-4 bg-neutral-50/50 hover:bg-neutral-50 border-b border-neutral-200/60 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-neutral-400 font-mono">07.</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 shrink-0">
                        Media & Photo Galleries
                      </h4>
                      {!formSectionsExpanded.media && (
                        <span className="hidden md:inline-block text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded border border-red-100/50 truncate font-mono">
                          {(formAuctionPictures?.length || 0) + (formAuctionSheet?.length || 0) + (formJapanPictures?.length || 0) + (formDurbanPictures?.length || 0)} configured files
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                      {formSectionsExpanded.media ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {formSectionsExpanded.media && (
                    <div className="p-5 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                      <CategorizedImageManager
                        auctionPictures={formAuctionPictures}
                        auctionSheet={formAuctionSheet}
                        japanPictures={formJapanPictures}
                        durbanPictures={formDurbanPictures}
                        showAuctionPictures={formShowAuctionPictures}
                        showJapanPictures={formShowJapanPictures}
                        showDurbanPictures={formShowDurbanPictures}
                        onChange={(updated) => {
                          setFormAuctionPictures(updated.auctionPictures);
                          setFormAuctionSheet(updated.auctionSheet);
                          setFormJapanPictures(updated.japanPictures);
                          setFormDurbanPictures(updated.durbanPictures);
                          setFormShowAuctionPictures(updated.showAuctionPictures);
                          setFormShowJapanPictures(updated.showJapanPictures);
                          setFormShowDurbanPictures(updated.showDurbanPictures);
                        }}
                        onGeneratePresets={generatePresetImg}
                      />
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer border border-neutral-200/50"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-md hover:shadow"
                  >
                    Commit Specifications
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ACTIVE DATABASE LISTINGS GRID */
            <div className="space-y-8">
              
              {/* Quick Stats Grid Container */}
              {(() => {
                let availableCount = 0, reservedCount = 0, reservedPiCount = 0, invoicedCount = 0, pendingCount = 0, soldCount = 0, total = 0;
                for (let i = 0; i < vehicles.length; i++) {
                  const v = vehicles[i];
                  if (!isVehicleVisible(v)) continue;
                  total++;
                  if (v.status === 'Available') availableCount++;
                  else if (v.status === 'Reserved') reservedCount++;
                  else if (v.status === 'Reserved with PI') reservedPiCount++;
                  else if (v.status === 'Invoice Created' || v.status === 'Invoiced') invoicedCount++;
                  else if (v.status === 'Pending') pendingCount++;
                  else if (v.status === 'Sold') soldCount++;
                }
                const totalCount = total || 1;

                return (
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-md relative overflow-hidden">
                    {/* Subtle grid background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="stats-grid-svg" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#stats-grid-svg)" />
                      </svg>
                    </div>

                    {/* Gradient light sources */}
                    <div className="absolute top-0 right-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-neutral-200/30 rounded-full blur-[80px] pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[8px] font-mono tracking-[0.25em] text-red-600 font-extrabold bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full uppercase">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" /> Real-time Audit Ledger
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">SECURE SYNC: ONLINE</span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-900 font-display">
                          INVENTORY CONTROL STATISTICS
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-light">
                          Manage current fleet logistics, reservation pipelines, and proforma sales ledgers.
                        </p>
                      </div>

                      {/* Stock Distribution Bar Chart */}
                      <div className="flex flex-col gap-1.5 font-mono min-w-[200px]">
                        <div className="flex justify-between items-center text-[9px] font-bold text-neutral-500">
                          <span className="uppercase tracking-wider">STOCK BALANCE</span>
                          <span>{totalCount} UNITS</span>
                        </div>
                        <div className="flex w-full h-2 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200/50 shadow-inner">
                          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(availableCount/totalCount)*100}%` }} title={`Available: ${availableCount}`} />
                          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(reservedCount/totalCount)*100}%` }} title={`Reserved: ${reservedCount}`} />
                          <div className="bg-purple-500 transition-all duration-500" style={{ width: `${(reservedPiCount/totalCount)*100}%` }} title={`Reserved with PI: ${reservedPiCount}`} />
                          <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(invoicedCount/totalCount)*100}%` }} title={`Invoiced: ${invoicedCount}`} />
                          <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${(pendingCount/totalCount)*100}%` }} title={`Pending: ${pendingCount}`} />
                          <div className="bg-rose-500 transition-all duration-500" style={{ width: `${(soldCount/totalCount)*100}%` }} title={`Sold Out: ${soldCount}`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] text-neutral-400 font-bold uppercase">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {availableCount} Avail</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {reservedCount} Locked</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {reservedPiCount} PI</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
                      {/* Available */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Available' ? 'All' : 'Available')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Available'
                            ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-emerald-500 ring-4 ring-emerald-500/10 shadow-md shadow-emerald-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Available status"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Available' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'
                          }`}>
                            <Car className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Available' ? 'text-emerald-700' : 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded'
                          }`}>
                            Active
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Available</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Available' ? 'text-emerald-950' : 'text-neutral-900'}`}>
                            {availableCount}
                          </span>
                        </div>
                      </button>

                      {/* Reserved */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Reserved' ? 'All' : 'Reserved')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Reserved'
                            ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-500 ring-4 ring-amber-500/10 shadow-md shadow-amber-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Reserved vehicles"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Reserved' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                          }`}>
                            <Clock className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Reserved' ? 'text-amber-700' : 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded'
                          }`}>
                            Locked
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Reserved</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Reserved' ? 'text-amber-950' : 'text-neutral-900'}`}>
                            {reservedCount}
                          </span>
                        </div>
                      </button>

                      {/* Reserved with PI */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Reserved with PI' ? 'All' : 'Reserved with PI')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Reserved with PI'
                            ? 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white border-purple-500 ring-4 ring-purple-500/10 shadow-md shadow-purple-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Reserved With PI status"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Reserved with PI' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Reserved with PI' ? 'text-purple-700' : 'text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded'
                          }`}>
                            P. Invoice
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Reserved with PI</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Reserved with PI' ? 'text-purple-950' : 'text-neutral-900'}`}>
                            {reservedPiCount}
                          </span>
                        </div>
                      </button>

                      {/* Invoice Created */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Invoice Created' ? 'All' : 'Invoice Created')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Invoice Created'
                            ? 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white border-blue-500 ring-4 ring-blue-500/10 shadow-md shadow-blue-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Invoiced vehicle status"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Invoice Created' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                          }`}>
                            <FileSpreadsheet className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Invoice Created' ? 'text-blue-700' : 'text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded'
                          }`}>
                            Invoiced
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Invoiced</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Invoice Created' ? 'text-blue-950' : 'text-neutral-900'}`}>
                            {invoicedCount}
                          </span>
                        </div>
                      </button>

                      {/* Pending */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Pending' ? 'All' : 'Pending')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Pending'
                            ? 'bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-md shadow-indigo-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Pending Sales status"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Pending' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'
                          }`}>
                            <RefreshCw className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Pending' ? 'text-indigo-700' : 'text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded'
                          }`}>
                            Processing
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Pending</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Pending' ? 'text-indigo-950' : 'text-neutral-900'}`}>
                            {pendingCount}
                          </span>
                        </div>
                      </button>

                      {/* Sold */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter(inventoryStatusFilter === 'Sold' ? 'All' : 'Sold')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'Sold'
                            ? 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white border-rose-500 ring-4 ring-rose-500/10 shadow-md shadow-rose-500/5'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Filter by Sold Out status"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'Sold' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white'
                          }`}>
                            <ShieldAlert className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'Sold' ? 'text-rose-700' : 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded'
                          }`}>
                            Closed
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-500">Sold Out</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'Sold' ? 'text-rose-950' : 'text-neutral-900'}`}>
                            {soldCount}
                          </span>
                        </div>
                      </button>

                      {/* Total Vault */}
                      <button
                        type="button"
                        onClick={() => setInventoryStatusFilter('All')}
                        className={`p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.03] ${
                          inventoryStatusFilter === 'All'
                            ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 border-neutral-900 text-white shadow-lg shadow-neutral-900/40 ring-4 ring-neutral-900/10'
                            : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-sm'
                        }`}
                        title="Show all vehicles"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <span className={`p-2 rounded-xl transition-colors ${
                            inventoryStatusFilter === 'All' ? 'bg-white text-neutral-950 shadow-md shadow-white/10' : 'bg-neutral-900/10 text-neutral-800 group-hover:bg-neutral-900 group-hover:text-white'
                          }`}>
                            <Layers className="w-4 h-4" />
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                            inventoryStatusFilter === 'All' ? 'text-neutral-300' : 'text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded'
                          }`}>
                            Grand Total
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] block font-mono font-black uppercase tracking-wider text-neutral-400 group-hover:text-neutral-300">Total Vault</span>
                          <span className={`text-2xl sm:text-3xl font-display font-black tracking-tight mt-1 block ${inventoryStatusFilter === 'All' ? 'text-white' : 'text-neutral-900'}`}>
                            {totalCount}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Table list of listings */}
              {inventoryStatusFilter !== 'Reserved' && inventoryStatusFilter !== 'Reserved with PI' && inventoryStatusFilter !== 'Invoice Created' && inventoryStatusFilter !== 'Sold' && (
                <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                  <div className="p-6 border-b border-neutral-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">
                        Active Vehicle Listings Database
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Manage live prices, change specifications, and upload new media
                      </p>
                    </div>

                    {/* Search / AI Search Container */}
                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search Mode Switcher Tabs */}
                        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchMode('standard');
                              handleResetAiSearch();
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              searchMode === 'standard'
                                ? 'bg-white text-neutral-950 shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                          >
                            <SlidersHorizontal className="w-3 h-3 text-red-600" />
                            <span>Standard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchMode('ai');
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer relative overflow-hidden ${
                              searchMode === 'ai'
                                ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                            <span>AI Copilot</span>
                            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping pointer-events-none" />
                          </button>
                        </div>

                        {searchMode === 'standard' ? (
                          /* Standard Search Input */
                          <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search brand, model, color..."
                              value={invSearch}
                              onChange={(e) => setInvSearch(e.target.value)}
                              className="w-full text-xs pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/40 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 transition-all font-medium"
                            />
                          </div>
                        ) : (
                          /* AI Smart Search Input */
                          <div className="flex items-center gap-2 w-full sm:w-96 md:w-[420px]">
                            <div className="relative flex-1">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              </span>
                              <input
                                type="text"
                                placeholder="Ask AI: 'Show Toyota SUVs under $15,000'..."
                                value={aiSearchQuery}
                                onChange={(e) => setAiSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAiSearch(aiSearchQuery);
                                  }
                                }}
                                className="w-full text-xs border border-red-500/10 focus:border-red-500/30 rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:bg-white bg-neutral-50/20 transition-all shadow-inner"
                              />
                              {aiSearchQuery && (
                                <button
                                  type="button"
                                  onClick={handleResetAiSearch}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAiSearch(aiSearchQuery)}
                              disabled={aiSearching || !aiSearchQuery.trim()}
                              className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:from-neutral-100 disabled:to-neutral-200 disabled:text-neutral-400 text-white font-display font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all duration-300 text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                            >
                              {aiSearching ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                  <span>...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                  <span>Search</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* AI Loading/Scanning Progress Effect */}
                      {searchMode === 'ai' && aiSearching && (
                        <div className="relative w-full h-0.5 bg-neutral-100 overflow-hidden rounded-full mt-1">
                          <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-full" style={{ animation: 'scanning 1.5s infinite linear' }} />
                        </div>
                      )}

                      {searchMode === 'ai' && aiSearchError && (
                        <div className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-lg flex items-center gap-1.5 border border-red-100/60 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>{aiSearchError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Listings Grid/Table */}
                  <div className="overflow-x-auto border border-neutral-300 rounded-lg shadow-sm">
                    <table className="w-full text-left border-collapse border border-neutral-300 font-sans">
                      <thead>
                        <tr className="bg-[#eef2f7] text-neutral-800 text-[11px] font-bold uppercase tracking-wide border border-neutral-300">
                          <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Vehicle Specification</th>
                          <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Condition</th>
                          <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">MSRP Price</th>
                          <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Mileage</th>
                          <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Status</th>
                          <th className="py-3 px-4 text-right font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-300 text-xs text-neutral-800">
                        {(() => {
                          const activeInventoryVehicles = filteredVehicles.filter(v => {
                            if (inventoryStatusFilter === 'All') return true;
                            if ((inventoryStatusFilter as any) === 'Invoice Created') {
                              return v.status === 'Invoice Created' || v.status === 'Invoiced';
                            }
                            return (v.status as any) === inventoryStatusFilter;
                          });
                          if (activeInventoryVehicles.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="text-center py-16 text-neutral-400">
                                  <div className="flex flex-col items-center justify-center space-y-2">
                                    <Search className="w-8 h-8 text-neutral-300" />
                                    <p className="font-bold text-sm text-neutral-500">No vehicles found</p>
                                    <p className="text-[10px] text-neutral-400">Try modifying your search or filtering options</p>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          return activeInventoryVehicles.map((v) => (
                            <React.Fragment key={v.id}>
                              <tr className="hover:bg-neutral-50/55 transition-colors border border-neutral-300">
                                <td className="py-3 px-4 border border-neutral-300 bg-white align-middle">
                                  <div className="flex items-center space-x-4">
                                    {/* Toggle Accordion Arrow */}
                                    <button
                                      onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
                                      title={expandedVehicleId === v.id ? "Collapse Specifications" : "Expand All 37 Specifications"}
                                    >
                                      {expandedVehicleId === v.id ? (
                                        <ChevronUp className="w-4 h-4 text-neutral-900 stroke-[3]" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>

                                    {/* Enhanced Larger Picture Thumbnail */}
                                    <div
                                      onClick={() => {
                                        setSlideshowVehicle(v);
                                        setSlideshowIndex(0);
                                      }}
                                      className="w-24 sm:w-28 aspect-[4/3] rounded-xl border border-neutral-200/80 bg-neutral-100 overflow-hidden cursor-pointer shadow-xs relative group shrink-0"
                                      title="Click to view full slideshow of vehicle pictures"
                                    >
                                      <img
                                        src={v.images?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'}
                                        alt={v.model}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-355"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-[8px] font-black text-white bg-neutral-900 px-2 py-1 rounded tracking-wider uppercase font-mono shadow-sm">
                                          Slideshow
                                        </span>
                                      </div>
                                      {((v.images && v.images.length > 0) || (v.totalPicturesCount !== undefined && v.totalPicturesCount > 0)) && (
                                        <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                                          {v.totalPicturesCount !== undefined ? v.totalPicturesCount : (v.images?.length || 0)}P
                                        </span>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-neutral-400 block">{v.make}</span>
                                      <span className="font-extrabold text-neutral-900 text-sm leading-tight block truncate max-w-[200px]">{v.model}</span>
                                      <span className="text-[10px] text-neutral-500 font-medium font-mono mt-0.5 block">ID: {v.id.slice(0, 8)} • {v.year} model • {v.type || 'Sedan'}</span>
                                      
                                      {/* Reference Number and ETD Date */}
                                      <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                                        {v.referenceNo && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs" title="Reference Number">
                                            Ref: {v.referenceNo}
                                          </span>
                                        )}
                                        {v.etdDate && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded shadow-2xs" title="Estimated Time of Departure">
                                            ETD: {v.etdDate}
                                          </span>
                                        )}
                                      </div>

                                      {(v.status === 'Reserved' || v.status === 'Reserved with PI') && (
                                        <div className="mt-1">
                                          <RichCountdownTimer
                                            reservedUntil={v.reservedUntil}
                                            size="sm"
                                            agentName={v.reservedByName || 'Sales Rep'}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 border border-neutral-300 bg-white align-middle">
                                  <span className="font-extrabold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-lg text-[10px] border border-neutral-200/40 uppercase tracking-wider">
                                    {v.condition}
                                  </span>
                                </td>
                                <td className="py-3 px-4 border border-neutral-300 bg-white align-middle">
                                  <span className="font-black text-neutral-900 text-sm">${v.price.toLocaleString()}</span>
                                </td>
                                <td className="py-3 px-4 border border-neutral-300 bg-white align-middle">
                                  <span className="font-mono text-neutral-600 font-semibold">{v.mileage.toLocaleString()} mi</span>
                                </td>
                                <td className="py-3 px-4 border border-neutral-300 bg-white align-middle">
                                  <div className="flex flex-col gap-1">
                                    <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border self-start tracking-wider ${
                                      v.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      v.status === 'Pending' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      v.status === 'Reserved' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                      v.status === 'Reserved with PI' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      v.status === 'Invoice Created' || v.status === 'Invoiced' ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold' :
                                      v.status === 'Sold' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                                    }`}>
                                      {v.status}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right border border-neutral-300 bg-white align-middle">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => {
                                        if (onViewDetails) {
                                          onViewDetails(v.id, true);
                                        } else {
                                          window.open(`?vehicleId=${v.id}&backend=true`, '_blank');
                                        }
                                      }}
                                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 p-2 rounded-xl transition-all border border-neutral-200/60 cursor-pointer shadow-xs"
                                      title="Check More Details"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {v.status === 'Available' && currentRole.permissions.canReserveVehicle && (
                                      <button
                                        onClick={() => {
                                          setReservingVehicle(v);
                                          setReservationCustomerName('');
                                          setReservationMarket('');
                                          setReservationCustomerEmail('');
                                          setReservationCustomerId('');
                                        }}
                                        className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-all cursor-pointer shadow-xs"
                                        title="Reserve Vehicle"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {(v.status === 'Reserved' || v.status === 'Reserved with PI') && currentRole.permissions.canReserveVehicle && (
                                      <button
                                        onClick={() => {
                                          triggerConfirm(
                                            "Release Reservation",
                                            `Do you want to release the active reservation lock on this ${v.year} ${v.make} ${v.model} and return it to public showroom inventory?`,
                                            async () => {
                                              await onUpdateVehicle(v.id, {
                                                status: 'Available',
                                                reservedAt: null,
                                                reservedUntil: null,
                                                reservedByEmail: null,
                                                reservedByName: null,
                                                reservationDurationHours: null
                                              });
                                              triggerToast(`${v.make} ${v.model} is now available in active inventory.`, 'success');
                                            },
                                            "Release Reservation"
                                          );
                                        }}
                                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-xs"
                                        title="Release Reservation"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {v.status === 'Reserved' && (
                                      <button
                                        onClick={() => setSelectedPiVehicle(v)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition-all cursor-pointer shadow-xs"
                                        title="Create Proforma Invoice"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {v.status === 'Reserved with PI' && (
                                      (() => {
                                        const matchingInvoice = proformaInvoices
                                          .filter(inv => inv.vehicleDetails?.vehicleId === v.id)
                                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
                                        if (matchingInvoice) {
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setPreviewingInvoice(matchingInvoice);
                                                setPreviewingVehicle(v);
                                                setPreviewingInvoiceEditMode(false);
                                              }}
                                              className="bg-neutral-900 hover:bg-neutral-800 text-white p-2 rounded-xl transition-all cursor-pointer shadow-xs"
                                              title="View Proforma Invoice"
                                            >
                                              <FileText className="w-3.5 h-3.5" />
                                            </button>
                                          );
                                        }
                                        return null;
                                      })()
                                    )}
                                    {currentRole.permissions.canEditInventory && (
                                      <>
                                        <button
                                          onClick={() => loadVehicleToForm(v)}
                                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 p-2 rounded-xl border border-neutral-200/60 transition-all cursor-pointer"
                                          title="Edit specs"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            triggerConfirm(
                                              "Delete Vehicle Listing",
                                              `Are you sure you want to permanently delete this ${v.year} ${v.make} ${v.model} listing? This action is irreversible.`,
                                              async () => {
                                                await onDeleteVehicle(v.id);
                                                triggerToast(`${v.make} ${v.model} deleted from database.`, 'info');
                                              },
                                              "Delete Listing"
                                            );
                                          }}
                                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl border border-rose-200/40 transition-all cursor-pointer"
                                          title="Remove vehicle"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Accordion Specification drop-down block containing exactly all 37 database fields */}
                              {expandedVehicleId === v.id && (
                                <tr className="bg-neutral-50/50">
                                  <td colSpan={6} className="py-10 px-12 border border-neutral-300 bg-neutral-50/20">
                                    <VehicleSpecifications vehicle={v} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESERVED VEHICLES DATABASE CARD */}
          {inventoryStatusFilter === 'Reserved' && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
                    <Clock className="text-amber-500 w-4.5 h-4.5" />
                    Reserved Vehicles Database
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Review and manage active agent reservation lockouts and quickly generate Proforma Invoices
                  </p>
                </div>

                {/* Search bar inside tab */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-neutral-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by brand, model, agent..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Sub-tab selection */}
              <div className="flex items-center space-x-6 border-b border-neutral-200 mb-6 pb-px">
                <button
                  type="button"
                  onClick={() => setReservationTab('staff')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    reservationTab === 'staff'
                      ? 'border-red-600 text-red-600 font-extrabold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Reservation ({vehicles.filter(v => v.status === 'Reserved' && !v.isOnlineReservation && isVehicleVisible(v)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setReservationTab('online')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    reservationTab === 'online'
                      ? 'border-red-600 text-red-600 font-extrabold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-700'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Online Reservations ({vehicles.filter(v => v.status === 'Reserved' && v.isOnlineReservation && isVehicleVisible(v)).length})
                </button>
              </div>

              <div className="overflow-x-auto border border-neutral-300 rounded-lg shadow-sm">
                <table className="w-full text-left border-collapse border border-neutral-300 font-sans">
                  <thead>
                    <tr className="bg-[#eef2f7] text-neutral-800 text-[11px] font-bold uppercase tracking-wide border border-neutral-300">
                      <th className="py-3 px-4 w-12 text-center border border-neutral-300 bg-[#eef2f7]">
                        <div className="flex items-center justify-center">
                          <span className="bg-[#107c41] text-white p-0.5 rounded inline-flex items-center justify-center w-5 h-5 shadow-sm" title="Spreadsheet Ledger">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Reservation Details</th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Buyer Details</th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Vehicle Details</th>
                      <th className="py-3 px-4 text-center font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-300 text-xs text-neutral-800">
                    {(() => {
                      const reservedVehicles = vehicles.filter(v => {
                        if (v.status !== 'Reserved') return false;
                        if (reservationTab === 'staff' && v.isOnlineReservation) return false;
                        if (reservationTab === 'online' && !v.isOnlineReservation) return false;
                        if (!isVehicleVisible(v)) return false;
                        if (!invSearch) return true;

                        const searchLower = invSearch.toLowerCase().trim();
                        const matchAgent = (v.reservedByName || '').toLowerCase().includes(searchLower);
                        const matchVehicle = filteredVehicles.some(fv => fv.id === v.id);
                        return matchAgent || matchVehicle;
                      });

                      if (reservedVehicles.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-neutral-400">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Clock className="w-8 h-8 text-neutral-300 animate-pulse" />
                                <p className="font-bold">No Reserved Vehicles found.</p>
                                <p className="text-[10px] text-neutral-400">
                                  {reservationTab === 'online'
                                    ? 'No customer online reservations found in this section.'
                                    : 'Mark a vehicle as "Reserved" in active listings to lock it for an agent.'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return reservedVehicles.map((v) => {
                        return (
                          <React.Fragment key={v.id}>
                            <tr className="hover:bg-neutral-50/55 transition-colors border border-neutral-300">
                              {/* Checkbox Column */}
                              <td className="py-3 px-4 text-center align-middle border border-neutral-300 bg-white">
                                <input
                                  type="checkbox"
                                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                  defaultChecked
                                />
                              </td>

                              {/* Reservation Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                <div className="flex flex-col">
                                  <div className={`inline-flex items-center gap-1 ${v.isOnlineReservation ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'} border text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider w-max mb-2`}>
                                    {v.isOnlineReservation ? 'Online Reservation' : 'Staff Reservation'}
                                  </div>
                                  <span className="text-neutral-800 font-medium text-xs leading-snug">
                                    Reserved On: <span className="font-bold text-neutral-900">{v.reservedAt ? formatDate(v.reservedAt) : 'N/A'}</span>
                                  </span>
                                  <p className="font-extrabold text-neutral-900 mt-2 text-xs">
                                    {v.isOnlineReservation ? 'Customer: ' : 'Agent: '}{v.isOnlineReservation ? (v.reservedCustomerName || v.reservedByUserName || 'Customer') : (v.reservedByName || 'Sales Rep')}
                                  </p>

                                  {/* Create PI CTA */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPiVehicle(v)}
                                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-colors w-max shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Generate Proforma
                                  </button>
                                </div>
                              </td>

                              {/* Buyer Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                {v.reservedCustomerName || v.customer || v.market ? (
                                  <div className="flex flex-col space-y-2">
                                    {(v.reservedCustomerName || v.customer) && (
                                      <div>
                                        <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wide block">Customer</span>
                                        <span className="text-neutral-900 font-extrabold text-xs">
                                          {v.reservedCustomerName || v.customer}
                                        </span>
                                      </div>
                                    )}
                                    {v.market && (
                                      <div>
                                        <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wide block">Target Market</span>
                                        <span className="text-neutral-700 font-bold text-[11px] flex items-center gap-1">
                                          <Globe className="w-3.5 h-3.5 text-neutral-500" />
                                          {v.market}
                                        </span>
                                      </div>
                                    )}
                                    <div className="pt-1 border-t border-neutral-100 text-[9px] text-neutral-400 italic">
                                      No Proforma invoice details yet.
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-6 text-center text-neutral-400 space-y-1.5">
                                    <Users className="w-6 h-6 text-neutral-300" />
                                    <span className="italic text-xs block">No Proforma details yet.</span>
                                    <span className="text-[10px] block text-neutral-400 leading-normal max-w-[160px] mx-auto">
                                      Generate a Proforma Invoice to specify Buyer & Consignee details.
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Vehicle Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                <div className="flex items-start space-x-4">
                                  {/* Toggle Accordion Arrow */}
                                  <button
                                    onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                                    className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors shrink-0 mt-1"
                                    title={expandedVehicleId === v.id ? "Collapse Specifications" : "Expand All 37 Specifications"}
                                  >
                                    {expandedVehicleId === v.id ? (
                                      <ChevronUp className="w-4 h-4 text-red-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>

                                  {/* Thumbnail */}
                                  <div
                                    onClick={() => {
                                      setSlideshowVehicle(v);
                                      setSlideshowIndex(0);
                                    }}
                                    className="w-24 sm:w-28 aspect-[4/3] rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden cursor-pointer shadow-sm relative group shrink-0 mt-1"
                                    title="Click to view full slideshow of vehicle pictures"
                                  >
                                    <img
                                      src={v.images?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'}
                                      alt={v.model}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-[8px] sm:text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded tracking-wider uppercase font-mono shadow">
                                        Slideshow
                                      </span>
                                    </div>
                                    {((v.images && v.images.length > 0) || (v.totalPicturesCount !== undefined && v.totalPicturesCount > 0)) && (
                                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono font-bold px-1 rounded">
                                        {v.totalPicturesCount !== undefined ? v.totalPicturesCount : (v.images?.length || 0)}P
                                      </span>
                                    )}
                                  </div>

                                  {/* Vehicle Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/15 animate-pulse shrink-0" />
                                      <span className="font-extrabold text-[#002060] hover:underline cursor-pointer text-xs leading-tight block">
                                        {v.stkNumber || 'STK'} / {v.chassis || 'CHASSIS'} {v.make} {v.model}
                                      </span>
                                    </div>
                                    <span className="text-neutral-500 text-[10px] font-mono mt-1 block">
                                      {v.year} model • {v.type || 'Sedan'} • MSRP: ${v.price.toLocaleString()}
                                    </span>
                                    
                                    {/* Reference Number and ETD Date */}
                                    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                                      {v.referenceNo && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs" title="Reference Number">
                                          Ref: {v.referenceNo}
                                        </span>
                                      )}
                                      {v.etdDate && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded shadow-2xs" title="Estimated Time of Departure">
                                          ETD: {v.etdDate}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <RichCountdownTimer
                                      reservedUntil={v.reservedUntil}
                                      size="lg"
                                      agentName={v.isOnlineReservation ? (v.reservedCustomerName || 'Customer') : (v.reservedByName || 'Sales Rep')}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Action Columns */}
                              <td className="py-3 px-4 align-middle border border-neutral-300 bg-white text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {/* Check More Details */}
                                  <button
                                    onClick={() => {
                                      if (onViewDetails) {
                                        onViewDetails(v.id, true);
                                      } else {
                                        window.open(`?vehicleId=${v.id}&backend=true`, '_blank');
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-all"
                                    title="Check More Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Release Reservation */}
                                  {currentRole.permissions.canReserveVehicle && (
                                    <button
                                      onClick={() => {
                                        triggerConfirm(
                                          "Release Reservation",
                                          `Do you want to release the active reservation lock on this ${v.year} ${v.make} ${v.model} and return it to public showroom inventory?`,
                                          async () => {
                                            await onUpdateVehicle(v.id, {
                                              status: 'Available',
                                              reservedAt: null,
                                              reservedUntil: null,
                                              reservedByEmail: null,
                                              reservedByName: null,
                                              reservationDurationHours: null
                                            });
                                            triggerToast(`${v.make} ${v.model} is now available in active inventory.`, 'success');
                                          },
                                          "Release Reservation"
                                        );
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-all"
                                      title="Release Reservation"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Create Proforma */}
                                  <button
                                    onClick={() => setSelectedPiVehicle(v)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg shadow-sm transition-all"
                                    title="Create Proforma Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit specs */}
                                  {currentRole.permissions.canEditInventory && (
                                    <>
                                      <button
                                        onClick={() => loadVehicleToForm(v)}
                                        className="bg-neutral-100 text-neutral-700 hover:bg-neutral-200 p-2 rounded-lg transition-colors"
                                        title="Edit specs"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      {/* Delete Listing */}
                                      <button
                                        onClick={() => {
                                          triggerConfirm(
                                            "Delete Vehicle Listing",
                                            `Are you sure you want to permanently delete this ${v.year} ${v.make} ${v.model} listing? This action is irreversible.`,
                                            async () => {
                                              await onDeleteVehicle(v.id);
                                              triggerToast(`${v.make} ${v.model} deleted from database.`, 'info');
                                            },
                                            "Delete Listing"
                                          );
                                        }}
                                        className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                        title="Remove vehicle"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Specifications Row */}
                            {expandedVehicleId === v.id && (
                              <tr className="bg-neutral-50/55">
                                <td colSpan={5} className="py-10 px-12 border border-neutral-300 bg-neutral-50/20">
                                  <VehicleSpecifications vehicle={v} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESERVED WITH PROFORMA INVENTORY CARD */}
          {inventoryStatusFilter === 'Reserved with PI' && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
                    <FileText className="text-purple-600 w-4.5 h-4.5" />
                    Reserved with Proforma Invoice Database
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Review, preview and convert reserved listings with compiled and active Proforma Invoices (PI)
                  </p>
                </div>

                {/* Search bar inside tab */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-neutral-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by brand, model, client, date..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-neutral-300 rounded-lg shadow-sm">
                <table className="w-full text-left border-collapse border border-neutral-300 font-sans">
                  <thead>
                    <tr className="bg-[#eef2f7] text-neutral-800 text-[11px] font-bold uppercase tracking-wide border border-neutral-300">
                      <th className="py-3 px-4 w-12 text-center border border-neutral-300 bg-[#eef2f7]">
                        <div className="flex items-center justify-center">
                          <span className="bg-[#107c41] text-white p-0.5 rounded inline-flex items-center justify-center w-5 h-5 shadow-sm" title="Spreadsheet Ledger">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Proforma Details</th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Buyer Details</th>
                      <th className="py-3 px-4 font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Vehicle Details</th>
                      <th className="py-3 px-4 text-center font-bold tracking-wide border border-neutral-300 bg-[#eef2f7] text-neutral-800">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-300 text-xs text-neutral-800">
                    {(() => {
                      const reservedVehicles = vehicles.filter(v => {
                        if (v.status !== 'Reserved with PI') return false;
                        if (!isVehicleVisible(v)) return false;
                        if (!invSearch) return true;

                        // 1. Matches global vehicle search (including purchase date, chassis, stk size, price, etc.)
                        if (filteredVehicles.some(fv => fv.id === v.id)) return true;

                        // 2. Matches invoice details
                        const searchLower = invSearch.toLowerCase().trim();
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
                      });

                      if (reservedVehicles.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-neutral-400">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <FileText className="w-8 h-8 text-neutral-300 animate-pulse" />
                                <p className="font-bold">No Reserved Vehicles with PI found.</p>
                                <p className="text-[10px] text-neutral-400">When you save a Proforma Invoice, the vehicle will automatically appear here with a "Reserved with PI" status.</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return reservedVehicles.map((v) => {
                        const invoice = proformaInvoices
                          .filter(inv => inv.vehicleDetails?.vehicleId === v.id || (inv.vehicleDetails?.chassisNo && v.chassis && inv.vehicleDetails.chassisNo.toLowerCase() === v.chassis.toLowerCase()))
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

                        return (
                          <React.Fragment key={v.id}>
                            <tr className="hover:bg-neutral-50/55 transition-colors border border-neutral-300">
                              {/* Checkbox Column */}
                              <td className="py-3 px-4 text-center align-middle border border-neutral-300 bg-white">
                                <input
                                  type="checkbox"
                                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                  defaultChecked
                                />
                              </td>

                              {/* Proforma Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                <div className="flex flex-col">
                                  {invoice ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewingInvoice(invoice);
                                          setPreviewingVehicle(v);
                                          setPreviewingInvoiceEditMode(false);
                                        }}
                                        className="text-[#002060] hover:underline font-extrabold text-xs text-left leading-tight"
                                      >
                                        Proforma No : {invoice.proformaNo}
                                      </button>
                                      <span className="text-neutral-800 font-medium text-xs mt-1.5 leading-snug">
                                        Total Price : {invoice.financials?.gTotalTerm || 'C&F'} <span className="font-bold text-neutral-900 font-mono">{(invoice.financials?.grandTotal || invoice.financials?.vehicleTotal || 0).toLocaleString()}</span> <span className="font-bold text-red-600">{invoice.currency || invoice.financials?.currency || 'USD'}</span>
                                      </span>
                                      <span className="text-neutral-800 text-xs mt-0.5 leading-snug">
                                        On : {formatDate(invoice.date || invoice.createdAt)}
                                      </span>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleConvertToInvoice(v, invoice)}
                                        className="mt-3 bg-[#6b8be8] hover:bg-[#5274d8] text-white font-semibold text-xs px-3.5 py-1.5 rounded-sm flex items-center justify-center cursor-pointer transition-colors w-max shadow-sm"
                                      >
                                        Proforma ⇒ Invoice
                                      </button>

                                      <p className="font-extrabold text-neutral-900 mt-3 text-xs">
                                        Sales Person : {invoice.financials?.salesPerson || 'Mohamed Adhil'}
                                      </p>
                                    </>
                                  ) : (
                                    <span className="text-neutral-400 italic">No Proforma details</span>
                                  )}

                                  <label className="flex items-center gap-1.5 mt-2.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={showToClientStates[v.id] ?? true}
                                      onChange={(e) => setShowToClientStates(prev => ({ ...prev, [v.id]: e.target.checked }))}
                                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="text-xs text-neutral-800">Show To Client</span>
                                  </label>
                                </div>
                              </td>

                              {/* Buyer Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                {invoice ? (
                                  <div className="flex flex-col text-xs text-neutral-800 max-w-[240px] leading-tight space-y-0.5">
                                    <span className="font-extrabold text-neutral-950 text-xs block mb-0.5">
                                      {invoice.buyer?.consigneeName || invoice.buyer?.companyName || v.reservedCustomerName || v.reservedByName || 'N/A'}
                                    </span>
                                    {invoice.buyer?.companyName && invoice.buyer?.consigneeName && (
                                      <span className="font-medium text-neutral-800 block">
                                        {invoice.buyer.companyName}
                                      </span>
                                    )}
                                    <span className="text-neutral-800 block">
                                      E-mail : {invoice.buyer?.email || v.reservedCustomerEmail || v.reservedByEmail || 'N/A'}
                                    </span>
                                    {invoice.buyer?.streetAddress && (
                                      <span className="text-neutral-800 block">
                                        {invoice.buyer.streetAddress}
                                      </span>
                                    )}
                                    {(invoice.buyer?.city || invoice.buyer?.country) && (
                                      <span className="text-neutral-800 block font-semibold">
                                        {invoice.buyer?.city && `${invoice.buyer.city}, `}{invoice.buyer?.country}
                                      </span>
                                    )}
                                    <span className="text-neutral-800 block mt-0.5">
                                      TEL No. : {invoice.buyer?.tel1 || invoice.buyer?.tel2 || 'N/A'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${invoice.buyer?.companyName || ''}\n${invoice.buyer?.consigneeName || ''}`);
                                        triggerToast("Buyer details copied!", "success");
                                      }}
                                      className="mt-3 bg-[#6b8be8] hover:bg-[#5274d8] text-white font-semibold text-xs px-3.5 py-1.5 rounded-sm transition-colors w-max cursor-pointer shadow-sm"
                                    >
                                      My Account
                                    </button>
                                  </div>
                                ) : (v.reservedCustomerName || v.reservedByName || v.reservedCustomerEmail || v.reservedByEmail) ? (
                                  <div className="flex flex-col text-xs text-neutral-800 max-w-[240px] leading-tight space-y-0.5">
                                    <span className="font-extrabold text-neutral-950 text-xs block mb-0.5">
                                      {v.reservedCustomerName || v.reservedByName || 'N/A'}
                                    </span>
                                    <span className="text-neutral-800 block">
                                      E-mail : {v.reservedCustomerEmail || v.reservedByEmail || 'N/A'}
                                    </span>
                                    <span className="text-purple-600 font-semibold text-[10px] block mt-1">
                                      Reserved with PI
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-neutral-400 italic">No buyer details</span>
                                )}
                              </td>

                              {/* Vehicle Details */}
                              <td className="py-3 px-4 align-top border border-neutral-300 bg-white">
                                <div className="flex items-start space-x-4">
                                  {/* Toggle Accordion Arrow */}
                                  <button
                                    onClick={() => setExpandedVehicleId(expandedVehicleId === v.id ? null : v.id)}
                                    className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors shrink-0 mt-1"
                                    title={expandedVehicleId === v.id ? "Collapse Specifications" : "Expand All 37 Specifications"}
                                  >
                                    {expandedVehicleId === v.id ? (
                                      <ChevronUp className="w-4 h-4 text-red-600 animate-bounce" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 hover:text-red-500 transition-colors" />
                                    )}
                                  </button>

                                  {/* Enhanced Larger Picture Thumbnail */}
                                  <div
                                    onClick={() => {
                                      setSlideshowVehicle(v);
                                      setSlideshowIndex(0);
                                    }}
                                    className="w-24 sm:w-28 aspect-[4/3] rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden cursor-pointer shadow-sm relative group shrink-0 mt-1"
                                    title="Click to view full slideshow of vehicle pictures"
                                  >
                                    <img
                                      src={v.images?.[0] || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'}
                                      alt={v.model}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-[8px] sm:text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded tracking-wider uppercase font-mono shadow">
                                        Slideshow
                                      </span>
                                    </div>
                                    {((v.images && v.images.length > 0) || (v.totalPicturesCount !== undefined && v.totalPicturesCount > 0)) && (
                                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono font-bold px-1 rounded">
                                        {v.totalPicturesCount !== undefined ? v.totalPicturesCount : (v.images?.length || 0)}P
                                      </span>
                                    )}
                                  </div>

                                  {/* Vehicle Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15 animate-pulse shrink-0" />
                                      <span className="font-extrabold text-[#002060] hover:underline cursor-pointer text-xs leading-tight block">
                                        {v.stkNumber || 'STK'} / {v.chassis || 'CHASSIS'} {v.make} {v.model}
                                      </span>
                                    </div>
                                    <span className="text-neutral-800 text-xs mt-1.5 block">
                                      Negotiated by Mr. {invoice?.financials?.salesPerson || 'Mohamed Adhil'}
                                    </span>

                                    {/* Reference Number and ETD Date */}
                                    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                                      {v.referenceNo && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs" title="Reference Number">
                                          Ref: {v.referenceNo}
                                        </span>
                                      )}
                                      {v.etdDate && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded shadow-2xs" title="Estimated Time of Departure">
                                          ETD: {v.etdDate}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <RichCountdownTimer
                                      reservedUntil={v.reservedUntil}
                                      size="lg"
                                      agentName={v.reservedByName || invoice?.financials?.salesPerson || 'Sales Rep'}
                                    />

                                    <span className="text-neutral-800 text-xs block pt-3">
                                      Shipper: {v.shippingCompany || invoice?.shipper?.companyName || 'Carchief Co. Ltd'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Action Columns - Matching the style and items of the reserved vehicle view */}
                              <td className="py-3 px-4 align-middle border border-neutral-300 bg-white text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {/* Check More Details */}
                                  <button
                                    onClick={() => {
                                      if (onViewDetails) {
                                        onViewDetails(v.id, true);
                                      } else {
                                        window.open(`?vehicleId=${v.id}&backend=true`, '_blank');
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-all"
                                    title="Check More Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Release Reservation */}
                                  {currentRole.permissions.canReserveVehicle && (
                                    <button
                                      onClick={() => {
                                        triggerConfirm(
                                          "Release Reservation",
                                          `Do you want to release the active reservation lock on this ${v.year} ${v.make} ${v.model} and return it to public showroom inventory?`,
                                          async () => {
                                            await onUpdateVehicle(v.id, {
                                              status: 'Available',
                                              reservedAt: null,
                                              reservedUntil: null,
                                              reservedByEmail: null,
                                              reservedByName: null,
                                              reservationDurationHours: null
                                            });
                                            triggerToast(`${v.make} ${v.model} is now available in active inventory.`, 'success');
                                          },
                                          "Release Reservation"
                                        );
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-all"
                                      title="Release Reservation"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* View Proforma Invoice / Preview Proforma */}
                                  {invoice && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewingInvoice(invoice);
                                        setPreviewingVehicle(v);
                                        setPreviewingInvoiceEditMode(false);
                                      }}
                                      className="bg-neutral-900 hover:bg-neutral-800 text-white p-2 rounded-lg shadow-sm transition-all"
                                      title="View Proforma Invoice"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Edit specs */}
                                  {currentRole.permissions.canEditInventory && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (invoice) {
                                            setPreviewingInvoice(invoice);
                                            setPreviewingVehicle(v);
                                            setPreviewingInvoiceEditMode(true);
                                          } else {
                                            loadVehicleToForm(v);
                                          }
                                        }}
                                        className="bg-neutral-100 text-neutral-700 hover:bg-neutral-200 p-2 rounded-lg transition-colors"
                                        title="Edit specs"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      {/* Delete Listing */}
                                      <button
                                        onClick={() => {
                                          triggerConfirm(
                                            "Delete Vehicle Listing",
                                            `Are you sure you want to permanently delete this ${v.year} ${v.make} ${v.model} listing? This action is irreversible.`,
                                            async () => {
                                              await onDeleteVehicle(v.id);
                                              triggerToast(`${v.make} ${v.model} deleted from database.`, 'info');
                                            },
                                            "Delete Listing"
                                          );
                                        }}
                                        className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                        title="Remove vehicle"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Specifications Row */}
                            {expandedVehicleId === v.id && (
                              <tr className="bg-neutral-50/55">
                                <td colSpan={5} className="py-10 px-12 border border-neutral-300 bg-neutral-50/20">
                                  <VehicleSpecifications vehicle={v} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVOICED DATABASE */}
          {inventoryStatusFilter === 'Invoice Created' && (
            <InvoicedRegistry
              vehicles={vehicles}
              proformaInvoices={proformaInvoices}
              customerPayments={customerPayments}
              invSearch={invSearch}
              setInvSearch={setInvSearch}
              expandedVehicleId={expandedVehicleId}
              setExpandedVehicleId={setExpandedVehicleId}
              activeExpandedTab={activeExpandedTab}
              setActiveExpandedTab={setActiveExpandedTab}
              setPreviewingInvoice={setPreviewingInvoice}
              setPreviewingVehicle={setPreviewingVehicle}
              setPreviewingInvoiceEditMode={setPreviewingInvoiceEditMode}
              setSlideshowVehicle={setSlideshowVehicle}
              setSlideshowIndex={setSlideshowIndex}
              showToClientStates={showToClientStates}
              setShowToClientStates={setShowToClientStates}
              currentRole={currentRole}
              onUpdateVehicle={onUpdateVehicle}
              onViewDetails={onViewDetails}
              setSelectedPiVehicle={setSelectedPiVehicle}
              triggerToast={triggerToast}
              isVehicleVisible={isVehicleVisible}
            />
          )}

          {/* SOLD OUT DATABASE */}
          {inventoryStatusFilter === 'Sold' && (
            <SoldOutRegistry
              vehicles={vehicles}
              proformaInvoices={proformaInvoices}
              customerPayments={customerPayments}
              invSearch={invSearch}
              setInvSearch={setInvSearch}
              expandedVehicleId={expandedVehicleId}
              setExpandedVehicleId={setExpandedVehicleId}
              activeExpandedTab={activeExpandedTab}
              setActiveExpandedTab={setActiveExpandedTab}
              setPreviewingInvoice={setPreviewingInvoice}
              setPreviewingVehicle={setPreviewingVehicle}
              setPreviewingInvoiceEditMode={setPreviewingInvoiceEditMode}
              setSlideshowVehicle={setSlideshowVehicle}
              setSlideshowIndex={setSlideshowIndex}
              showToClientStates={showToClientStates}
              setShowToClientStates={setShowToClientStates}
              currentRole={currentRole}
              onUpdateVehicle={onUpdateVehicle}
              onViewDetails={onViewDetails}
              setSelectedPiVehicle={setSelectedPiVehicle}
              triggerToast={triggerToast}
              isVehicleVisible={isVehicleVisible}
            />
          )}
        </div>
      )}

      {/* LEAD MANAGEMENT MODULE */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Leads Table List (Span 7) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-100 shadow-md overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800">
                    Buyer Communications Registry
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Acknowledge vehicle deal requests and logs
                  </p>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Show:</span>
                  <label htmlFor="lead-filter-select" className="sr-only">Filter Leads Status</label>
                  <select
                    id="lead-filter-select"
                    value={leadFilter}
                    onChange={(e) => setLeadFilter(e.target.value as any)}
                    className="text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none bg-neutral-50 focus:bg-white"
                  >
                    <option value="All">All Leads</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Sold">Sold</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold tracking-wider border-b border-neutral-100">
                      <th className="py-4 px-5">Lead / Buyer Info</th>
                      <th className="py-4 px-5">Target Model</th>
                      <th className="py-4 px-5">Logistics / Freight</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-neutral-400">
                          No customer communication leads registered at this status.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((l) => (
                        <tr 
                          key={l.id} 
                          onClick={() => {
                            setSelectedLeadId(l.id);
                            setLeadNotes(l.notes || '');
                          }}
                          className={`hover:bg-neutral-50/50 cursor-pointer transition-colors ${
                            selectedLeadId === l.id ? 'bg-red-50/30 font-medium border-l-2 border-l-red-600' : ''
                          }`}
                        >
                          <td className="py-4.5 px-5">
                            <div>
                              <span className="font-bold text-neutral-900 block">{l.customerName}</span>
                              <span className="text-neutral-500 font-mono text-[11px] block">{l.customerEmail}</span>
                              <span className="text-neutral-400 font-mono text-[10px]">{l.customerPhone || 'No telephone provided'}</span>
                            </div>
                          </td>
                          <td className="py-4.5 px-5">
                            <span className="font-semibold text-neutral-800">{l.vehicleTitle}</span>
                          </td>
                          <td className="py-4.5 px-5">
                            {l.freightDetails ? (
                              <div>
                                <span className="font-bold text-red-600 font-mono">${l.freightDetails.estimatedCost.toLocaleString()}</span>
                                <span className="text-[10px] text-neutral-400 block">{l.freightDetails.destination} ({l.freightDetails.shippingMethod})</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[10px]">Showroom Purchase</span>
                            )}
                          </td>
                          <td className="py-4.5 px-5">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              l.status === 'New' ? 'bg-red-100 text-red-700 border-red-200' :
                              l.status === 'Contacted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              l.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              l.status === 'Sold' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-neutral-50 text-neutral-700 border-neutral-100'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-4.5 px-5 text-right">
                            <ArrowRight className={`w-4 h-4 inline text-neutral-400 transition-transform ${
                              selectedLeadId === l.id ? 'translate-x-1.5 text-red-600' : ''
                            }`} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lead Inspection Dashboard (Span 5) */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-md">
              {selectedLeadId ? (() => {
                const activeLead = leads.find(l => l.id === selectedLeadId)!;
                if (!activeLead) return <p className="text-xs text-neutral-400 text-center py-6">Select a lead to inspect details</p>;
                return (
                  <div className="space-y-5">
                    <div className="border-b border-neutral-100 pb-3 flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold uppercase text-red-600">Active Inquiry Spec</span>
                        <h4 className="text-sm font-black text-neutral-900 uppercase">
                          {activeLead.customerName}
                        </h4>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">{new Date(activeLead.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-150 space-y-2 text-xs">
                      <p className="text-neutral-500 italic">" {activeLead.message} "</p>
                    </div>

                    {/* Contact detail rows */}
                    <div className="space-y-2 text-xs text-neutral-700">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Email Address</span>
                        <a href={`mailto:${activeLead.customerEmail}`} className="font-bold text-red-600 hover:underline">{activeLead.customerEmail}</a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Phone Contact</span>
                        <span className="font-semibold text-neutral-800">{activeLead.customerPhone || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Status selection and persistent internal agent notes */}
                    <div className="space-y-4 border-t border-neutral-100 pt-4">
                      <div>
                        <label htmlFor="lead-status-picker" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1.5">Action Status</label>
                        <select
                          id="lead-status-picker"
                          value={activeLead.status}
                          onChange={async (e) => {
                            if (!currentRole.permissions.canManageLeads) {
                              triggerToast("Unauthorized role. You do not have permission to manage leads.", "error");
                              return;
                            }
                            await onUpdateLeadStatus(activeLead.id, e.target.value as any, activeLead.notes || '');
                          }}
                          className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                        >
                          <option value="New">New (Needs Call)</option>
                          <option value="Contacted">Contacted (Emailed)</option>
                          <option value="In Progress">In Progress (Negotiation)</option>
                          <option value="Sold">Sold (Closed-Won)</option>
                          <option value="Archived">Archived (Closed-Lost)</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="lead-notes-editor" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1.5">Internal Agent Notes (Persistent)</label>
                        <textarea
                          id="lead-notes-editor"
                          rows={4}
                          placeholder="Type details, offer prices discussed, callback schedules..."
                          value={leadNotes}
                          onChange={(e) => setLeadNotes(e.target.value)}
                          className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50 resize-none font-sans leading-relaxed"
                        />
                      </div>

                      {currentRole.permissions.canManageLeads && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onUpdateLeadStatus(activeLead.id, activeLead.status, leadNotes);
                            triggerToast("Notes successfully updated and synchronized.", "success");
                          }}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-[10px] transition-colors"
                        >
                          Save Internal Notes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-neutral-400 space-y-3">
                  <Mail className="w-10 h-10 text-neutral-300 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Lead Selected</p>
                  <p className="text-[11px] max-w-[200px] leading-relaxed">
                    Click any buyer lead in the communications table to view details, update status, and take persistent agent notes.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}


      {/* FINANCE AUDIT & TT CONTROL MODULE */}
      {activeTab === 'finance' && (
        <div className="flex flex-col gap-3 h-[calc(100vh-115px)] overflow-hidden animate-in fade-in duration-300">
          {/* Statistics Bar - Compact 1-line strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white p-3 rounded-xl border border-neutral-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold shrink-0">
                <Coins className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block truncate">Audited & Approved</span>
                <span className="text-base font-black text-neutral-900 font-mono block leading-tight">
                  ${customerPayments.filter(p => p.status === 'Approved').reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-neutral-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5 stroke-[1.5] animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block truncate">Pending Customer TTs</span>
                <span className="text-base font-black text-amber-600 font-mono block leading-tight">
                  {customerPayments.filter(p => p.status === 'Pending' && !p.allocatedBySalesman).length}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-neutral-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block truncate">Sales Allocations</span>
                <span className="text-base font-black text-blue-600 font-mono block leading-tight">
                  {customerPayments.filter(p => p.status === 'Pending' && p.allocatedBySalesman).length}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-neutral-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                <Bell className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block truncate">Filtered Wires</span>
                <span className="text-base font-black text-red-600 font-mono block leading-tight">
                  {filteredFinancePayments.length} <span className="text-[10px] font-normal text-neutral-400">wire(s)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Main Workspace Split (Left Table + Right Notifications Feed) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Left Column: Auditing Panel & Filter Controls (col-span 8) */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col min-h-0 overflow-hidden">
              {/* Header Bar */}
              <div className="p-3 border-b border-neutral-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-neutral-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    Finance Audit Desk
                  </h3>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                    {financeDateFrom && financeDateTo && financeDateFrom === financeDateTo
                      ? (financeDateFrom === getTodayString() ? 'Showing: Today' : `Date: ${financeDateFrom}`)
                      : (financeDateFrom || financeDateTo ? `Range: ${financeDateFrom || 'Start'} to ${financeDateTo || 'End'}` : 'All Historical Data')}
                  </span>
                </div>

                {/* Sub-tab Switches */}
                <div className="flex bg-neutral-200/70 p-1 rounded-lg">
                  <button
                    onClick={() => setFinanceSubTab('customer_payments')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      financeSubTab === 'customer_payments'
                        ? 'bg-white text-neutral-900 shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Customer Portal TTs ({customerPayments.filter(p => !p.allocatedBySalesman).length})
                  </button>
                  <button
                    onClick={() => setFinanceSubTab('salesman_allocations')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      financeSubTab === 'salesman_allocations'
                        ? 'bg-white text-neutral-900 shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Salesman Allocations ({customerPayments.filter(p => p.allocatedBySalesman).length})
                  </button>
                  <button
                    onClick={() => setFinanceSubTab('exchange_rates')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      financeSubTab === 'exchange_rates'
                        ? 'bg-white text-neutral-900 shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Exchange Rates
                  </button>
                </div>
              </div>

              {/* Filter Control Toolbar (Only for TT tables) */}
              {financeSubTab !== 'exchange_rates' && (
                <div className="p-2.5 bg-neutral-100/80 border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
                  {/* Date controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-neutral-300 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">From:</span>
                      <input
                        type="date"
                        value={financeDateFrom}
                        onChange={(e) => setFinanceDateFrom(e.target.value)}
                        className="text-[11px] font-mono font-bold text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-neutral-300 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">To:</span>
                      <input
                        type="date"
                        value={financeDateTo}
                        onChange={(e) => setFinanceDateTo(e.target.value)}
                        className="text-[11px] font-mono font-bold text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayString();
                        setFinanceDateFrom(today);
                        setFinanceDateTo(today);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        financeDateFrom === getTodayString() && financeDateTo === getTodayString()
                          ? 'bg-red-600 text-white shadow-2xs font-black'
                          : 'bg-white hover:bg-neutral-200/80 text-neutral-700 border border-neutral-300'
                      }`}
                      title="Filter Today's Transactions"
                    >
                      Today
                    </button>

                    {(financeDateFrom || financeDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFinanceDateFrom('');
                          setFinanceDateTo('');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-200/80 text-neutral-600 border border-neutral-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        title="Clear date filter to view all historical data"
                      >
                        Show All Dates
                      </button>
                    )}
                  </div>

                  {/* Search & Status Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customer, TT #, ref..."
                        value={financeSearchQuery}
                        onChange={(e) => setFinanceSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-white border border-neutral-300 rounded-lg text-[11px] w-44 focus:outline-none focus:border-red-500 shadow-2xs"
                      />
                    </div>

                    <select
                      value={financeStatusFilter}
                      onChange={(e) => setFinanceStatusFilter(e.target.value as any)}
                      className="px-2 py-1 bg-white border border-neutral-300 rounded-lg text-[11px] font-semibold text-neutral-700 focus:outline-none focus:border-red-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Transactions Table / Exchange Rate View Container */}
              {financeSubTab === 'exchange_rates' ? (
                <div className="p-3 flex-1 min-h-0 overflow-y-auto">
                  <ExchangeRateMaster triggerToast={triggerToast} />
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs relative">
                    <thead className="sticky top-0 bg-neutral-100 z-10 shadow-2xs">
                      <tr className="text-neutral-500 font-mono text-[9.5px] uppercase font-bold tracking-wider border-b border-neutral-200">
                        <th className="py-2.5 px-4">ID & Date</th>
                        <th className="py-2.5 px-4">Submitter Details</th>
                        <th className="py-2.5 px-4">Swift Reference</th>
                        <th className="py-2.5 px-4">Invoice Reference</th>
                        <th className="py-2.5 px-4 text-right">Wire Amount</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-700 bg-white">
                      {filteredFinancePayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-14 text-neutral-400 font-medium">
                            <Coins className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                              No transactions found for {financeDateFrom && financeDateTo && financeDateFrom === financeDateTo && financeDateFrom === getTodayString() ? `Today (${financeDateFrom})` : (financeDateFrom || financeDateTo) ? `selected range (${financeDateFrom || 'Start'} to ${financeDateTo || 'End'})` : 'this filter'}
                            </p>
                            {(financeDateFrom || financeDateTo) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFinanceDateFrom('');
                                  setFinanceDateTo('');
                                }}
                                className="mt-2.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                Clear Date Filter & See All Historical TT Data
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredFinancePayments.map((payment) => {
                          const paymentCust = customers.find(c => c.id === payment.customerId || c.customerId === payment.customerId);
                          const payDate = getPaymentDateStr(payment);

                          return (
                            <tr key={payment.id} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="py-2.5 px-4">
                                <span className="font-mono font-bold text-neutral-900 block text-[11.5px]">{payment.paymentId}</span>
                                <span className="text-[9.5px] text-neutral-500 block font-mono">{payDate || payment.paymentDate || 'No date'}</span>
                              </td>
                              <td className="py-2.5 px-4">
                                {payment.allocatedBySalesman ? (
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-neutral-800 block">
                                      {paymentCust?.customerName || payment.customerName || 'Agent Allocation'}
                                    </span>
                                    <span className="text-[9.5px] text-blue-700 font-mono font-bold block">
                                      Salesman: {payment.createdBySalesmanName || (payment as any).salesmanName || 'Sales Staff'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-neutral-800 block">{paymentCust?.customerName || payment.customerName || 'Direct Customer'}</span>
                                    <span className="text-[9.5px] text-neutral-500 font-mono block">{paymentCust?.email || payment.customerId}</span>
                                    {payment.createdBySalesmanName && (
                                      <span className="text-[9.5px] text-blue-700 font-mono font-bold block">
                                        Salesman: {payment.createdBySalesmanName}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono font-bold text-neutral-800 uppercase block tracking-tight">{payment.reference || payment.ttNumber}</span>
                                  <span className="text-[9.5px] text-neutral-500 block">{payment.bank || 'Direct Wire'} ({payment.currency || 'USD'})</span>
                                  {payment.slipUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePreviewUrl(payment.slipUrl || null);
                                        setActivePreviewTitle(`SWIFT Wire / TT Receipt Proof (Ref: ${payment.reference || 'N/A'})`);
                                      }}
                                      className="mt-0.5 inline-flex items-center gap-1 text-[8.5px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded w-max transition-all cursor-pointer font-sans"
                                      title="View SWIFT Wire Receipt Proof"
                                    >
                                      <Paperclip className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                      VIEW TT SLIP
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[8.5px] text-neutral-400 font-sans">
                                      <Paperclip className="w-2.5 h-2.5 text-neutral-300 shrink-0" />
                                      No Attachment
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-mono text-neutral-700 block">{payment.invoiceNumber || 'Manual'}</span>
                                {payment.remarks && (
                                  <span className="text-[9px] text-neutral-400 italic block max-w-[140px] truncate" title={payment.remarks}>
                                    "{payment.remarks}"
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-neutral-900">
                                {payment.currency || 'USD'} {Number(payment.amount || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  payment.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                  payment.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex justify-end items-center gap-1">
                                  {payment.slipUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePreviewUrl(payment.slipUrl || null);
                                        setActivePreviewTitle(`SWIFT Proof Document (Ref: ${payment.reference || 'N/A'})`);
                                      }}
                                      className="p-1 text-neutral-500 hover:text-blue-700 hover:bg-blue-50 bg-neutral-50 border border-neutral-200 rounded transition-all cursor-pointer"
                                      title="View SWIFT Proof Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {payment.status === 'Pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveFinancePayment(payment)}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="Approve to Finance & Allocate"
                                      >
                                        <Check className="w-3 h-3 stroke-[3]" /> Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRejectingPaymentId(payment.id);
                                          setRejectionRemarks('');
                                        }}
                                        className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold px-1.5 py-1 rounded text-[9.5px] uppercase tracking-wider transition-all cursor-pointer"
                                        title="Reject Payment"
                                      >
                                        <X className="w-3 h-3" />
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
              )}
            </div>

            {/* Right Column: Live Notifications Feed (col-span 4) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col min-h-0 overflow-hidden">
              <div className="p-3 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-600 animate-bounce" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    System Notifications
                  </h3>
                </div>
                {systemNotifications.filter(n => !n.read).length > 0 && (
                  <button
                    onClick={handleClearAllNotifications}
                    className="text-[9px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider border-b border-red-600/30 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                {systemNotifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16 space-y-2">
                    <Bell className="w-6 h-6 text-neutral-300" />
                    <p className="text-[10.5px] font-bold uppercase tracking-wider">No Notifications</p>
                    <p className="text-[9.5px] text-neutral-400 max-w-[170px] leading-relaxed">
                      Real-time ledger audit notifications will appear in this feed automatically.
                    </p>
                  </div>
                ) : (
                  systemNotifications.map((n) => {
                    const relativeTime = (() => {
                      if (!n.createdAt) return 'Just now';
                      const diffMs = Date.now() - new Date(n.createdAt).getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      const diffHrs = Math.floor(diffMins / 60);
                      if (diffHrs < 24) return `${diffHrs}h ago`;
                      return new Date(n.createdAt).toLocaleDateString();
                    })();

                    return (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg border transition-all text-[11px] relative pr-8 group ${
                          n.read
                            ? 'border-neutral-100 bg-neutral-50/50 text-neutral-500'
                            : n.salesmanEmail && n.salesmanEmail.toLowerCase() === currentUserEmail?.toLowerCase()
                              ? 'border-blue-100 bg-blue-50/10 text-neutral-800 hover:bg-blue-50/20 shadow-xs'
                              : 'border-red-100 bg-red-50/10 text-neutral-800 hover:bg-red-50/20'
                        }`}
                      >
                        {/* Cross button to remove notification */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(n.id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-neutral-200/60 transition-colors cursor-pointer z-10"
                          title="Remove notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {!n.read && (
                          <span className="absolute top-3.5 right-8 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                        )}

                        {n.salesmanEmail && n.salesmanEmail.toLowerCase() === currentUserEmail?.toLowerCase() && (
                          <span className="absolute top-3 right-8 bg-blue-600 text-white text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded shadow-xs animate-pulse">
                            Your Sale
                          </span>
                        )}

                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {n.type === 'salesman_allocated' ? (
                              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : n.type === 'payment_approved' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            ) : n.type === 'online_reservation' ? (
                              <Globe className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            ) : (
                              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-[10.5px] uppercase block leading-tight tracking-tight text-neutral-900">
                              {n.title}
                            </span>
                            <p className="text-[10px] mt-0.5 leading-relaxed text-neutral-600">{n.message}</p>
                            
                            {n.salesmanName && (
                              <div className="text-[9px] text-neutral-400 font-medium font-mono mt-1 block">
                                Sales Agent: <span className="text-neutral-600 font-bold">{n.salesmanName}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[8.5px] text-neutral-400 font-mono">{relativeTime}</span>
                              {!n.read && (
                                <button
                                  onClick={() => handleMarkNotificationRead(n.id)}
                                  className="text-[8.5px] font-bold text-red-600 hover:text-red-700 uppercase tracking-tight cursor-pointer"
                                >
                                  • Mark as Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Rejection Remarks Modal */}
          {rejectingPaymentId && (
            <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-sm font-black uppercase text-red-600 tracking-wider">
                    Reject Payment Allocation
                  </h3>
                  <button
                    onClick={() => setRejectingPaymentId(null)}
                    className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-neutral-500 leading-relaxed">
                    Please specify the reason for rejecting this wire transaction proof (e.g. invalid Swift code, amount discrepancy, uncredited funds). This will be logged on the ledger history.
                  </p>

                  <div>
                    <label htmlFor="rejection-reason" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1.5">Rejection Reason Remarks</label>
                    <textarea
                      id="rejection-reason"
                      rows={3}
                      placeholder="Enter audit notes for this transaction rejection..."
                      value={rejectionRemarks}
                      onChange={(e) => setRejectionRemarks(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50 font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => setRejectingPaymentId(null)}
                    className="text-neutral-500 hover:text-neutral-700 font-bold px-4 py-2 text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!rejectionRemarks.trim()) {
                        triggerToast("Please enter a rejection reason remark.", "error");
                        return;
                      }
                      await handleRejectFinancePayment(rejectingPaymentId, rejectionRemarks);
                      setRejectingPaymentId(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* USER ROLES MANAGER & PERMISSION MATRIX MODULE */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <UserSecurityMatrix
            currentRole={currentRole}
            availableRoles={availableRoles}
            onUpdateRolePermissions={onUpdateRolePermissions}
            onAddRole={onAddRole}
            onDeleteRole={onDeleteRole}
            triggerToast={triggerToast}
          />

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
                <Clock className="text-red-600 w-4.5 h-4.5" /> Global Vehicle Reservation Duration Settings
              </h3>
              <p className="text-xs text-neutral-500 mb-6">
                Define the default lock period (in hours) when a vehicle is marked as "Reserved". All active reservations will retain their original expiry timestamp. Changing this setting will only affect new reservations.
              </p>
              
              <div className="max-w-xs flex items-center space-x-3">
                <div className="relative rounded-lg shadow-sm flex-1">
                  <input
                    type="number"
                    min="1"
                    max="8760"
                    value={adminHoursInput}
                    onChange={(e) => setAdminHoursInput(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={currentRole.id !== 'Admin'}
                    className="w-full pl-3 pr-16 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold disabled:bg-neutral-50"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-neutral-500 text-xs font-mono">HOURS</span>
                  </div>
                </div>
                {currentRole.id === 'Admin' && (
                  <button
                    onClick={async () => {
                      await onUpdateReservationHours(adminHoursInput);
                      triggerToast(`Reservation period updated to ${adminHoursInput} hours successfully!`, "success");
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
                  >
                    Save Configuration
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
                <FileText className="text-red-600 w-4.5 h-4.5" /> Proforma Invoice (PI) Reservation Duration Settings
              </h3>
              <p className="text-xs text-neutral-500 mb-6">
                Define the default lock period (in hours) when a vehicle is automatically marked as "Reserved with PI" after saving a Proforma Invoice. Changing this setting will only affect new Proforma Invoice reservations.
              </p>
              
              <div className="max-w-xs flex items-center space-x-3">
                <div className="relative rounded-lg shadow-sm flex-1">
                  <input
                    type="number"
                    min="1"
                    max="8760"
                    value={adminPiHoursInput}
                    onChange={(e) => setAdminPiHoursInput(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={currentRole.id !== 'Admin'}
                    className="w-full pl-3 pr-16 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold disabled:bg-neutral-50"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-neutral-500 text-xs font-mono">HOURS</span>
                  </div>
                </div>
                {currentRole.id === 'Admin' && (
                  <button
                    onClick={async () => {
                      await onUpdatePiReservationHours(adminPiHoursInput);
                      triggerToast(`Proforma Invoice reservation period updated to ${adminPiHoursInput} hours successfully!`, "success");
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
                  >
                    Save Configuration
                  </button>
                )}
              </div>
            </div>

            {/* USER ACCOUNTS MANAGER SECTION */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 mt-6">
              <div className="border-b border-neutral-100 pb-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
                  <Users className="text-red-600 w-4.5 h-4.5" /> System User Directory & Account Creation
                </h3>
                <p className="text-xs text-neutral-500">
                  Manage active user credentials, view assigned security roles, and create new authorized accounts with system-generated secure passwords.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Create User Form */}
                <form onSubmit={handleCreateUser} className="lg:col-span-5 bg-neutral-50/50 rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-red-600" /> Create Authorized User
                  </h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., John Doe"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g., john@carchief.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Assigned Security Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-bold cursor-pointer"
                    >
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} ({role.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-neutral-600 uppercase">User Password</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          title="Auto-generate a strong password"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-Generate
                        </button>
                        <span className="text-neutral-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearPassword}
                          className="text-[10px] text-neutral-500 font-bold hover:text-red-600 hover:underline cursor-pointer"
                          title="Clear password to enter custom password"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-lg shadow-sm">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Type custom password or click Auto-Generate"
                        className="w-full text-xs font-mono font-bold border border-neutral-300 rounded-lg pl-3 pr-24 p-2.5 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
                        {/* Copy Password Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (newUserPassword) {
                              navigator.clipboard.writeText(newUserPassword);
                              triggerToast("Password copied to clipboard!", "success");
                            }
                          }}
                          className="bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 px-2 py-1 rounded-md text-[10px] font-bold font-sans flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                          title="Copy Password"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        {/* Toggle visibility */}
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="text-neutral-500 hover:text-neutral-700 p-1 cursor-pointer"
                          title={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 font-sans">
                      Auto-generated by default. You can edit or remove it to assign a custom password, or click Auto-Generate.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={userCreationLoading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 text-white font-bold p-3 rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {userCreationLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        Register Account & Sync
                      </>
                    )}
                  </button>
                </form>

                {/* Right Column: Registered Users List Table */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-red-600" /> Active System Users ({systemUsers.length})
                    </h4>
                    <span className="text-[10px] font-bold bg-neutral-100 border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded font-mono">
                      REALTIME SYNCED
                    </span>
                  </div>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200 text-[10px] uppercase font-mono tracking-wider">
                            <th className="py-3 px-4">User Info</th>
                            <th className="py-3 px-4">Assigned Role</th>
                            <th className="py-3 px-4">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-sans">
                          {usersLoading ? (
                            <tr>
                              <td colSpan={3} className="text-center py-10 text-neutral-400 font-mono text-[10px]">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                                Loading user directories from secure store...
                              </td>
                            </tr>
                          ) : systemUsers.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center py-10 text-neutral-400 font-mono text-[10px]">
                                No system users found.
                              </td>
                            </tr>
                          ) : (
                            systemUsers.map((user) => {
                              return (
                                <tr key={user.id} className="hover:bg-neutral-50/50 transition-all">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-neutral-400" />
                                      {user.name}
                                    </div>
                                    <div className="text-neutral-400 font-mono text-[10px] mt-0.5 flex items-center gap-1.5">
                                      {user.email}
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(user.email);
                                          triggerToast("Email copied to clipboard!", "success");
                                        }}
                                        className="hover:text-red-500 p-0.5 cursor-pointer text-neutral-400"
                                        title="Copy Email Address"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <select
                                      value={user.role || 'Guest'}
                                      onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                                      className="text-xs font-bold border border-neutral-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-sm text-neutral-800 font-mono"
                                      title="Click to reassign user security role"
                                    >
                                      {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                          {role.name} ({role.id})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3.5 px-4 text-neutral-500 font-mono text-[10px]">
                                    {formatDate(user.createdAt)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}


      {/* CSV INTEGRATED SOURCING MODULE */}
      {activeTab === 'csv' && (
        <div className="space-y-8">
          {isEditing === 'new' ? (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6">
              <form onSubmit={handleSaveVehicle} className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-150">
                  <h3 className="text-sm font-bold uppercase text-red-600 tracking-wider">
                    Manually Register Model
                  </h3>
                  <button 
                    type="button" 
                    onClick={resetForm} 
                    className="text-xs text-neutral-400 hover:text-neutral-600 font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>

                {/* Input Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label htmlFor="csv-form-make" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Make / Brand *</label>
                    <input
                      id="csv-form-make"
                      type="text"
                      required
                      placeholder="e.g., Porsche"
                      value={formMake}
                      onChange={(e) => setFormMake(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="csv-form-model" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Model Name *</label>
                    <input
                      id="csv-form-model"
                      type="text"
                      required
                      placeholder="e.g., 911 Carrera S"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="csv-form-year" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Manufacture Year *</label>
                    <input
                      id="csv-form-year"
                      type="number"
                      required
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>

                  <div>
                    <label htmlFor="csv-form-price" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">MSRP Price (USD) *</label>
                    <input
                      id="csv-form-price"
                      type="number"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="csv-form-mileage" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Mileage (Miles) *</label>
                    <input
                      id="csv-form-mileage"
                      type="number"
                      required
                      value={formMileage}
                      onChange={(e) => setFormMileage(Number(e.target.value))}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="csv-form-condition" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Condition Class *</label>
                    <select
                      id="csv-form-condition"
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value as any)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    >
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                      <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="csv-form-type" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Vehicle Type *</label>
                    <select
                      id="csv-form-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Hypercar">Hypercar</option>
                      <option value="Convertible">Convertible</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Wagon">Wagon</option>
                      <option value="Truck">Truck</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="csv-form-transmission" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Transmission *</label>
                    <select
                      id="csv-form-transmission"
                      value={formTransmission}
                      onChange={(e) => setFormTransmission(e.target.value as any)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                      <option value="Dual-Clutch">Dual-Clutch</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="csv-form-fuel-type" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Fuel Type *</label>
                    <select
                      id="csv-form-fuel-type"
                      value={formFuelType}
                      onChange={(e) => setFormFuelType(e.target.value as any)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="csv-form-color" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Exterior Paint *</label>
                    <input
                      id="csv-form-color"
                      type="text"
                      required
                      placeholder="e.g., Guards Red"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="csv-form-engine" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Engine Specification *</label>
                    <input
                      id="csv-form-engine"
                      type="text"
                      required
                      placeholder="e.g., 3.8L Twin-Turbo Flat-6"
                      value={formEngine}
                      onChange={(e) => setFormEngine(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="csv-form-status" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Showroom Status *</label>
                    <select
                      id="csv-form-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    >
                      <option value="Available">Available</option>
                      <option value="Pending">Pending</option>
                      <option value="Sold">Sold</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="csv-form-description" className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Full Description Specification *</label>
                  <textarea
                    id="csv-form-description"
                    required
                    rows={3}
                    placeholder="Enter premium copy description of vehicle highlights..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-neutral-50 resize-none"
                  />
                </div>

                {/* ADVANCED CUSTOM FIELDS COLLAPSIBLE EXPANSION */}
                <div className="border border-neutral-150 rounded-xl overflow-hidden bg-neutral-50/50">
                  <button
                    type="button"
                    onClick={() => setShowExtraFields(!showExtraFields)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-neutral-100 hover:bg-neutral-150 transition-colors text-xs font-bold uppercase text-neutral-700 tracking-wider"
                  >
                    <span>Show All Custom Spec Fields ({showExtraFields ? 'Hide' : 'Expand 30+ Fields'})</span>
                    <span className="text-[10px] text-red-600 font-mono">
                      {showExtraFields ? '▲' : '▼'}
                    </span>
                  </button>
                  {showExtraFields && (
                    <div className="p-4 bg-white border-t border-neutral-150">
                      <ExtraFieldsEditorGrid
                        values={formExtra}
                        onChange={setFormExtra}
                      />
                    </div>
                  )}
                </div>

                {/* PICTURES / HIGH-QUALITY IMAGES MODULES */}
                <CategorizedImageManager
                  auctionPictures={formAuctionPictures}
                  auctionSheet={formAuctionSheet}
                  japanPictures={formJapanPictures}
                  durbanPictures={formDurbanPictures}
                  showAuctionPictures={formShowAuctionPictures}
                  showJapanPictures={formShowJapanPictures}
                  showDurbanPictures={formShowDurbanPictures}
                  onChange={(updated) => {
                    setFormAuctionPictures(updated.auctionPictures);
                    setFormAuctionSheet(updated.auctionSheet);
                    setFormJapanPictures(updated.japanPictures);
                    setFormDurbanPictures(updated.durbanPictures);
                    setFormShowAuctionPictures(updated.showAuctionPictures);
                    setFormShowJapanPictures(updated.showJapanPictures);
                    setFormShowDurbanPictures(updated.showDurbanPictures);
                  }}
                  onGeneratePresets={generatePresetImg}
                />

                <button
                  type="submit"
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors"
                >
                  Commit Specification Record
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Manually Register New Vehicle Button Card */}
              {currentRole.permissions.canEditInventory && (
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-1">Manual Inventory Registration</h4>
                    <p className="text-xs text-neutral-500">Would you prefer to manually register a new vehicle specifications record instead of a bulk spreadsheet?</p>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsEditing('new');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-red-600/10 flex items-center gap-2 transition-colors uppercase text-xs tracking-wider whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manually Register New Vehicle</span>
                  </button>
                </div>
              )}

              {!currentRole.permissions.canUploadCSV ? (
                <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center max-w-2xl mx-auto shadow-md space-y-4">
                  <div className="bg-neutral-950 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                    Bulk Sourcing Restricted
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-md mx-auto">
                    Your current role, <b className="text-neutral-800 uppercase">{currentRole.name}</b>, is not configured with the <b>Bulk CSV Import</b> privilege. 
                  </p>
                  <p className="text-xs text-neutral-400">
                    To grant access, switch to an Administrator role or toggle the permission inside the <span className="font-bold text-red-600">Roles Control</span> matrix.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-100 pb-4 mb-6 gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                      <FileSpreadsheet className="text-red-600 w-4.5 h-4.5" /> CSV Bulk Sourcing Portal
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Directly import large logistics batches or map vehicle shipment details using reference numbers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Import Engine Online</span>
                  </div>
                </div>

                {/* Sub Tab Selection */}
                <div className="flex border-b border-neutral-100 mb-6">
                  <button
                    onClick={() => {
                      setCsvUploadType('vehicles');
                      setCsvError('');
                      setCsvSuccess('');
                      setParsedCsvCount(null);
                      setParsedVehicles([]);
                    }}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all mr-6 ${
                      csvUploadType === 'vehicles'
                        ? 'border-red-600 text-red-600 font-extrabold'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Vehicle Sourcing Import
                  </button>
                  <button
                    onClick={() => {
                      setCsvUploadType('shipment');
                      setCsvError('');
                      setCsvSuccess('');
                      setParsedCsvCount(null);
                      setParsedShipments([]);
                    }}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      csvUploadType === 'shipment'
                        ? 'border-red-600 text-red-600 font-extrabold'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Shipment Details Master Upload
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* File Upload Zone */}
                  <div className="lg:col-span-5 space-y-4">
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Logistics Sheet Dropzone</label>
                    <div 
                      className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 hover:border-red-500 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50 flex flex-col items-center justify-center min-h-[220px]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <Download className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-800">
                        {csvUploadType === 'vehicles' ? 'Select logistics sheet' : 'Select shipment master sheet'}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] leading-relaxed">
                        Drag and drop your CSV spreadsheet here or click to browse. Supports UTF-8 format.
                      </p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            if (csvUploadType === 'vehicles') {
                              handleCsvFile(f);
                            } else {
                              handleShipmentCsvFile(f);
                            }
                          }
                        }}
                        className="hidden" 
                        accept=".csv"
                      />
                    </div>

                    {csvUploadType === 'vehicles' ? (
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-150 space-y-2">
                        <span className="block text-[10px] font-bold text-neutral-600 uppercase">Sourcing Metadata Guidelines:</span>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                          Our intelligent importer automatically maps <code className="font-bold text-neutral-700">Make</code>, <code className="font-bold text-neutral-700">Model</code>, <code className="font-bold text-neutral-700">YearMonth</code>, <code className="font-bold text-neutral-700">Mileage</code>, <code className="font-bold text-neutral-700">Transmission</code>, <code className="font-bold text-neutral-700">STK Number</code>, and <code className="font-bold text-neutral-700">ReferenceNo</code>. Blank prices are automatically estimated based on high-end luxury market valuation benchmarks.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-150 space-y-2 animate-in fade-in duration-300">
                        <span className="block text-[10px] font-bold text-neutral-600 uppercase">Shipment Mapping Guidelines:</span>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                          Provide a CSV file with reference mappings. Our importer will align shipment parameters directly to active vehicles. Required headers (case-insensitive):
                        </p>
                        <ul className="text-[10px] text-neutral-500 space-y-1 list-disc list-inside">
                          <li><code className="font-bold text-neutral-700">Reference No</code> (Primary key matching existing vehicles)</li>
                          <li><code className="font-bold text-neutral-700">Ship Method</code> (Shipment Method)</li>
                          <li><code className="font-bold text-neutral-700">Shipping Company</code> (Shipping Company)</li>
                          <li><code className="font-bold text-neutral-700">Departure Vessel</code> (Departure Vessel)</li>
                          <li><code className="font-bold text-neutral-700">Departure Voyage</code> (Departure Voyage)</li>
                          <li><code className="font-bold text-neutral-700">ETD Date</code> (ETD Date)</li>
                          <li><code className="font-bold text-neutral-700">ETA Date</code> (ETA Date)</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Parse Results Preview Panel */}
                  <div className="lg:col-span-7 space-y-4">
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Verification Pipeline</label>
                    
                    {csvUploadType === 'vehicles' ? (
                      !parsedCsvCount || parsedVehicles.length === 0 ? (
                        <div className="border border-neutral-100 rounded-2xl p-12 text-center text-neutral-400 bg-neutral-50/20 flex flex-col items-center justify-center h-[340px]">
                          <Clock className="w-8 h-8 text-neutral-300 animate-bounce mb-3" />
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pipeline Idle</span>
                          <p className="text-[11px] text-neutral-400 mt-1 max-w-[240px] leading-relaxed">
                            Once you select a CSV, parsed specifications will list here for your verification prior to database insertion.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-mono text-red-600 font-bold uppercase">Logistics Pre-flight Match</span>
                              <h4 className="text-xs font-black text-neutral-900 uppercase">
                                Parsed {parsedCsvCount} items ready for import
                              </h4>
                            </div>
                            <button
                              onClick={triggerImportCsv}
                              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-[10px] transition-colors shadow-md"
                            >
                              Commit & Publish
                            </button>
                          </div>

                          {/* Preview list */}
                          <div className="border border-neutral-150 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-150 text-[10px] font-bold text-neutral-500 font-mono uppercase">
                                  <th className="p-3">STK / Ref</th>
                                  <th className="p-3">Brand & Model</th>
                                  <th className="p-3">Year / Mileage</th>
                                  <th className="p-3">Location & Port</th>
                                  <th className="p-3 text-right">Price (USD)</th>
                                  <th className="p-3 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 text-neutral-700 bg-white">
                                {parsedVehicles.map((v, idx) => (
                                  <tr key={idx} className="hover:bg-neutral-50/50">
                                    <td className="p-3 font-mono">
                                      <span className="font-bold text-neutral-900 block">{v.stkNumber || 'N/A'}</span>
                                      <span className="text-neutral-400 text-[9px]">{v.referenceNo || 'N/A'}</span>
                                    </td>
                                    <td className="p-3">
                                      <span className="font-semibold text-neutral-800 block">{v.make} {v.model}</span>
                                      <span className="text-[10px] text-neutral-400 font-mono">{v.type}</span>
                                    </td>
                                    <td className="p-3 font-mono">
                                      <span className="text-neutral-800 block">{v.year}</span>
                                      <span className="text-neutral-400 text-[10px]">{v.mileage.toLocaleString()} km</span>
                                    </td>
                                    <td className="p-3">
                                      <span className="text-neutral-800 font-medium block">{v.stockLocation || 'Stock'}</span>
                                      <span className="text-neutral-400 text-[10px] font-mono">{v.port || 'Port'}</span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-red-600 font-mono">
                                      ${v.price.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCsvIndex(idx);
                                          setEditingCsvVehicle({ ...v });
                                        }}
                                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded transition-all"
                                        title="Edit & Add Photos"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    ) : (
                      !parsedCsvCount || parsedShipments.length === 0 ? (
                        <div className="border border-neutral-100 rounded-2xl p-12 text-center text-neutral-400 bg-neutral-50/20 flex flex-col items-center justify-center h-[340px]">
                          <Clock className="w-8 h-8 text-neutral-300 animate-bounce mb-3" />
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pipeline Idle</span>
                          <p className="text-[11px] text-neutral-400 mt-1 max-w-[240px] leading-relaxed">
                            Once you select a Shipment CSV, parsed records with matched vehicle names will display here prior to database update.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-mono text-red-600 font-bold uppercase">Shipment Master Pre-flight Match</span>
                              <h4 className="text-xs font-black text-neutral-900 uppercase">
                                Parsed {parsedShipments.length} records ready for updates
                              </h4>
                            </div>
                            <button
                              onClick={commitShipmentDetails}
                              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-[10px] transition-colors shadow-md"
                            >
                              Commit Shipment Details
                            </button>
                          </div>

                          {/* Preview list */}
                          <div className="border border-neutral-150 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto animate-in fade-in duration-300">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-150 text-[10px] font-bold text-neutral-500 font-mono uppercase">
                                  <th className="p-3">Ref No</th>
                                  <th className="p-3">Matched Vehicle</th>
                                  <th className="p-3">Ship Method & Co.</th>
                                  <th className="p-3">Vessel & Voyage</th>
                                  <th className="p-3">ETD / ETA Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 text-neutral-700 bg-white">
                                {parsedShipments.map((s, idx) => (
                                  <tr key={idx} className="hover:bg-neutral-50/50">
                                    <td className="p-3 font-mono font-bold text-neutral-900">
                                      {s.referenceNo}
                                    </td>
                                    <td className="p-3">
                                      {s.matchedVehicleId ? (
                                        <span className="text-green-600 font-semibold">{s.matchedVehicleName}</span>
                                      ) : (
                                        <span className="text-red-500 italic font-medium">⚠️ No Matched Vehicle</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="font-semibold text-neutral-800 block">{s.shipMethod || 'N/A'}</span>
                                      <span className="text-[10px] text-neutral-400 font-mono block">{s.shippingCompany || 'N/A'}</span>
                                    </td>
                                    <td className="p-3">
                                      <span className="text-neutral-800 block font-medium">{s.departureVessel || 'N/A'}</span>
                                      <span className="text-neutral-400 text-[10px] font-mono block">{s.departureVoyage || 'N/A'}</span>
                                    </td>
                                    <td className="p-3 font-mono">
                                      <div><span className="text-[9px] text-neutral-400 mr-1">ETD:</span>{s.etdDate || 'N/A'}</div>
                                      <div><span className="text-[9px] text-neutral-400 mr-1">ETA:</span>{s.etaDate || 'N/A'}</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Feedback status banners */}
                {csvError && (
                  <div className="mt-6 bg-red-50 text-red-800 text-xs p-4 rounded-xl border border-red-150 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                    <span className="font-medium">{csvError}</span>
                  </div>
                )}

                {csvSuccess && (
                  <div className="mt-6 bg-green-50 text-green-800 text-xs p-4 rounded-xl border border-green-150 flex items-center gap-2 animate-bounce">
                    <Check className="w-5 h-5 flex-shrink-0 text-green-600" />
                    <span className="font-medium">{csvSuccess}</span>
                  </div>
                )}
              </div>

              {/* COMMITTED UPLOAD LIST HISTORY (Uploaded list below CSV file) */}
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6">
                <div className="border-b border-neutral-100 pb-3 mb-5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                    Sourced Stream History
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Live list of imported vehicles committed to the cloud database registry in this active management session.
                  </p>
                </div>

                {lastUploadedVehicles.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 font-medium text-xs space-y-1">
                    <p>No bulk uploads registered in this session.</p>
                    <p className="text-[11px] text-neutral-400 font-normal">When you successfully parse and click "Commit & Publish" above, they will display below.</p>
                  </div>
                ) : (
                  <div className="border border-neutral-150 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-150 text-[10px] font-bold text-neutral-500 font-mono uppercase">
                          <th className="py-4 px-5">STK / Ref Code</th>
                          <th className="py-4 px-5">Make & Model</th>
                          <th className="py-4 px-5">Sourcing Metrics</th>
                          <th className="py-4 px-5">Geographic Logistics</th>
                          <th className="py-4 px-5">Included Accessories</th>
                          <th className="py-4 px-5 text-right">Price (USD)</th>
                          <th className="py-4 px-5 text-center">Cloud Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-700 bg-white">
                        {lastUploadedVehicles.map((v, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="py-4 px-5 font-mono">
                              <span className="font-bold text-neutral-900 block">{v.stkNumber || 'N/A'}</span>
                              <span className="text-neutral-400 text-[10px]">{v.referenceNo || 'N/A'}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-bold text-neutral-900 block">{v.year} {v.make} {v.model}</span>
                              <span className="text-neutral-400 text-[10px] font-mono">{v.type} ({v.color})</span>
                            </td>
                            <td className="py-4 px-5 font-mono text-neutral-600">
                              <span className="block"><span className="text-neutral-400 font-sans">Mileage:</span> {v.mileage.toLocaleString()} km</span>
                              <span className="block text-[10px]"><span className="text-neutral-400 font-sans">Model Code:</span> {v.engine || 'N/A'}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-semibold text-neutral-800 block">{v.stockLocation || 'Sourced'}</span>
                              <span className="text-neutral-400 text-[10px] font-mono">{v.port || 'Port'}</span>
                            </td>
                            <td className="py-4 px-5 max-w-[200px] truncate">
                              <span className="text-neutral-500 italic text-[11px]">{v.accessories || 'Standard options'}</span>
                            </td>
                            <td className="py-4 px-5 text-right font-black text-red-600 font-mono text-sm">
                              ${v.price.toLocaleString()}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className="bg-green-100 text-green-700 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">
                                Published
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )}

      {/* ADMIN MASTER CONTROLS MODULE */}
      {activeTab === 'masters' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminMasterControls />
        </div>
      )}

      {/* FREIGHT CALCULATOR MAPPING MODULE */}
      {activeTab === 'freight_mapping' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FreightMappingManager />
        </div>
      )}

      {/* CITY DELIVERY RATE MAPPING MODULE */}
      {activeTab === 'city_delivery' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CityDeliveryManager />
        </div>
      )}

      {/* CUSTOMER TIERS CONFIG MASTER MODULE */}
      {activeTab === 'customer_tiers' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminCustomerTiers />
        </div>
      )}

      {/* CUSTOMER PORTAL MANAGEMENT MODULE */}
      {activeTab === 'customer_management' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminCustomerManagement vehicles={vehicles} currentRole={currentRole} />
        </div>
      )}

      {/* CMS BRANDING MODULE */}
      {activeTab === 'cms' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CmsBrandingManager branding={branding} onUpdateBranding={onUpdateBranding} />
        </div>
      )}

      {/* FAQ KNOWLEDGE MANAGEMENT MODULE */}
      {activeTab === 'faq_mgmt' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminFAQManager />
        </div>
      )}

      {/* FIRESTORE AUDIT & LOOP PROTECTION DASHBOARD */}
      {activeTab === 'firestore_audit' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <FirestoreAuditPanel />
        </div>
      )}

      {/* PRE-COMMIT CSV ROW EDITING & IMAGE UPLOADER MODAL */}
      {editingCsvIndex !== null && editingCsvVehicle !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-neutral-900 text-white p-5 flex justify-between items-center border-b border-neutral-800">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500">
                  Sourcing Pre-Commit Editor
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Edit CSV Record: {editingCsvVehicle.make} {editingCsvVehicle.model}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setEditingCsvIndex(null);
                  setEditingCsvVehicle(null);
                }}
                className="text-neutral-400 hover:text-white bg-neutral-800 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
              
              {/* IMAGE MANAGER ZONE */}
              <CategorizedImageManager
                auctionPictures={editingCsvVehicle.auctionPictures || []}
                auctionSheet={editingCsvVehicle.auctionSheet || []}
                japanPictures={editingCsvVehicle.japanPictures || []}
                durbanPictures={editingCsvVehicle.durbanPictures || []}
                showAuctionPictures={editingCsvVehicle.showAuctionPictures !== false}
                showJapanPictures={editingCsvVehicle.showJapanPictures !== false}
                showDurbanPictures={editingCsvVehicle.showDurbanPictures !== false}
                onChange={(updated) => {
                  const computedImages: string[] = [];
                  if (updated.showAuctionPictures && updated.auctionPictures.length > 0) {
                    computedImages.push(...updated.auctionPictures);
                  }
                  if (updated.showJapanPictures && updated.japanPictures.length > 0) {
                    computedImages.push(...updated.japanPictures);
                  }
                  if (updated.showDurbanPictures && updated.durbanPictures.length > 0) {
                    computedImages.push(...updated.durbanPictures);
                  }

                  setEditingCsvVehicle({
                    ...editingCsvVehicle,
                    auctionPictures: updated.auctionPictures,
                    auctionSheet: updated.auctionSheet,
                    japanPictures: updated.japanPictures,
                    durbanPictures: updated.durbanPictures,
                    showAuctionPictures: updated.showAuctionPictures,
                    showJapanPictures: updated.showJapanPictures,
                    showDurbanPictures: updated.showDurbanPictures,
                    images: computedImages.length > 0 ? computedImages : (updated.auctionPictures.length > 0 ? updated.auctionPictures : ['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80']),
                  });
                }}
              />

              {/* CORE VEHICLE DETAILS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Core Vehicle Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Make / Brand *</label>
                    <input 
                      type="text" 
                      required
                      value={editingCsvVehicle.make}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, make: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Model *</label>
                    <input 
                      type="text" 
                      required
                      value={editingCsvVehicle.model}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, model: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Year *</label>
                    <input 
                      type="number" 
                      required
                      value={editingCsvVehicle.year}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, year: Number(e.target.value) })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Price (USD) *</label>
                    <input 
                      type="number" 
                      required
                      value={editingCsvVehicle.price}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, price: Number(e.target.value) })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Mileage (km) *</label>
                    <input 
                      type="number" 
                      required
                      value={editingCsvVehicle.mileage}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, mileage: Number(e.target.value) })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Body Style (Type) *</label>
                    <input 
                      type="text" 
                      required
                      value={editingCsvVehicle.type}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, type: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Exterior Color *</label>
                    <input 
                      type="text" 
                      required
                      value={editingCsvVehicle.color}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, color: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Condition *</label>
                    <select
                      value={editingCsvVehicle.condition}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, condition: e.target.value as VehicleCondition })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="New">New</option>
                      <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Transmission *</label>
                    <select
                      value={editingCsvVehicle.transmission}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, transmission: e.target.value as TransmissionType })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                      <option value="Dual-Clutch">Dual-Clutch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Fuel Type *</label>
                    <select
                      value={editingCsvVehicle.fuelType}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, fuelType: e.target.value as FuelType })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Engine / Model Code</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.engine}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, engine: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">STK / Stock Number</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.stkNumber}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, stkNumber: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* DETAILED SOURCING & PORT LOGISTICS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Detailed Logistics & Port Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Reference No</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.referenceNo || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, referenceNo: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Model Code</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.modelCode || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, modelCode: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">VIN / Serial No</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.vinSerialNo || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, vinSerialNo: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Destination Port</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.port || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, port: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Stock Location</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.stockLocation || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, stockLocation: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Current Location</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.currentLocation || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, currentLocation: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Special Offer</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.specialOffer || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, specialOffer: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">BTM / Bottom Price</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.bottomPrice || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, bottomPrice: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Sourcing Accessories & Custom Remarks</label>
                  <textarea 
                    rows={2}
                    value={editingCsvVehicle.accessories || ''}
                    onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, accessories: e.target.value })}
                    className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500 bg-neutral-50"
                    placeholder="Enter lists of accessories (A/C, CD Player, Leather seats, Navigation...)"
                  />
                </div>
              </div>

              {/* TIER PRICING DETAILS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Dealer Tier Valuations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Silver Tier Price</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.silverTierPrice || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, silverTierPrice: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Gold Tier Price</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.goldTierPrice || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, goldTierPrice: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Platinum Tier Price</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.platinumTierPrice || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, platinumTierPrice: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* SHIPPING VOYAGE DETAILS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Voyage Logs & Vessel Carrier Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Ship Method</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.shipMethod || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, shipMethod: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Shipping Company</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.shippingCompany || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, shippingCompany: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">BL Number</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.blNumber || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, blNumber: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Vanning Status</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.vanning || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, vanning: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Departure Vessel</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.departureVessel || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, departureVessel: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Arrival Vessel</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.arrivalVessel || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, arrivalVessel: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Carrier ATD</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.carrierAtd || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, carrierAtd: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Carrier ETA</label>
                    <input 
                      type="text" 
                      value={editingCsvVehicle.carrierEta || ''}
                      onChange={(e) => setEditingCsvVehicle({ ...editingCsvVehicle, carrierEta: e.target.value })}
                      className="w-full text-xs border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* COMPREHENSIVE LOGISTICS SPECIFICATIONS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Full Logistics & Custom Specs Matrix (30+ Fields)
                </h4>
                <ExtraFieldsEditorGrid
                  values={editingCsvVehicle}
                  onChange={(updates) => setEditingCsvVehicle({ ...editingCsvVehicle, ...updates })}
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="bg-neutral-50 p-4 border-t border-neutral-100 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setEditingCsvIndex(null);
                  setEditingCsvVehicle(null);
                }}
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-mono font-bold py-2 px-5 rounded-xl uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingCsvIndex !== null && editingCsvVehicle) {
                    const newList = [...parsedVehicles];
                    newList[editingCsvIndex] = editingCsvVehicle;
                    setParsedVehicles(newList);
                    setEditingCsvIndex(null);
                    setEditingCsvVehicle(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-mono font-bold py-2 px-6 rounded-xl uppercase tracking-wider shadow-md shadow-red-600/10"
              >
                Save Vehicle Specs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal Portal */}
      {confirmModal.isOpen && (
        <div id="custom-confirm-modal" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-neutral-100 overflow-hidden transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center gap-3 text-amber-500 mb-4">
                <AlertCircle className="w-8 h-8 flex-shrink-0" />
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight">{confirmModal.title}</h3>
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold font-mono py-2.5 px-4 rounded-xl uppercase tracking-wider transition-colors"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  try {
                    await confirmModal.onConfirm();
                  } catch (err) {
                    console.error("Action error:", err);
                    triggerToast("Action failed to execute. Try again.", "error");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono py-2.5 px-5 rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-red-600/10"
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification Overlay */}
      {toast.isOpen && (
        <div id="custom-toast-overlay" className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold max-w-sm ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
            toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' :
            'bg-blue-50 text-blue-800 border-blue-100'
          }`}>
            {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            {toast.type === 'info' && <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button 
              type="button"
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
              className="ml-auto text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selectedPiVehicle && (
        <ProformaInvoiceGenerator
          vehicle={selectedPiVehicle}
          leads={leads}
          onClose={() => setSelectedPiVehicle(null)}
          triggerToast={triggerToast}
          onSaved={async (savedInvoice) => {
            const now = new Date();
            const until = new Date(now.getTime() + piReservationHours * 60 * 60 * 1000);
            try {
              await onUpdateVehicle(selectedPiVehicle.id, {
                status: 'Reserved with PI',
                reservedAt: now.toISOString(),
                reservedUntil: until.toISOString(),
                reservationDurationHours: piReservationHours,
                reservedByName: savedInvoice?.buyer?.consigneeName || savedInvoice?.buyer?.companyName || 'Customer',
                reservedByEmail: savedInvoice?.buyer?.email || '',
                reservedCustomerName: savedInvoice?.buyer?.consigneeName || savedInvoice?.buyer?.companyName || 'Customer',
                reservedCustomerEmail: savedInvoice?.buyer?.email || '',
              });
              triggerToast(`${selectedPiVehicle.make} ${selectedPiVehicle.model} is now Reserved with PI for ${piReservationHours} hours!`, 'success');
            } catch (err) {
              console.error("Failed to update vehicle status to Reserved with PI:", err);
            }
            setSelectedPiVehicle(null);
          }}
        />
      )}

      {/* CUSTOM VEHICLE RESERVATION MODAL */}
      {reservingVehicle && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 text-neutral-800">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-[#eef2f7]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shadow-sm border border-amber-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Lock Vehicle Reservation</h3>
                  <p className="text-[11px] text-neutral-500">Hold vehicle in reserve for a client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReservingVehicle(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 hover:bg-neutral-150 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Vehicle Card Summary */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-150 flex gap-4 items-center">
                {reservingVehicle.images?.[0] ? (
                  <img
                    src={reservingVehicle.images[0]}
                    alt={reservingVehicle.model}
                    className="w-16 h-12 object-cover rounded-md border border-neutral-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-12 bg-neutral-100 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-neutral-900 text-xs">
                    {reservingVehicle.year} {reservingVehicle.make} {reservingVehicle.model}
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    STK: <span className="font-mono font-bold text-neutral-700">{reservingVehicle.stkNumber || 'N/A'}</span> • Chassis: <span className="font-mono font-bold text-neutral-700">{reservingVehicle.chassis || 'N/A'}</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">
                    MSRP: ${reservingVehicle.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Customer Name Selection & Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Customer Name <span className="text-red-500">*</span>
                </label>
                
                {/* select from created customers from database */}
                {customers.length > 0 ? (
                  <div className="mb-2">
                    <select
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedCust = customers.find(c => c.id === selectedId);
                        if (selectedCust) {
                          setReservationCustomerName(selectedCust.customerName);
                          setReservationCustomerEmail(selectedCust.email || '');
                          setReservationCustomerId(selectedCust.id);
                          // Auto-select Destination Country as market
                          if (selectedCust.country) {
                            setReservationMarket(selectedCust.country);
                          }
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2 border border-neutral-200 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 border-emerald-200 transition-colors focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Select Customer from Database --</option>
                      {customers
                        .map(cust => (
                          <option key={cust.id} value={cust.id} className="text-neutral-950 font-normal">
                            {cust.customerName} {cust.companyName ? `(${cust.companyName})` : ''} {cust.country ? `• Destination: ${cust.country}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-500 italic mb-2 px-1">
                    No registered customers found in database.
                  </div>
                )}

                {/* select from active leads dropdown */}
                {leads.length > 0 && (
                  <div className="mb-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setReservationCustomerName(e.target.value);
                          const matchedLead = leads.find(l => l.customerName === e.target.value);
                          setReservationCustomerEmail(matchedLead?.customerEmail || '');
                          setReservationCustomerId('');
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2 border border-neutral-200 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors focus:outline-none focus:border-amber-500 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Select Name from Active Leads (Optional) --</option>
                      {Array.from(new Set(leads.map(l => l.customerName).filter(Boolean)))
                        .sort()
                        .map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Or enter custom customer name..."
                  value={reservationCustomerName}
                  onChange={(e) => {
                    setReservationCustomerName(e.target.value);
                    setReservationCustomerEmail('');
                    setReservationCustomerId('');
                  }}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                  required
                />
              </div>

              {/* Market Selection & Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-500" />
                  Destination Market <span className="text-red-500">*</span>
                </label>

                <div className="mb-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setReservationMarket(e.target.value);
                      }
                    }}
                    value={reservationMarket}
                    className="w-full text-xs px-3.5 py-2 border border-neutral-200 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="" disabled>-- Select Popular Destination Market --</option>
                    <option value="East Africa (Kenya, Tanzania, Uganda, Rwanda)">East Africa (Kenya, Tanzania, Uganda, Rwanda)</option>
                    <option value="SADC (Zambia, Zimbabwe, Malawi, Mozambique, Botswana)">SADC (Zambia, Zimbabwe, Malawi, Mozambique, Botswana)</option>
                    <option value="Caribbean (Jamaica, Bahamas, Trinidad & Tobago)">Caribbean (Jamaica, Bahamas, Trinidad & Tobago)</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="South America (Chile, Guyana, Suriname)">South America (Chile, Guyana, Suriname)</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Europe">Europe</option>
                    <option value="Central/North Asia">Central/North Asia</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Or enter custom market / destination country..."
                  value={reservationMarket}
                  onChange={(e) => setReservationMarket(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                  required
                />
              </div>

              {/* Expiry Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-normal">
                  Locking this vehicle reserves it exclusively for your account. It will automatically return to active stock after <span className="font-extrabold">{reservationHours} hours</span> unless converted to a Proforma Invoice.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
              <button
                type="button"
                onClick={() => setReservingVehicle(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!reservationCustomerName.trim()) {
                    triggerToast("Please select or enter a Customer Name.", "error");
                    return;
                  }
                  if (!reservationMarket.trim()) {
                    triggerToast("Please select or enter a Destination Market.", "error");
                    return;
                  }

                  const now = new Date();
                  const until = new Date(now.getTime() + reservationHours * 60 * 60 * 1000);
                  const userEmail = auth.currentUser?.email || 'salesman@carchief.com';
                  const userName = auth.currentUser?.displayName || userEmail.split('@')[0];

                  try {
                    await onUpdateVehicle(reservingVehicle.id, {
                      status: 'Reserved',
                      reservedAt: now.toISOString(),
                      reservedUntil: until.toISOString(),
                      reservedByEmail: userEmail,
                      reservedByName: userName,
                      reservationDurationHours: reservationHours,
                      reservedCustomerName: reservationCustomerName.trim(),
                      customer: reservationCustomerName.trim(),
                      market: reservationMarket.trim(),
                      reservedCustomerEmail: reservationCustomerEmail.trim(),
                      reservedCustomerId: reservationCustomerId
                    });
                    triggerToast(`${reservingVehicle.make} ${reservingVehicle.model} successfully reserved for ${reservationCustomerName.trim()} (${reservationMarket.trim()})!`, 'success');
                  } catch (err) {
                    console.error("Failed to reserve vehicle:", err);
                    triggerToast("Error saving reservation details. Please try again.", "error");
                  }
                  setReservingVehicle(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {previewingInvoice && previewingVehicle && (
        <ProformaInvoiceGenerator
          vehicle={previewingVehicle}
          leads={leads}
          onClose={() => {
            setPreviewingInvoice(null);
            setPreviewingVehicle(null);
            setPreviewingInvoiceEditMode(false);
          }}
          triggerToast={triggerToast}
          proformaInvoice={previewingInvoice}
          initialTab={previewingInvoiceEditMode ? 'edit' : 'preview'}
          onSaved={() => {
            setPreviewingInvoice(null);
            setPreviewingVehicle(null);
            setPreviewingInvoiceEditMode(false);
          }}
        />
      )}

      {/* Backend Slideshow Overlay */}
      {slideshowVehicle && slideshowImages && slideshowImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-neutral-950/98 backdrop-blur-md z-[9999] flex flex-col justify-between p-4 animate-in fade-in duration-200"
          onClick={() => setSlideshowVehicle(null)}
        >
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between text-white border-b border-neutral-800 pb-3 p-2">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-black block">Staff Slideshow Control</span>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider font-display text-neutral-200">
                {slideshowVehicle.year} {slideshowVehicle.make} {slideshowVehicle.model}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
                {slideshowIndex + 1} / {slideshowImages.length}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideshowVehicle(null);
                }}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-red-500 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Stage Section */}
          <div className="flex-1 flex items-center justify-center relative my-4">
            {/* Left Navigation Arrow */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSlideshowIndex((prev) => (prev === 0 ? slideshowImages.length - 1 : prev - 1));
              }}
              className="absolute left-2 sm:left-4 p-3.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white hover:text-red-500 hover:scale-105 transition-all cursor-pointer z-10 shadow-2xl border border-neutral-800"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Displayed Image */}
            <div 
              className="max-w-[92%] max-h-[72vh] flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-900 p-2 border border-neutral-800/55 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={slideshowImages[slideshowIndex]} 
                alt={`${slideshowVehicle.make} ${slideshowVehicle.model} slide`}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded-xl select-none"
              />
            </div>

            {/* Right Navigation Arrow */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSlideshowIndex((prev) => (prev === slideshowImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-2 sm:right-4 p-3.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white hover:text-red-500 hover:scale-105 transition-all cursor-pointer z-10 shadow-2xl border border-neutral-800"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Horizontal Thumbnail Strip Container */}
          <div 
            className="py-3 px-4 bg-neutral-900/40 border border-neutral-800/30 rounded-2xl max-w-4xl mx-auto w-full flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center text-[10px] text-neutral-400 font-semibold px-1 uppercase font-mono">
              <span>Select image to jump</span>
              <span className="text-red-500">Total photos: {slideshowImages.length}</span>
            </div>
            <div className="overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-neutral-800 flex gap-2.5 pb-1">
              {slideshowImages.map((img, idx) => (
                <button
                   key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideshowIndex(idx);
                  }}
                  className={`w-14 sm:w-20 aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    slideshowIndex === idx 
                      ? 'border-red-600 scale-105 shadow-xl shadow-red-600/10' 
                      : 'border-neutral-800 opacity-50 hover:opacity-100 hover:border-neutral-600'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`strip thumbnail ${idx}`} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECURE INTEGRATED DOCUMENT AUDIT LIGHTBOX MODAL */}
      {activePreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 font-sans">
                    {activePreviewTitle || 'TT / SWIFT Payment Receipt'}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">Secure Document Audit Viewer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivePreviewUrl(null);
                  setActivePreviewTitle('');
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-auto flex-1 bg-neutral-100/50 flex flex-col items-center justify-center min-h-[300px]">
              {activePreviewUrl.startsWith('data:image/') || activePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                <div className="relative group max-w-full">
                  <img
                    src={activePreviewUrl}
                    alt="TT Swift receipt proof"
                    className="max-h-[60vh] rounded-lg border border-neutral-200/80 shadow-md object-contain mx-auto bg-white"
                  />
                  <div className="text-center mt-3">
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-2.5 py-1 rounded-full uppercase">
                      Image Document
                    </span>
                  </div>
                </div>
              ) : activePreviewUrl.startsWith('data:application/pdf') || activePreviewUrl.match(/\.pdf/i) ? (
                <div className="w-full h-[60vh] flex flex-col">
                  <object
                    data={activePreviewUrl}
                    type="application/pdf"
                    className="w-full h-full rounded-lg border border-neutral-200 shadow-sm"
                  >
                    <div className="flex flex-col items-center justify-center p-8 bg-white border border-neutral-200 rounded-lg h-full text-center space-y-4">
                      <FileText className="w-12 h-12 text-red-500 animate-bounce" />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800">PDF Document Loaded</h4>
                        <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                          The browser's PDF viewer plugin is active. If the document is not displayed, click the action below to download and inspect it locally.
                        </p>
                      </div>
                      <a
                        href={activePreviewUrl}
                        download="TT-Swift-Receipt-Proof.pdf"
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Download PDF File
                      </a>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-neutral-200 rounded-lg text-center max-w-md space-y-4">
                  <FileText className="w-12 h-12 text-blue-500" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800">Document Package File Loaded</h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      This is a secure data payload document. You can download and read it on your local device.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={activePreviewUrl}
                      download="TT-Receipt-Proof"
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <span className="text-[10px] text-neutral-400 font-mono font-semibold">
                Payload Size: {Math.round(activePreviewUrl.length * 0.75 / 1024)} KB
              </span>
              <div className="flex gap-2">
                <a
                  href={activePreviewUrl}
                  download={
                    activePreviewUrl.startsWith('data:image/')
                      ? 'TT-Receipt-Proof.png'
                      : activePreviewUrl.startsWith('data:application/pdf')
                      ? 'TT-Receipt-Proof.pdf'
                      : 'TT-Receipt-Proof'
                  }
                  className="bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  Download File
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setActivePreviewUrl(null);
                    setActivePreviewTitle('');
                  }}
                  className="bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImageSequencerAndUploader({
  images,
  onChange,
  onGeneratePresets
}: {
  images: string[];
  onChange: (updated: string[]) => void;
  onGeneratePresets?: (type: 'sports' | 'suv' | 'luxury') => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.65): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions keeping aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string); // fallback
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => {
          resolve(event.target?.result as string); // fallback
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        resolve(""); // fallback empty
      };
    });
  };

  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedImages = await Promise.all(
        fileArray.map(file => compressImage(file))
      );
      const validImages = compressedImages.filter(img => img !== "");
      onChange([...(images || []), ...validImages]);
    } catch (err) {
      console.error("Compression error:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset to allow selecting the same file again if removed
    }
  };

  const addUrl = () => {
    if (urlInput.trim() && !(images || []).includes(urlInput.trim())) {
      onChange([...(images || []), urlInput.trim()]);
      setUrlInput('');
    }
  };

  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const temp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = temp;
    onChange(next);
  };

  const moveRight = (idx: number) => {
    if (idx === images.length - 1) return;
    const next = [...images];
    const temp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = temp;
    onChange(next);
  };

  const setAsCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const item = next.splice(idx, 1)[0];
    next.unshift(item);
    onChange(next);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
          Interactive Picture Board & Sequencing Manager
        </span>
        <span className="text-[10px] font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-bold">
          {images.length} Active Photos
        </span>
      </div>

      {/* Drag & Drop Main Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
          dragActive 
            ? 'border-red-500 bg-red-50/50 scale-[0.99] shadow-inner' 
            : 'border-neutral-300 hover:border-neutral-400 bg-white'
        }`}
      >
        {isCompressing ? (
          <div className="flex flex-col items-center py-2">
            <RefreshCw className="w-8 h-8 mb-2 text-red-600 animate-spin" />
            <p className="text-xs font-semibold text-neutral-800">
              Compressing & optimizing pictures...
            </p>
            <p className="text-[10px] text-neutral-400 mt-1">
              Converting and resizing to fit high-performance cloud constraints
            </p>
          </div>
        ) : (
          <>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <ImageIcon className={`w-8 h-8 mb-2 transition-transform ${dragActive ? 'text-red-500 scale-110' : 'text-neutral-400'}`} />
            <p className="text-xs font-semibold text-neutral-800">
              Drag & drop vehicle pictures here or <span className="text-red-600 underline">browse</span>
            </p>
            <p className="text-[10px] text-neutral-400 mt-1">
              Supports PNG, JPG, WEBP • Automatically compressed to bypass size limits
            </p>
          </>
        )}
      </div>

      {/* Manual URL Input Block */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-neutral-200">
        <input
          type="text"
          placeholder="Or paste direct image URL address..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="flex-1 text-xs px-2 focus:outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={addUrl}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-lg tracking-wider"
        >
          Add URL
        </button>
      </div>

      {/* Presets if provided */}
      {onGeneratePresets && (
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="text-neutral-400 font-medium">Quick Preset Photo Injectors:</span>
          <button
            type="button"
            onClick={() => onGeneratePresets('sports')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Sports Spec
          </button>
          <button
            type="button"
            onClick={() => onGeneratePresets('suv')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Elite SUV
          </button>
          <button
            type="button"
            onClick={() => onGeneratePresets('luxury')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> German Luxury
          </button>
        </div>
      )}

      {/* Sequencing & Reordering Zone */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
            <span>Arrange Catalog Sequence</span>
            <span>First photo is the Cover display</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, imgIdx) => (
              <div 
                key={imgIdx} 
                className={`group relative rounded-xl overflow-hidden border bg-neutral-100 transition-all ${
                  imgIdx === 0 
                    ? 'border-red-500 ring-2 ring-red-500/10 shadow-md' 
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* Visual Image */}
                <div className="aspect-[16/10] overflow-hidden">
                  <img 
                    src={imgUrl} 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>

                {/* Index & Badge Overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow ${
                    imgIdx === 0 
                      ? 'bg-red-600 text-white' 
                      : 'bg-black/60 text-white'
                  }`}>
                    {imgIdx === 0 ? 'COVER' : `#${imgIdx + 1}`}
                  </span>
                </div>

                {/* Cover quick action (if not cover) */}
                {imgIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setAsCover(imgIdx)}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-neutral-700 hover:text-red-600 p-1 rounded-full shadow transition-all opacity-0 group-hover:opacity-100"
                    title="Make cover photo"
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeImage(imgIdx)}
                  className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow transition-all opacity-100 lg:opacity-0 group-hover:opacity-100"
                  title="Remove photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Sequencing controller arrows */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {imgIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveLeft(imgIdx)}
                      className="bg-black/75 hover:bg-black text-white p-1 rounded-md shadow transition-colors"
                      title="Move Left / Forward"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                  {imgIdx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveRight(imgIdx)}
                      className="bg-black/75 hover:bg-black text-white p-1 rounded-md shadow transition-colors"
                      title="Move Right / Backward"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExtraFieldsEditorGrid({
  values,
  onChange
}: {
  values: Partial<Vehicle>;
  onChange: (updates: Partial<Vehicle>) => void;
}) {
  const updateField = (key: keyof Vehicle, val: string) => {
    onChange({
      ...values,
      [key]: val
    });
  };

  const sections = [
    {
      title: "1. Core Technical & Mechanical Specifications",
      fields: [
        { key: 'modelCode', label: 'Model Code', placeholder: 'e.g., DBA-GK3' },
        { key: 'engineCode', label: 'Engine Code', placeholder: 'e.g., 2GR-FSE' },
        { key: 'enginesize', label: 'Engine CC / Size', placeholder: 'e.g., 2500 CC' },
        { key: 'displacement', label: 'Engine Displacement', placeholder: 'e.g., 2.5L' },
        { key: 'transmission', label: 'Transmission Spec', placeholder: 'e.g., 6-Speed Manual' },
        { key: 'fuelType', label: 'Fuel Type Spec', placeholder: 'e.g., Petrol / Premium' },
        { key: 'exteriorColor', label: 'Body Color (Exterior)', placeholder: 'e.g., Pearl White' },
        { key: 'color', label: 'Secondary Color Spec', placeholder: 'e.g., White Metallic' },
        { key: 'interiorColor', label: 'Interior Color Spec', placeholder: 'e.g., Black Leather' },
        { key: 'mileage', label: 'Mileage (KM)', placeholder: 'e.g., 45000' },
        { key: 'status', label: 'Showroom Status', placeholder: 'e.g., Available' },
        { key: 'steering', label: 'Steering Position', placeholder: 'e.g., Right Hand Drive (RHD)' },
        { key: 'door', label: 'Doors Count', placeholder: 'e.g., 5' },
        { key: 'passengers', label: 'Seats / Passengers', placeholder: 'e.g., 5' },
        { key: 'driveType', label: 'Drive Type (2WD/4WD)', placeholder: 'e.g., 4WD' },
        { key: 'bodyStyle1', label: 'Body Style 1', placeholder: 'e.g., Hatchback' },
        { key: 'bodyStyle2', label: 'Body Style 2', placeholder: 'e.g., Sedan' },
        { key: 'bodytype', label: 'Body Type', placeholder: 'e.g., SUV' },
        { key: 'versionClass', label: 'Version / Class', placeholder: 'e.g., Hybrid L Package' },
        { key: 'gradeTrimDomestic', label: 'Grade Trim Domestic', placeholder: 'e.g., X Selection' },
        { key: 'vinSerialNo', label: 'VIN / Serial Number', placeholder: 'e.g., JZ120038421' },
        { key: 'createdAt', label: 'Created On (Date)', placeholder: 'YYYY-MM-DD' },
      ]
    },
    {
      title: "2. Commercial, Stock & Sourcing Ledger",
      fields: [
        { key: 'erpStockNo', label: 'Stock Number', placeholder: 'e.g., STK-8821' },
        { key: 'stkNumber', label: 'STK Number Spec', placeholder: 'e.g., STK-9912' },
        { key: 'referenceNo', label: 'Reference Number', placeholder: 'e.g., REF-10293' },
        { key: 'chassis', label: 'Chassis / Frame #', placeholder: 'e.g., GK3-1209384' },
        { key: 'title', label: 'Title / Certificate', placeholder: 'e.g., Clean / Export Certificate' },
        { key: 'btmPrice', label: 'BTM Price (Bottom Price)', placeholder: 'e.g., 45000' },
        { key: 'bottomPrice', label: 'Bottom Price (Value)', placeholder: 'e.g., 45000' },
        { key: 'silverTierPrice', label: 'Silver Tier Price', placeholder: 'e.g., 47000' },
        { key: 'goldTierPrice', label: 'Gold Tier Price', placeholder: 'e.g., 46000' },
        { key: 'platinumTierPrice', label: 'Platinum Tier Price', placeholder: 'e.g., 45000' },
        { key: 'priceDomestic', label: 'Price Domestic', placeholder: 'e.g., 5200000 JPY' },
        { key: 'currency', label: 'Trading Currency', placeholder: 'e.g., USD' },
        { key: 'payTrade', label: 'Pay Trade Status', placeholder: 'e.g., Fully Paid' },
        { key: 'labelStatus', label: 'Label Status (Special)', placeholder: 'e.g., Hot Deal' },
        { key: 'specialOffer', label: 'Special Offer Badge', placeholder: 'e.g., Special Pricing' },
        { key: 'source', label: 'Sourcing / Channel', placeholder: 'e.g., Auction Japan' },
        { key: 'dataSource', label: 'Data Source Origin', placeholder: 'e.g., CSV Import' },
        { key: 'stockLocation', label: 'Stock Location Yard', placeholder: 'e.g., Nagoya Port' },
        { key: 'commandType', label: 'Command Type', placeholder: 'e.g., Import' },
        { key: 'itemType', label: 'Item Type', placeholder: 'e.g., Car' },
        { key: 'domestic', label: 'Domestic Market Flag', placeholder: 'e.g., Yes' },
        { key: 'overseas', label: 'Overseas Market Flag', placeholder: 'e.g., Yes' },
        { key: 'isPostedOption', label: 'Is Posted Option', placeholder: 'e.g., true' },
        { key: 'staff', label: 'Responsible Staff', placeholder: 'e.g., John Doe' },
        { key: 'layingDate', label: 'Laying Date', placeholder: 'YYYY-MM-DD' },
        { key: 'layingCost', label: 'Laying Cost', placeholder: 'e.g., 38000' },
        { key: 'layingCostCurrency', label: 'Laying Cost Currency', placeholder: 'e.g., USD' },
        { key: 'layingSupplier', label: 'Laying Supplier', placeholder: 'e.g., JAA Tokyo' },
      ]
    },
    {
      title: "3. Logistics & Shipping Specifications",
      fields: [
        { key: 'yardIn', label: 'Yard-In Location', placeholder: 'e.g., Yokohama Yard A' },
        { key: 'shipMethod', label: 'Shipment Method', placeholder: 'e.g., RORO / Container' },
        { key: 'shippingCompany', label: 'Shipping Company', placeholder: 'e.g., ONE / NYK Line' },
        { key: 'vanning', label: 'Vanning Method', placeholder: 'e.g., FCL 40ft' },
        { key: 'sealNo', label: 'Seal Number', placeholder: 'e.g., SL-1029384' },
        { key: 'shippingMark', label: 'Shipping Mark', placeholder: 'e.g., TO-MOMBASA' },
        { key: 'stackDate', label: 'Stack Date', placeholder: 'YYYY-MM-DD' },
        { key: 'shippingRemarks', label: 'Shipping Remarks', placeholder: 'e.g., Handle with extreme care' },
        { key: 'countryStock', label: 'Country Stock Location', placeholder: 'e.g., Kenya' },
        { key: 'portStock', label: 'Port Stock Location', placeholder: 'e.g., Mombasa' },
        { key: 'port', label: 'Destination Port', placeholder: 'e.g., Mombasa Port' },
        { key: 'freightAdjustment', label: 'Freight Adjustment Cost', placeholder: 'e.g., 200' },
        { key: 'etdDate', label: 'ETD Date', placeholder: 'YYYY-MM-DD' },
        { key: 'etaDate', label: 'ETA Date', placeholder: 'YYYY-MM-DD' },
        { key: 'ata', label: 'ATA Actual Arrival', placeholder: 'YYYY-MM-DD' },
        { key: 'arrivalVoyage', label: 'Arrival Voyage', placeholder: 'e.g., V.102B' },
        { key: 'arrivalVessel', label: 'Arrival Vessel', placeholder: 'e.g., Pacific Highway' },
        { key: 'carrierAtd', label: 'Carrier ATD (Actual Departure)', placeholder: 'YYYY-MM-DD' },
        { key: 'carrierEta', label: 'Carrier ETA (Expected Arrival)', placeholder: 'YYYY-MM-DD' },
      ]
    },
    {
      title: "4. Booking & Voyage Coordinates",
      fields: [
        { key: 'bookingStatus', label: 'Booking Status', placeholder: 'e.g., Confirmed' },
        { key: 'bookingDate', label: 'Booking Date', placeholder: 'YYYY-MM-DD' },
        { key: 'tripPhase', label: 'Trip Phase', placeholder: 'e.g., Ocean Transit' },
        { key: 'loadEtd', label: 'Load ETD (Departure)', placeholder: 'YYYY-MM-DD' },
        { key: 'blNumber', label: 'BL Number', placeholder: 'e.g., BL-90129384' },
        { key: 'loadPlanReference', label: 'Load Plan Reference', placeholder: 'e.g., LP-9901-A' },
        { key: 'soCutOffDate', label: 'SO Cut-off Date', placeholder: 'YYYY-MM-DD' },
        { key: 'destinationInspectionDate', label: 'Destination Inspection Date', placeholder: 'YYYY-MM-DD' },
        { key: 'departureVessel', label: 'Departure Vessel', placeholder: 'e.g., Green Bay MV' },
        { key: 'departureVoyage', label: 'Departure Voyage', placeholder: 'e.g., V.102A' },
        { key: 'purchasedDate', label: 'Purchased Date', placeholder: 'YYYY-MM-DD' },
        { key: 'mfgYear', label: 'Manufacturing Year/Month', placeholder: 'e.g., 2021/04' },
        { key: 'yearMonth', label: 'Year/Month Specification', placeholder: 'e.g., 2021-04' },
        { key: 'registerYear', label: 'Registration Year/Month', placeholder: 'e.g., 2021/08' },
        { key: 'bookingDateApi', label: 'Booking Date (API)', placeholder: 'YYYY-MM-DD' },
        { key: 'bookingStatusApi', label: 'Booking Status (API)', placeholder: 'e.g., Booked' },
        { key: 'tripPhaseApi', label: 'Trip Phase (API)', placeholder: 'e.g., In Port' },
        { key: 'loadEtdApi', label: 'Load ETD (API)', placeholder: 'YYYY-MM-DD' },
        { key: 'loadReferenceApi', label: 'Load Reference (API)', placeholder: 'e.g., LRA-9218' },
        { key: 'inspectionDate', label: 'Inspection Date', placeholder: 'YYYY-MM-DD' },
        { key: 'inspectionStatus', label: 'Inspection Status', placeholder: 'e.g., Passed' },
        { key: 'reInspectionDate', label: 'Re-Inspection Date', placeholder: 'YYYY-MM-DD' },
        { key: 'reInspectionStatus', label: 'Re-Inspection Status', placeholder: 'e.g., N/A' },
      ]
    },
    {
      title: "5. Physical Dimensions, Accessories & Sourcing Notes",
      fields: [
        { key: 'vehicleWidth', label: 'Vehicle Width (mm)', placeholder: 'e.g., 1695' },
        { key: 'vehicleLength', label: 'Vehicle Length (mm)', placeholder: 'e.g., 4690' },
        { key: 'vehicleHeight', label: 'Vehicle Height (mm)', placeholder: 'e.g., 1425' },
        { key: 'm3', label: 'M3 Volume Size (m³)', placeholder: 'e.g., 11.33' },
        { key: 'accessories', label: 'Sourcing Accessories', placeholder: 'e.g., Navigation, Leather Seats' },
        { key: 'accessoriesRemark', label: 'Accessories Remark', placeholder: 'e.g., Back Camera, Leather Seats' },
        { key: 'otherOptions', label: 'Other Options', placeholder: 'e.g., Alloy Wheels, Sunroof' },
        { key: 'mechanicalProblem', label: 'Mechanical Problems', placeholder: 'e.g., None' },
        { key: 'adminComments', label: 'Admin Comments', placeholder: 'e.g., Reserved for VIP' },
        { key: 'commentsDomestic', label: 'Comments Domestic', placeholder: 'e.g., High demand model' },
        { key: 'salescomment', label: 'Sales Comment / Remarks', placeholder: 'e.g., Best option for export' },
        { key: 'vehicleRemark', label: 'Vehicle Remark', placeholder: 'e.g., Inspected and certified' },
        { key: 'customer', label: 'Reserved Customer', placeholder: 'e.g., John Smith' },
        { key: 'imageFiles', label: 'Image Files List', placeholder: 'e.g., img1.jpg, img2.jpg' },
      ]
    }
  ];

  return (
    <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div>
          <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">
            All Custom Vehicle Fields & Logistics Specifications
          </h4>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            Fill and edit premium logistics parameters that are processed during CSV synchronization.
          </p>
        </div>
        <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded uppercase">
          {sections.reduce((acc, curr) => acc + curr.fields.length, 0)} Active Fields
        </span>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h5 className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-md border border-red-100/50 inline-block">
              {section.title}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1 tracking-tight">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={(values[f.key as keyof Vehicle] as string) || ''}
                    onChange={(e) => updateField(f.key as keyof Vehicle, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
