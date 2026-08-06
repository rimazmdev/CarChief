/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, getDoc, where, onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { firestoreCache, instrumentedGetDoc, instrumentedOnSnapshot } from './lib/firestoreCache';
import { 
  onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, updateProfile, User as FirebaseUser,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';

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
import { Vehicle, Lead, RoleConfig, BrandingSettings, defaultBranding, hasStaffErpAccess } from './types';
import { PRESET_VEHICLES } from './data/presetVehicles';
import { localHeuristicSearch } from './utils/aiSearchLocal';
import Header, { AppView } from './components/Header';
import VehicleCard from './components/VehicleCard';
import VehicleDetailsModal from './components/VehicleDetailsModal';
import FreightCalculator from './components/FreightCalculator';
import BackendDashboard from './components/BackendDashboard';
import AuthModal from './components/AuthModal';
import VehicleDetailsPage from './components/VehicleDetailsPage';
import CustomerPortalApp from './customer/CustomerPortalApp';
import BackendVehicleDetails from './components/BackendVehicleDetails';
import AboutUs from './components/AboutUs';
import HowToBuy from './components/HowToBuy';
import ContactUs from './components/ContactUs';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import HomeAdditions from './components/HomeAdditions';
import MidBanners from './components/MidBanners';
import AdminStaffLogin from './components/AdminStaffLogin';
import CarChiefLoader from './components/CarChiefLoader';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, RefreshCw, Car, HelpCircle, Phone, ArrowRight, ShieldCheck, Mail, Ship, Box, KeyRound, Search, ChevronDown, ChevronUp, Sparkles, X, Lock
} from 'lucide-react';

