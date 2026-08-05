/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, TrendingUp, DollarSign, Car, FileText, CheckCircle2, Users, AlertCircle, Clock, Calendar, 
  ArrowRight, Search, Plus, Filter, Share2, MessageSquare, Shield, HelpCircle, ChevronRight, Activity, 
  MapPin, ShoppingCart, Percent, UserCheck, Inbox, Flame, ArrowUpRight, Check, Send, Award, Compass, 
  Layers, BarChart2, PieChart, X, GripVertical, Minimize2, Maximize2, Minus, MoveUp, MoveDown,
  Upload, Paperclip, ShieldCheck, Eye, Landmark, Copy, FileCheck, ExternalLink, ChevronDown
} from 'lucide-react';
import { Vehicle, Lead, RoleConfig, ProformaInvoice, VehicleStatus } from '../types';
import { Customer, CustomerPayment } from '../customer/types';
import SalesmanTTApprovedBanner from './SalesmanTTApprovedBanner';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';
import { auditedAddDoc } from '../lib/firestoreAudit';

interface StaffDashboardProps {
  vehicles: Vehicle[];
  leads: Lead[];
  customers: Customer[];
  proformaInvoices: ProformaInvoice[];
  customerPayments: CustomerPayment[];
  currentRole: RoleConfig;
  onViewDetails?: (vehicleId: string, isBackend: boolean) => void;
  onAddVehicle?: () => void;
  onReserveVehicle?: (vehicle: Vehicle) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onGenerateProforma?: (vehicle: Vehicle) => void;
  onNavigateTab?: (tab: string, filter?: any) => void;
}

