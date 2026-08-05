/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, where 
} from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';
import { db, firebaseConfig, auth } from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, updatePassword, updateEmail } from 'firebase/auth';
import { 
  Customer, CustomerTier 
} from '../customer/types';
import { Vehicle, CountryMaster, PortMaster, RoleConfig } from '../types';
import { 
  Users, Plus, Edit, Trash2, RefreshCw, X, ChevronDown, ChevronUp, 
  FileText, Check, AlertCircle, Phone, Mail, MapPin, DollarSign, 
  Calendar, Briefcase, Award, Eye, Trash, ShieldAlert
} from 'lucide-react';

interface AdminCustomerManagementProps {
  vehicles: Vehicle[];
  currentRole?: RoleConfig;
}

export default function AdminCustomerManagement({ vehicles, currentRole }: AdminCustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [masterCountries, setMasterCountries] = useState<CountryMaster[]>([]);
  const [masterPorts, setMasterPorts] = useState<PortMaster[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);

  // Current logged in user info
  const currentUserEmail = auth.currentUser?.email;
  const currentUserId = auth.currentUser?.uid;
  const isSuperAdmin = currentRole?.id === 'Admin' || currentUserEmail === 'charith3ny@gmail.com';

  // Form states: Create Customer
  const [custName, setCustName] = useState('');
  const [compName, setCompName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCountry, setCustCountry] = useState('');
  const [assignedTierId, setAssignedTierId] = useState('');
  const [custPassword, setCustPassword] = useState('outdesk123@');
  const [custStatus, setCustStatus] = useState<'active' | 'deactivated' | 'suspended'>('active');

  // New fields form states (Create)
  const [broker, setBroker] = useState<'Yes' | 'No'>('No');
  const [assignedSalesPersonId, setAssignedSalesPersonId] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [port, setPort] = useState('');
  const [memo, setMemo] = useState('');
  const [erpCustomerId, setErpCustomerId] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyingXGradeCars, setBuyingXGradeCars] = useState<'Yes' | 'No'>('No');
  const [whatsapp, setWhatsapp] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxPin, setTaxPin] = useState('');
  const [incorporationCertificate, setIncorporationCertificate] = useState('');
  const [customerNationality, setCustomerNationality] = useState('');
  const [customerCategory, setCustomerCategory] = useState('Retail');
  const [sourceOfAcquisition, setSourceOfAcquisition] = useState('');

  // Form states: Edit Customer
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCompName, setEditCompName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustCountry, setEditCustCountry] = useState('');
  const [editAssignedTierId, setEditAssignedTierId] = useState('');
  const [editCustStatus, setEditCustStatus] = useState<'active' | 'deactivated' | 'suspended'>('active');
  const [editCustPassword, setEditCustPassword] = useState('');

  // New fields form states (Edit)
  const [editBroker, setEditBroker] = useState<'Yes' | 'No'>('No');
  const [editAssignedSalesPersonId, setEditAssignedSalesPersonId] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPort, setEditPort] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editErpCustomerId, setEditErpCustomerId] = useState('');
  const [editCustomerDob, setEditCustomerDob] = useState('');
  const [editActivationDate, setEditActivationDate] = useState('');
  const [editBuyingXGradeCars, setEditBuyingXGradeCars] = useState<'Yes' | 'No'>('No');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editTaxPin, setEditTaxPin] = useState('');
  const [editIncorporationCertificate, setEditIncorporationCertificate] = useState('');
  const [editCustomerNationality, setEditCustomerNationality] = useState('');
  const [editCustomerCategory, setEditCustomerCategory] = useState('Retail');
  const [editSourceOfAcquisition, setEditSourceOfAcquisition] = useState('');

  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all databases needed
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Tiers
      const tiersSnap = await getDocs(query(collection(db, 'customerTiers'), orderBy('priority', 'asc')));
      const tiersList = tiersSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerTier));
      setTiers(tiersList);

      // 2. Fetch Master Countries
      const countriesSnap = await getDocs(collection(db, 'countries'));
      const countriesList = countriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CountryMaster));
      setMasterCountries(countriesList);

      // 3. Fetch Master Ports
      const portsSnap = await getDocs(collection(db, 'ports'));
      const portsList = portsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PortMaster));
      setMasterPorts(portsList);

      // 4. Fetch Sales Reps (Users collection where role is 'Sales' or 'sales')
      const usersSnap = await getDocs(collection(db, 'users'));
      const salesList = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.role?.toLowerCase() === 'sales' || u.role?.toLowerCase() === 'salesperson');
      setSalespersons(salesList);

      // 5. Fetch Sourcing Customers
      const custSnap = await getDocs(query(collection(db, 'customers'), orderBy('customerId', 'desc')));
      const custList = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(custList);
    } catch (err) {
      console.error("Failed loading customer databases and master sets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-assign salesman when opening modal if the logged-in user is a salesman
  useEffect(() => {
    if (showCreateModal && !isSuperAdmin && currentUserId) {
      setAssignedSalesPersonId(currentUserId);
    }
  }, [showCreateModal, isSuperAdmin, currentUserId]);

  // Handle files to base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large! Please select a document smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditIncorporationCertificate(reader.result as string);
        } else {
          setIncorporationCertificate(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custEmail.trim() || !assignedTierId) {
      alert("Please fill in all mandatory customer profile fields (Name, Email, Sourcing Tier).");
      return;
    }

    const normalizedEmail = custEmail.trim().toLowerCase();
    const initialPassword = custPassword.trim() || "outdesk123@";

    // 1. Generate sequential numeric Customer ID if possible
    let newCustId = "CUST-" + Math.floor(1000 + Math.random() * 9000);
    if (customers.length > 0) {
      const highestId = customers.reduce((max, cur) => {
        const num = parseInt(cur.customerId?.replace("CUST-", "") || "0");
        return num > max ? num : max;
      }, 0);
      if (highestId > 0) {
        newCustId = `CUST-${highestId + 1}`;
      }
    }

    const tier = tiers.find(t => t.id === assignedTierId);
    const selectedSalesperson = salespersons.find(s => s.uid === assignedSalesPersonId);
    const assignedSalesPersonName = selectedSalesperson ? (selectedSalesperson.name || selectedSalesperson.displayName || selectedSalesperson.email?.split('@')[0]) : '';

    // 2. Register account directly to Firebase Auth secondary app
    let mappedUid = "uid-" + Math.floor(100000 + Math.random() * 900000);
    if (firebaseConfig && firebaseConfig.apiKey) {
      try {
        const secondaryAppName = `temp-cust-reg-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCreds = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, initialPassword);
        mappedUid = userCreds.user.uid;

        // Register in primary users collection
        await setDoc(doc(db, 'users', mappedUid), {
          uid: mappedUid,
          name: custName.trim(),
          email: normalizedEmail,
          role: 'customer',
          status: custStatus,
          createdAt: new Date().toISOString()
        });

        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
      } catch (err: any) {
        console.error("Automatic Firebase Auth registration skipped or failed:", err?.message || err);
        mappedUid = "uid-" + Math.floor(100000 + Math.random() * 900000);
      }
    }

    const payload: Omit<Customer, 'id'> = {
      customerId: newCustId,
      customerName: custName.trim(),
      companyName: compName.trim() || 'Private Fleet',
      email: normalizedEmail,
      phone: custPhone.trim(),
      address: custAddress.trim(),
      country: custCountry || 'Kenya',
      tierId: assignedTierId,
      tierName: tier ? tier.name : 'Retail',
      uid: mappedUid,
      status: custStatus,
      creditLimit: tier ? tier.creditLimit : 10000,
      paymentTerms: tier ? tier.paymentTerms : 'Net 30',
      password: initialPassword,
      lastLogin: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // New custom fields requested
      broker,
      assignedSalesPersonId,
      assignedSalesPersonName,
      city: city.trim(),
      state: state.trim(),
      port,
      memo: memo.trim(),
      erpCustomerId: erpCustomerId.trim(),
      customerDob,
      activationDate,
      buyingXGradeCars,
      whatsapp: whatsapp.trim(),
      currency,
      taxPin: taxPin.trim(),
      incorporationCertificate,
      customerNationality: customerNationality.trim(),
      customerCategory,
      sourceOfAcquisition: sourceOfAcquisition.trim()
    };

    try {
      await addDoc(collection(db, 'customers'), payload);
      firestoreCache.invalidate('customers');
      setShowCreateModal(false);
      fetchAllData();
      
      // Reset forms
      setCustName('');
      setCompName('');
      setCustEmail('');
      setCustPhone('');
      setCustAddress('');
      setCustCountry('');
      setAssignedTierId('');
      setCustPassword('outdesk123@');
      setBroker('No');
      setAssignedSalesPersonId('');
      setCity('');
      setState('');
      setPort('');
      setMemo('');
      setErpCustomerId('');
      setCustomerDob('');
      setActivationDate(new Date().toISOString().split('T')[0]);
      setBuyingXGradeCars('No');
      setWhatsapp('');
      setCurrency('USD');
      setTaxPin('');
      setIncorporationCertificate('');
      setCustomerNationality('');
      setCustomerCategory('Retail');
      setSourceOfAcquisition('');
    } catch (err) {
      console.error(err);
      alert("Failed to record customer profile.");
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!window.confirm(`Are you sure you want to permanently delete customer "${cust.customerName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'customers', cust.id));
      firestoreCache.invalidate('customers');
      alert("Customer profile successfully deleted.");
      fetchAllData();
      if (selectedCust?.id === cust.id) {
        setSelectedCust(null);
      }
    } catch (err) {
      console.error("Failed to delete customer:", err);
      alert("Failed to delete customer from database.");
    }
  };

  const handleOpenEditModal = (cust: Customer) => {
    setSelectedCust(cust);
    setEditCustName(cust.customerName || '');
    setEditCompName(cust.companyName || '');
    setEditCustEmail(cust.email || '');
    setEditCustPhone(cust.phone || '');
    setEditCustAddress(cust.address || '');
    setEditCustCountry(cust.country || '');
    setEditAssignedTierId(cust.tierId || '');
    setEditCustStatus(cust.status || 'active');
    setEditCustPassword(cust.password || 'outdesk123@');

    setEditBroker(cust.broker || 'No');
    setEditAssignedSalesPersonId(cust.assignedSalesPersonId || '');
    setEditCity(cust.city || '');
    setEditState(cust.state || '');
    setEditPort(cust.port || '');
    setEditMemo(cust.memo || '');
    setEditErpCustomerId(cust.erpCustomerId || '');
    setEditCustomerDob(cust.customerDob || '');
    setEditActivationDate(cust.activationDate || '');
    setEditBuyingXGradeCars(cust.buyingXGradeCars || 'No');
    setEditWhatsapp(cust.whatsapp || '');
    setEditCurrency(cust.currency || 'USD');
    setEditTaxPin(cust.taxPin || '');
    setEditIncorporationCertificate(cust.incorporationCertificate || '');
    setEditCustomerNationality(cust.customerNationality || '');
    setEditCustomerCategory(cust.customerCategory || 'Retail');
    setEditSourceOfAcquisition(cust.sourceOfAcquisition || '');

    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) return;
    if (!editCustName.trim() || !editCustEmail.trim() || !editAssignedTierId) {
      alert("Please fill in all mandatory customer profile fields.");
      return;
    }

    setUpdating(true);
    const oldEmail = selectedCust.email;
    const oldPassword = selectedCust.password || "outdesk123@";
    const newEmail = editCustEmail.trim().toLowerCase();
    const newPassword = editCustPassword.trim() || "outdesk123@";

    try {
      if (selectedCust.uid && (oldEmail !== newEmail || oldPassword !== newPassword)) {
        try {
          const secondaryAppName = `temp-cust-updater-${Date.now()}`;
          const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
          const secondaryAuth = getAuth(secondaryApp);

          try {
            const userCredential = await signInWithEmailAndPassword(secondaryAuth, oldEmail, oldPassword);
            const user = userCredential.user;

            if (oldEmail !== newEmail) {
              await updateEmail(user, newEmail);
            }
            if (oldPassword !== newPassword) {
              await updatePassword(user, newPassword);
            }
          } catch (signInErr: any) {
            console.warn("Secondary app sign-in failed. Attempting user creation or skipping Auth update...", signInErr);
            if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/wrong-password' || signInErr?.code === 'auth/invalid-credential') {
              try {
                await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
              } catch (createErr) {
                console.error("Failed to register missing Auth user:", createErr);
              }
            }
          }

          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);
        } catch (authSyncErr) {
          console.error("Auth synchronization encountered an error:", authSyncErr);
        }
      }

      const tier = tiers.find(t => t.id === editAssignedTierId);
      const selectedEditSalesperson = salespersons.find(s => s.uid === editAssignedSalesPersonId);
      const editAssignedSalesPersonName = selectedEditSalesperson ? (selectedEditSalesperson.name || selectedEditSalesperson.displayName || selectedEditSalesperson.email?.split('@')[0]) : '';

      const updates: Partial<Customer> = {
        customerName: editCustName.trim(),
        companyName: editCompName.trim() || 'Private Fleet',
        email: newEmail,
        phone: editCustPhone.trim(),
        address: editCustAddress.trim(),
        country: editCustCountry || 'Kenya',
        tierId: editAssignedTierId,
        tierName: tier ? tier.name : 'Retail',
        status: editCustStatus,
        creditLimit: tier ? tier.creditLimit : 10000,
        paymentTerms: tier ? tier.paymentTerms : 'Net 30',
        password: newPassword,
        updatedAt: new Date().toISOString(),

        broker: editBroker,
        assignedSalesPersonId: editAssignedSalesPersonId,
        assignedSalesPersonName: editAssignedSalesPersonName,
        city: editCity.trim(),
        state: editState.trim(),
        port: editPort,
        memo: editMemo.trim(),
        erpCustomerId: editErpCustomerId.trim(),
        customerDob: editCustomerDob,
        activationDate: editActivationDate,
        buyingXGradeCars: editBuyingXGradeCars,
        whatsapp: editWhatsapp.trim(),
        currency: editCurrency,
        taxPin: editTaxPin.trim(),
        incorporationCertificate: editIncorporationCertificate,
        customerNationality: editCustomerNationality.trim(),
        customerCategory: editCustomerCategory,
        sourceOfAcquisition: editSourceOfAcquisition.trim()
      };

      await updateDoc(doc(db, 'customers', selectedCust.id), updates);
      firestoreCache.invalidate('customers');

      if (selectedCust.uid) {
        try {
          await setDoc(doc(db, 'users', selectedCust.uid), {
            uid: selectedCust.uid,
            name: editCustName.trim(),
            email: newEmail,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Failed to update Users database record:", err);
        }
      }

      setShowEditModal(false);
      fetchAllData();
      alert("Customer profile successfully updated!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update customer profile: " + (err?.message || err));
    } finally {
      setUpdating(false);
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedCustId(prev => (prev === id ? null : id));
  };

  // Filter list of customers
  const filteredCustomers = customers.filter(c => {
    // Salesman visibility constraint: only show customers assigned to them
    if (!isSuperAdmin) {
      if (c.assignedSalesPersonId !== currentUserId) {
        return false;
      }
    }

    const search = custSearch.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(search) ||
      (c.companyName || '').toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      (c.phone || '').toLowerCase().includes(search) ||
      (c.country || '').toLowerCase().includes(search) ||
      (c.city || '').toLowerCase().includes(search) ||
      (c.customerId || '').toLowerCase().includes(search) ||
      (c.erpCustomerId || '').toLowerCase().includes(search) ||
      (c.assignedSalesPersonName || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Tab Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-neutral-200/60 p-5 rounded-2xl gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-mono font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-red-500 animate-pulse" /> Sourcing Client Management Desk
          </h3>
          <p className="text-[11px] text-neutral-500 font-light mt-1 font-mono leading-relaxed">
            {isSuperAdmin 
              ? "Super Administrator Portal: Accessing all customer portfolios, master assignments, and security accounts."
              : "Sales Specialist view: Managing client portfolios assigned specifically to you."}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all uppercase tracking-widest cursor-pointer shadow-lg shadow-red-600/10 hover:shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll Sourcing Client</span>
        </button>
      </div>

      {/* Search and Stats bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-neutral-200 p-4 rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={custSearch}
            onChange={(e) => setCustSearch(e.target.value)}
            placeholder="Search by name, company, city, ERP code, sales rep..."
            className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 pl-4 pr-10 text-xs text-neutral-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono transition-all shadow-xs"
          />
        </div>
        <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-2">
          <span>Displaying</span>
          <span className="text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded border border-neutral-200">{filteredCustomers.length}</span>
          <span>of</span>
          <span className="text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded border border-neutral-200">{customers.length}</span>
          <span>Clients</span>
        </div>
      </div>

      {/* Main List Display */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          <span>Loading client portfolios and masters...</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-24 text-center bg-white border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-500 space-y-3 shadow-xs">
          <Users className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-neutral-600 font-medium">No sourcing clients match the filter rules or search criteria.</p>
          <p className="text-[10px] text-neutral-400 max-w-md mx-auto leading-relaxed">
            {isSuperAdmin 
              ? "Ensure your filters or search terms are correct, or enroll a new client above." 
              : "Only clients assigned to you under 'Assigned Sales Person' are listed here."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200/60 rounded-2xl overflow-hidden shadow-sm">
          {/* Desktop view: Table with Expandable rows */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 font-mono uppercase text-[9px] tracking-wider border-b border-neutral-200/80">
                  <th className="py-3.5 px-4">Client Detail</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Logistics Hub</th>
                  <th className="py-3.5 px-4">Sales Rep</th>
                  <th className="py-3.5 px-4">Broker / Tier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {filteredCustomers.map((c) => {
                  const isExpanded = expandedCustId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr 
                        className={`hover:bg-neutral-50/50 transition-all cursor-pointer ${isExpanded ? 'bg-neutral-50 border-l-4 border-l-red-500' : ''}`}
                        onClick={() => toggleRowExpand(c.id)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-red-500" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                            <div>
                              <div className="font-sans font-bold text-neutral-800 text-xs hover:text-red-600 transition-colors">{c.customerName}</div>
                              <div className="text-[9px] text-neutral-400 mt-0.5 flex gap-1.5">
                                <span>ID: {c.customerId}</span>
                                {c.erpCustomerId && <span className="text-red-600 font-medium">| ERP: {c.erpCustomerId}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-neutral-700 text-[11px] truncate max-w-[150px]" title={c.email}>{c.email}</div>
                          <div className="text-neutral-400 text-[10px] mt-0.5">{c.phone || 'No mobile'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-neutral-700 font-sans font-medium">{c.country}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 font-sans flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500" /> {c.port || c.city || 'No Port Set'}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-neutral-700">
                          {c.assignedSalesPersonName ? (
                            <span className="text-neutral-700 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {c.assignedSalesPersonName}
                            </span>
                          ) : (
                            <span className="text-neutral-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 px-1.5 py-0.5 rounded">
                              Tier: {c.tierName}
                            </span>
                          </div>
                          <div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              c.broker === 'Yes' ? 'bg-red-50 text-red-600 border border-red-200/50' : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                            }`}>
                              Broker: {c.broker || 'No'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            c.status === 'active' 
                              ? 'bg-green-50 text-green-700 border border-green-200/50' 
                              : c.status === 'suspended'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200/50'
                              : 'bg-red-50 text-red-700 border border-red-200/50'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Edit Client details"
                          >
                            <Edit className="w-3.5 h-3.5 text-red-600" />
                            <span className="hidden xl:inline text-[9px] font-mono uppercase font-bold">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-2 bg-neutral-50 hover:bg-red-50 border border-neutral-200 hover:border-red-200 text-neutral-500 hover:text-red-600 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Delete Client profile"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span className="hidden xl:inline text-[9px] font-mono uppercase font-bold">Delete</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable detailed row showing ALL 26 fields in a beautiful bento dashboard */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-neutral-50/50 border-l-4 border-l-red-500">
                            <div className="p-6 space-y-6 text-neutral-700 animate-in fade-in slide-in-from-top-1 duration-200">
                              
                              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
                                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-red-500" /> Comprehensive Sourcing Portfolio Profile ({c.customerName})
                                </h4>
                                <span className="text-[9px] font-mono text-neutral-400">Last Database Sync: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'N/A'}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                
                                {/* 1. Account & Security Profile */}
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                                  <h5 className="text-[10px] uppercase font-mono font-black text-red-600 tracking-wider flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                                    <Briefcase className="w-3.5 h-3.5" /> Account & Security
                                  </h5>
                                  <div className="space-y-2.5 text-[11px] font-mono">
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">ERP Client ID</span>
                                      <span className="text-neutral-800 font-bold">{c.erpCustomerId || 'Not Assigned'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Sourcing Portal login ID</span>
                                      <span className="text-neutral-800 font-bold truncate block" title={c.email}>{c.email}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Portal Access Password</span>
                                      <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px] select-all border border-red-100">{c.password || '••••••••'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Activation Date</span>
                                      <span className="text-neutral-700 font-sans">{c.activationDate ? new Date(c.activationDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'No activation date set'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. Logistics & Destination */}
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                                  <h5 className="text-[10px] uppercase font-mono font-black text-red-600 tracking-wider flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                                    <MapPin className="w-3.5 h-3.5" /> Destination Logistics
                                  </h5>
                                  <div className="space-y-2.5 text-[11px] font-mono">
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Destination Port (Master)</span>
                                      <span className="text-neutral-800 font-bold flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-red-500" /> {c.port || 'Unspecified'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Sourcing country</span>
                                      <span className="text-neutral-700">{c.country || 'Kenya'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Delivery City & State</span>
                                      <span className="text-neutral-700 font-sans">{c.city || 'N/A'}{c.state ? `, ${c.state}` : ''}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Physical Address</span>
                                      <span className="text-neutral-700 font-sans line-clamp-2" title={c.address}>{c.address || 'No physical address listed'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. Sourcing Parameters & Credit */}
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                                  <h5 className="text-[10px] uppercase font-mono font-black text-red-600 tracking-wider flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                                    <Award className="w-3.5 h-3.5" /> Sourcing Limits & Rules
                                  </h5>
                                  <div className="space-y-2.5 text-[11px] font-mono">
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Member Tier Level</span>
                                      <span className="text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{c.tierName}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Allocated Sourcing Currency</span>
                                      <span className="text-neutral-800 font-bold">{c.currency || 'USD'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Buying X Grade Cars</span>
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${c.buyingXGradeCars === 'Yes' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>{c.buyingXGradeCars || 'No'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Acquisition Channel</span>
                                      <span className="text-neutral-700">{c.sourceOfAcquisition || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 4. Demographic & Tax Identifiers */}
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                                  <h5 className="text-[10px] uppercase font-mono font-black text-red-600 tracking-wider flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                                    <DollarSign className="w-3.5 h-3.5" /> Personal & Fiscal Identifiers
                                  </h5>
                                  <div className="space-y-2.5 text-[11px] font-mono">
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Tax PIN / ID Number</span>
                                      <span className="text-neutral-800 font-bold tracking-wider">{c.taxPin || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Customer Nationality</span>
                                      <span className="text-neutral-700">{c.customerNationality || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Client DOB (Demographics)</span>
                                      <span className="text-neutral-700 font-sans">{c.customerDob ? new Date(c.customerDob).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'No DOB provided'}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-400 block text-[9px] uppercase">Customer category</span>
                                      <span className="text-neutral-700">{c.customerCategory || 'Retail'}</span>
                                    </div>
                                  </div>
                                </div>

                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                                {/* Incorporation Certificate File view */}
                                <div className="col-span-1 md:col-span-6 space-y-2">
                                  <span className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider font-bold block">Incorporation Certificate / ID Copy Attachment</span>
                                  {c.incorporationCertificate ? (
                                    <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center justify-center shadow-inner">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">KYC_Document_Saved.bin</p>
                                          <p className="text-[10px] text-neutral-400">Base64 Encoded ID Verification Copy</p>
                                        </div>
                                      </div>
                                      <a
                                        href={c.incorporationCertificate}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold rounded-md flex items-center gap-1 transition-all"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> View KYC ID
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="bg-white/60 p-4 rounded-lg border border-dashed border-neutral-200 text-center py-6">
                                      <span className="text-[10px] text-neutral-400 italic block font-mono">No ID Copy or Incorporation Certificate has been uploaded yet for this client.</span>
                                    </div>
                                  )}
                                </div>

                                {/* General Sourcing Memo */}
                                <div className="col-span-1 md:col-span-6 space-y-2 border-t md:border-t-0 md:border-l border-neutral-200 pt-4 md:pt-0 md:pl-6">
                                  <span className="text-neutral-500 text-[10px] uppercase font-mono tracking-wider font-bold block">Internal Client Profile Memo & Remarks</span>
                                  <div className="bg-white p-4 rounded-lg border border-neutral-200 min-h-[70px]">
                                    <p className="text-[11px] text-neutral-600 font-sans leading-relaxed whitespace-pre-wrap">
                                      {c.memo || "No internal credit desk memos or routing remarks are recorded for this client's profile."}
                                    </p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card list */}
          <div className="block md:hidden divide-y divide-neutral-200">
            {filteredCustomers.map((c) => (
              <div key={c.id} className="p-4 space-y-3 font-mono bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-sans font-bold text-neutral-800 text-xs uppercase">{c.customerName}</h5>
                    <p className="text-[10px] text-neutral-500">{c.companyName || 'Private Fleet'}</p>
                  </div>
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                    {c.tierName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">ID:</span>
                    <span className="font-medium text-neutral-800">{c.customerId}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">ERP:</span>
                    <span className="font-medium text-neutral-800">{c.erpCustomerId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">Email:</span>
                    <span className="truncate block max-w-[120px] font-medium text-neutral-800">{c.email}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">Port:</span>
                    <span className="font-medium text-neutral-800">{c.port || 'No Port'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">Sales Rep:</span>
                    <span className="text-neutral-800 font-bold">{c.assignedSalesPersonName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[8px] uppercase">Status:</span>
                    <span className={`text-[9px] font-bold uppercase ${
                      c.status === 'active' ? 'text-green-600' : c.status === 'suspended' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="flex-1 py-2 px-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3 text-red-600" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c)}
                    className="flex-1 py-2 px-3 bg-neutral-50 hover:bg-red-50 border border-neutral-200 text-neutral-500 hover:text-red-600 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enroll Sourcing Client Modal overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200/80 rounded-2xl w-full max-w-4xl p-6 sm:p-8 relative shadow-xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-500 hover:text-neutral-800 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="space-y-1 mb-5 pb-3 border-b border-neutral-200">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-800">Enroll Sourcing Client</h3>
              <p className="text-[11px] text-neutral-500 font-light">Enter client profile parameters below. Enrolled clients can access the customized CarChief Car Sourcing Portal with portal credentials.</p>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-6 text-xs font-mono">
              
              {/* Category 1: Account, Credentials & Assignment */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> SECTION I: ACCOUNT SECURITY, CREDENTIALS & ASSIGNMENT
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Email / Login ID *</label>
                    <input
                      type="email"
                      required
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="client@source.com"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Portal Access Password *</label>
                    <input
                      type="text"
                      required
                      value={custPassword}
                      onChange={(e) => setCustPassword(e.target.value)}
                      placeholder="Set login password"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Assigned Sales Person *</label>
                    <select
                      required
                      disabled={!isSuperAdmin}
                      value={assignedSalesPersonId}
                      onChange={(e) => setAssignedSalesPersonId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="">Select Sales Rep...</option>
                      {salespersons.map((s) => (
                        <option key={s.uid || s.id} value={s.uid || s.id}>
                          {s.name || s.displayName || s.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Member Tier Level *</label>
                    <select
                      required
                      value={assignedTierId}
                      onChange={(e) => setAssignedTierId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="">Select Tier level...</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} - Limit: ${t.creditLimit?.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">ERP Customer ID Code</label>
                    <input
                      type="text"
                      value={erpCustomerId}
                      onChange={(e) => setErpCustomerId(e.target.value)}
                      placeholder="e.g. ERP-90412"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Activation Date *</label>
                    <input
                      type="date"
                      required
                      value={activationDate}
                      onChange={(e) => setActivationDate(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Status *</label>
                    <select
                      value={custStatus}
                      onChange={(e: any) => setCustStatus(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="active">Active & Portal Granted</option>
                      <option value="suspended">Suspended (Pending Balance)</option>
                      <option value="deactivated">Deactivated (Banned)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Category 2: Core Profile Details */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-red-600" /> SECTION II: CORE CLIENT IDENTITY & DEMOGRAPHICS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Client Full Name *</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Salim Mohammed"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Company Name</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="e.g. Juba Motors Ltd"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer DOB</label>
                    <input
                      type="date"
                      value={customerDob}
                      onChange={(e) => setCustomerDob(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer Nationality</label>
                    <input
                      type="text"
                      value={customerNationality}
                      onChange={(e) => setCustomerNationality(e.target.value)}
                      placeholder="e.g. Kenyan"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer Category</label>
                    <select
                      value={customerCategory}
                      onChange={(e) => setCustomerCategory(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="Retail">Retail Client</option>
                      <option value="Dealer">Commercial Dealer</option>
                      <option value="Corporate">Corporate Fleet</option>
                      <option value="Broker">Intermediary Broker</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Source of Acquisition</label>
                    <input
                      type="text"
                      value={sourceOfAcquisition}
                      onChange={(e) => setSourceOfAcquisition(e.target.value)}
                      placeholder="e.g. Google Search, Referral, Mombasa Road Showroom"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Category 3: Logistics, Ports, Contacts */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-red-600" /> SECTION III: LOGISTICS, PORTS & COMMUNICATION CHANNELS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Tel/Mobile Number</label>
                    <input
                      type="text"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="+254 712 345678"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">WhatsApp (Tel/Mobile)</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+254 712 345678"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Destination Country *</label>
                    <select
                      required
                      value={custCountry}
                      onChange={(e) => setCustCountry(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="">Select Country...</option>
                      {masterCountries.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      {/* Fallback option in case countries are empty */}
                      {masterCountries.length === 0 && <option value="Kenya">Kenya</option>}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Destination Port (Master) *</label>
                    <select
                      required
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="">Select Port...</option>
                      {masterPorts
                        .filter(p => !custCountry || p.countryName === custCountry)
                        .map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      {masterPorts.length === 0 && <option value="Mombasa">Mombasa</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Delivery City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Nairobi"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Delivery State / Province</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Rift Valley"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Physical Shipping Address</label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="e.g. Suite 5, Tower B, Mombasa Road"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Category 4: Sourcing Preferences, Currency, Upload Documents */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <DollarSign className="w-3.5 h-3.5 text-red-600" /> SECTION IV: CREDIT, SOURCING RULES & KYC DOCUMENTS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Sourcing Currency *</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="USD">USD ($) - United States Dollar</option>
                      <option value="JPY">JPY (¥) - Japanese Yen</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="KES">KES (KSh) - Kenya Shilling</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Is Broker Intermediary? *</label>
                    <select
                      value={broker}
                      onChange={(e: any) => setBroker(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="No">No - Direct Client</option>
                      <option value="Yes">Yes - Third party Broker</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Buying X-Grade Cars? *</label>
                    <select
                      value={buyingXGradeCars}
                      onChange={(e: any) => setBuyingXGradeCars(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    >
                      <option value="No">No - Restricted (Clean Cars Only)</option>
                      <option value="Yes">Yes - Authorized to Source X-Grade</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Tax PIN / ID No.</label>
                    <input
                      type="text"
                      value={taxPin}
                      onChange={(e) => setTaxPin(e.target.value)}
                      placeholder="e.g. A00123456Z"
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Incorporation Certificate / KYC ID Copy</label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, false)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200 py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        {incorporationCertificate ? "✓ ID Document Loaded" : "Upload KYC / Certificate File"}
                      </button>
                      {incorporationCertificate && (
                        <button
                          type="button"
                          onClick={() => setIncorporationCertificate('')}
                          className="px-3 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Internal Credit Desk Memo / Remarks</label>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Enter internal credit routing remarks or compliance memos..."
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2 text-xs text-neutral-800 focus:outline-none focus:border-red-500 h-10 resize-none font-sans transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-3 px-5 rounded-lg transition-all uppercase tracking-widest cursor-pointer shadow-md shadow-red-600/10 hover:shadow-red-600/20"
              >
                Enroll & Synchronize Client Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sourcing Client Modal overlay */}
      {showEditModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200/80 rounded-2xl w-full max-w-4xl p-6 sm:p-8 relative shadow-xl overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              disabled={updating}
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-500 hover:text-neutral-800 p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="space-y-1 mb-5 pb-3 border-b border-neutral-200">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-800">Edit Sourcing Client Details</h3>
              <p className="text-[11px] text-neutral-500 font-light">Modify customer profile properties below. Changes synchronize to customer credentials and associated records instantly.</p>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-6 text-xs font-mono">
              
              {/* Category 1: Account, Credentials & Assignment */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> SECTION I: ACCOUNT SECURITY, CREDENTIALS & ASSIGNMENT
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Email / Login ID *</label>
                    <input
                      type="email"
                      required
                      disabled={updating}
                      value={editCustEmail}
                      onChange={(e) => setEditCustEmail(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Portal Access Password *</label>
                    <input
                      type="text"
                      required
                      disabled={updating}
                      value={editCustPassword}
                      onChange={(e) => setEditCustPassword(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Assigned Sales Person *</label>
                    <select
                      required
                      disabled={updating || !isSuperAdmin}
                      value={editAssignedSalesPersonId}
                      onChange={(e) => setEditAssignedSalesPersonId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="">Select Sales Rep...</option>
                      {salespersons.map((s) => (
                        <option key={s.uid || s.id} value={s.uid || s.id}>
                          {s.name || s.displayName || s.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Member Tier Level *</label>
                    <select
                      required
                      disabled={updating}
                      value={editAssignedTierId}
                      onChange={(e) => setEditAssignedTierId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="">Select Tier level...</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} - Limit: ${t.creditLimit?.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">ERP Customer ID Code</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editErpCustomerId}
                      onChange={(e) => setEditErpCustomerId(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Activation Date *</label>
                    <input
                      type="date"
                      required
                      disabled={updating}
                      value={editActivationDate}
                      onChange={(e) => setEditActivationDate(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Status *</label>
                    <select
                      disabled={updating}
                      value={editCustStatus}
                      onChange={(e: any) => setEditCustStatus(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="active">Active & Portal Granted</option>
                      <option value="suspended">Suspended (Pending Balance)</option>
                      <option value="deactivated">Deactivated (Banned)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Category 2: Core Profile Details */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-red-600" /> SECTION II: CORE CLIENT IDENTITY & DEMOGRAPHICS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Client Full Name *</label>
                    <input
                      type="text"
                      required
                      disabled={updating}
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Company Name</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editCompName}
                      onChange={(e) => setEditCompName(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer DOB</label>
                    <input
                      type="date"
                      disabled={updating}
                      value={editCustomerDob}
                      onChange={(e) => setEditCustomerDob(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer Nationality</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editCustomerNationality}
                      onChange={(e) => setEditCustomerNationality(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Customer Category</label>
                    <select
                      disabled={updating}
                      value={editCustomerCategory}
                      onChange={(e) => setEditCustomerCategory(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="Retail">Retail Client</option>
                      <option value="Dealer">Commercial Dealer</option>
                      <option value="Corporate">Corporate Fleet</option>
                      <option value="Broker">Intermediary Broker</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Source of Acquisition</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editSourceOfAcquisition}
                      onChange={(e) => setEditSourceOfAcquisition(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Category 3: Logistics, Ports, Contacts */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-red-600" /> SECTION III: LOGISTICS, PORTS & COMMUNICATION CHANNELS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Tel/Mobile Number</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">WhatsApp (Tel/Mobile)</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Destination Country *</label>
                    <select
                      required
                      disabled={updating}
                      value={editCustCountry}
                      onChange={(e) => setEditCustCountry(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="">Select Country...</option>
                      {masterCountries.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      {masterCountries.length === 0 && <option value="Kenya">Kenya</option>}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Destination Port (Master) *</label>
                    <select
                      required
                      disabled={updating}
                      value={editPort}
                      onChange={(e) => setEditPort(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="">Select Port...</option>
                      {masterPorts
                        .filter(p => !editCustCountry || p.countryName === editCustCountry)
                        .map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      {masterPorts.length === 0 && <option value="Mombasa">Mombasa</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Delivery City</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Delivery State / Province</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Physical Shipping Address</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editCustAddress}
                      onChange={(e) => setEditCustAddress(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Category 4: Sourcing Preferences, Currency, Upload Documents */}
              <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <h4 className="text-[10px] uppercase font-bold text-red-600 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1.5 mb-3">
                  <DollarSign className="w-3.5 h-3.5 text-red-600" /> SECTION IV: CREDIT, SOURCING RULES & KYC DOCUMENTS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Sourcing Currency *</label>
                    <select
                      disabled={updating}
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="USD">USD ($) - United States Dollar</option>
                      <option value="JPY">JPY (¥) - Japanese Yen</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="KES">KES (KSh) - Kenya Shilling</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Is Broker Intermediary? *</label>
                    <select
                      disabled={updating}
                      value={editBroker}
                      onChange={(e: any) => setEditBroker(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="No">No - Direct Client</option>
                      <option value="Yes">Yes - Third party Broker</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Buying X-Grade Cars? *</label>
                    <select
                      disabled={updating}
                      value={editBuyingXGradeCars}
                      onChange={(e: any) => setEditBuyingXGradeCars(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    >
                      <option value="No">No - Restricted (Clean Cars Only)</option>
                      <option value="Yes">Yes - Authorized to Source X-Grade</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Tax PIN / ID No.</label>
                    <input
                      type="text"
                      disabled={updating}
                      value={editTaxPin}
                      onChange={(e) => setEditTaxPin(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-red-500 transition-all font-mono shadow-xs disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Incorporation Certificate / KYC ID Copy</label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        ref={editFileInputRef}
                        onChange={(e) => handleFileChange(e, true)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => editFileInputRef.current?.click()}
                        className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200 py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {editIncorporationCertificate ? "✓ ID Document Loaded" : "Upload KYC / Certificate File"}
                      </button>
                      {editIncorporationCertificate && (
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => setEditIncorporationCertificate('')}
                          className="px-3 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Internal Credit Desk Memo / Remarks</label>
                    <textarea
                      disabled={updating}
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                      placeholder="Enter internal credit routing remarks or compliance memos..."
                      className="w-full bg-white border border-neutral-200 focus:ring-1 focus:ring-red-500 rounded-lg p-2 text-xs text-neutral-800 focus:outline-none focus:border-red-500 h-10 resize-none font-sans transition-all shadow-xs disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-3 px-5 rounded-lg transition-all uppercase tracking-widest cursor-pointer shadow-md shadow-red-600/10 hover:shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Syncing Customer Profile & Credentials...</span>
                  </>
                ) : (
                  <span>Update & Synchronize Client Profile</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