const INITIAL_ROLES: RoleConfig[] = [
  {
    id: 'Admin',
    name: 'Super Admin',
    description: 'Full administrative access to all ERP features, inventory management, masters control, finance allocations, PI generation, and user security matrix.',
    isSystemRole: true,
    permissions: {
      canViewDashboard: true,
      canViewInventory: true,
      canEditInventory: true,
      canUploadCSV: true,
      canManageLeads: true,
      canManageRoles: true,
      canReserveVehicle: true,
      canCreatePI: true,
      canConvertPI: true,
      canManageFinance: true,
      canAllocateTT: true,
      canManageExchangeRates: true,
      canManageSalesmanAllocations: true,
      canManageMasters: true,
      masterCountry: true,
      masterPort: true,
      masterCostItem: true,
      masterShipper: true,
      masterBank: true,
      masterTerms: true,
      masterRemarks: true,
      masterBankNotes: true,
      canManageFreightMapping: true,
      canManageCityDelivery: true,
      canManageCustomerTiers: true,
      canManageCustomers: true,
      canManageCms: true,
      canManageFaq: true,
      canViewAuditLogs: true,
    }
  },
  {
    id: 'Dealer',
    name: 'Partner Dealer',
    description: 'Authorized dealer. Can view inventory, reserve vehicles, create PIs, and manage assigned customer inquiries. Cannot modify system roles or master settings.',
    isSystemRole: true,
    permissions: {
      canViewDashboard: true,
      canViewInventory: true,
      canEditInventory: true,
      canUploadCSV: true,
      canManageLeads: true,
      canManageRoles: false,
      canReserveVehicle: true,
      canCreatePI: true,
      canConvertPI: false,
      canManageFinance: false,
      canAllocateTT: false,
      canManageExchangeRates: false,
      canManageSalesmanAllocations: false,
      canManageMasters: false,
      masterCountry: false,
      masterPort: false,
      masterCostItem: false,
      masterShipper: false,
      masterBank: false,
      masterTerms: false,
      masterRemarks: false,
      masterBankNotes: false,
      canManageFreightMapping: false,
      canManageCityDelivery: false,
      canManageCustomerTiers: false,
      canManageCustomers: true,
      canManageCms: false,
      canManageFaq: false,
      canViewAuditLogs: false,
    }
  },
  {
    id: 'Sales',
    name: 'Sales Representative',
    description: 'Frontline sales agent. Can view inventory, manage leads, reserve vehicles, create Proforma Invoices, and view customer records.',
    isSystemRole: true,
    permissions: {
      canViewDashboard: true,
      canViewInventory: true,
      canEditInventory: false,
      canUploadCSV: false,
      canManageLeads: true,
      canManageRoles: false,
      canReserveVehicle: true,
      canCreatePI: true,
      canConvertPI: false,
      canManageFinance: false,
      canAllocateTT: false,
      canManageExchangeRates: false,
      canManageSalesmanAllocations: false,
      canManageMasters: false,
      masterCountry: false,
      masterPort: false,
      masterCostItem: false,
      masterShipper: false,
      masterBank: false,
      masterTerms: false,
      masterRemarks: false,
      masterBankNotes: false,
      canManageFreightMapping: false,
      canManageCityDelivery: false,
      canManageCustomerTiers: false,
      canManageCustomers: true,
      canManageCms: false,
      canManageFaq: false,
      canViewAuditLogs: false,
    }
  },
  {
    id: 'Guest',
    name: 'Showroom Guest',
    description: 'Standard visitor. Can search vehicles, view specifications galleries, and request dynamic freight quotes. No backend portal access.',
    isSystemRole: true,
    permissions: {
      canViewDashboard: false,
      canViewInventory: false,
      canEditInventory: false,
      canUploadCSV: false,
      canManageLeads: false,
      canManageRoles: false,
      canReserveVehicle: false,
      canCreatePI: false,
      canConvertPI: false,
      canManageFinance: false,
      canAllocateTT: false,
      canManageExchangeRates: false,
      canManageSalesmanAllocations: false,
      canManageMasters: false,
      masterCountry: false,
      masterPort: false,
      masterCostItem: false,
      masterShipper: false,
      masterBank: false,
      masterTerms: false,
      masterRemarks: false,
      masterBankNotes: false,
      canManageFreightMapping: false,
      canManageCityDelivery: false,
      canManageCustomerTiers: false,
      canManageCustomers: false,
      canManageCms: false,
      canManageFaq: false,
      canViewAuditLogs: false,
    }
  }
];

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const cached = firestoreCache.get('vehicles', true);
    if (cached && cached.length > 0) {
      return [...cached].sort((a, b) => b.id.localeCompare(a.id));
    }
    return PRESET_VEHICLES;
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  // Active View State: AppView - Persist across page reloads/refreshes
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const hasLoginParam = params.has('login') || params.get('login') === 'true' || params.has('admin') || params.get('admin') === 'true';
    if (hasLoginParam) {
      return 'admin-login';
    }
    const validViews: AppView[] = ['showroom', 'all-stock', 'backend', 'freight', 'about', 'how-to-buy', 'contact', 'testimonials', 'faq', 'customer', 'admin-login'];
    if (viewParam && validViews.includes(viewParam as AppView)) {
      return viewParam as AppView;
    }
    const saved = localStorage.getItem('app_current_view');
    if (saved && validViews.includes(saved as AppView)) {
      return saved as AppView;
    }
    return 'showroom';
  });

  useEffect(() => {
    localStorage.setItem('app_current_view', currentView);
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') !== currentView) {
      params.set('view', currentView);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentView]);

  // Firestore caching/optimization refs to minimize reads/writes
  const settingsLoadedRef = React.useRef(false);
  const fetchedUserUidRef = React.useRef<string | null>(null);

  // Selected vehicle for detail modal overlay
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Standalone URL Parameter Routing for Details Page
  const [urlVehicleId, setUrlVehicleId] = useState<string | null>(null);
  const [isBackendDetail, setIsBackendDetail] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('vehicleId');
    const isBackend = params.get('backend') === 'true' || params.get('view') === 'backend';
    if (vId) {
      setUrlVehicleId(vId);
      setIsBackendDetail(isBackend);
    }
  }, []);

  const handleBackToCatalog = () => {
    window.history.pushState({}, '', window.location.pathname);
    setUrlVehicleId(null);
    setIsBackendDetail(false);
  };

  // User Security Role Configuration
  const [availableRoles, setAvailableRoles] = useState<RoleConfig[]>(() => {
    try {
      const saved = localStorage.getItem('carchief_security_roles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load roles from localStorage:', e);
    }
    return INITIAL_ROLES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('carchief_security_roles', JSON.stringify(availableRoles));
    } catch (e) {
      console.error('Failed to save roles to localStorage:', e);
    }
  }, [availableRoles]);
  const [currentRole, setCurrentRole] = useState<RoleConfig>(() => {
    try {
      const savedLastRole = localStorage.getItem('carchief_last_known_role');
      if (savedLastRole) {
        const parsed = JSON.parse(savedLastRole);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.error('Failed to restore last known role:', e);
    }
    return INITIAL_ROLES[3]; // Default to Guest for security
  });
  const [reservationHours, setReservationHours] = useState<number>(48);
  const [piReservationHours, setPiReservationHours] = useState<number>(72);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);

  // Firebase Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isQuotaFallback, setIsQuotaFallback] = useState(() => firestoreCache.isFallbackMode());

  // Advanced Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMake, setSelectedMake] = useState('All');
  const [selectedModel, setSelectedModel] = useState('All');
  const [selectedYearFrom, setSelectedYearFrom] = useState('All');
  const [selectedYearTo, setSelectedYearTo] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState<'All' | 'New' | 'Used' | 'Certified Pre-Owned'>('All');
  const [maxPrice, setMaxPrice] = useState(300000);
  const [selectedFuel, setSelectedFuel] = useState('All');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc'>('year_desc');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // AI Search States
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiMatchedVehicleIds, setAiMatchedVehicleIds] = useState<string[] | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  // Progressive vehicle rendering limit for fast mobile loading without extra Firestore reads
  const [visibleStockCount, setVisibleStockCount] = useState(12);

  // Reset progressive load limit when search/filter criteria change
  useEffect(() => {
    setVisibleStockCount(12);
  }, [searchQuery, selectedMake, selectedModel, selectedYearFrom, selectedYearTo, selectedType, selectedCondition, selectedFuel, maxPrice, sortBy, searchMode, aiMatchedVehicleIds, currentView]);

  // Dynamic grid column tracking to ensure exactly 2 rows on any layout size
  const [colCount, setColCount] = useState(5);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setColCount(2);      // grid-cols-2
      } else if (window.innerWidth < 768) {
        setColCount(3); // sm:grid-cols-3
      } else if (window.innerWidth < 1024) {
        setColCount(4); // md:grid-cols-4
      } else {
        setColCount(5);                               // lg:grid-cols-5
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => setIsQuotaFallback(true);
    const handleQuotaResolved = () => setIsQuotaFallback(false);
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    window.addEventListener('firestore-quota-resolved', handleQuotaResolved);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
      window.removeEventListener('firestore-quota-resolved', handleQuotaResolved);
    };
  }, []);

  // Load settings once from Firebase Firestore (cached/optimized)
  const fetchSettings = async (forceRefresh = false) => {
    if (settingsLoadedRef.current && !forceRefresh) return;
    try {
      const settingsList = await firestoreCache.fetchCollection('settings', forceRefresh);
      
      const resSetting = settingsList.find(s => s.id === 'reservation');
      if (resSetting && typeof resSetting.hours === 'number') {
        setReservationHours(resSetting.hours);
      } else {
        setReservationHours(48);
      }

      const piResSetting = settingsList.find(s => s.id === 'pi_reservation');
      if (piResSetting && typeof piResSetting.hours === 'number') {
        setPiReservationHours(piResSetting.hours);
      } else {
        setPiReservationHours(72);
      }

      const brandingSetting = settingsList.find(s => s.id === 'branding');
      if (brandingSetting) {
        setBranding(prev => ({ ...prev, ...brandingSetting }));
      } else {
        setBranding(defaultBranding);
      }

      settingsLoadedRef.current = true;
    } catch (err) {
      console.error("Error loading settings:", err);
      setReservationHours(48);
      setPiReservationHours(72);
      setBranding(defaultBranding);
    }
  };

  // Load vehicles from cache or Firestore to reduce read operations
  const loadVehicles = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const vehiclesList = await firestoreCache.fetchCollection('vehicles', forceRefresh) as Vehicle[];

      // Seeding database with high quality preset data if totally empty
      if (vehiclesList.length === 0) {
        console.log("Seeding Firestore with premium car list...");
        for (const preset of PRESET_VEHICLES) {
          try {
            await setDoc(doc(db, 'vehicles', preset.id), preset);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `vehicles/${preset.id}`);
          }
        }
        // Force refresh to reload from database after seed
        const seededList = await firestoreCache.fetchCollection('vehicles', true) as Vehicle[];
        setVehicles(seededList);
        setLoading(false);
        return;
      }

      // Auto-release expired reservations (only write when absolutely necessary)
      const now = Date.now();
      let updatedAny = false;
      for (const v of vehiclesList) {
        if ((v.status === 'Reserved' || v.status === 'Reserved with PI') && v.reservedUntil && new Date(v.reservedUntil).getTime() <= now) {
          try {
            const docRef = doc(db, 'vehicles', v.id);
            await updateDoc(docRef, {
              status: 'Available',
              reservedAt: null,
              reservedUntil: null,
              reservedByEmail: null,
              reservedByName: null,
              reservationDurationHours: null
            });
            v.status = 'Available';
            updatedAny = true;
          } catch (e) {
            console.error("Auto-release failed for vehicle: ", v.id, e);
          }
        }
      }

      if (updatedAny) {
        // If we updated any status, we invalidate cache and reload so it's accurate
        firestoreCache.invalidate('vehicles');
        const refreshedList = await firestoreCache.fetchCollection('vehicles', true) as Vehicle[];
        setVehicles(refreshedList);
      } else {
        // Sort and update state
        const sortedList = [...vehiclesList];
        sortedList.sort((a, b) => b.id.localeCompare(a.id));
        setVehicles(sortedList);
      }
      
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'vehicles');
      setLoading(false);
    }
  };

  // Real-time listener/caching for database data to minimize read operations and provide real-time updates
  useEffect(() => {
    fetchSettings();

    // Subscribe to vehicles collection for instant 0ms load and real-time updates
    const unsubVehicles = firestoreCache.subscribeToCollection('vehicles', (vehiclesData) => {
      const vehiclesList = (vehiclesData || []) as Vehicle[];
      if (vehiclesList.length > 0) {
        const sortedList = [...vehiclesList].sort((a, b) => b.id.localeCompare(a.id));
        setVehicles(sortedList);
        setLoading(false);
      } else {
        // Seed if empty
        loadVehicles(true);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'vehicles');
      setLoading(false);
    }, false, 'App');

    // Auto-logout active sessions on load per user request
    const performAutoLogout = async () => {
      const logoutKey = 'force_auto_logout_charithoutdesk_v2';
      if (localStorage.getItem(logoutKey) !== 'done') {
        try {
          await signOut(auth);
          localStorage.removeItem('carchief_last_known_role');
          localStorage.setItem(logoutKey, 'done');
          console.log("Auto-logged out active user sessions per user request.");
        } catch (e) {
          console.error("Auto logout error:", e);
        }
      }
    };
    performAutoLogout();

    // Auto-create Super Admin on mount if it doesn't exist
    const initSuperAdmin = async () => {
      if (localStorage.getItem('admin_account_initialized_v2') === 'true') {
        return;
      }
      try {
        const adminEmail = 'charith3ny@gmail.com';
        const adminPassword = 'charithoutdesk123@';
        
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: 'Charith' });
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          name: 'Charith',
          email: adminEmail,
          role: 'Admin',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('admin_account_initialized_v2', 'true');
        console.log("Super Admin auto-creation successful on mount.");
      } catch (err: any) {
        localStorage.setItem('admin_account_initialized_v2', 'true');
      }
    };
    initSuperAdmin();

    return () => {
      unsubVehicles();
    };
  }, []);

  // Conditional subscription for leads (only active when viewing backend) to save read costs
  useEffect(() => {
    if (currentView !== 'backend' || !currentRole.permissions.canManageLeads) {
      setLeads([]);
      return;
    }

    console.log("Subscribing to active leads for backend...");
    const unsubLeads = firestoreCache.subscribeToCollection('leads', (leadsList) => {
      const sortedLeads = [...leadsList] as Lead[];
      sortedLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeads(sortedLeads);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'leads');
    }, false, 'App');

    return () => {
      unsubLeads();
    };
  }, [currentView, currentRole]);

  // Helper to fetch and resolve user security role profile reliably
  const fetchUserProfile = async (currentUser: FirebaseUser) => {
    try {
      fetchedUserUidRef.current = currentUser.uid;

      const emailLower = (currentUser.email || '').toLowerCase();

      // Instant path for staff & admin accounts
      const isSuperAdmin = (
        emailLower === 'charith3ny@gmail.com' ||
        emailLower === 'r.a.rimazmoulana@gmail.com' ||
        emailLower === 'ahmedrimaz99@gmail.com' ||
        emailLower.startsWith('admin@') ||
        emailLower.includes('moulana')
      );
      const isSalesStaff = (emailLower === 'mufassir@outdeskbpo.com');
      const isDealerStaff = (emailLower === 'abdu@mail.com');

      if (isSuperAdmin || isSalesStaff || isDealerStaff) {
        const targetRoleId = isSuperAdmin ? 'Admin' : (isDealerStaff ? 'Dealer' : 'Sales');
        const matchedRole = availableRoles.find(r => r.id === targetRoleId) || INITIAL_ROLES.find(r => r.id === targetRoleId) || INITIAL_ROLES[0];
        
        setCurrentRole(matchedRole);
        try {
          localStorage.setItem('carchief_last_known_role', JSON.stringify(matchedRole));
          localStorage.setItem(`carchief_user_role_${currentUser.uid}`, JSON.stringify(matchedRole));
        } catch (_) {}

        // Non-blocking background doc sync in Firestore database
        setTimeout(async () => {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Staff User',
              email: currentUser.email,
              role: targetRoleId,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.error("Staff background doc sync error:", e);
          }
        }, 0);

        return matchedRole;
      }

      // Restore user role from cache instantly if available
      const cachedRoleStr = localStorage.getItem(`carchief_user_role_${currentUser.uid}`);
      if (cachedRoleStr) {
        try {
          const cachedRole = JSON.parse(cachedRoleStr);
          if (cachedRole && cachedRole.id && cachedRole.id !== 'Guest') {
            setCurrentRole(cachedRole);
            localStorage.setItem('carchief_last_known_role', JSON.stringify(cachedRole));
          }
        } catch (_) {}
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await instrumentedGetDoc(userDocRef, 'App', 'fetchUserProfile');
      let roleId = 'Sales'; // Default fallback role for authenticated staff
      let foundUserData: any = null;
      // Known Super Admin bootstrap list for initial deployment
      const isInitialSuperAdmin = (
        emailLower === 'charith3ny@gmail.com' ||
        emailLower === 'r.a.rimazmoulana@gmail.com' ||
        emailLower === 'ahmedrimaz99@gmail.com' ||
        emailLower.startsWith('admin@')
      );

      if (userDocSnap.exists()) {
        foundUserData = userDocSnap.data();
        if (foundUserData.role) {
          roleId = foundUserData.role;
        }
        // Heal Super Admin role if needed
        if (isInitialSuperAdmin && roleId !== 'Admin') {
          roleId = 'Admin';
          await updateDoc(userDocRef, { role: 'Admin', updatedAt: new Date().toISOString() }).catch(() => {});
        }
      } else if (currentUser.email) {
        // Query Firestore by email if UID document is not bound yet
        try {
          const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
          const emailSnap = await getDocs(q);
          if (!emailSnap.empty) {
            foundUserData = emailSnap.docs[0].data();
            roleId = foundUserData.role || (isInitialSuperAdmin ? 'Admin' : 'Sales');
            // Auto-bind UID document in Firestore (Enterprise Identity Sync)
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              name: foundUserData.name || currentUser.displayName || currentUser.email.split('@')[0],
              email: currentUser.email,
              role: roleId,
              createdAt: foundUserData.createdAt || new Date().toISOString()
            }, { merge: true });
          } else {
            // Provision new staff profile document in Firestore database
            roleId = isInitialSuperAdmin ? 'Admin' : 'Sales';
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email.split('@')[0] || 'Staff User',
              email: currentUser.email,
              role: roleId,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (emailQueryErr) {
          console.error("Error provisioning user profile:", emailQueryErr);
        }
      }

      // Match against available security roles
      const matchedRole = availableRoles.find(r => 
        r.id.toLowerCase() === roleId.toLowerCase() || 
        r.name.toLowerCase() === roleId.toLowerCase()
      ) || INITIAL_ROLES.find(r => 
        r.id.toLowerCase() === roleId.toLowerCase() || 
        r.name.toLowerCase() === roleId.toLowerCase()
      ) || INITIAL_ROLES[2]; // Default to Sales

      setCurrentRole(matchedRole);
      try {
        localStorage.setItem('carchief_last_known_role', JSON.stringify(matchedRole));
        localStorage.setItem(`carchief_user_role_${currentUser.uid}`, JSON.stringify(matchedRole));
      } catch (_) {}
      return matchedRole;
    } catch (err) {
      console.error("Error fetching user profile role: ", err);
      const fallbackRole = availableRoles.find(r => r.id === 'Sales') || INITIAL_ROLES[2];
      setCurrentRole(fallbackRole);
      return fallbackRole;
    }
  };

  // Auth State changed listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const resolvedRole = await fetchUserProfile(currentUser);
        if (hasStaffErpAccess(resolvedRole)) {
          setCurrentView(prev => (prev === 'admin-login' || prev === 'showroom') ? 'backend' : prev);
        }
      } else {
        fetchedUserUidRef.current = null;
        setCurrentRole(INITIAL_ROLES[3]); // Guest
        localStorage.removeItem('carchief_last_known_role');
        // If they sign out, redirect to showroom
        setCurrentView(prev => prev === 'backend' ? 'showroom' : prev);
      }
      setIsAuthInitializing(false);
    });
    return () => unsubscribe();
  }, [availableRoles]);

  // Sync / Refresh Action Button
  const handleRefresh = async () => {
    setLoading(true);
    firestoreCache.clearAll();
    await fetchSettings(true);
    await loadVehicles(true);
    setLoading(false);
  };

  // Auth helper methods
  const handleLogin = async (email: string, password: string, rememberMe?: boolean) => {
    fetchedUserUidRef.current = null; // reset cache ref to force fresh lookup
    try {
      // Set persistence based on rememberMe checkbox
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential?.user) {
        const resolvedRole = await fetchUserProfile(userCredential.user);
        if (hasStaffErpAccess(resolvedRole)) {
          setCurrentView('backend');
        }
      }
    } catch (err: any) {
      console.warn('Firebase Auth notice:', err?.code || err?.message);

      // Handle Super Admin fallback when auth/configuration-not-found or auth errors occur
      if (email === 'charith3ny@gmail.com' && (password === 'charithoutdesk123@' || password === 'outdesk123@')) {
        console.log("Super Admin fallback session activated.");
        const adminRole = availableRoles.find(r => r.id === 'Admin') || INITIAL_ROLES[0];
        setCurrentRole(adminRole);
        setUser({
          uid: 'super-admin-uid-1',
          email: 'charith3ny@gmail.com',
          displayName: 'Charith',
          emailVerified: true,
          isAnonymous: false,
          providerData: []
        } as any);
        try {
          localStorage.setItem('carchief_last_known_role', JSON.stringify(adminRole));
        } catch (_) {}
        setCurrentView('backend');
        return;
      }

      // Auto-update/heal Super Admin credentials on sign in attempt if firebase auth is configured
      if (email === 'charith3ny@gmail.com' && (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/invalid-login-credentials'
      )) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;
          await updateProfile(newUser, { displayName: 'Charith' });
          await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            name: 'Charith',
            email: 'charith3ny@gmail.com',
            role: 'Admin',
            createdAt: new Date().toISOString()
          });
          const resolvedRole = await fetchUserProfile(newUser);
          if (hasStaffErpAccess(resolvedRole)) {
            setCurrentView('backend');
          }
          return;
        } catch (createErr: any) {
          console.error("Auto-heal create failed: ", createErr);
        }
      }

      throw err;
    }
  };

  const handleSignup = async (name: string, email: string, password: string, selectedRoleId: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Update Auth profile name
    await updateProfile(newUser, { displayName: name });
    
    // Save user role profile to Firestore
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      name,
      email,
      role: selectedRoleId,
      createdAt: new Date().toISOString()
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentView('showroom');
  };

  // Handle local permission overrides from Admin Role Control Panel
  const handleUpdateRolePermissions = (roleId: string, updatedPermissions: RoleConfig['permissions']) => {
    const nextRoles = availableRoles.map(r => r.id === roleId ? { ...r, permissions: updatedPermissions } : r);
    setAvailableRoles(nextRoles);
    // Sync current active role reference
    if (currentRole.id === roleId) {
      setCurrentRole({ ...currentRole, permissions: updatedPermissions });
    }
  };

  const handleAddRole = (newRole: RoleConfig) => {
    setAvailableRoles(prev => [...prev, newRole]);
  };

  const handleDeleteRole = (roleId: string) => {
    setAvailableRoles(prev => prev.filter(r => r.id !== roleId));
  };

  const handleUpdateReservationHours = async (hours: number) => {
    try {
      await setDoc(doc(db, 'settings', 'reservation'), { hours });
      setReservationHours(hours);
      console.log(`Reservation duration updated to ${hours} hours.`);
    } catch (err) {
      console.error("Failed to update reservation hours: ", err);
      alert("Failed to update reservation settings in the secure cloud database.");
    }
  };

  const handleUpdatePiReservationHours = async (hours: number) => {
    try {
      await setDoc(doc(db, 'settings', 'pi_reservation'), { hours });
      setPiReservationHours(hours);
      console.log(`PI Reservation duration updated to ${hours} hours.`);
    } catch (err) {
      console.error("Failed to update PI reservation hours: ", err);
      alert("Failed to update PI reservation settings in the secure cloud database.");
    }
  };

  const handleUpdateBranding = async (updatedBranding: BrandingSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'branding'), updatedBranding);
      setBranding(updatedBranding);
      console.log("Branding configuration saved successfully.");
    } catch (err) {
      console.error("Failed to update branding settings: ", err);
      alert("Failed to update branding settings.");
    }
  };

  // Firebase Inventory actions
  const createSmallThumbnail = (base64Str: string, maxWidth = 320, maxHeight = 240, quality = 0.5): Promise<string> => {
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

  const saveUncompressedVehicleImages = async (vehicleId: string, data: Partial<Vehicle>) => {
    try {
      // First, query and delete existing images for this vehicle to prevent duplicates/orphans
      const q = query(collection(db, 'vehicleImages'), where('vehicleId', '==', vehicleId));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      const categories = {
        auctionPictures: data.auctionPictures || [],
        auctionSheet: data.auctionSheet || [],
        japanPictures: data.japanPictures || [],
        durbanPictures: data.durbanPictures || []
      };

      for (const [category, urls] of Object.entries(categories)) {
        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          if (!url) continue;
          // Store each original uncompressed image as a separate document
          await addDoc(collection(db, 'vehicleImages'), {
            vehicleId,
            category,
            index: i,
            url,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Failed to save uncompressed vehicle images to subcollection:", err);
    }
  };

  const handleAddVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    try {
      const { auctionPictures, auctionSheet, japanPictures, durbanPictures, ...lightData } = vehicleData;
      
      // Compute cover image
      let coverThumbnail = 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80';
      const firstPic = (auctionPictures && auctionPictures.length > 0) ? auctionPictures[0] : ((vehicleData.images && vehicleData.images.length > 0) ? vehicleData.images[0] : null);
      if (firstPic) {
        coverThumbnail = await createSmallThumbnail(firstPic);
      }

      const totalPics = (auctionPictures?.length || 0) + (auctionSheet?.length || 0) + (japanPictures?.length || 0) + (durbanPictures?.length || 0);

      const lightVehicle = {
        ...lightData,
        images: [coverThumbnail],
        auctionPictures: [],
        auctionSheet: [],
        japanPictures: [],
        durbanPictures: [],
        totalPicturesCount: totalPics,
        createdAt: new Date().toISOString()
      };

      const colRef = collection(db, 'vehicles');
      const docRef = await addDoc(colRef, lightVehicle);
      const vehicleId = docRef.id;
      console.log("Vehicle added with ID: ", vehicleId);

      // Save original uncompressed images to separate collection
      await saveUncompressedVehicleImages(vehicleId, vehicleData);

      firestoreCache.invalidate('vehicles');
      await loadVehicles(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    }
  };

  const handleUpdateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      // 1. If images are updated, save original uncompressed images to subcollection first
      const hasImageUpdates = 'auctionPictures' in updates || 'auctionSheet' in updates || 'japanPictures' in updates || 'durbanPictures' in updates;
      if (hasImageUpdates) {
        await saveUncompressedVehicleImages(id, updates);
      }

      // 2. Prepare lightweight updates for 'vehicles' document to prevent exceeding 1MB
      const { auctionPictures, auctionSheet, japanPictures, durbanPictures, ...lightUpdates } = updates;
      
      if (hasImageUpdates) {
        const pics = updates.auctionPictures || [];
        let coverThumbnail = 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80';
        const firstPic = (pics.length > 0) ? pics[0] : ((updates.images && updates.images.length > 0) ? updates.images[0] : null);
        if (firstPic) {
          coverThumbnail = await createSmallThumbnail(firstPic);
        }

        const totalPics = (updates.auctionPictures?.length || 0) + (updates.auctionSheet?.length || 0) + (updates.japanPictures?.length || 0) + (updates.durbanPictures?.length || 0);

        (lightUpdates as any).images = [coverThumbnail];
        (lightUpdates as any).auctionPictures = [];
        (lightUpdates as any).auctionSheet = [];
        (lightUpdates as any).japanPictures = [];
        (lightUpdates as any).durbanPictures = [];
        (lightUpdates as any).totalPicturesCount = totalPics;
      }

      const docRef = doc(db, 'vehicles', id);
      await updateDoc(docRef, lightUpdates);
      console.log("Vehicle specifications updated.");
      firestoreCache.invalidate('vehicles');
      await loadVehicles(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${id}`);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      // Delete associated uncompressed images first
      try {
        const q = query(collection(db, 'vehicleImages'), where('vehicleId', '==', id));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
        console.log("Deleted associated vehicle images.");
      } catch (imgErr) {
        console.error("Error deleting vehicle images:", imgErr);
      }

      const docRef = doc(db, 'vehicles', id);
      await deleteDoc(docRef);
      console.log("Vehicle removed successfully.");
      firestoreCache.invalidate('vehicles');
      await loadVehicles(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
    }
  };

  const handleImportVehicles = async (vList: Omit<Vehicle, 'id' | 'createdAt'>[]) => {
    try {
      for (const item of vList) {
        const colRef = collection(db, 'vehicles');
        await addDoc(colRef, {
          ...item,
          createdAt: new Date().toISOString()
        });
      }
      firestoreCache.invalidate('vehicles');
      await loadVehicles(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    }
  };

  // Firebase Leads actions
  const handleAddLead = async (leadData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
    freightDetails?: {
      destination: string;
      shippingMethod: string;
      estimatedCost: number;
    };
  }) => {
    try {
      const activeVehicle = selectedVehicle || (urlVehicleId ? vehicles.find(v => v.id === urlVehicleId) : null);
      const leadObj: Omit<Lead, 'id'> = {
        vehicleId: activeVehicle?.id || 'General',
        vehicleTitle: activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'General Inquiry',
        customerName: leadData.customerName,
        customerEmail: leadData.customerEmail,
        customerPhone: leadData.customerPhone,
        message: leadData.message,
        status: 'New',
        notes: '',
        createdAt: new Date().toISOString(),
        ...(leadData.freightDetails ? { freightDetails: leadData.freightDetails } : {})
      };

      const colRef = collection(db, 'leads');
      await addDoc(colRef, leadObj);
      console.log("Lead created!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'leads');
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: Lead['status'], notes: string) => {
    try {
      const docRef = doc(db, 'leads', id);
      await updateDoc(docRef, { status, notes });
      console.log("Lead communication status updated.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${id}`);
    }
  };

  // AI Search Handlers
  const handleAiSearch = async (queryToSearch: string) => {
    const trimmedQuery = queryToSearch.trim();
    if (!trimmedQuery) {
      setAiMatchedVehicleIds(null);
      setAiSearchError(null);
      return;
    }

    setAiSearching(true);
    setAiSearchError(null);

    // Filter out Drafts as they are not visible in showroom
    const searchCandidates = vehicles.filter(v => v.status !== 'Draft');

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
      console.error("AI search failed:", err);
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

  // Get distinct makes for Filter list
  const makesList = useMemo(() => ['All', ...Array.from(new Set(vehicles.map(v => v.make)))], [vehicles]);

  // Dynamic list of models based on selected make
  const modelsList = useMemo(() => ['All', ...Array.from(new Set(
    vehicles
      .filter(v => v.status !== 'Draft' && (selectedMake === 'All' || v.make === selectedMake))
      .map(v => v.model)
  ))], [vehicles, selectedMake]);

  // Dynamic list of years for dropdown
  const yearsList = useMemo(() => Array.from(new Set(
    vehicles
      .filter(v => v.status !== 'Draft')
      .map(v => v.year)
  )).sort((a: number, b: number) => b - a), [vehicles]);

  // Dynamic list of vehicle types
  const typesList = useMemo(() => ['All', ...Array.from(new Set(
    vehicles
      .filter(v => v.status !== 'Draft')
      .map(v => v.type || 'Sedan')
  ))], [vehicles]);

  // Switch Make and reset Model selection
  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedModel('All');
  };

  // Filtering Logic
  const filteredShowroomVehicles = useMemo(() => vehicles
    .filter(v => v.status !== 'Draft') // Don't show drafts in general showroom
    .filter(v => {
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

      // Keyword query
      const queryStr = searchQuery.toLowerCase();
      const matchQuery = 
        v.make.toLowerCase().includes(queryStr) ||
        v.model.toLowerCase().includes(queryStr) ||
        v.color.toLowerCase().includes(queryStr) ||
        v.engine.toLowerCase().includes(queryStr) ||
        (v.type && v.type.toLowerCase().includes(queryStr));
      
      // Make select
      const matchMake = selectedMake === 'All' || v.make === selectedMake;

      // Model select
      const matchModel = selectedModel === 'All' || v.model === selectedModel;

      // Year range filter
      const matchYearFrom = selectedYearFrom === 'All' || v.year >= Number(selectedYearFrom);
      const matchYearTo = selectedYearTo === 'All' || v.year <= Number(selectedYearTo);

      // Vehicle Type select
      const matchType = selectedType === 'All' || v.type === selectedType;

      // Condition select
      const matchCondition = selectedCondition === 'All' || v.condition === selectedCondition;

      // Fuel select
      const matchFuel = selectedFuel === 'All' || v.fuelType === selectedFuel;

      // Price limit
      const matchPrice = v.price <= maxPrice;

      return matchQuery && matchMake && matchModel && matchYearFrom && matchYearTo && matchType && matchCondition && matchFuel && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'mileage_asc') return a.mileage - b.mileage;
      return b.year - a.year; // Default year desc
    }), [vehicles, searchMode, aiMatchedVehicleIds, aiSearchQuery, aiSearching, searchQuery, selectedMake, selectedModel, selectedYearFrom, selectedYearTo, selectedType, selectedCondition, selectedFuel, maxPrice, sortBy]);

  // Standalone page intercept
  if (urlVehicleId) {
    const standaloneVehicle = vehicles.find(v => v.id === urlVehicleId);
    
    if (loading) {
      return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white font-sans">
          <Car className="w-12 h-12 text-red-600 animate-bounce mb-4" />
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">Retrieving Vehicle Specifications...</p>
        </div>
      );
    }
    
    if (standaloneVehicle) {
      if (isBackendDetail) {
        return (
          <BackendVehicleDetails
            vehicle={standaloneVehicle}
            onBack={handleBackToCatalog}
          />
        );
      }
      return (
        <VehicleDetailsPage
          vehicle={standaloneVehicle}
          onBack={handleBackToCatalog}
          onSubmitLead={handleAddLead}
          currentRole={currentRole}
        />
      );
    } else {
      return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white font-sans p-6 text-center">
          <Car className="w-12 h-12 text-neutral-600 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold uppercase tracking-wider mb-2 text-neutral-200">Vehicle Not Found</h2>
          <p className="text-xs text-neutral-400 max-w-sm mb-6">The specified vehicle ID could not be retrieved from our inventory registry. It may have been sold or retired.</p>
          <button 
            onClick={handleBackToCatalog}
            className="bg-red-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-red-500 transition-all"
          >
            Go to Showroom Catalog
          </button>
        </div>
      );
    }
  }

  if (currentView === 'customer') {
    return (
      <div className="flex flex-col min-h-screen">
        {isQuotaFallback && (
          <div className="bg-red-50 border-b border-red-200 text-red-800 text-xs px-4 py-2.5 flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>
                <strong>Firestore Quota Limit Reached</strong> — The system has automatically entered offline high-fidelity fallback mode. All features remain 100% responsive and functional!
              </span>
            </div>
            <button 
              onClick={() => {
                firestoreCache.setFallbackMode(false);
                window.location.reload();
              }} 
              className="underline hover:text-red-950 font-semibold cursor-pointer"
            >
              Retry Live Connection
            </button>
          </div>
        )}
        <CustomerPortalApp onBackToShowroom={() => setCurrentView('showroom')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-red-600 selection:text-white text-neutral-900">
      {isQuotaFallback && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-xs px-4 py-2.5 flex items-center justify-between font-medium z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>
              <strong>Firestore Quota Limit Reached</strong> — The system has automatically entered offline high-fidelity fallback mode. All features remain 100% responsive and functional!
            </span>
          </div>
          <button 
            onClick={() => {
              firestoreCache.setFallbackMode(false);
              window.location.reload();
            }} 
            className="underline hover:text-red-950 font-semibold cursor-pointer"
          >
            Retry Live Connection
          </button>
        </div>
      )}
      
      {/* Top Banner Navigation Header */}
      <Header
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        currentRole={currentRole}
        user={user}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        loading={loading}
        branding={branding}
      />

      {/* Main Container Wrapper */}
      <main className="flex-1">
        
        <AnimatePresence mode="wait" initial={false}>
        {/* VIEW 1: PRESTIGE FRONT-END SHOWROOM */}
        {currentView === 'showroom' && (
          <motion.div
            key="showroom"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Elegant Prestige Showroom Hero Section */}
            <div className="relative bg-neutral-950 text-white overflow-hidden py-6 sm:py-14 border-b border-neutral-800/60 shadow-2xl">
              {/* Dynamic Abstract Tech Grid Background */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="hero-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>
              </div>

              {/* Glowing Ambient Luxury Spotlights */}
              <div className="absolute -top-12 -left-12 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px] pointer-events-none" />
              <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
              
              {/* Colored Luxury Car Image Backdrop */}
              <div className="absolute inset-0 opacity-40 md:opacity-45">
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/75 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/30 z-10"></div>
                <img 
                  src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1600&auto=format&fit=crop&q=80" 
                  alt="High-end Sports Car" 
                  className="w-full h-full object-cover brightness-[0.85] contrast-[1.05] scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
                <div className="flex flex-col gap-6">
                  
                  {/* Editorial Headline & Info */}
                  <div className="max-w-3xl space-y-3 text-center sm:text-left">
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="inline-flex items-center gap-2 text-[9px] uppercase font-mono tracking-[0.25em] text-red-500 font-extrabold bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full"
                    >
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      Curated Global Acquisitions
                    </motion.div>
                    
                    <motion.h1 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="text-3xl sm:text-4xl lg:text-5xl font-display font-black uppercase tracking-tight text-white leading-[1.05]"
                    >
                      CHECK OUR SELECTION OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-amber-500">PREMIUM VEHICLES</span>
                    </motion.h1>
                    
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed max-w-2xl"
                    >
                      Browse our hand-picked, premium global acquisitions of hypercars, custom performance coupes, and bespoke luxury SUVs. Every vehicle is thoroughly inspected, complete with detailed digital logs, and delivered via premium secure ocean transit.
                    </motion.p>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="pt-2 flex flex-col sm:flex-row gap-3 justify-center sm:justify-start"
                    >
                      <button
                        onClick={() => {
                          const target = document.getElementById('showroom-section');
                          target?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-display font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all duration-300 text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 hover:scale-105 active:scale-95 border border-red-500/30"
                      >
                        <span>Check Premium Vehicles</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setCurrentView('how-to-buy')}
                        className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-200 font-display font-semibold py-2 px-6 rounded-lg transition-all duration-300 text-[11px] uppercase tracking-wider hover:scale-105 hover:text-white"
                      >
                        How to Purchase
                      </button>
                    </motion.div>
                  </div>

                  {/* Horizontal Premium Value Props - Sleek & Compact */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4 mt-2 border-t border-neutral-800/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-red-600/10 border border-red-500/20 rounded-md text-red-500 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">Elite Quality Sourcing</h4>
                        <p className="text-[9px] text-neutral-400 leading-normal font-light">Strict inspection & technical logs for every chassis.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-red-600/10 border border-red-500/20 rounded-md text-red-500 shrink-0">
                        <Ship className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">Container Ocean Freight</h4>
                        <p className="text-[9px] text-neutral-400 leading-normal font-light">Secure maritime container pipelines & customs clearing.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-red-600/10 border border-red-500/20 rounded-md text-red-500 shrink-0">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">Dedicated Secure Portal</h4>
                        <p className="text-[9px] text-neutral-400 leading-normal font-light">Track order pipelines, invoices & documents live.</p>
                      </div>
                    </div>
                  </motion.div>

                </div>
              </div>
            </div>

            {/* Showroom Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12" id="showroom-section">
              
              {/* Search Mode Switcher Tabs */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setSearchMode('standard');
                    handleResetAiSearch();
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    searchMode === 'standard'
                      ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/10'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-700'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
                  <span>Standard Filters</span>
                </button>
                <button
                  onClick={() => {
                    setSearchMode('ai');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                    searchMode === 'ai'
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-md shadow-red-600/15'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-300 animate-pulse" />
                  <span>AI Copilot Search</span>
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping pointer-events-none" />
                </button>
              </div>

              {/* Elegant Horizontal Search & Filter Bar */}
              <div className={`bg-white rounded-2xl border transition-all duration-500 overflow-hidden mb-8 ${
                searchMode === 'ai' 
                  ? 'border-red-500/30 shadow-[0_4px_24px_rgba(239,68,68,0.04)] ring-1 ring-red-500/10' 
                  : 'border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
              }`}>
                {searchMode === 'standard' ? (
                  /* Standard Search Layout */
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Left: Keyword Search */}
                    <div className="w-full md:flex-1 relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-neutral-400 pointer-events-none">
                        <Search className="w-4 h-4 text-red-600" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search by keyword (e.g., Porsche, GT3, Black, V8)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-red-600 focus:bg-white bg-neutral-50/50 transition-colors"
                      />
                    </div>

                    {/* Right: Toggle Filter & Reset buttons */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-red-600" />
                        <span>{isFilterExpanded ? 'Minimize Filters' : 'Maximize Filters'}</span>
                        {isFilterExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedMake('All');
                          setSelectedModel('All');
                          setSelectedType('All');
                          setSelectedCondition('All');
                          setSelectedYearFrom('All');
                          setSelectedYearTo('All');
                          setMaxPrice(300000);
                          setSelectedFuel('All');
                          setSortBy('year_desc');
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-500 hover:bg-red-50/50 transition-all font-mono tracking-wider uppercase cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                ) : (
                  /* AI Smart Search Layout */
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      <div className="w-full md:flex-1 relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-neutral-400 pointer-events-none">
                          <Sparkles className="w-4 h-4 text-red-600 animate-pulse" />
                        </span>
                        <input
                          type="text"
                          placeholder="Ask AI Copilot: 'Show Toyota SUVs under $15,000' or 'White cars arriving next month'..."
                          value={aiSearchQuery}
                          onChange={(e) => setAiSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAiSearch(aiSearchQuery);
                            }
                          }}
                          className="w-full text-xs border border-red-500/10 focus:border-red-500/40 rounded-xl pl-10 pr-10 py-3.5 focus:outline-none focus:bg-white bg-neutral-50/20 transition-all shadow-inner"
                        />
                        {aiSearchQuery && (
                          <button
                            onClick={handleResetAiSearch}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleAiSearch(aiSearchQuery)}
                        disabled={aiSearching || !aiSearchQuery.trim()}
                        className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-neutral-100 disabled:to-neutral-200 disabled:text-neutral-400 text-white font-display font-bold py-3.5 px-6 rounded-xl shadow-md shadow-red-600/10 transition-all duration-300 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
                      >
                        {aiSearching ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-red-300" />
                            <span>Ask Copilot</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Loading/Scanning Progress Effect */}
                    {aiSearching && (
                      <div className="relative w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-full" style={{ animation: 'scanning 1.5s infinite linear' }} />
                        <style>{`
                          @keyframes scanning {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(200%); }
                          }
                        `}</style>
                      </div>
                    )}

                    {/* Quick Suggestion Prompts */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-neutral-100">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono shrink-0">Try Asking:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Show me all Toyota SUVs under $15,000",
                          "Find white automatic vehicles arriving next month",
                          "Show vehicles with less than 80,000 km"
                        ].map((sample) => (
                          <button
                            key={sample}
                            onClick={() => {
                              setAiSearchQuery(sample);
                              handleAiSearch(sample);
                            }}
                            className="text-[10px] bg-neutral-50 hover:bg-red-50/40 border border-neutral-200/60 hover:border-red-200/50 text-neutral-600 hover:text-red-700 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm hover:shadow-md"
                          >
                            {sample}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Search Match Meta Indicators or Errors */}
                    {aiMatchedVehicleIds !== null && !aiSearching && (
                      <div className="flex justify-between items-center bg-green-50/50 border border-green-200/30 rounded-xl p-3 text-xs animate-fade-in">
                        <div className="flex items-center gap-2 text-green-800 font-medium">
                          <Sparkles className="w-4 h-4 text-green-600 shrink-0" />
                          <span>AI search resolved successfully. Found <strong>{filteredShowroomVehicles.length}</strong> matching vehicles.</span>
                        </div>
                        <button
                          onClick={handleResetAiSearch}
                          className="text-[10px] font-bold uppercase tracking-wider text-green-700 hover:text-green-900 cursor-pointer"
                        >
                          Clear Results
                        </button>
                      </div>
                    )}

                    {aiSearchError && (
                      <div className="flex justify-between items-center bg-red-50/50 border border-red-200/30 rounded-xl p-3 text-xs animate-fade-in">
                        <span className="text-red-800 font-medium">{aiSearchError}</span>
                        <button
                          onClick={() => setAiSearchError(null)}
                          className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Filter Panel */}
                {isFilterExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50/30 px-5 pb-5 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Make Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Make
                        </label>
                        <div className="relative">
                          <select
                            value={selectedMake}
                            onChange={(e) => handleMakeChange(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {makesList.map(make => (
                              <option key={make} value={make}>{make === 'All' ? 'All Makes' : make}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Model Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Model
                        </label>
                        <div className="relative">
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {modelsList.map(model => (
                              <option key={model} value={model}>{model === 'All' ? 'All Models' : model}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Type Selector (e.g. Sedan, SUV, Coupe) */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Vehicle Type
                        </label>
                        <div className="relative">
                          <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {typesList.map(typeOpt => (
                              <option key={typeOpt} value={typeOpt}>
                                {typeOpt === 'All' ? 'All Types' : `${typeOpt}s`}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Year Range Selectors */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Year Range
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative w-full">
                            <select
                              value={selectedYearFrom}
                              onChange={(e) => setSelectedYearFrom(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                            >
                              <option value="All">From</option>
                              {yearsList.map(yr => (
                                <option key={`from-${yr}`} value={yr}>{yr}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            </div>
                          </div>
                          <span className="text-neutral-400 text-xs font-mono">to</span>
                          <div className="relative w-full">
                            <select
                              value={selectedYearTo}
                              onChange={(e) => setSelectedYearTo(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                            >
                              <option value="All">To</option>
                              {yearsList.map(yr => (
                                <option key={`to-${yr}`} value={yr}>{yr}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Filters: Price, Fuel & Sorting */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 pt-4 border-t border-neutral-100">
                      {/* Price Limit Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Max Price Limit</span>
                          <span className="text-xs font-bold text-red-600 font-mono">${maxPrice.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min={40000}
                          max={300000}
                          step={5000}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full accent-red-600 cursor-pointer h-1 bg-neutral-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Power / Fuel Type */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Fuel Spec
                        </label>
                        <div className="relative">
                          <select
                            value={selectedFuel}
                            onChange={(e) => setSelectedFuel(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            <option value="All">All Fuels</option>
                            <option value="Petrol">Petrol Only</option>
                            <option value="Electric">Electric (EV)</option>
                            <option value="Hybrid">Hybrid Spec</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Sorting */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Sort Order
                        </label>
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            <option value="year_desc">Newest Manufacture Year</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="mileage_asc">Lowest Mileage First</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Showroom Vehicle Cards Grid Content - Exactly 2 Rows Slicing */}
              <div className="space-y-4 sm:space-y-8">
                {filteredShowroomVehicles.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-neutral-200 p-10 sm:p-20 text-center text-neutral-400 space-y-4 shadow-sm">
                    <Car className="w-12 h-12 text-neutral-300 mx-auto animate-bounce" />
                    <p className="text-sm font-bold text-neutral-800 uppercase tracking-wider">No Matching Models Found</p>
                    <p className="text-xs max-w-sm mx-auto leading-relaxed text-neutral-400">
                      We couldn't find any active vehicles matching your current search or filter criteria. Try resetting or adjusting your filters above.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                      {filteredShowroomVehicles
                        .slice(0, colCount * 2)
                        .map((vehicle) => (
                          <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            onSelect={(v) => {
                              window.history.pushState({}, '', `?vehicleId=${v.id}`);
                              setUrlVehicleId(v.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          />
                        ))}
                    </div>

                    {/* Highly Crafted, Prominent "See All Stock" button */}
                    {filteredShowroomVehicles.length > colCount * 2 && (
                      <div className="flex justify-end pt-4 sm:pt-8 pb-2 sm:pb-4 border-t border-neutral-200/60">
                        <button
                          onClick={() => {
                            setCurrentView('all-stock');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="group bg-red-600 hover:bg-red-500 text-white font-display font-bold py-2.5 px-6 rounded-xl shadow-md shadow-red-600/15 transition-all duration-300 text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center space-x-2.5 hover:scale-105 active:scale-95 border border-red-500 cursor-pointer"
                        >
                          <Car className="w-3.5 h-3.5 text-white" />
                          <span>SEE ALL ACTIVE STOCK ({filteredShowroomVehicles.length} VEHICLES)</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Dynamic Sleek Mid Banners Showcase (Conversion & Engagement) */}
              <MidBanners 
                onExploreStock={() => {
                  setCurrentView('all-stock');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
                onNavigate={(view) => {
                  setCurrentView(view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />

              {/* Rich Home Additions */}
              <HomeAdditions onNavigate={(view) => setCurrentView(view)} />

            </div>
          </motion.div>
        )}

        {/* VIEW 1.5: ALL STOCK INVENTORY PAGE */}
        {currentView === 'all-stock' && (
          <motion.div
            key="all-stock"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Elegant Sub-Hero Header */}
            <div className="relative bg-neutral-950 text-white py-12 border-b border-neutral-800 shadow-2xl">
              <div className="absolute top-0 left-1/3 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <span className="inline-block text-[10px] uppercase font-mono tracking-[0.25em] text-red-500 font-extrabold bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full">
                  Full Inventory Catalog
                </span>
                <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight text-white mt-3">
                  ALL STOCK INVENTORY
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 font-light mt-2 max-w-md mx-auto leading-relaxed">
                  Search and dynamically filter our entire live container-logistics fleet. Instantly reserve models or calculate customized shipping quotes.
                </p>
              </div>
            </div>

            {/* Content Section with Search & Advanced Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" id="all-stock-section">
              
              {/* Elegant Horizontal Search & Filter Bar */}
              <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden mb-8">
                {/* Main Row: Always visible */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Left: Keyword Search */}
                  <div className="w-full md:flex-1 relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-neutral-400 pointer-events-none">
                      <Search className="w-4 h-4 text-red-600" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by keyword (e.g., Porsche, GT3, Black, V8)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-red-600 focus:bg-white bg-neutral-50/50 transition-colors"
                    />
                  </div>

                  {/* Right: Toggle Filter & Reset buttons */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                      onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-red-600" />
                      <span>{isFilterExpanded ? 'Minimize Filters' : 'Maximize Filters'}</span>
                      {isFilterExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedMake('All');
                        setSelectedModel('All');
                        setSelectedType('All');
                        setSelectedCondition('All');
                        setSelectedYearFrom('All');
                        setSelectedYearTo('All');
                        setMaxPrice(300000);
                        setSelectedFuel('All');
                        setSortBy('year_desc');
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-500 hover:bg-red-50/50 transition-all font-mono tracking-wider uppercase"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Expanded Filter Panel */}
                {isFilterExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50/30 px-5 pb-5 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Make Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Make
                        </label>
                        <div className="relative">
                          <select
                            value={selectedMake}
                            onChange={(e) => handleMakeChange(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {makesList.map(make => (
                              <option key={make} value={make}>{make === 'All' ? 'All Makes' : make}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Model Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Model
                        </label>
                        <div className="relative">
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {modelsList.map(model => (
                              <option key={model} value={model}>{model === 'All' ? 'All Models' : model}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Type Selector (e.g. Sedan, SUV, Coupe) */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Vehicle Type
                        </label>
                        <div className="relative">
                          <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            {typesList.map(typeOpt => (
                              <option key={typeOpt} value={typeOpt}>
                                {typeOpt === 'All' ? 'All Types' : `${typeOpt}s`}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Year Range Selectors */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Year Range
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative w-full">
                            <select
                              value={selectedYearFrom}
                              onChange={(e) => setSelectedYearFrom(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                            >
                              <option value="All">From</option>
                              {yearsList.map(yr => (
                                <option key={`from-${yr}`} value={yr}>{yr}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            </div>
                          </div>
                          <span className="text-neutral-400 text-xs font-mono">to</span>
                          <div className="relative w-full">
                            <select
                              value={selectedYearTo}
                              onChange={(e) => setSelectedYearTo(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                            >
                              <option value="All">To</option>
                              {yearsList.map(yr => (
                                <option key={`to-${yr}`} value={yr}>{yr}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Filters: Price, Fuel & Sorting */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 pt-4 border-t border-neutral-100">
                      {/* Price Limit Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Max Price Limit</span>
                          <span className="text-xs font-bold text-red-600 font-mono">${maxPrice.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min={40000}
                          max={300000}
                          step={5000}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full accent-red-600 cursor-pointer h-1 bg-neutral-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Power / Fuel Type */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Fuel Spec
                        </label>
                        <div className="relative">
                          <select
                            value={selectedFuel}
                            onChange={(e) => setSelectedFuel(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            <option value="All">All Fuels</option>
                            <option value="Petrol">Petrol Only</option>
                            <option value="Electric">Electric (EV)</option>
                            <option value="Hybrid">Hybrid Spec</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>

                      {/* Sorting */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Sort Order
                        </label>
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full text-xs border border-neutral-200 rounded-xl p-3 pr-10 bg-white appearance-none focus:outline-none focus:border-red-600 cursor-pointer transition-colors shadow-sm"
                          >
                            <option value="year_desc">Newest Manufacture Year</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="mileage_asc">Lowest Mileage First</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Showroom Vehicle Cards Grid Content */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-center bg-white p-3 sm:py-4 sm:px-6 rounded-xl sm:rounded-2xl border border-neutral-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] text-[10px] sm:text-xs">
                  <p className="text-neutral-500 font-medium">
                    Showing <span className="text-neutral-900 font-bold">{filteredShowroomVehicles.length}</span> premium models available
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="text-red-600 hover:text-red-500 font-bold flex items-center gap-1.5 uppercase font-mono text-[9px] sm:text-[10px] tracking-wider transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Force Sync
                  </button>
                </div>

                {filteredShowroomVehicles.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl border border-dashed border-neutral-200 p-10 sm:p-20 text-center text-neutral-400 space-y-4 shadow-sm"
                  >
                    <Car className="w-12 h-12 text-neutral-300 mx-auto animate-bounce" />
                    <p className="text-sm font-bold text-neutral-800 uppercase tracking-wider">No Showroom Models Found</p>
                    <p className="text-xs max-w-sm mx-auto leading-relaxed text-neutral-400">
                      We could not find any active vehicles matching your current custom filter specification. Try resetting selectors or search keywords.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
                      {filteredShowroomVehicles.slice(0, visibleStockCount).map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          onSelect={(v) => {
                            window.history.pushState({}, '', `?vehicleId=${v.id}`);
                            setUrlVehicleId(v.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      ))}
                    </div>

                    {/* Progressive Loading Control - Fast Mobile Experience */}
                    {filteredShowroomVehicles.length > visibleStockCount && (
                      <div className="flex flex-col items-center justify-center pt-6 sm:pt-8 pb-4 space-y-2">
                        <button
                          onClick={() => setVisibleStockCount(prev => prev + 12)}
                          className="group bg-neutral-900 hover:bg-neutral-800 text-white font-display font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border border-neutral-700 cursor-pointer active:scale-95"
                        >
                          <Car className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                          <span>LOAD MORE VEHICLES ({filteredShowroomVehicles.length - visibleStockCount} REMAINING)</span>
                          <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                        <p className="text-[10px] text-neutral-400 font-mono tracking-wide">
                          Showing {Math.min(visibleStockCount, filteredShowroomVehicles.length)} of {filteredShowroomVehicles.length} total models
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* VIEW: ABOUT US */}
        {currentView === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <AboutUs onNavigate={(view) => setCurrentView(view)} />
          </motion.div>
        )}

        {/* VIEW: HOW TO BUY */}
        {currentView === 'how-to-buy' && (
          <motion.div
            key="how-to-buy"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <HowToBuy onNavigate={(view) => setCurrentView(view)} />
          </motion.div>
        )}

        {/* VIEW: CONTACT US */}
        {currentView === 'contact' && (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <ContactUs 
              onSubmitLead={handleAddLead} 
              onNavigateToFaq={() => setCurrentView('faq')} 
            />
          </motion.div>
        )}

        {/* VIEW: TESTIMONIALS */}
        {currentView === 'testimonials' && (
          <motion.div
            key="testimonials"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Testimonials onNavigateToShowroom={() => setCurrentView('showroom')} />
          </motion.div>
        )}

        {/* VIEW: FAQ */}
        {currentView === 'faq' && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <FAQ onNavigate={(view) => setCurrentView(view)} />
          </motion.div>
        )}

        {/* VIEW 2: STANDALONE LOGISTICS ESTIMATOR PAGE */}
        {currentView === 'freight' && (
          <motion.div
            key="freight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto px-4 py-16"
          >
            <div className="text-center mb-12">
              <span className="text-[10px] font-mono font-bold uppercase text-red-600 tracking-[0.25em] bg-red-600/10 px-3.5 py-1.5 rounded-full border border-red-500/10">CarChief Global Hub</span>
              <h2 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight text-neutral-950 mt-4">
                INTERNATIONAL OCEAN FREIGHT
              </h2>
              <p className="text-xs text-neutral-500 max-w-md mx-auto mt-3 leading-relaxed">
                Estimate cargo container rates, roll-on/roll-off loading surcharges, and port duty estimates for delivery worldwide.
              </p>
            </div>
            
            <FreightCalculator onSubmitLead={handleAddLead} />
          </motion.div>
        )}

        {/* VIEW 3: SECURE MANAGEMENT ERP DASHBOARD & VIEW 4: ADMIN STAFF LOGIN */}
        {isAuthInitializing && (currentView === 'backend' || currentView === 'admin-login') ? (
          <motion.div
            key="carchief-loader"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <CarChiefLoader 
              message="AUTHENTICATING CARCHIEF WORKSPACE"
              submessage="Verifying session credentials & syncing role permissions..."
            />
          </motion.div>
        ) : (
          <>
            {currentView === 'backend' && hasStaffErpAccess(currentRole) && (
              <motion.div
                key="backend"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <BackendDashboard
                  vehicles={vehicles}
                  leads={leads}
                  currentRole={currentRole}
                  availableRoles={availableRoles}
                  reservationHours={reservationHours}
                  onUpdateReservationHours={handleUpdateReservationHours}
                  piReservationHours={piReservationHours}
                  onUpdatePiReservationHours={handleUpdatePiReservationHours}
                  onAddVehicle={handleAddVehicle}
                  onUpdateVehicle={handleUpdateVehicle}
                  onDeleteVehicle={handleDeleteVehicle}
                  onImportVehicles={handleImportVehicles}
                  onUpdateLeadStatus={handleUpdateLeadStatus}
                  onUpdateRolePermissions={handleUpdateRolePermissions}
                  onAddRole={handleAddRole}
                  onDeleteRole={handleDeleteRole}
                  branding={branding}
                  onUpdateBranding={handleUpdateBranding}
                  onViewDetails={(vehicleId, isBackend) => {
                    window.history.pushState({}, '', `?vehicleId=${vehicleId}${isBackend ? '&backend=true' : ''}`);
                    setUrlVehicleId(vehicleId);
                    setIsBackendDetail(isBackend);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </motion.div>
            )}

            {(currentView === 'admin-login' || (currentView === 'backend' && !hasStaffErpAccess(currentRole))) && (
              <motion.div
                key="admin-login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <AdminStaffLogin
                  user={user}
                  currentRole={currentRole}
                  onLogin={handleLogin}
                  onNavigateToBackend={() => setCurrentView('backend')}
                  onNavigateToShowroom={() => setCurrentView('showroom')}
                  onRefreshUserRole={async () => {
                    if (user) {
                      const resolvedRole = await fetchUserProfile(user);
                      if (hasStaffErpAccess(resolvedRole)) {
                        setCurrentView('backend');
                      }
                    }
                  }}
                />
              </motion.div>
            )}
          </>
        )}
        </AnimatePresence>
      </main>

      {/* Footer Area */}
      <footer className="bg-neutral-950 text-white border-t border-neutral-800 py-16 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <span className="text-xl font-display font-black tracking-tight text-white uppercase">
                CAR<span className="text-red-600">CHIEF</span>
              </span>
              <p className="text-[9px] text-neutral-400 font-mono tracking-[0.2em] uppercase">
                PREMIUM GLOBAL VEHICLE EXPORTERS
              </p>
              <p className="text-xs text-neutral-400 mt-4 leading-relaxed max-w-sm">
                CarChief is a high-end showcase portal providing direct ocean-cargo logistics, certified pre-owned inspections, and custom spec tracking.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-red-500 uppercase tracking-widest text-[10px] font-mono">Logistics Core Portals</h4>
              <ul className="space-y-2 text-neutral-400 font-medium">
                <li><button onClick={() => setCurrentView('showroom')} className="hover:text-white transition-colors cursor-pointer">Showroom Catalog</button></li>
                <li><button onClick={() => setCurrentView('how-to-buy')} className="hover:text-white transition-colors cursor-pointer">How to Buy</button></li>
                <li><button onClick={() => setCurrentView('about')} className="hover:text-white transition-colors cursor-pointer">About Us</button></li>
                <li><button onClick={() => setCurrentView('testimonials')} className="hover:text-white transition-colors cursor-pointer">Testimonials</button></li>
                <li><button onClick={() => setCurrentView('faq')} className="hover:text-white transition-colors cursor-pointer">FAQ</button></li>
                <li><button onClick={() => setCurrentView('contact')} className="hover:text-white transition-colors cursor-pointer">Contact Us</button></li>
                {user && hasStaffErpAccess(currentRole) && (
                  <li><button onClick={() => setCurrentView('backend')} className="hover:text-white transition-colors cursor-pointer">Logistics ERP Console</button></li>
                )}
              </ul>
            </div>

            <div className="space-y-5 text-xs">
              <h4 className="font-bold text-red-500 uppercase tracking-widest text-[10px] font-mono">Secure Verification</h4>
              <p className="text-neutral-400 leading-relaxed">
                CarChief utilizes highly secure cloud-replicated server architectures for real-time transaction records and client logs.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-red-400 bg-red-600/10 px-3 py-1.5 rounded-lg border border-red-500/20 tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> SECURED CLOUD ENVELOPE
              </span>
            </div>
          </div>

          <div className="border-t border-neutral-900 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-[9px] text-neutral-500 font-mono">
            <span>© 2026 CARCHIEF AUTO GROUP. ALL RIGHTS RESERVED.</span>
            <span className="uppercase">CLOUDRUN ENVIRONMENT • REGISTRY SECURITY PROTOCOL SHIELD-V2</span>
          </div>
        </div>
      </footer>

      {/* OVERLAY: VEHICLE SPECS DETAILS MODAL */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onSubmitLead={handleAddLead}
        />
      )}

      {/* SECURE OPERATIONS: AUTHENTICATION PORTAL MODAL */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />

    </div>
  );
}