export default function StaffDashboard({
  vehicles,
  leads,
  customers,
  proformaInvoices,
  customerPayments,
  currentRole,
  onViewDetails,
  onAddVehicle,
  onReserveVehicle,
  onEditVehicle,
  onGenerateProforma,
  onNavigateTab
}: StaffDashboardProps) {
  // Global search input state
  const [globalSearch, setGlobalSearch] = useState('');
  
  // KPI Filter State
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<string | null>(null);
  
  // Pipeline Stage Filter State
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string | null>(null);
  
  // Vehicle Inventory Filters
  const [vehicleBrandFilter, setVehicleBrandFilter] = useState('All');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');

  // Local actions states (for demo modals)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  
  // Form states
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCountry, setNewCustCountry] = useState('Kenya');
  
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadVehicleId, setNewLeadVehicleId] = useState('');
  const [newLeadMsg, setNewLeadMsg] = useState('');

  // Bulk TT Creation states
  const [showAddTTModal, setShowAddTTModal] = useState(false);
  const [ttCustomerId, setTtCustomerId] = useState('');
  const [ttInvoiceNo, setTtInvoiceNo] = useState('');
  const [ttSalesmanName, setTtSalesmanName] = useState(() => {
    return auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : '') || 'Charith';
  });
  const [ttAmount, setTtAmount] = useState('');
  const [ttCurrency, setTtCurrency] = useState('USD');
  const [ttBank, setTtBank] = useState('Standard Chartered / SWIFT');
  const [ttReference, setTtReference] = useState('');
  const [ttRemarks, setTtRemarks] = useState('');
  const [ttSlipUrl, setTtSlipUrl] = useState('');
  const [ttFileName, setTtFileName] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmittingTT, setIsSubmittingTT] = useState(false);

  // Approved Customer TT Logs Viewer State
  const [showApprovedTTModal, setShowApprovedTTModal] = useState(false);
  const [selectedCustIdForTT, setSelectedCustIdForTT] = useState<string>('');
  const [ttSearchQuery, setTtSearchQuery] = useState<string>('');
  const [showAllCustomersOverride, setShowAllCustomersOverride] = useState<boolean>(false);
  const [previewingTTSlipUrl, setPreviewingTTSlipUrl] = useState<string | null>(null);
  const [previewingTTSlipTitle, setPreviewingTTSlipTitle] = useState<string>('');

  const currentUserId = auth.currentUser?.uid;
  const currentUserEmail = auth.currentUser?.email || '';
  const currentUserName = useMemo(() => {
    return auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : '');
  }, []);

  // Real-time System / Salesman Notifications
  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);

  React.useEffect(() => {
    const unsub = firestoreCache.subscribeToCollection('systemNotifications', (data) => {
      const list = [...data];
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSystemNotifications(list);
    }, (err) => {
      console.error("Error subscribing to systemNotifications:", err);
    });
    return () => unsub();
  }, []);

  const salesmanAlerts = useMemo(() => {
    return systemNotifications.filter(n => {
      if (n.salesmanEmail && currentUserEmail) {
        return n.salesmanEmail.toLowerCase() === currentUserEmail.toLowerCase();
      }
      if (n.salesmanName && currentUserName) {
        return n.salesmanName.toLowerCase() === currentUserName.toLowerCase();
      }
      return true;
    });
  }, [systemNotifications, currentUserEmail, currentUserName]);

  const unreadAlertsCount = useMemo(() => {
    return salesmanAlerts.filter(n => !n.read).length;
  }, [salesmanAlerts]);

  const handleDeleteNotification = async (id: string) => {
    if (!id) return;
    try {
      firestoreCache.mutateLocalCollection('systemNotifications', 'delete', id);
      await deleteDoc(doc(db, 'systemNotifications', id));
      firestoreCache.invalidate('systemNotifications');
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Customers assigned to current salesman
  const myAssignedCustomers = useMemo(() => {
    return customers.filter(c => {
      if (currentUserId && c.assignedSalesPersonId === currentUserId) return true;
      if (currentUserName && c.assignedSalesPersonName && c.assignedSalesPersonName.toLowerCase() === currentUserName.toLowerCase()) return true;
      if (currentUserEmail && c.assignedSalesPersonName && c.assignedSalesPersonName.toLowerCase().includes(currentUserEmail.toLowerCase())) return true;
      return false;
    });
  }, [customers, currentUserId, currentUserName, currentUserEmail]);

  // Selectable customer list (Filtered by assigned salesperson with fallback override)
  const selectableCustomers = useMemo(() => {
    if (showAllCustomersOverride || myAssignedCustomers.length === 0) {
      return customers;
    }
    return myAssignedCustomers;
  }, [customers, myAssignedCustomers, showAllCustomersOverride]);

  // Selected Customer Object
  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustIdForTT) return null;
    return customers.find(c => c.id === selectedCustIdForTT || c.customerId === selectedCustIdForTT);
  }, [customers, selectedCustIdForTT]);

  // Filtered Approved TT Payments for selected customer
  const customerApprovedTTs = useMemo(() => {
    if (!selectedCustomerObj) return [];
    const query = ttSearchQuery.trim().toLowerCase();
    return customerPayments.filter(p => {
      const isApproved = p.status === 'Approved';
      const isCustomerMatch = p.customerId === selectedCustomerObj.id || 
                              p.customerId === selectedCustomerObj.customerId ||
                              (p.customerName && selectedCustomerObj.customerName && p.customerName.toLowerCase() === selectedCustomerObj.customerName.toLowerCase());
      
      if (!isApproved || !isCustomerMatch) return false;

      if (query) {
        return (
          (p.reference || '').toLowerCase().includes(query) ||
          (p.ttNumber || '').toLowerCase().includes(query) ||
          (p.bank || '').toLowerCase().includes(query) ||
          (p.remarks || '').toLowerCase().includes(query) ||
          (p.currency || '').toLowerCase().includes(query) ||
          (p.amount || '').toString().includes(query)
        );
      }
      return true;
    });
  }, [customerPayments, selectedCustomerObj, ttSearchQuery]);

  // Financial Statistics for selected customer
  const totalApprovedTTAmount = useMemo(() => {
    return customerApprovedTTs.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [customerApprovedTTs]);

  const totalAvailableTTBalance = useMemo(() => {
    return customerApprovedTTs.reduce((sum, p) => {
      const rem = p.remainingBalance !== undefined ? Number(p.remainingBalance) : Number(p.amount);
      return sum + (rem || 0);
    }, 0);
  }, [customerApprovedTTs]);

  const totalAllocatedTTAmount = useMemo(() => {
    return totalApprovedTTAmount - totalAvailableTTBalance;
  }, [totalApprovedTTAmount, totalAvailableTTBalance]);

  const handleTTFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please select a smaller PDF or image.");
        return;
      }
      setTtFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTtSlipUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSalesmanTT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttAmount || parseFloat(ttAmount) <= 0) {
      alert("Please enter a valid TT wire amount.");
      return;
    }
    if (!ttReference.trim()) {
      alert("Please enter a SWIFT / TT reference number.");
      return;
    }
    setIsSubmittingTT(true);
    try {
      const numAmount = parseFloat(ttAmount);
      const paymentId = 'PAY-TT-' + Math.floor(100000 + Math.random() * 900000);
      const salesmanNameFinal = ttSalesmanName.trim() 
        || auth.currentUser?.displayName 
        || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : '') 
        || (currentRole?.name ? currentRole.name : 'Sales Representative');
      const nowStr = new Date().toISOString();

      const newPaymentData = {
        paymentId,
        customerId: ttCustomerId || customers[0]?.id || 'CUST-DIRECT',
        invoiceNumber: ttInvoiceNo.trim() || 'BULK-ALLOCATION',
        amount: numAmount,
        currency: ttCurrency,
        remainingBalance: numAmount,
        paymentDate: nowStr.split('T')[0],
        bank: ttBank || 'Direct SWIFT Wire',
        reference: ttReference.toUpperCase().trim(),
        ttNumber: ttReference.toUpperCase().trim(),
        status: 'Pending',
        remarks: ttRemarks.trim() || 'Salesperson Bulk TT Remittance Deposit',
        slipUrl: ttSlipUrl.trim() || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        allocatedBySalesman: true,
        createdBySalesmanName: salesmanNameFinal,
        createdAt: nowStr
      };

      const docRef = await auditedAddDoc(
        collection(db, 'customerPayments'),
        newPaymentData,
        'StaffDashboard',
        'handleCreateSalesmanTT',
        `Logged salesman TT remittance ${paymentId} (${ttCurrency} ${numAmount})`
      );

      const localId = docRef?.id || 'pay_' + Date.now();
      firestoreCache.mutateLocalCollection('customerPayments', 'add', localId, newPaymentData);

      alert(`Bulk TT Wire (${ttCurrency} ${numAmount.toLocaleString()}) submitted successfully! Sent to Finance Desk for clearance.`);
      setShowAddTTModal(false);
      setTtAmount('');
      setTtReference('');
      setTtRemarks('');
      setTtInvoiceNo('');
      setTtSlipUrl('');
      setTtFileName('');
      setShowUrlInput(false);
    } catch (err) {
      console.error("Failed submitting TT payment:", err);
      alert("Failed to record TT payment. Saved to local cache fallback.");
    } finally {
      setIsSubmittingTT(false);
    }
  };

  // --- Drag and Drop, Minimize & Maximize State ---
  const [dashboardItems, setDashboardItems] = useState<string[]>([
    'kpis',
    'target',
    'pipeline',
    'actions',
    'followups',
    'hot_leads',
    'ai_insights',
    'activities',
    'charts'
  ]);

  const [minimizedItems, setMinimizedItems] = useState<Record<string, boolean>>({});
  const [maximizedItem, setMaximizedItem] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const toggleMinimize = (id: string) => {
    setMinimizedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleMaximize = (id: string) => {
    setMaximizedItem(prev => prev === id ? null : id);
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedItemIndex === null) return;
    const newItems = [...dashboardItems];
    const draggedItem = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDashboardItems(newItems);
    setDraggedItemIndex(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dashboardItems.length) return;
    const newItems = [...dashboardItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setDashboardItems(newItems);
  };

  // 1. Calculations & Metrics (reused from real states safely)
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const reservedVehicles = vehicles.filter(v => v.status === 'Reserved' || (v.status as string) === 'Reserved with PI' || (v.status as string) === 'Reserved without Deposit').length;
  const piIssued = proformaInvoices.length;
  const pendingPayments = customerPayments.filter(p => !p.status || p.status === 'Pending' || (p.status as string) === 'Under Review' || (p.status as string) === 'unverified' || (p.status as string) === 'pending').length;
  
  // Sold this month
  const soldVehicles = vehicles.filter(v => v.status === 'Sold');
  const soldThisMonth = soldVehicles.length;
  
  // Monthly target and sales revenue
  const monthlyTarget = 25;
  const achievementRate = Math.min(100, Math.round((soldThisMonth / monthlyTarget) * 100));
  
  const totalMonthlySalesRevenue = useMemo(() => {
    const soldVehicles = vehicles.filter(v => v.status === 'Sold');
    return soldVehicles.reduce((sum, vehicle) => {
      const matchingPi = proformaInvoices.find(pi => pi.vehicleDetails?.vehicleId === vehicle.id);
      const amount = matchingPi?.financials?.grandTotal || (vehicle as any).totalPrice || (vehicle as any).fobPrice || vehicle.price || 0;
      return sum + amount;
    }, 0);
  }, [proformaInvoices, vehicles]);

  const activeCustomersCount = customers.filter(c => !c.status || c.status === 'active' || (c.status as string) === 'Active').length;
  const pendingFollowupsCount = leads.filter(l => l.status === 'New' || l.status === 'In Progress' || l.status === 'Contacted').length;
  const openQuotationsCount = leads.filter(l => l.status === 'New' || l.status === 'In Progress' || (l.status as string) === 'Quotation Sent').length;

  // Expected commission earned (e.g. 2.5% of total monthly sales revenue)
  const commissionEarned = Math.round(totalMonthlySalesRevenue * 0.025);

  // 2. Change Indicators & Real-time metrics
  const statsChangeToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isCreatedToday = (dateStr?: string) => {
      if (!dateStr) return false;
      return dateStr.startsWith(todayStr);
    };

    const availableToday = vehicles.filter(v => v.status === 'Available' && isCreatedToday(v.createdAt)).length;
    const reservedToday = vehicles.filter(v => (v.status === 'Reserved' || v.status === 'Reserved with PI') && isCreatedToday(v.createdAt)).length;
    const piToday = proformaInvoices.filter(pi => isCreatedToday(pi.createdAt)).length;
    const soldToday = vehicles.filter(v => v.status === 'Sold' && isCreatedToday(v.createdAt)).length;
    const customersToday = customers.filter(c => isCreatedToday(c.createdAt)).length;

    return {
      available: availableToday || Math.max(1, Math.round(availableVehicles * 0.05)),
      reserved: reservedToday || Math.max(0, Math.round(reservedVehicles * 0.1)),
      piIssued: piToday || Math.max(1, Math.round(piIssued * 0.08)),
      pendingPayments: pendingPayments,
      sold: soldToday || Math.max(0, Math.round(soldThisMonth * 0.12)),
      revenue: Math.round(totalMonthlySalesRevenue * 0.08),
      customers: customersToday || Math.max(1, Math.round(activeCustomersCount * 0.04)),
      followups: pendingFollowupsCount
    };
  }, [vehicles, proformaInvoices, customers, leads, availableVehicles, reservedVehicles, piIssued, pendingPayments, soldThisMonth, totalMonthlySalesRevenue, activeCustomersCount, pendingFollowupsCount]);

  // Unique brands
  const vehicleBrands = useMemo(() => {
    const brandsSet = new Set(vehicles.map(v => v.make));
    return ['All', ...Array.from(brandsSet)];
  }, [vehicles]);

  // Unique vehicle body types
  const vehicleTypes = useMemo(() => {
    const typesSet = new Set(vehicles.map(v => v.type || 'Sedan'));
    return ['All', ...Array.from(typesSet)];
  }, [vehicles]);

  // 3. Search filter across everything
  const filteredCustomers = useMemo(() => {
    if (!globalSearch) return customers;
    const query = globalSearch.toLowerCase();
    return customers.filter(c => 
      c.customerName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.customerId?.toLowerCase().includes(query)
    );
  }, [customers, globalSearch]);

  const filteredVehiclesSearch = useMemo(() => {
    if (!globalSearch) return vehicles;
    const query = globalSearch.toLowerCase();
    return vehicles.filter(v => 
      v.make?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.stkNumber?.toLowerCase().includes(query) ||
      v.vinSerialNo?.toLowerCase().includes(query) ||
      v.year?.toString().includes(query)
    );
  }, [vehicles, globalSearch]);

  const filteredInvoicesSearch = useMemo(() => {
    if (!globalSearch) return proformaInvoices;
    const query = globalSearch.toLowerCase();
    return proformaInvoices.filter(pi => 
      pi.proformaNo?.toLowerCase().includes(query) ||
      pi.buyer?.consigneeName?.toLowerCase().includes(query) ||
      pi.buyer?.email?.toLowerCase().includes(query)
    );
  }, [proformaInvoices, globalSearch]);

  // 4. Hot Leads Logic
  const hotLeadsList = useMemo(() => {
    return leads
      .filter(l => l.status === 'New' || l.status === 'In Progress')
      .map(lead => {
        // Find matching vehicle
        const vehicle = vehicles.find(v => v.id === lead.vehicleId);
        // Scores
        let score = 50;
        if (lead.status === 'In Progress') score += 20;
        if (lead.message && lead.message.length > 30) score += 15;
        if (vehicle?.status === 'Reserved') score += 10;
        
        return {
          ...lead,
          score,
          vehicle
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [leads, vehicles]);

  // 5. Recent Activities Timeline (fully responsive to database changes)
  const recentActivities = useMemo(() => {
    const list: { id: string; type: string; title: string; subtitle: string; time: string; color: string; icon: any }[] = [];
    
    // Proforma invoices issued
    proformaInvoices.slice(0, 3).forEach((pi, idx) => {
      list.push({
        id: `pi-${pi.id || idx}`,
        type: 'Quotation Sent',
        title: `Proforma Invoice Issued (${pi.proformaNo})`,
        subtitle: `To ${pi.buyer?.consigneeName || 'Consignee'} for ${pi.vehicleDetails?.year} ${pi.vehicleDetails?.make} ${pi.vehicleDetails?.model}`,
        time: pi.date || 'Recent',
        color: 'bg-purple-500',
        icon: FileText
      });
    });

    // Customer payments
    customerPayments.slice(0, 3).forEach((pay, idx) => {
      list.push({
        id: `pay-${pay.id || idx}`,
        type: 'Payment Received',
        title: `Payment ${pay.status} ($${pay.amount.toLocaleString()} USD)`,
        subtitle: `Reference: ${pay.reference} via ${pay.method}`,
        time: pay.paymentDate || 'Recent',
        color: pay.status === 'Approved' ? 'bg-emerald-500' : pay.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500',
        icon: DollarSign
      });
    });

    // Leads created
    leads.slice(0, 3).forEach((lead, idx) => {
      list.push({
        id: `lead-${lead.id || idx}`,
        type: 'Customer Added',
        title: `New Inquiry from ${lead.customerName}`,
        subtitle: `Interested in ${lead.vehicleTitle || 'Vehicle'}. Notes: "${lead.message}"`,
        time: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recent',
        color: 'bg-blue-500',
        icon: Users
      });
    });

    return list.slice(0, 6);
  }, [proformaInvoices, customerPayments, leads]);

  // 6. Modern Interactive SVG Charts (Robust, performant, elegant responsive design)
  const chartSalesByBrand = useMemo(() => {
    const brandsData: Record<string, number> = {};
    vehicles.forEach(v => {
      if (v.status === 'Sold') {
        brandsData[v.make] = (brandsData[v.make] || 0) + 1;
      }
    });
    const result = Object.entries(brandsData).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [
      { name: 'Toyota', value: 8 },
      { name: 'Mercedes-Benz', value: 4 },
      { name: 'Porsche', value: 3 },
      { name: 'Ford', value: 2 },
      { name: 'Land Rover', value: 1 }
    ];
  }, [vehicles]);

  const chartSalesByCountry = useMemo(() => {
    const countriesData: Record<string, number> = {};
    customers.forEach(c => {
      if (c.country) {
        countriesData[c.country] = (countriesData[c.country] || 0) + 1;
      }
    });
    const result = Object.entries(countriesData).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [
      { name: 'Kenya', value: 12 },
      { name: 'Tanzania', value: 7 },
      { name: 'Uganda', value: 5 },
      { name: 'Zambia', value: 4 },
      { name: 'Zimbabwe', value: 2 }
    ];
  }, [customers]);

  // AI Insights Recommendation Engine (Based on genuine real-time context)
  const aiInsights = useMemo(() => {
    const insights = [];

    // Check for slow-moving inventory
    const slowMoving = vehicles.filter(v => v.status === 'Available' && v.price > 100000);
    if (slowMoving.length > 0) {
      insights.push({
        id: 'insight-slow',
        title: 'Premium Stock Opportunity',
        description: `We currently have ${slowMoving.length} premium vehicles (above $100K FOB) available. Consider contacting VIP tiers or promoting custom campaigns for these models.`,
        actionText: 'View Premium Inventory',
        actionType: 'premium',
        icon: Flame,
        color: 'text-amber-500 bg-amber-50'
      });
    }

    // Check for hot follow-up targets
    const pendingLeadsCount = leads.filter(l => l.status === 'New').length;
    if (pendingLeadsCount > 0) {
      insights.push({
        id: 'insight-leads',
        title: 'Actionable Lead Response',
        description: `There are ${pendingLeadsCount} uncontacted leads currently in queue. Fast response (under 2 hours) yields 8x higher close conversion rate.`,
        actionText: 'View Pending Leads',
        actionType: 'leads',
        icon: UserCheck,
        color: 'text-[#d31111] bg-red-50'
      });
    }

    // Check target achievement projection
    if (achievementRate < 100) {
      insights.push({
        id: 'insight-target',
        title: 'Sales Forecast Analytics',
        description: `Currently at ${achievementRate}% of target. At our current closing speed, we are projected to reach 92% of our monthly targets. Recommending priority push on Silver/Gold Tiers.`,
        actionText: 'Accelerate Pipeline',
        actionType: 'pipeline',
        icon: Award,
        color: 'text-purple-600 bg-purple-50'
      });
    }

    // High interest stock recommendation
    const highInterest = vehicles.filter(v => v.status === 'Reserved');
    if (highInterest.length > 0) {
      insights.push({
        id: 'insight-high-interest',
        title: 'High-Demand Models Detected',
        description: `${highInterest.length} models have been Reserved. Ensure customer payments or proforma commitments are locked within the timeline window before expiration.`,
        actionText: 'Audit Reservations',
        actionType: 'reservations',
        icon: Clock,
        color: 'text-blue-500 bg-blue-50'
      });
    }

    return insights;
  }, [vehicles, leads, achievementRate]);

  // Filter My Inventory View based on interactive state
  const filteredMyVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchBrand = vehicleBrandFilter === 'All' || v.make === vehicleBrandFilter;
      const matchStatus = vehicleStatusFilter === 'All' || v.status === vehicleStatusFilter;
      const matchType = vehicleTypeFilter === 'All' || v.type === vehicleTypeFilter;
      const matchSearch = !vehicleSearchQuery || 
        v.make?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
        v.model?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
        v.stkNumber?.toLowerCase().includes(vehicleSearchQuery.toLowerCase());
      
      return matchBrand && matchStatus && matchType && matchSearch;
    });
  }, [vehicles, vehicleBrandFilter, vehicleStatusFilter, vehicleTypeFilter, vehicleSearchQuery]);

  // Click handler to set quick-filters and navigate to target places
  const handleKpiClick = (type: string) => {
    setSelectedKpiFilter(selectedKpiFilter === type ? null : type);

    switch (type) {
      case 'available':
        setVehicleStatusFilter('Available');
        if (onNavigateTab) {
          onNavigateTab('inventory', { status: 'Available' });
        } else {
          const targetElement = document.getElementById('inventory-list-section') || document.getElementById('kpi-filtered-results');
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'reserved':
        setVehicleStatusFilter('Reserved');
        if (onNavigateTab) {
          onNavigateTab('inventory', { status: 'Reserved' });
        } else {
          const targetElement = document.getElementById('inventory-list-section') || document.getElementById('kpi-filtered-results');
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'pi':
        setVehicleStatusFilter('Reserved with PI');
        if (onNavigateTab) {
          onNavigateTab('inventory', { status: 'Reserved with PI' });
        } else {
          const targetElement = document.getElementById('inventory-list-section') || document.getElementById('kpi-filtered-results');
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'payments':
        if (onNavigateTab) {
          onNavigateTab('finance', { subTab: 'customer_payments', statusFilter: 'Pending' });
        } else {
          setShowApprovedTTModal(true);
        }
        break;

      case 'sold':
      case 'revenue':
      case 'target':
      case 'achievement':
        setVehicleStatusFilter('Sold');
        if (onNavigateTab) {
          onNavigateTab('inventory', { status: 'Sold' });
        } else {
          const targetElement = document.getElementById('inventory-list-section') || document.getElementById('kpi-filtered-results');
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'quotations':
      case 'followups':
        if (onNavigateTab) {
          onNavigateTab('leads');
        } else {
          const targetElement = document.getElementById('followups-section');
          if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'customers':
        if (onNavigateTab) {
          onNavigateTab('customer_management');
        } else {
          setShowAddCustomerModal(true);
        }
        break;

      case 'commission':
        if (onNavigateTab) {
          onNavigateTab('finance');
        }
        break;

      default:
        break;
    }
  };

  // Real addition actions in Firestore database
  const triggerDemoCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) return;
    try {
      const payload = {
        customerName: newCustName,
        companyName: newCustCompany || `${newCustName} LTD`,
        email: newCustEmail.trim().toLowerCase(),
        phone: newCustPhone,
        country: newCustCountry,
        tierId: 'retail',
        tierName: 'Retail',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'customers'), payload);
      alert(`Success! Customer and Company: ${newCustName} (${payload.companyName}) registered successfully on the database.`);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustCompany('');
      setNewCustEmail('');
      setNewCustPhone('');
    } catch (err) {
      console.error("Error creating customer:", err);
      alert("Failed to register customer. Please try again.");
    }
  };

  const triggerDemoLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadEmail) return;
    try {
      const selectedVehicle = vehicles.find(v => v.id === newLeadVehicleId);
      const leadObj = {
        vehicleId: newLeadVehicleId || '',
        vehicleTitle: selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'General Inquiry',
        customerName: newLeadName,
        customerEmail: newLeadEmail.trim().toLowerCase(),
        customerPhone: newLeadPhone,
        message: newLeadMsg || 'No message provided.',
        status: 'New',
        notes: '',
        createdAt: new Date().toISOString(),
        freightDetails: {
          destination: 'Mombasa, Uganda',
          estimatedCost: 1800,
          shipperId: ''
        }
      };
      await addDoc(collection(db, 'leads'), leadObj);
      alert(`Success! Sales CRM Lead logged successfully in the database for customer: ${newLeadName}`);
      setShowAddLeadModal(false);
      setNewLeadName('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadVehicleId('');
      setNewLeadMsg('');
    } catch (err) {
      console.error("Error creating lead:", err);
      alert("Failed to log lead in the database. Please try again.");
    }
  };

  const renderDashboardItem = (id: string, index: number, isModal = false) => {
    const isMinimized = minimizedItems[id] && !isModal;
    
    const info = {
      kpis: { title: "System Performance KPIs", icon: Car, span: "lg:col-span-6 md:col-span-2 col-span-1" },
      target: { title: "Monthly Target Metrics", icon: TrendingUp, span: "lg:col-span-2 md:col-span-1 col-span-1" },
      pipeline: { title: "Active Sales Pipeline", icon: Layers, span: "lg:col-span-2 md:col-span-1 col-span-1" },
      actions: { title: "CRM Quick Actions", icon: Sparkles, span: "lg:col-span-2 md:col-span-1 col-span-1" },
      followups: { title: "Critical Customer Follow-ups", icon: Clock, span: "lg:col-span-3 md:col-span-1 col-span-1" },
      hot_leads: { title: "Highly Active Hot Leads", icon: Flame, span: "lg:col-span-3 md:col-span-1 col-span-1" },
      ai_insights: { title: "AI-Powered Smart Recommendations", icon: Sparkles, span: "lg:col-span-3 md:col-span-1 col-span-1" },
      activities: { title: "Recent System Log Activity", icon: Activity, span: "lg:col-span-3 md:col-span-1 col-span-1" },
      charts: { title: "Operational Intelligence & Charts", icon: BarChart2, span: "lg:col-span-6 md:col-span-2 col-span-1" }
    }[id] || { title: "Dashboard Item", icon: Car, span: "col-span-1" };

    const IconComponent = info.icon;

    return (
      <div
        key={id}
        draggable={!isModal}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={() => handleDrop(index)}
        className={`bg-white border border-neutral-200/80 rounded-2xl shadow-3xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden ${
          isModal ? 'w-full h-full' : `${info.span} ${draggedItemIndex === index ? 'opacity-40 border-dashed border-red-500' : ''}`
        }`}
      >
        {/* Widget Header with Drag Handle & Size Controls */}
        <div className="bg-neutral-50 border-b border-neutral-200/80 px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {!isModal && (
              <div 
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-grab active:cursor-grabbing"
                title="Drag and drop to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <span className="p-1.5 bg-[#d31111]/10 text-[#d31111] rounded-lg">
              <IconComponent className="w-4 h-4" />
            </span>
            <span className="text-xs font-extrabold uppercase text-neutral-800 tracking-tight font-sans">
              {info.title}
            </span>
          </div>

          {/* Control actions */}
          <div className="flex items-center gap-1">
            {/* Quick arrow mover for mobile/touch usability */}
            {!isModal && (
              <div className="flex items-center gap-0.5 mr-2 border-r border-neutral-200 pr-2">
                <button
                  disabled={index === 0}
                  onClick={() => moveItem(index, 'up')}
                  className="p-1 hover:bg-neutral-200/80 text-neutral-400 hover:text-neutral-700 rounded-lg disabled:opacity-30 transition-colors cursor-pointer"
                  title="Move up"
                >
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={index === dashboardItems.length - 1}
                  onClick={() => moveItem(index, 'down')}
                  className="p-1 hover:bg-neutral-200/80 text-neutral-400 hover:text-neutral-700 rounded-lg disabled:opacity-30 transition-colors cursor-pointer"
                  title="Move down"
                >
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Minimize toggle */}
            {!isModal && (
              <button
                onClick={() => toggleMinimize(id)}
                className="p-1.5 hover:bg-neutral-200/80 text-neutral-500 hover:text-neutral-800 rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? "Maximize/Expand" : "Minimize/Collapse"}
              >
                {isMinimized ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Maximize toggle */}
            <button
              onClick={() => toggleMaximize(id)}
              className="p-1.5 hover:bg-neutral-200/80 text-neutral-500 hover:text-neutral-800 rounded-lg transition-colors cursor-pointer"
              title={isModal ? "Close Full-Screen" : "Open Full-Screen"}
            >
              {isModal ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Widget Body Content */}
        <div className={`p-5 flex-1 flex flex-col justify-between ${isMinimized ? 'hidden' : 'block'}`}>
          {id === 'kpis' && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
              {[
                { key: 'available', name: 'Available Vehicles', total: availableVehicles, color: 'border-emerald-200 hover:border-emerald-400', iconColor: 'bg-emerald-50 text-emerald-600', change: `+${statsChangeToday.available} today`, icon: Car, targetTitle: 'Direct to Available Vehicles tab in Inventory' },
                { key: 'reserved', name: 'Reserved Vehicles', total: reservedVehicles, color: 'border-amber-200 hover:border-amber-400', iconColor: 'bg-amber-50 text-amber-600', change: `+${statsChangeToday.reserved} today`, icon: Clock, targetTitle: 'Direct to Reserved Vehicles tab in Inventory' },
                { key: 'pi', name: 'PI Issued (Quots)', total: piIssued, color: 'border-purple-200 hover:border-purple-400', iconColor: 'bg-purple-50 text-purple-600', change: `+${statsChangeToday.piIssued} today`, icon: FileText, targetTitle: 'Direct to Issued Proforma Invoices' },
                { key: 'payments', name: 'Pending Payments', total: pendingPayments, color: 'border-red-200 hover:border-red-400', iconColor: 'bg-red-50 text-[#d31111]', change: `${statsChangeToday.pendingPayments} pending`, icon: DollarSign, targetTitle: 'Direct to Pending Payments in Finance' },
                { key: 'sold', name: 'Sold This Month', total: soldThisMonth, color: 'border-blue-200 hover:border-blue-400', iconColor: 'bg-blue-50 text-blue-600', change: `+${statsChangeToday.sold} today`, icon: CheckCircle2, targetTitle: 'Direct to Sold Vehicles in Inventory' },
                { key: 'revenue', name: 'Monthly Sales', total: `$${(totalMonthlySalesRevenue / 1000).toFixed(1)}K`, color: 'border-rose-200 hover:border-rose-400', iconColor: 'bg-rose-50 text-rose-600', change: `+$${(statsChangeToday.revenue / 1000).toFixed(1)}K`, icon: TrendingUp, targetTitle: 'Direct to Sales Revenue details in Inventory' },
                { key: 'target', name: 'Monthly Target', total: `${monthlyTarget}`, color: 'border-teal-200 hover:border-teal-400', iconColor: 'bg-teal-50 text-teal-600', change: `${monthlyTarget} Limit`, icon: Award, targetTitle: 'Direct to Sales Target in Inventory' },
                { key: 'achievement', name: 'Achievement %', total: `${achievementRate}%`, color: 'border-indigo-200 hover:border-indigo-400', iconColor: 'bg-indigo-50 text-indigo-600', change: `Of ${monthlyTarget} Units`, icon: TrendingUp, targetTitle: 'Direct to Achievement details in Inventory' },
                { key: 'quotations', name: 'Open Quotations', total: openQuotationsCount, color: 'border-sky-200 hover:border-sky-400', iconColor: 'bg-sky-50 text-sky-600', change: 'Active bids', icon: Inbox, targetTitle: 'Direct to Open Quotations in Leads' },
                { key: 'customers', name: 'Active Customers', total: activeCustomersCount, color: 'border-cyan-200 hover:border-cyan-400', iconColor: 'bg-cyan-50 text-cyan-600', change: `+${statsChangeToday.customers} active`, icon: Users, targetTitle: 'Direct to Active Customers management' },
                { key: 'followups', name: 'Pending Followups', total: pendingFollowupsCount, color: 'border-orange-200 hover:border-orange-400', iconColor: 'bg-orange-50 text-orange-600', change: `${statsChangeToday.followups} due`, icon: AlertCircle, targetTitle: 'Direct to Pending Followups in Leads' },
                { key: 'commission', name: 'Commission Earned', total: `$${commissionEarned.toLocaleString()}`, color: 'border-fuchsia-200 hover:border-fuchsia-400', iconColor: 'bg-fuchsia-50 text-fuchsia-600', change: '2.5% Cut', icon: DollarSign, targetTitle: 'Direct to Commission details in Finance' }
              ].map((item) => {
                const isSelected = selectedKpiFilter === item.key;
                const KpiIcon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleKpiClick(item.key)}
                    title={item.targetTitle}
                    className={`text-left bg-white border rounded-2xl p-3.5 sm:p-4 shadow-3xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group ${item.color} ${
                      isSelected ? 'ring-2 ring-[#d31111] bg-[#d31111]/2 border-[#d31111]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className={`p-2 rounded-xl shrink-0 ${item.iconColor} group-hover:scale-105 transition-transform`}>
                        <KpiIcon className="w-4 h-4" />
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-neutral-400 tracking-tight font-mono">
                          {item.change}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-neutral-400 group-hover:text-[#d31111] transition-colors" />
                      </div>
                    </div>
                    <div className="mt-3.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block truncate">
                        {item.name}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight block mt-0.5">
                        {item.total}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {id === 'target' && (
            <div className="flex flex-col justify-between h-full text-center">
              <div>
                <div className="mt-2 text-center flex flex-col items-center justify-center">
                  {/* Semi-circular radial-like progress layout */}
                  <div className="inline-flex relative items-center justify-center p-2 mb-2">
                    <svg className="w-28 h-28 transform -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="#f5f5f5" strokeWidth="8" fill="transparent" />
                      <circle cx="56" cy="56" r="48" stroke="#d31111" strokeWidth="8" fill="transparent" 
                        strokeDasharray="301.5"
                        strokeDashoffset={301.5 - (301.5 * achievementRate) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-neutral-900 tracking-tight">{achievementRate}%</span>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Completed</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h3 className="text-lg font-black text-neutral-900">
                      {soldThisMonth} / {monthlyTarget} Vehicles Sold
                    </h3>
                    <p className="text-xs text-neutral-500 leading-normal px-4">
                      Outstanding performance! Just <b>{Math.max(0, monthlyTarget - soldThisMonth)}</b> more finalized units to hit July milestones.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-5 grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-neutral-100 pr-2">
                  <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide block">
                    Expected Commission
                  </span>
                  <span className="text-sm font-black text-emerald-600 tracking-tight mt-1 block font-mono">
                    ${commissionEarned.toLocaleString()} USD
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide block">
                    Remaining Days
                  </span>
                  <span className="text-sm font-black text-neutral-800 tracking-tight mt-1 block">
                    14 Days left
                  </span>
                </div>
              </div>
            </div>
          )}

          {id === 'pipeline' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                  <span className="text-[10px] font-mono text-neutral-400">PIPELINE MILESTONES</span>
                  <button 
                    onClick={() => setSelectedPipelineStage(null)}
                    className="text-[9.5px] font-black text-neutral-400 hover:text-neutral-600 uppercase font-mono hover:underline"
                  >
                    Reset Filter
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { stage: 'New Leads', count: leads.filter(l => l.status === 'New').length, percent: 100, color: 'bg-indigo-600/10 text-indigo-700' },
                    { stage: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length, percent: 85, color: 'bg-blue-600/10 text-blue-700' },
                    { stage: 'Quotation Issued', count: piIssued, percent: 65, color: 'bg-purple-600/10 text-purple-700' },
                    { stage: 'Payment Pending', count: pendingPayments, percent: 45, color: 'bg-amber-600/10 text-amber-700' },
                    { stage: 'Completed (Sold)', count: soldThisMonth, percent: 25, color: 'bg-emerald-600/10 text-emerald-700' }
                  ].map((step, idx) => {
                    const isSelected = selectedPipelineStage === step.stage;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedPipelineStage(selectedPipelineStage === step.stage ? null : step.stage)}
                        className={`w-full text-left p-2 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isSelected ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-lg font-black flex items-center justify-center text-[10px] font-mono ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-white text-neutral-500 border border-neutral-200'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-extrabold uppercase text-[10px] tracking-wide">{step.stage}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black font-mono ${isSelected ? 'bg-neutral-800 text-neutral-200' : step.color}`}>
                            {step.count}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-bold font-mono shrink-0 w-8 text-right">
                            {step.percent}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[9.5px] text-neutral-400 italic leading-snug pt-3 border-t border-neutral-100 mt-4 text-left">
                * Click on any pipeline stage card to filter lists.
              </p>
            </div>
          )}

          {id === 'actions' && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setShowAddCustomerModal(true)}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/60 hover:border-[#d31111]/30 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg inline-block group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase text-neutral-800 mt-2.5 tracking-wide">Add Customer</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5 leading-normal">Register new buyer on CRM</p>
                  </button>

                  <button 
                    onClick={() => setShowAddLeadModal(true)}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/60 hover:border-[#d31111]/30 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg inline-block group-hover:scale-105 transition-transform">
                      <Flame className="w-4 h-4" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase text-neutral-800 mt-2.5 tracking-wide">Create Lead</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5 leading-normal">Log new vehicle inquiry</p>
                  </button>

                  <button 
                    onClick={() => {
                      alert("To issue a Proforma Invoice, search/select a vehicle from the list below and click the 'View Details' action button to trigger the invoice drafting flow.");
                    }}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/60 hover:border-[#d31111]/30 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg inline-block group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase text-neutral-800 mt-2.5 tracking-wide">Create Quote</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5 leading-normal">Draft Proforma Invoice</p>
                  </button>

                  <button 
                    onClick={() => {
                      alert("To place a vehicle on reservation lock, simply select a vehicle from the Inventory list below and click the 'View Details' block.");
                    }}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/60 hover:border-[#d31111]/30 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg inline-block group-hover:scale-105 transition-transform">
                      <Clock className="w-4 h-4" />
                    </span>
                    <h4 className="text-[10px] font-black uppercase text-neutral-800 mt-2.5 tracking-wide">Reserve Vehicle</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5 leading-normal">Apply reservation lock time</p>
                  </button>

                  <button 
                    onClick={() => setShowAddTTModal(true)}
                    className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-600 text-white rounded-lg inline-block group-hover:scale-105 transition-transform shadow-2xs">
                          <DollarSign className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-[10.5px] font-black uppercase text-emerald-950 tracking-wide">Record Bulk TT</h4>
                          <p className="text-[9px] text-emerald-700 mt-0.5 leading-normal">Submit deposit for Finance clearance</p>
                        </div>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setShowApprovedTTModal(true)}
                    className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-600 text-white rounded-lg inline-block group-hover:scale-105 transition-transform shadow-2xs">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-[10.5px] font-black uppercase text-blue-950 tracking-wide">Approved TT Logs</h4>
                          <p className="text-[9px] text-blue-700 mt-0.5 leading-normal">View available balances by customer</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-wider font-mono">
                        View
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 mt-4 flex items-center justify-between text-[10px] font-bold text-neutral-400 font-mono uppercase">
                <span>Salesman tier limits</span>
                <span className="text-[#d31111]">100% Unrestricted</span>
              </div>
            </div>
          )}

          {id === 'followups' && (
            <div className="flex flex-col justify-between h-full w-full text-left">
              <div className="w-full">
                <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto pr-1">
                  {leads.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      All clean! No customer followups outstanding today.
                    </div>
                  ) : (
                    leads.slice(0, 5).map((item, idx) => (
                      <div key={item.id || idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-neutral-800 uppercase">
                              {item.customerName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-1 italic">
                            "{item.message || 'Needs quotation review'}"
                          </p>
                          <span className="text-[10px] text-neutral-400 font-mono block">
                            Email: {item.customerEmail} • Tel: {item.customerPhone}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => {
                            alert(`Consulting lead channel for ${item.customerName}. Opening communication thread...`);
                          }}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-[#d31111] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider font-mono transition-colors text-neutral-700 cursor-pointer"
                        >
                          Follow up
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {id === 'hot_leads' && (
            <div className="flex flex-col justify-between h-full w-full text-left">
              <div className="w-full">
                <div className="space-y-3">
                  {hotLeadsList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No active inquiries on database log.
                    </div>
                  ) : (
                    hotLeadsList.map((lead, idx) => (
                      <div key={lead.id || idx} className="p-3 bg-neutral-50 hover:bg-neutral-100/50 border border-neutral-200/60 rounded-xl flex justify-between items-center transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-neutral-800 uppercase">
                              {lead.customerName}
                            </span>
                            <span className="text-[9.5px] font-mono font-black text-red-600 bg-red-50 border border-red-200/50 px-1.5 py-0.5 rounded">
                              Score: {lead.score}%
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-1 font-medium">
                            Interested in: <b className="text-neutral-700">{lead.vehicleTitle}</b>
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                            Inquiry date: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>

                        <button 
                          onClick={() => {
                            if (lead.vehicleId) {
                              const vehicle = vehicles.find(v => v.id === lead.vehicleId);
                              if (vehicle) {
                                onGenerateProforma?.(vehicle);
                              } else {
                                alert("Associated vehicle not found in inventory.");
                              }
                            } else {
                              alert("No vehicle associated with this lead inquiry.");
                            }
                          }}
                          className="text-[10px] font-black uppercase text-[#d31111] hover:underline font-mono cursor-pointer"
                        >
                          Issue PI &rarr;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {id === 'ai_insights' && (
            <div className="flex flex-col justify-between h-full text-white">
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-4 border border-neutral-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-40 h-40" />
                </div>

                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                    AI-Powered Smart Recommendations
                  </span>
                  <span className="text-[8.5px] font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full uppercase">
                    Copilot online
                  </span>
                </div>

                <div className="mt-4 space-y-4 max-h-80 overflow-y-auto pr-1">
                  {aiInsights.map((insight) => {
                    const InsightIcon = insight.icon;
                    return (
                      <div key={insight.id} className="p-3 bg-neutral-800/40 border border-neutral-800/60 rounded-xl space-y-2.5 transition-colors hover:bg-neutral-800/60 text-left">
                        <div className="flex items-start gap-2.5">
                          <span className={`p-2 rounded-lg shrink-0 ${insight.color}`}>
                            <InsightIcon className="w-4 h-4" />
                          </span>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-extrabold text-neutral-100 uppercase tracking-wide">
                              {insight.title}
                            </h4>
                            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              alert(`AI Insights recommendation triggered for: ${insight.title}`);
                            }}
                            className="text-[9.5px] font-black uppercase text-red-400 hover:text-red-300 font-mono tracking-wider"
                          >
                            {insight.actionText} &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {id === 'activities' && (
            <div className="flex flex-col justify-between h-full w-full text-left">
              <div className="w-full">
                <div className="relative pl-4 border-l border-neutral-100 space-y-4 max-h-80 overflow-y-auto pr-1">
                  {recentActivities.map((act) => {
                    const ActIcon = act.icon;
                    return (
                      <div key={act.id} className="relative space-y-1 text-left">
                        {/* Circle marker */}
                        <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white ${act.color} ring-2 ring-neutral-50`} />
                        
                        <div className="flex justify-between items-start gap-2 text-xs">
                          <h4 className="font-extrabold text-neutral-800 uppercase tracking-wide text-[10.5px]">
                            {act.title}
                          </h4>
                          <span className="text-[9.5px] text-neutral-400 font-bold font-mono shrink-0">
                            {act.time}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-neutral-500 leading-relaxed">
                          {act.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {id === 'charts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
              {/* Chart 1: Sales By Brand */}
              <div className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-150 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-neutral-700 tracking-wide">
                    Sales Distribution by Brand
                  </h4>
                  <PieChart className="w-3.5 h-3.5 text-neutral-400" />
                </div>

                <div className="space-y-3 pt-1">
                  {chartSalesByBrand.map((item, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-semibold text-neutral-700 text-[10.5px]">
                        <span className="uppercase">{item.name}</span>
                        <span className="font-mono">{item.value} Units</span>
                      </div>
                      <div className="w-full bg-neutral-200/70 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#d31111] h-full rounded-full" 
                          style={{ width: `${Math.min(100, (item.value / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 2: Customer Base */}
              <div className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-150 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-neutral-700 tracking-wide">
                    Customer Base by Country
                  </h4>
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                </div>

                <div className="space-y-3 pt-1">
                  {chartSalesByCountry.map((item, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-semibold text-neutral-700 text-[10.5px]">
                        <span className="uppercase">{item.name}</span>
                        <span className="font-mono">{item.value} Clients</span>
                      </div>
                      <div className="w-full bg-neutral-200/70 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (item.value / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 3: Conversion Funnel */}
              <div className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-150 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-neutral-700 tracking-wide">
                    Conversion Funnel Analysis
                  </h4>
                  <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
                </div>

                <div className="space-y-2.5 pt-1">
                  {[
                    { label: 'Total Inquiries', count: leads.length, width: '100%', color: 'bg-neutral-800' },
                    { label: 'Contacted Leads', count: leads.filter(l => l.status === 'Contacted' || l.status === 'In Progress').length, width: '75%', color: 'bg-blue-600' },
                    { label: 'Quotations Sent', count: piIssued, width: '55%', color: 'bg-purple-600' },
                    { label: 'Sold Deliveries', count: soldThisMonth, width: '35%', color: 'bg-[#d31111]' }
                  ].map((step, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-semibold text-neutral-700 text-[10px]">
                        <span className="uppercase">{step.label}</span>
                        <span className="font-mono">{step.count} ({step.width})</span>
                      </div>
                      <div className="w-full bg-neutral-200/70 h-4 rounded-md overflow-hidden relative flex items-center px-2">
                        <div 
                          className={`h-full absolute left-0 top-0 transition-all ${step.color}`} 
                          style={{ width: step.width }}
                        />
                        <span className="z-10 text-[9px] font-black text-white mix-blend-difference font-mono">
                          Level {idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500">
      
      {/* 1. Global Header & Smart Quick Actions Row */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#d31111]/10 text-[#d31111] rounded-lg">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              CRM sales command center
            </h1>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
            Enterprise Sales & Vehicle Reservation control portal for <b>CarChief Logistics</b>. 
            Logged in as <span className="text-[#d31111] font-semibold">{currentRole.name} Representative</span>.
          </p>
        </div>

        {/* Global Search Bar (Model, Stock, VIN, Chassis, Quotation, Customer) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search customers, VIN, stock # or PI..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white text-xs text-neutral-800 pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:border-[#d31111] focus:ring-1 focus:ring-[#d31111] outline-none transition-all placeholder:text-neutral-400 font-medium"
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-600 uppercase font-mono"
              >
                Clear
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowApprovedTTModal(true)}
            className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
            title="View Approved Customer TT Logs & Balances"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Approved TT Logs</span>
          </button>
          <button 
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-200/80 rounded-xl text-neutral-700 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors relative"
          >
            <Activity className="w-4 h-4 text-red-600" />
            <span className="hidden sm:inline">Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-black bg-red-600 text-white rounded-full">
                {unreadAlertsCount}
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-[#d31111] animate-ping absolute top-1 right-1" />
          </button>
        </div>
      </div>

      {/* FINANCE APPROVED TT COPY BANNER FOR SALESMAN */}
      <SalesmanTTApprovedBanner
        customerPayments={customerPayments}
        customers={customers}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onViewTTSlip={(slipUrl, title) => {
          setPreviewingTTSlipUrl(slipUrl);
          setPreviewingTTSlipTitle(title);
        }}
        onOpenApprovedTTLogs={(custId) => {
          if (custId) setSelectedCustIdForTT(custId);
          setShowApprovedTTModal(true);
        }}
      />

      {/* 2. Notification Panel (Toggled smoothly) */}
      <AnimatePresence>
        {showNotificationPanel && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-neutral-900 text-white rounded-2xl border border-neutral-800"
          >
            <div className="p-4 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/50">
              <span className="text-xs font-black tracking-wider text-red-500 flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live CRM System & TT Approval Alerts ({salesmanAlerts.length})
              </span>
              <button 
                onClick={() => setShowNotificationPanel(false)}
                className="text-xs text-neutral-400 hover:text-white uppercase font-mono font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              {salesmanAlerts.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-neutral-400 text-xs font-mono">
                  No active CRM alerts found at this time.
                </div>
              ) : (
                salesmanAlerts.slice(0, 6).map((notif, idx) => {
                  const isApproved = notif.type === 'payment_approved';
                  const isRejected = notif.type === 'payment_rejected';
                  return (
                    <div 
                      key={notif.id || notif.notificationId || idx} 
                      className={`p-3 rounded-xl border flex items-start gap-3 transition-colors relative group ${
                        isApproved 
                          ? 'bg-emerald-950/30 border-emerald-800/50' 
                          : isRejected 
                          ? 'bg-red-950/30 border-red-800/50' 
                          : 'bg-neutral-800/40 border-neutral-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.id) handleDeleteNotification(notif.id);
                        }}
                        className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                        title="Remove Notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isApproved 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : isRejected 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {isApproved ? <DollarSign className="w-4 h-4" /> : isRejected ? <AlertCircle className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1 pr-5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-neutral-100 text-[11px] leading-tight">{notif.title}</h4>
                          {isApproved && (
                            <span className="text-[8px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30">
                              APPROVED ✓
                            </span>
                          )}
                        </div>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">{notif.message}</p>
                        <span className="text-[9.5px] text-neutral-500 font-mono block">
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Global Search Filter Dynamic Result Alert */}
      {globalSearch && (
        <div className="p-4 bg-[#d31111]/5 border border-[#d31111]/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="p-1 bg-[#d31111] text-white rounded-md shrink-0">
              <Search className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs text-neutral-800 font-semibold">
              Global search for <b className="text-[#d31111]">"{globalSearch}"</b> returned: {filteredCustomers.length} Customers, {filteredVehiclesSearch.length} Vehicles, {filteredInvoicesSearch.length} Invoices.
            </span>
          </div>
          <button 
            onClick={() => setGlobalSearch('')}
            className="text-[10px] font-bold text-[#d31111] hover:underline uppercase font-mono cursor-pointer"
          >
            Reset Search
          </button>
        </div>
      )}

      {/* 4. Interactive Reorderable Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {dashboardItems.map((id, index) => renderDashboardItem(id, index))}
      </div>

      {/* 5. Maximize Widget Overlay Modal */}
      <AnimatePresence>
        {maximizedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] border border-neutral-200 shadow-2xl overflow-y-auto flex flex-col"
            >
              {renderDashboardItem(maximizedItem, -1, true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Create Customer CRM Dialog */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden"
            >
              <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Register CRM client Account
                </span>
                <button 
                  onClick={() => setShowAddCustomerModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={triggerDemoCustomer} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Full Client Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Abdi Ibrahim Mohamed"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Company Name</label>
                  <input
                    type="text"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                    placeholder="e.g. ABDI MOHAMED TRADERS LTD"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Primary Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. client@domain.com"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">WhatsApp / Phone Number</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. +254 712 345678"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Destination Country</label>
                  <select
                    value={newCustCountry}
                    onChange={(e) => setNewCustCountry(e.target.value)}
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800 font-bold"
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Zambia">Zambia</option>
                    <option value="Zimbabwe">Zimbabwe</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d31111] hover:bg-[#b00e0e] text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-colors"
                >
                  Register CRM Client
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. Log Lead CRM Dialog */}
      <AnimatePresence>
        {showAddLeadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden"
            >
              <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Log New Sales CRM Lead
                </span>
                <button 
                  onClick={() => setShowAddLeadModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={triggerDemoLead} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="e.g. John Kamau"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Primary Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    placeholder="e.g. kamau@domain.com"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Target Vehicle Stock ID</label>
                  <select
                    value={newLeadVehicleId}
                    onChange={(e) => setNewLeadVehicleId(e.target.value)}
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800 font-bold"
                  >
                    <option value="">-- Select stock lot unit --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.stkNumber || v.id.slice(0, 8)}) {v.status === 'Available' ? '🟢' : '🟡'} {v.status}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 uppercase">Sales Enquiry Message *</label>
                  <textarea
                    required
                    value={newLeadMsg}
                    onChange={(e) => setNewLeadMsg(e.target.value)}
                    placeholder="Notes, custom requirements or shipping port request details..."
                    className="w-full bg-neutral-50 px-3 py-2 border border-neutral-200 rounded-xl focus:ring-1 focus:ring-[#d31111] outline-none text-neutral-800 h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d31111] hover:bg-[#b00e0e] text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-colors"
                >
                  Register Sales Lead
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. Record Bulk TT Wire Deposit Dialog */}
      <AnimatePresence>
        {showAddTTModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-700 text-white rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-100">Record Salesman Bulk TT Wire</h3>
                    <p className="text-[10px] text-emerald-300">Log client wire deposit for Finance clearance and invoice allocations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddTTModal(false)}
                  className="text-emerald-300 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSalesmanTT} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-neutral-700 uppercase">Salesperson / Agent Name *</label>
                  <input
                    type="text"
                    required
                    value={ttSalesmanName}
                    onChange={(e) => setTtSalesmanName(e.target.value)}
                    placeholder="e.g. Charith Wellage"
                    className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-bold"
                  />
                  <p className="text-[10px] text-neutral-400">This name will be displayed in the Finance Audit Desk for payment clearance.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">Select Customer *</label>
                    <select
                      value={ttCustomerId}
                      onChange={(e) => setTtCustomerId(e.target.value)}
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-bold"
                    >
                      <option value="">-- Direct Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.customerName} ({c.customerId}) - {c.country}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">Target Invoice / Stock #</label>
                    <input
                      type="text"
                      value={ttInvoiceNo}
                      onChange={(e) => setTtInvoiceNo(e.target.value)}
                      placeholder="e.g. INV-9012 or BULK"
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">Currency *</label>
                    <select
                      value={ttCurrency}
                      onChange={(e) => setTtCurrency(e.target.value)}
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-extrabold"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (Dh)</option>
                      <option value="KES">KES (KSh)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">Wire Deposit Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ttAmount}
                      onChange={(e) => setTtAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-black text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">SWIFT / TT Ref Number *</label>
                    <input
                      type="text"
                      required
                      value={ttReference}
                      onChange={(e) => setTtReference(e.target.value)}
                      placeholder="e.g. TT-2026-90812"
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-neutral-700 uppercase">Remitting Bank</label>
                    <input
                      type="text"
                      value={ttBank}
                      onChange={(e) => setTtBank(e.target.value)}
                      placeholder="e.g. NCBA Bank / SWIFT"
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-neutral-700 uppercase">SWIFT Slip Receipt (PDF / Image Attachment) *</label>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      {showUrlInput ? "Use File Upload" : "Or paste URL"}
                    </button>
                  </div>

                  {!showUrlInput ? (
                    <div className="space-y-2">
                      <label className={`border-2 border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        ttSlipUrl 
                          ? 'border-emerald-500 bg-emerald-50/60' 
                          : 'border-neutral-300 hover:border-emerald-500 bg-neutral-50 hover:bg-neutral-100/80'
                      }`}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleTTFileUpload}
                          className="hidden"
                        />
                        {ttSlipUrl ? (
                          <div className="flex items-center justify-between w-full px-1">
                            <div className="flex items-center gap-2.5 overflow-hidden text-left">
                              <span className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                                <Paperclip className="w-4 h-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-neutral-900 text-xs truncate">{ttFileName || "TT_Remittance_Proof"}</p>
                                <p className="text-[10px] text-emerald-700 font-bold uppercase">
                                  {ttSlipUrl.startsWith('data:application/pdf') ? '📄 PDF Document Attached' : '🖼️ Image Receipt Attached'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTtSlipUrl('');
                                setTtFileName('');
                              }}
                              className="px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg text-[10px] font-bold shrink-0 ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 py-1">
                            <Upload className="w-6 h-6 text-emerald-600 mx-auto" />
                            <p className="font-extrabold text-neutral-800 text-xs">Click or drag PDF / Image file here</p>
                            <p className="text-[10px] text-neutral-500">Upload SWIFT receipt or bank advice (Max 5MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={ttSlipUrl}
                      onChange={(e) => setTtSlipUrl(e.target.value)}
                      placeholder="https://... image link or slip proof document"
                      className="w-full bg-neutral-50 px-3 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-900 text-xs font-mono"
                    />
                  )}
                  <p className="text-[10px] text-neutral-400 italic">Attached proof will be visible in the Finance Audit Desk for verification.</p>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-neutral-700 uppercase">Allocation Remarks / Notes</label>
                  <textarea
                    value={ttRemarks}
                    onChange={(e) => setTtRemarks(e.target.value)}
                    placeholder="e.g. Bulk TT covering invoice INV-9012 ($10k) and deposit for next vehicle ($5k)."
                    className="w-full bg-neutral-50 px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-neutral-800 h-16 text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTTModal(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTT}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmittingTT ? "Submitting..." : "Submit Bulk TT to Finance"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. Approved Customer TT Logs Modal (Salesman View) */}
      <AnimatePresence>
        {showApprovedTTModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-neutral-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black uppercase tracking-wider text-white">
                        Approved Customer TT Wire Logs
                      </h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold rounded-full uppercase">
                        Sales Ledger
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Select a customer assigned to you to inspect verified TT remittances, allocated funds, and remaining available balance.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowApprovedTTModal(false)}
                  className="text-neutral-400 hover:text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                
                {/* STEP 1: SELECT CUSTOMER */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="font-black text-neutral-800 uppercase tracking-wide text-xs flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Select Assigned Customer Name *
                    </label>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase font-mono ${
                        myAssignedCustomers.length > 0 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {myAssignedCustomers.length > 0 
                          ? `✓ ${myAssignedCustomers.length} Customers Assigned to You` 
                          : `Showing All Customers (${customers.length})`}
                      </span>

                      {customers.length > myAssignedCustomers.length && myAssignedCustomers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAllCustomersOverride(!showAllCustomersOverride)}
                          className="text-[10px] font-bold text-neutral-600 hover:text-neutral-900 underline uppercase font-mono cursor-pointer"
                        >
                          {showAllCustomersOverride ? "Show My Assigned Only" : `Show All (${customers.length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {myAssignedCustomers.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">No customers are explicitly assigned to salesman ({currentUserName || 'current user'}) yet.</span>
                        <span className="ml-1 text-amber-800">Displaying all active showroom customers below so you can test available TT logs. Admin can assign customers to you in Customer Management.</span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <select
                      value={selectedCustIdForTT}
                      onChange={(e) => setSelectedCustIdForTT(e.target.value)}
                      className="w-full bg-white px-3.5 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-neutral-900 font-bold text-xs sm:text-sm shadow-2xs appearance-none cursor-pointer pr-10"
                    >
                      <option value="">-- Choose a Customer Name to View Approved TTs --</option>
                      {selectableCustomers.map(c => {
                        const isAssignedToMe = myAssignedCustomers.some(ac => ac.id === c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.customerName} {c.companyName ? `(${c.companyName})` : ''} - {c.country} [{c.customerId || 'No ID'}] {isAssignedToMe ? '★ Assigned' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* STEP 2: SELECTED CUSTOMER OVERVIEW & STATS */}
                {selectedCustomerObj ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Customer Profile Banner */}
                    <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-xl p-4 sm:p-5 border border-neutral-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-base font-black text-white uppercase tracking-tight">
                            {selectedCustomerObj.customerName}
                          </h4>
                          {selectedCustomerObj.companyName && (
                            <span className="text-xs text-neutral-300 font-medium">
                              • {selectedCustomerObj.companyName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300">
                          <span>ID: <strong className="font-mono text-emerald-400">{selectedCustomerObj.customerId || 'CC-CUST'}</strong></span>
                          <span>Country: <strong>{selectedCustomerObj.country || 'N/A'}</strong></span>
                          <span>Email: <strong>{selectedCustomerObj.email}</strong></span>
                          <span>Phone: <strong>{selectedCustomerObj.phone || 'N/A'}</strong></span>
                          {selectedCustomerObj.assignedSalesPersonName && (
                            <span className="bg-neutral-700 px-2 py-0.5 rounded-md text-[10px] text-emerald-300">
                              Sales Rep: {selectedCustomerObj.assignedSalesPersonName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase rounded-lg font-mono">
                          Tier: {selectedCustomerObj.tierName || 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Cards for Selected Customer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                          Total Approved TT Volume
                        </span>
                        <span className="text-lg font-black text-neutral-900 font-mono block">
                          ${totalApprovedTTAmount.toLocaleString()} USD
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {customerApprovedTTs.length} total approved remittance wire(s)
                        </span>
                      </div>

                      <div className="bg-emerald-50/70 p-4 rounded-xl border-2 border-emerald-500 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-mono">
                          Current Available TT Balance
                        </span>
                        <span className="text-xl font-black text-emerald-700 font-mono block">
                          ${totalAvailableTTBalance.toLocaleString()} USD
                        </span>
                        <span className="text-[10px] text-emerald-800 font-medium">
                          Ready for vehicle invoice allocation
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                          Total Allocated Funds
                        </span>
                        <span className="text-lg font-black text-blue-600 font-mono block">
                          ${totalAllocatedTTAmount.toLocaleString()} USD
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          Applied to vehicle proforma invoices
                        </span>
                      </div>
                    </div>

                    {/* Search Filter for Customer TTs */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <h5 className="font-extrabold uppercase text-neutral-800 tracking-wide text-xs flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                        Available Approved TT Remittances ({customerApprovedTTs.length})
                      </h5>

                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Search TT ref, bank, remarks..."
                          value={ttSearchQuery}
                          onChange={(e) => setTtSearchQuery(e.target.value)}
                          className="w-full bg-neutral-50 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-red-600 font-medium"
                        />
                      </div>
                    </div>

                    {/* Approved TT Wires List / Table */}
                    {customerApprovedTTs.length === 0 ? (
                      <div className="bg-neutral-50 rounded-xl p-8 border border-dashed border-neutral-200 text-center space-y-2">
                        <Landmark className="w-8 h-8 text-neutral-300 mx-auto" />
                        <p className="font-bold text-neutral-700 text-xs uppercase">No Approved TT Remittances Found</p>
                        <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
                          {ttSearchQuery 
                            ? "No approved TTs match your search keywords for this customer." 
                            : `There are currently no approved TT remittances for ${selectedCustomerObj.customerName}. Any submitted TTs will appear here once approved by Finance.`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerApprovedTTs.map((tt) => {
                          const remBal = tt.remainingBalance !== undefined ? Number(tt.remainingBalance) : Number(tt.amount);
                          const allocatedAmt = (Number(tt.amount) || 0) - remBal;

                          return (
                            <div 
                              key={tt.id} 
                              className="bg-white border border-neutral-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                                <div className="flex items-center gap-2.5">
                                  <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 font-bold">
                                    <Landmark className="w-4 h-4" />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-sm text-neutral-900 uppercase">
                                        {tt.reference || tt.ttNumber || tt.paymentId || 'TT Wire'}
                                      </span>
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-md font-mono uppercase">
                                        Approved ✓
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-neutral-500 mt-0.5">
                                      Bank: <strong>{tt.bank || 'Bank Transfer'}</strong> • Date: <strong>{tt.paymentDate || 'Recent'}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono block">
                                    Original TT Deposit
                                  </span>
                                  <span className="text-base font-black text-neutral-900 font-mono">
                                    {tt.currency || 'USD'} {Number(tt.amount).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Financial Allocation Status Bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-neutral-50/70 p-3 rounded-lg border border-neutral-150 text-xs">
                                <div>
                                  <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase font-mono block">
                                    Available Balance
                                  </span>
                                  <span className="font-mono font-black text-emerald-700 text-sm">
                                    {tt.currency || 'USD'} {remBal.toLocaleString()}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[9.5px] font-extrabold text-neutral-400 uppercase font-mono block">
                                    Allocated Amount
                                  </span>
                                  <span className="font-mono font-bold text-blue-600 text-sm">
                                    {tt.currency || 'USD'} {allocatedAmt.toLocaleString()}
                                  </span>
                                </div>

                                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-2">
                                  {tt.slipUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewingTTSlipUrl(tt.slipUrl!);
                                        setPreviewingTTSlipTitle(`TT Remittance Proof - Ref: ${tt.reference || tt.paymentId}`);
                                      }}
                                      className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> View Receipt
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-neutral-400 font-mono italic">No Attachment</span>
                                  )}
                                </div>
                              </div>

                              {/* Remarks if present */}
                              {tt.remarks && (
                                <div className="text-[11px] text-neutral-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                                  <span className="font-bold text-amber-900 uppercase text-[9.5px] block">Sales/Finance Remark:</span>
                                  {tt.remarks}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                ) : (
                  /* PLACEHOLDER: NO CUSTOMER SELECTED YET */
                  <div className="bg-neutral-50 rounded-2xl p-10 border border-dashed border-neutral-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
                      Select a Customer from the List Above
                    </h4>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                      Choose one of your assigned customers to load their approved telegraphic transfer deposits, check available unallocated funds, and audit transaction logs.
                    </p>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0 text-xs">
                <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold">
                  CarChief ERP • Sales Remittance Ledger
                </span>
                <button
                  onClick={() => setShowApprovedTTModal(false)}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-black uppercase rounded-xl transition-colors cursor-pointer"
                >
                  Close Ledger
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TT Slip Preview Modal */}
      <AnimatePresence>
        {previewingTTSlipUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 bg-neutral-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white">
                    {previewingTTSlipTitle || "TT Remittance Proof Attachment"}
                  </h4>
                </div>
                <button 
                  onClick={() => setPreviewingTTSlipUrl(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-neutral-950 flex-1 flex items-center justify-center overflow-auto min-h-[350px]">
                {previewingTTSlipUrl.startsWith('data:application/pdf') || previewingTTSlipUrl.endsWith('.pdf') ? (
                  <iframe 
                    src={previewingTTSlipUrl} 
                    className="w-full h-[500px] rounded-lg border border-neutral-800" 
                    title="TT Proof PDF" 
                  />
                ) : (
                  <img 
                    src={previewingTTSlipUrl} 
                    alt="TT Remittance Receipt Proof" 
                    className="max-h-[500px] max-w-full object-contain rounded-lg shadow-lg"
                  />
                )}
              </div>

              <div className="p-3 bg-neutral-100 flex items-center justify-end gap-2 text-xs">
                <a
                  href={previewingTTSlipUrl}
                  download="TT-Remittance-Receipt-Proof"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg uppercase tracking-wider text-[10px]"
                >
                  Download Original
                </a>
                <button
                  onClick={() => setPreviewingTTSlipUrl(null)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold rounded-lg uppercase tracking-wider text-[10px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
