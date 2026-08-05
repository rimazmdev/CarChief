/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ErrorInfo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';
import { Vehicle, Lead, ProformaInvoice, ShipperMaster, BankMaster, TermsPresetMaster } from '../types';

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
import { 
  X, Printer, Save, RefreshCw, Sparkles, FileText, CheckCircle, 
  ChevronLeft, Send, CheckSquare, Square, CreditCard, Building2, User, AlertCircle, Search
} from 'lucide-react';

interface ProformaInvoiceGeneratorProps {
  vehicle: Vehicle;
  leads: Lead[];
  onClose: () => void;
  onSaved?: (savedInvoice: ProformaInvoice) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  proformaInvoice?: ProformaInvoice;
  initialTab?: 'edit' | 'preview';
}

function ProformaInvoiceGeneratorComponent({
  vehicle,
  leads,
  onClose,
  onSaved,
  triggerToast,
  proformaInvoice,
  initialTab
}: ProformaInvoiceGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(initialTab || 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const lastLoadedInvoiceIdRef = useRef<string | null>(null);

  const getDynamicTierDiscount = () => {
    if (!selectedCustomer || !selectedCustomer.tierId) return { percentage: 0, reason: '', ruleLabel: '' };
    const tier = customerTiers.find(t => t.id === selectedCustomer.tierId);
    if (!tier) return { percentage: 0, reason: '', ruleLabel: '' };

    if (!purchasedDate) {
      return { 
        percentage: tier.discountPercentage || 0, 
        reason: `Customer belongs to "${tier.name}" tier. (No vehicle purchased date is set, fell back to base tier discount)`,
        ruleLabel: 'Base Tier Discount'
      };
    }

    try {
      const purchaseTime = new Date(purchasedDate).getTime();
      if (isNaN(purchaseTime)) {
        return { 
          percentage: tier.discountPercentage || 0, 
          reason: `Customer belongs to "${tier.name}" tier. (Invalid purchased date format, fell back to base tier discount)`,
          ruleLabel: 'Base Tier Discount'
        };
      }

      const today = new Date();
      const diffTime = today.getTime() - purchaseTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { 
          percentage: tier.discountPercentage || 0, 
          reason: `Customer belongs to "${tier.name}" tier. (Future purchased date, fell back to base tier discount)`,
          ruleLabel: 'Base Tier Discount'
        };
      }

      const weekNumber = Math.floor(diffDays / 7) + 1;
      const daysStr = `${diffDays} days (${weekNumber} week${weekNumber > 1 ? 's' : ''} elapsed since purchase)`;

      if (tier.discountRules && tier.discountRules.length > 0) {
        const matchingRule = tier.discountRules.find((rule: any) => {
          const startMatch = weekNumber >= rule.startWeek;
          const endMatch = rule.endWeek === null || weekNumber <= rule.endWeek;
          return startMatch && endMatch;
        });

        if (matchingRule) {
          return {
            percentage: matchingRule.discountPercentage,
            reason: `Matching dynamic rule for Week ${matchingRule.startWeek}${matchingRule.endWeek ? `-${matchingRule.endWeek}` : '+'} applied based on ${daysStr}.`,
            ruleLabel: `Week ${matchingRule.startWeek}${matchingRule.endWeek ? `-${matchingRule.endWeek}` : '+'}`
          };
        }
      }

      return {
        percentage: tier.discountPercentage || 0,
        reason: `Customer belongs to "${tier.name}" tier. No custom rule matched for Week ${weekNumber} (${daysStr}), fell back to base tier discount.`,
        ruleLabel: 'Base Tier Discount'
      };
    } catch (err) {
      console.error(err);
      return { 
        percentage: tier.discountPercentage || 0, 
        reason: `Customer belongs to "${tier.name}" tier. (Error calculating elapsed weeks, fell back to base tier discount)`,
        ruleLabel: 'Base Tier Discount'
      };
    }
  };

  useEffect(() => {
    if (proformaInvoice) {
      const loadedInvoiceKey = `${proformaInvoice.id}_${proformaInvoice.updatedAt || proformaInvoice.createdAt || ''}`;
      if (lastLoadedInvoiceIdRef.current === loadedInvoiceKey) {
        return;
      }
      lastLoadedInvoiceIdRef.current = loadedInvoiceKey;

      setActiveTab(initialTab || 'preview');
      setProformaNo(proformaInvoice.proformaNo);
      setDate(proformaInvoice.date);
      setPaymentDue(proformaInvoice.paymentDue);
      setPaymentTerms(proformaInvoice.paymentTerms);
      
      // Buyer details
      setBuyerCompany(proformaInvoice.buyer.companyName || '');
      setBuyerConsignee(proformaInvoice.buyer.consigneeName || '');
      setBuyerAddress(proformaInvoice.buyer.streetAddress || '');
      setBuyerCity(proformaInvoice.buyer.city || '');
      setBuyerCountry(proformaInvoice.buyer.country || 'Uganda');
      setBuyerEmail(proformaInvoice.buyer.email || '');
      setBuyerTel1(proformaInvoice.buyer.tel1 || '');
      setBuyerTel2(proformaInvoice.buyer.tel2 || '');
      setBroker(proformaInvoice.buyer.broker || '');
      
      // Shipper details
      setShipperCompany(proformaInvoice.shipper.companyName || 'CARCHIEF CO. LTD');
      setShipperAddress1(proformaInvoice.shipper.address1 || '1-6-8 NISHIAWAJI,');
      setShipperAddress2(proformaInvoice.shipper.address2 || 'HIGASHIYODOGAWA-KU');
      setShipperCity(proformaInvoice.shipper.city || 'OSAKA');
      setShipperState(proformaInvoice.shipper.state || 'JAPAN');
      setShipperZip(proformaInvoice.shipper.zipCode || '533-0013');
      setShipperTel(proformaInvoice.shipper.telephone || '+81-66-795-9867');
      setShipperFax(proformaInvoice.shipper.fax || '+81-66-795-9869');
      setPortOfLoading(proformaInvoice.shipper.fromPort || 'Any port, Japan');
      setPortOfDischarging(proformaInvoice.shipper.toPort || 'Mombasa, Uganda');
      
      // Vehicle details
      setMake(proformaInvoice.vehicleDetails.make || '');
      setModel(proformaInvoice.vehicleDetails.model || '');
      setMfgYear(proformaInvoice.vehicleDetails.year?.toString() || '2023');
      setModelCode(proformaInvoice.vehicleDetails.modelCode || '');
      setChassisNo(proformaInvoice.vehicleDetails.chassisNo || '');
      setGrade(proformaInvoice.vehicleDetails.grade || '');
      const parts = proformaInvoice.vehicleDetails.mfgYearMonth?.split('/') || [];
      setMfgMonth(parts[1] || '01');
      const regParts = proformaInvoice.vehicleDetails.regYearMonth?.split('/') || [];
      setRegYear(regParts[0] || '2023');
      setRegMonth(regParts[1] || '01');
      setFuel(proformaInvoice.vehicleDetails.fuel || 'Diesel');
      setEngineCC(proformaInvoice.vehicleDetails.engineCC || '');
      setExteriorColor(proformaInvoice.vehicleDetails.exteriorColor || '');
      setSteering(proformaInvoice.vehicleDetails.steering || 'Right Hand');
      setBodyType(proformaInvoice.vehicleDetails.bodyType || '');
      setHsCode(proformaInvoice.vehicleDetails.hsCode || '');
      setEngineNo(proformaInvoice.vehicleDetails.engineNo || '');
      setDriveType(proformaInvoice.vehicleDetails.driveType || '');
      setTransmission(proformaInvoice.vehicleDetails.transmission || '');
      setMileage(proformaInvoice.vehicleDetails.mileage || '');
      setSeatCapacity(proformaInvoice.vehicleDetails.seatCapacity || '');
      setStockLotNo(proformaInvoice.vehicleDetails.stockLotNo || '');
      setRemarks(proformaInvoice.vehicleDetails.remarks || '');
      setCfs(proformaInvoice.vehicleDetails.cfs || '');
      setShipmentType(proformaInvoice.vehicleDetails.shipmentType || '');
      setOtherRemarks(proformaInvoice.vehicleDetails.otherRemarks || '');
      setShowImage(proformaInvoice.vehicleDetails.showImage !== false);
      
      // Visibility checkboxes
      setShowBodyType(proformaInvoice.vehicleDetails.showBodyType !== false);
      setShowTransmission(proformaInvoice.vehicleDetails.showTransmission !== false);
      setShowHsCode(proformaInvoice.vehicleDetails.showHsCode !== false);
      setShowMileage(proformaInvoice.vehicleDetails.showMileage !== false);
      setShowEngineNo(proformaInvoice.vehicleDetails.showEngineNo !== false);
      setShowSeatCapacity(proformaInvoice.vehicleDetails.showSeatCapacity !== false);
      setShowDriveType(proformaInvoice.vehicleDetails.showDriveType !== false);
      setShowStockLotNo(proformaInvoice.vehicleDetails.showStockLotNo !== false);
      setShowRemarks(proformaInvoice.vehicleDetails.showRemarks !== false);
      setCfs(proformaInvoice.vehicleDetails.cfs || '');
      setShipmentType(proformaInvoice.vehicleDetails.shipmentType || '');
      setShowOtherRemarks(proformaInvoice.vehicleDetails.showOtherRemarks !== false);
      
      // Financials
      const loadedCurrency = proformaInvoice.currency || (proformaInvoice as any).financials?.currency || 'USD';
      setCurrency(loadedCurrency);
      if ((proformaInvoice as any).financials?.exchangeRateUsed) {
        setConversionRate((proformaInvoice as any).financials.exchangeRateUsed);
      }
      if ((proformaInvoice as any).financials?.baseUsdFob) {
        setBaseUsdPrice((proformaInvoice as any).financials.baseUsdFob);
      } else {
        setBaseUsdPrice(vehicle.price || 0);
      }
      setStockNo(proformaInvoice.financials.stockNo || '');
      setFob(proformaInvoice.financials.fob || 0);
      setFreight(proformaInvoice.financials.freight || 0);
      setInsurance(proformaInvoice.financials.insurance || 0);
      setInspection(proformaInvoice.financials.inspection || 250);
      setTaxPercent(proformaInvoice.financials.taxPercent || 0);
      setGTotalTerm(proformaInvoice.financials.gTotalTerm || 'CNF');
      setSalesPerson(proformaInvoice.financials.salesPerson || 'Select');
      if (proformaInvoice.financials.customCosts) {
        const loaded = [...proformaInvoice.financials.customCosts];
        while (loaded.length < 3) {
          loaded.push({ category: '', cost: 0 });
        }
        setCustomCosts(loaded);
      } else {
        setCustomCosts([
          { category: '', cost: 0 },
          { category: '', cost: 0 },
          { category: '', cost: 0 }
        ]);
      }
      
      // Bank details
      setBankName(proformaInvoice.bankDetails.bankName || '');
      setBranchName(proformaInvoice.bankDetails.branchName || '');
      setAccountName(proformaInvoice.bankDetails.accountName || '');
      setAccountNumber(proformaInvoice.bankDetails.accountNumber || '');
      setSwiftCode(proformaInvoice.bankDetails.swiftCode || '');
      setBranchAddress(proformaInvoice.bankDetails.branchAddress || '');
      setBankNotes(proformaInvoice.bankDetails.notes || '');

      // Terms
      if (proformaInvoice.termsDescription !== undefined) {
        setTermsDescription(proformaInvoice.termsDescription);
      }
      if (proformaInvoice.termsPresetId !== undefined) {
        setSelectedTermsPresetId(proformaInvoice.termsPresetId);
      }
    }
  }, [proformaInvoice, initialTab]);

  // Auto-generate Proforma No and Date
  const generateProformaNo = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `P-${num}`;
  };

  // State Variables matching captured data
  const [proformaNo, setProformaNo] = useState(generateProformaNo());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDue, setPaymentDue] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('CNF');

  // Buyer State
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerConsignee, setBuyerConsignee] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [buyerCountry, setBuyerCountry] = useState('Uganda');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerTel1, setBuyerTel1] = useState('');
  const [buyerTel2, setBuyerTel2] = useState('');
  const [broker, setBroker] = useState('');

  // Shipper State
  const [shipperCompany, setShipperCompany] = useState('CARCHIEF CO. LTD');
  const [shipperAddress1, setShipperAddress1] = useState('1-6-8 NISHIAWAJI,');
  const [shipperAddress2, setShipperAddress2] = useState('HIGASHIYODOGAWA-KU');
  const [shipperCity, setShipperCity] = useState('OSAKA');
  const [shipperState, setShipperState] = useState('JAPAN');
  const [shipperZip, setShipperZip] = useState('533-0013');
  const [shipperTel, setShipperTel] = useState('+81-66-795-9867');
  const [shipperFax, setShipperFax] = useState('+81-66-795-9869');
  const [portOfLoading, setPortOfLoading] = useState('Any port, Japan');
  const [portOfDischarging, setPortOfDischarging] = useState('Mombasa, Uganda');

  // Vehicle Details (Editable)
  const [make, setMake] = useState(vehicle.make || '');
  const [model, setModel] = useState(vehicle.model || '');
  const [modelCode, setModelCode] = useState(vehicle.modelCode || '');
  const [chassisNo, setChassisNo] = useState(vehicle.chassis || vehicle.vinSerialNo || '');
  const [grade, setGrade] = useState(vehicle.gradeTrimDomestic || 'Super -GL');
  const [mfgYear, setMfgYear] = useState(vehicle.year?.toString() || '2023');
  const [mfgMonth, setMfgMonth] = useState(vehicle.yearMonth?.split('/')?.[1] || '01');
  const [regYear, setRegYear] = useState(vehicle.registerYear || vehicle.year?.toString() || '2023');
  const [regMonth, setRegMonth] = useState('01');
  const [fuel, setFuel] = useState<string>(vehicle.fuelType || 'Diesel');
  const [engineCC, setEngineCC] = useState(vehicle.enginesize || vehicle.engine || '2,982');
  const [exteriorColor, setExteriorColor] = useState(vehicle.exteriorColor || vehicle.color || 'Silver');
  const [steering, setSteering] = useState(vehicle.steering || 'Right Hand');

  // Specific Specs & Checkboxes for display
  const [bodyType, setBodyType] = useState(vehicle.bodytype || vehicle.type || 'VAN');
  const [showBodyType, setShowBodyType] = useState(true);

  const [transmission, setTransmission] = useState<string>(vehicle.transmission || 'Automatic');
  const [showTransmission, setShowTransmission] = useState(true);

  const [hsCode, setHsCode] = useState('8704.21.000');
  const [showHsCode, setShowHsCode] = useState(true);

  const [mileage, setMileage] = useState(vehicle.mileage ? vehicle.mileage.toLocaleString() : '263,250');
  const [showMileage, setShowMileage] = useState(true);

  const [engineNo, setEngineNo] = useState('1KD-123456');
  const [showEngineNo, setShowEngineNo] = useState(true);

  const [seatCapacity, setSeatCapacity] = useState(vehicle.passengers || '5');
  const [showSeatCapacity, setShowSeatCapacity] = useState(true);

  const [driveType, setDriveType] = useState(vehicle.driveType || '2WD');
  const [showDriveType, setShowDriveType] = useState(true);

  const [stockLotNo, setStockLotNo] = useState(vehicle.stkNumber || `STK${Math.floor(100000 + Math.random() * 900000)}`);
  const [showStockLotNo, setShowStockLotNo] = useState(true);

  const [remarks, setRemarks] = useState('proceed with eaa inspection');
  const [showRemarks, setShowRemarks] = useState(true);

  const [cfs, setCfs] = useState('SIGNON');
  const [showCfs, setShowCfs] = useState(true);

  const [shipmentType, setShipmentType] = useState('Container');
  const [showShipmentType, setShowShipmentType] = useState(true);

  const [otherRemarks, setOtherRemarks] = useState('');
  const [showOtherRemarks, setShowOtherRemarks] = useState(true);

  const [showImage, setShowImage] = useState(true);

  // Financial State
  const [currency, setCurrency] = useState<string>(
    proformaInvoice?.currency || (proformaInvoice as any)?.financials?.currency || 'USD'
  );
  const [conversionRate, setConversionRate] = useState<number>(
    (proformaInvoice as any)?.financials?.exchangeRateUsed || 1
  );
  const [baseUsdPrice, setBaseUsdPrice] = useState<number>(
    (proformaInvoice as any)?.financials?.baseUsdFob || vehicle.price || 0
  );
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        let ratesList = firestoreCache.get('exchangeRates');
        if (!ratesList || ratesList.length === 0) {
          const snap = await getDocs(collection(db, 'exchangeRates'));
          ratesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        if (!ratesList || ratesList.length === 0) {
          ratesList = [
            { id: '1', fromCurrency: 'USD', toCurrency: 'JPY', rate: 163.93, activeStatus: 'Active' },
            { id: '2', fromCurrency: 'JPY', toCurrency: 'USD', rate: 0.0061, activeStatus: 'Active' },
            { id: '3', fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.925, activeStatus: 'Active' },
            { id: '4', fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.08, activeStatus: 'Active' },
            { id: '5', fromCurrency: 'USD', toCurrency: 'UGX', rate: 3700, activeStatus: 'Active' }
          ];
        }
        setExchangeRates(ratesList);
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
      }
    };
    fetchRates();
  }, []);

  const getRateForCurrency = (targetCurr: string, ratesList = exchangeRates) => {
    if (!targetCurr || targetCurr === 'USD') return 1;
    const direct = ratesList.find((r: any) => r.fromCurrency === 'USD' && r.toCurrency === targetCurr && r.activeStatus !== 'Inactive');
    if (direct && Number(direct.rate) > 0) return Number(direct.rate);
    const reverse = ratesList.find((r: any) => r.fromCurrency === targetCurr && r.toCurrency === 'USD' && r.activeStatus !== 'Inactive');
    if (reverse && Number(reverse.rate) > 0) return Number((1 / Number(reverse.rate)).toFixed(4));
    
    if (targetCurr === 'JPY') return 163.93;
    if (targetCurr === 'EUR') return 0.925;
    if (targetCurr === 'GBP') return 0.78;
    if (targetCurr === 'UGX') return 3700;
    return 1;
  };

  const getCurrencyName = (curr: string) => {
    switch (curr) {
      case 'JPY': return 'Japanese Yen';
      case 'EUR': return 'Euro';
      case 'GBP': return 'British Pound';
      case 'UGX': return 'Ugandan Shilling';
      case 'AUD': return 'Australian Dollar';
      case 'CAD': return 'Canadian Dollar';
      default: return 'United States Dollars';
    }
  };

  const handleCurrencyChange = (newCurrency: string, customRate?: number) => {
    setCurrency(newCurrency);
    const basePrice = baseUsdPrice || vehicle.price || 0;
    if (newCurrency === 'USD') {
      setConversionRate(1);
      setFob(basePrice);
    } else {
      const rate = customRate !== undefined ? customRate : getRateForCurrency(newCurrency);
      setConversionRate(rate);
      const calculatedFob = Math.round(basePrice * rate);
      setFob(calculatedFob);
      if (inspection === 250) {
        setInspection(Math.round(250 * rate));
      }
    }
  };

  const handleRateChange = (newRate: number) => {
    setConversionRate(newRate);
    const basePrice = baseUsdPrice || vehicle.price || 0;
    if (currency !== 'USD' && newRate > 0) {
      setFob(Math.round(basePrice * newRate));
    }
  };

  const [stockNo, setStockNo] = useState(vehicle.stkNumber || vehicle.id.slice(0, 8));
  const [fob, setFob] = useState(vehicle.price || 0);
  const [freight, setFreight] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [inspection, setInspection] = useState(250); // Default inspection fee
  const [taxPercent, setTaxPercent] = useState(0);
  const [gTotalTerm, setGTotalTerm] = useState('CNF');
  const [salesPerson, setSalesPerson] = useState(auth.currentUser?.displayName || 'Select');

  const [inspectionType, setInspectionType] = useState('Inspection');
  const [costItems, setCostItems] = useState<any[]>([]);
  const [customCosts, setCustomCosts] = useState<Array<{ category: string; cost: number }>>([
    { category: '', cost: 0 },
    { category: '', cost: 0 },
    { category: '', cost: 0 }
  ]);

  // Bank & Other Information
  const [bankDetailsType, setBankDetailsType] = useState('MUFG BANK');
  const [bankName, setBankName] = useState('MUFG BANK');
  const [branchName, setBranchName] = useState('Kanayama Branch');
  const [accountName, setAccountName] = useState('Car Chief Co., Ltd');
  const [accountNumber, setAccountNumber] = useState('288-7110009');
  const [swiftCode, setSwiftCode] = useState('BOTKJPJT');
  const [branchAddress, setBranchAddress] = useState('Kanayama 1-14-18, Naka-Ku, Nagoya-Shi, Aichi, 460-0022, Japan.');
  
  const defaultBankNotes = `WE CERTIFY THAT THE GOODS ARE OF JAPANESE ORIGIN
The Buyer should bear the cost of the Remittance Charge when remitting T/T
The Buyer is requested to arrange Marine Insurance on the Items on FOB/C&F Basis.`;
  const [bankNotes, setBankNotes] = useState(defaultBankNotes);

  const [termsPresets, setTermsPresets] = useState<TermsPresetMaster[]>([]);
  const [selectedTermsPresetId, setSelectedTermsPresetId] = useState<string>('');
  const defaultTermsDescription = `Agreement between Buyer and Seller for the above Invoice
WITNESSSETH

WHEREAS, Seller desires to sell a used vehicle, details of which are specified on the Proforma Invoice attached herewith, to Buyer and agrees to handle the exporting arrangements; and, WHEREAS Buyer is willing to purchase the vehicle from Seller at the mutually agreed total price as specified on the Proforma Invoice. NOW THEREFORE, in consideration of the mutual agreements contained herein, the parties agree as follows:Buyer shall pay the agreed amount for the vehicle under the conditions set forth below, and Seller shall guarantee the sale when Buyer complies with these processes.

Proforma Invoice`;
  const [termsDescription, setTermsDescription] = useState<string>(defaultTermsDescription);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const termsSnap = await getDocs(collection(db, 'termsPresets'));
        const termsList = termsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TermsPresetMaster));
        setTermsPresets(termsList);

        if (proformaInvoice) {
          if (proformaInvoice.termsDescription) {
            setTermsDescription(proformaInvoice.termsDescription);
          } else if (proformaInvoice.termsPresetId) {
            const matched = termsList.find(t => t.id === proformaInvoice.termsPresetId);
            if (matched) {
              setTermsDescription(matched.description || defaultTermsDescription);
            }
          }
          if (proformaInvoice.termsPresetId) {
            setSelectedTermsPresetId(proformaInvoice.termsPresetId);
          }
        } else if (termsList.length > 0) {
          const defaultPreset = termsList[0];
          setSelectedTermsPresetId(defaultPreset.id);
          setTermsDescription(defaultPreset.description || defaultTermsDescription);
        }
      } catch (err) {
        console.error('Error fetching presets:', err);
      }
    };
    fetchPresets();
  }, [proformaInvoice]);

  // Searchable Customers Master
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerTiers, setCustomerTiers] = useState<any[]>([]);
  const [purchasedDate, setPurchasedDate] = useState<string>(vehicle.purchasedDate || '');

  // Quick Add Customer States
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustCompany, setQuickCustCompany] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustCountry, setQuickCustCountry] = useState('Uganda');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustCity, setQuickCustCity] = useState('');

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName || !quickCustEmail) {
      triggerToast("Please fill in the required fields (Name and Email)", 'error');
      return;
    }
    try {
      const payload = {
        customerName: quickCustName,
        companyName: quickCustCompany || `${quickCustName} LTD`,
        email: quickCustEmail.trim().toLowerCase(),
        phone: quickCustPhone,
        country: quickCustCountry,
        address: quickCustAddress,
        city: quickCustCity,
        tierId: 'retail',
        tierName: 'Retail',
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'customers'), payload);
      const newCust = { id: docRef.id, ...payload };
      
      // Update customers state locally
      setCustomers(prev => [...prev, newCust]);
      
      // Select the newly created customer
      handleSelectCustomer(newCust);
      
      triggerToast("Customer & Company registered and selected successfully!", 'success');
      setShowQuickAddCustomer(false);
      
      // Reset form
      setQuickCustName('');
      setQuickCustCompany('');
      setQuickCustEmail('');
      setQuickCustPhone('');
      setQuickCustAddress('');
      setQuickCustCity('');
    } catch (err) {
      console.error("Error creating customer:", err);
      triggerToast("Failed to create customer.", 'error');
    }
  };

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchCustomersAndTiers = async () => {
      try {
        const custSnap = await getDocs(collection(db, 'customers'));
        const custList = custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(custList);

        const tiersSnap = await getDocs(collection(db, 'customerTiers'));
        const tiersList = tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomerTiers(tiersList);

        // Try to automatically link selected customer if we are viewing an existing invoice
        if (proformaInvoice && proformaInvoice.buyer) {
          const matchedCust = custList.find((c: any) => 
            c.email === proformaInvoice.buyer?.email || 
            c.companyName === proformaInvoice.buyer?.companyName
          );
          if (matchedCust) {
            setSelectedCustomer(matchedCust);
          }
        }
      } catch (err) {
        console.error('Error fetching customers/tiers:', err);
      }
    };
    fetchCustomersAndTiers();
  }, [proformaInvoice]);

  useEffect(() => {
    const fetchCostItems = async () => {
      try {
        const snap = await getDocs(collection(db, 'costItems'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCostItems(list);
      } catch (err) {
        console.error('Error fetching cost items:', err);
        handleFirestoreError(err, OperationType.GET, 'costItems');
      }
    };
    fetchCostItems();
  }, []);

  const [shippers, setShippers] = useState<ShipperMaster[]>([]);
  const [masterBanks, setMasterBanks] = useState<BankMaster[]>([]);

  useEffect(() => {
    const fetchShippers = async () => {
      try {
        const snap = await getDocs(collection(db, 'shippers'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShipperMaster));
        setShippers(list);
      } catch (err) {
        console.error('Error fetching shippers:', err);
        handleFirestoreError(err, OperationType.GET, 'shippers');
      }
    };
    fetchShippers();
  }, []);

  useEffect(() => {
    const fetchMasterBanks = async () => {
      try {
        const snap = await getDocs(collection(db, 'banks'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankMaster));
        setMasterBanks(list);
      } catch (err) {
        console.error('Error fetching master banks:', err);
        handleFirestoreError(err, OperationType.GET, 'banks');
      }
    };
    fetchMasterBanks();
  }, []);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setBuyerCompany(cust.companyName || cust.customerName || '');
    setBuyerConsignee(cust.customerName || '');
    setBuyerAddress(cust.address || '');
    setBuyerCity(cust.city || '');
    if (cust.country) {
      setBuyerCountry(cust.country);
    }
    setBuyerEmail(cust.email || '');
    setBuyerTel1(cust.phone || '');
    if (cust.broker && cust.broker !== 'No') {
      setBroker(cust.broker === 'Yes' ? `${cust.customerName} AGENTS` : cust.broker);
    }
    if (cust.port) {
      setPortOfDischarging(cust.port);
    }
    setShowCustomerDropdown(false);

    // Auto-detect and set Customer Currency (e.g. JPY, EUR, etc.)
    const custCurrency = cust.currency || (cust.country === 'Japan' ? 'JPY' : 'USD');
    if (custCurrency) {
      handleCurrencyChange(custCurrency);
    }
  };

  // Sync details if lead is chosen
  const handleSelectLead = (leadId: string) => {
    if (!leadId) return;
    const selected = leads.find(l => l.id === leadId);
    if (selected) {
      setBuyerConsignee(selected.customerName || '');
      setBuyerEmail(selected.customerEmail || '');
      setBuyerTel1(selected.customerPhone || '');
      setBuyerCompany(selected.customerName ? `${selected.customerName} TRADERS LTD` : '');
      setBuyerAddress('P O BOX 4278 KAMPALA UGANDA');
      setBuyerCity('KAMPALA');
      setBuyerCountry('Uganda');
      if (selected.freightDetails) {
        setPortOfDischarging(selected.freightDetails.destination || 'Mombasa, Uganda');
        setFreight(selected.freightDetails.estimatedCost || 0);
      }
      
      // Auto-select matching registered customer if exists
      const matchedCust = customers.find(c => c.email?.toLowerCase() === selected.customerEmail?.toLowerCase());
      if (matchedCust) {
        setSelectedCustomer(matchedCust);
      } else {
        setSelectedCustomer(null);
      }
    }
  };

  const handleSelectShipper = (shipperId: string) => {
    if (!shipperId) {
      setShipperCompany('');
      setShipperAddress1('');
      setShipperAddress2('');
      setShipperCity('');
      setShipperState('');
      setShipperZip('');
      setShipperTel('');
      setShipperFax('');
      return;
    }
    const selected = shippers.find(s => s.id === shipperId);
    if (selected) {
      setShipperCompany(selected.companyName || '');
      setShipperAddress1(selected.address1 || '');
      setShipperAddress2(selected.address2 || '');
      setShipperCity(selected.city || '');
      setShipperState(selected.state || '');
      setShipperZip(selected.zipCode || '');
      setShipperTel(selected.telephone || '');
      setShipperFax(selected.fax || '');

      // Auto-populate associated bank details from master
      const linkedBank = masterBanks.find(b => b.shipperId === selected.id);
      if (linkedBank) {
        setBankDetailsType(linkedBank.id || linkedBank.title);
        setBankName(linkedBank.bankName || '');
        setBranchName(linkedBank.branchName || '');
        setAccountName(linkedBank.accountName || '');
        setAccountNumber(linkedBank.accountNumber || '');
        setSwiftCode(linkedBank.swiftCode || '');
        setBranchAddress(linkedBank.address || '');
      }
    }
  };

  // Calculate totals
  const customCostsTotal = customCosts.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const vehicleTotal = Number(fob) + Number(freight) + Number(insurance) + Number(inspection) + customCostsTotal;
  const taxAmount = (vehicleTotal * Number(taxPercent)) / 100;
  const grandTotal = vehicleTotal + taxAmount;

  // Show All Toggle
  const handleToggleShowAll = (checked: boolean) => {
    setShowBodyType(checked);
    setShowTransmission(checked);
    setShowHsCode(checked);
    setShowMileage(checked);
    setShowEngineNo(checked);
    setShowSeatCapacity(checked);
    setShowDriveType(checked);
    setShowStockLotNo(checked);
    setShowRemarks(checked);
    setShowCfs(checked);
    setShowShipmentType(checked);
    setShowOtherRemarks(checked);
  };

  const resetForm = () => {
    setProformaNo(generateProformaNo());
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentDue(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPaymentTerms('CNF');
    setBuyerCompany('');
    setBuyerConsignee('');
    setBuyerAddress('');
    setBuyerCity('');
    setBuyerCountry('Uganda');
    setBuyerEmail('');
    setBuyerTel1('');
    setBuyerTel2('');
    setBroker('');
    setFreight(0);
    setInsurance(0);
    setInspection(250);
    setTaxPercent(0);
    setGTotalTerm('CNF');
    setBankNotes(defaultBankNotes);
    if (termsPresets.length > 0) {
      const defaultPreset = termsPresets[0];
      setSelectedTermsPresetId(defaultPreset.id);
      setTermsDescription(defaultPreset.description || defaultTermsDescription);
    } else {
      setSelectedTermsPresetId('');
      setTermsDescription(defaultTermsDescription);
    }
    triggerToast('Form has been reset to defaults.', 'info');
  };

  const saveProformaInvoice = async () => {
    setIsSaving(true);
    try {
      const invoiceData: ProformaInvoice = {
        proformaNo,
        date,
        paymentDue,
        paymentTerms,
        currency: currency || 'USD',
        buyer: {
          companyName: buyerCompany,
          consigneeName: buyerConsignee,
          streetAddress: buyerAddress,
          city: buyerCity,
          country: buyerCountry,
          email: buyerEmail,
          tel1: buyerTel1,
          tel2: buyerTel2,
          broker,
        },
        shipper: {
          companyName: shipperCompany,
          address1: shipperAddress1,
          address2: shipperAddress2,
          city: shipperCity,
          state: shipperState,
          zipCode: shipperZip,
          telephone: shipperTel,
          fax: shipperFax,
          fromPort: portOfLoading,
          toPort: portOfDischarging,
        },
        vehicleDetails: {
          vehicleId: vehicle.id,
          make,
          model,
          year: parseInt(mfgYear),
          modelCode,
          chassisNo,
          grade,
          mfgYearMonth: `${mfgYear}/${mfgMonth}`,
          regYearMonth: `${regYear}/${regMonth}`,
          fuel,
          engineCC,
          exteriorColor,
          steering,
          bodyType,
          hsCode,
          engineNo,
          driveType,
          transmission,
          mileage,
          seatCapacity,
          stockLotNo,
          remarks,
          cfs,
          shipmentType,
          otherRemarks,
          purchasedDate,
          imageUrl: vehicle.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600',
          showImage,
          showBodyType,
          showTransmission,
          showHsCode,
          showMileage,
          showEngineNo,
          showSeatCapacity,
          showDriveType,
          showStockLotNo,
          showRemarks,
          showCfs,
          showShipmentType,
          showOtherRemarks,
        },
        financials: {
          stockNo,
          fob,
          freight,
          insurance,
          inspection,
          customCosts: customCosts.filter(c => c.category && Number(c.cost) > 0),
          vehicleTotal,
          taxPercent,
          gTotalTerm,
          grandTotal,
          salesPerson,
          currency: currency || 'USD',
          exchangeRateUsed: conversionRate,
          baseUsdFob: baseUsdPrice,
        },
        bankDetails: {
          bankName,
          branchName,
          accountName,
          accountNumber,
          swiftCode,
          branchAddress,
          notes: bankNotes,
        },
        termsDescription,
        termsPresetId: selectedTermsPresetId,
        createdAt: proformaInvoice?.createdAt || new Date().toISOString()
      };

      if (proformaInvoice && proformaInvoice.id) {
        // Update existing Proforma Invoice
        const updatedInvoice = {
          ...invoiceData,
          id: proformaInvoice.id,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'proformaInvoices', proformaInvoice.id), updatedInvoice);
        firestoreCache.mutateLocalCollection('proformaInvoices', 'update', proformaInvoice.id, updatedInvoice);
        triggerToast(`Proforma Invoice ${proformaNo} successfully updated!`, 'success');
      } else {
        // Create new Proforma Invoice
        const docRef = await addDoc(collection(db, 'proformaInvoices'), invoiceData);
        const newInvoice = { ...invoiceData, id: docRef.id };
        firestoreCache.mutateLocalCollection('proformaInvoices', 'add', docRef.id, newInvoice);
        triggerToast(`Proforma Invoice ${proformaNo} successfully saved to cloud database!`, 'success');
      }

      // Update associated vehicle specifications and buyer details in Firestore 'vehicles' collection
      try {
        const vehicleRef = doc(db, 'vehicles', vehicle.id);
        const parsedMileage = parseInt(mileage.toString().replace(/,/g, '')) || 0;
        const vehicleUpdates = {
          make,
          model,
          year: parseInt(mfgYear),
          modelCode,
          chassis: chassisNo,
          vinSerialNo: chassisNo,
          gradeTrimDomestic: grade,
          yearMonth: `${mfgYear}/${mfgMonth}`,
          fuelType: fuel,
          enginesize: engineCC,
          engine: engineCC,
          exteriorColor: exteriorColor,
          color: exteriorColor,
          steering,
          bodytype: bodyType,
          type: bodyType,
          transmission,
          mileage: parsedMileage,
          passengers: seatCapacity,
          stkNumber: stockLotNo,
          remarks,
          otherRemarks,
          purchasedDate,
          reservedByName: buyerConsignee || buyerCompany || 'Customer',
          reservedByEmail: buyerEmail || '',
          reservedCustomerName: buyerConsignee || buyerCompany || 'Customer',
          reservedCustomerEmail: buyerEmail || '',
        };
        await setDoc(vehicleRef, vehicleUpdates, { merge: true });
        firestoreCache.mutateLocalCollection('vehicles', 'update', vehicle.id, vehicleUpdates);
        console.log("Associated vehicle specifications and buyer details successfully updated in Firebase.");
      } catch (vehError) {
        console.error("Failed to update associated vehicle details:", vehError);
      }

      firestoreCache.invalidate('proformaInvoices');
      firestoreCache.invalidate('vehicles');

      if (onSaved) onSaved(invoiceData);
    } catch (error) {
      triggerToast('Failed to save Proforma Invoice.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'proformaInvoices');
    } finally {
      setIsSaving(false);
    }
  };

  // Print function matching 37599
  const triggerPrint = () => {
    // We will initiate window.print(). In index.css, we can target `@media print` 
    // to hide the navbar, sidebar, buttons, and make the `#printable-proforma-invoice` 100% wide.
    window.print();
  };

  const simulateSendEmail = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      triggerToast(`Proforma Invoice ${proformaNo} has been compiled into a PDF and emailed to ${buyerEmail || 'customer'} successfully!`, 'success');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-0 md:p-6">
      <div className="bg-neutral-50 w-full max-w-7xl md:rounded-2xl border border-neutral-200 shadow-2xl flex flex-col h-full md:h-[90vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 text-white p-2 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-neutral-900">
                {proformaInvoice ? 'Preview Proforma Invoice (PI)' : 'Create Proforma Invoice (PI)'}
              </h2>
              <p className="text-[10px] text-neutral-500 font-mono">
                Vehicle: {vehicle.year} {vehicle.make} {vehicle.model} • Stock No: {vehicle.stkNumber || vehicle.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'edit'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Form Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'preview'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Interactive Preview (PDF)
            </button>
            <div className="w-px h-6 bg-neutral-200 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-neutral-100">
          
          {activeTab === 'edit' ? (
            <div className="p-6 space-y-6">
              
              {/* HELPER - AUTO PREFILL FROM LEADS */}
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Prefill from visitor inquiries</h4>
                    <p className="text-[10px] text-neutral-500">Speed up creation by fetching buyer address and freight details from leads.</p>
                  </div>
                </div>
                <div className="relative shrink-0 w-full md:w-80">
                  <select
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    defaultValue=""
                  >
                    <option value="">-- Choose active inquiry lead --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.customerName} ({l.customerEmail}) - {l.vehicleTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FORM SECTION 1: HEADER & BUYER & SHIPPER INFO */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800 flex items-center space-x-1.5">
                    <span>1. Invoice Header & Stakeholder Details</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-neutral-500">Proforma No*:</span>
                      <input 
                        type="text" 
                        value={proformaNo}
                        onChange={(e) => setProformaNo(e.target.value)}
                        className="border border-neutral-300 rounded px-2 py-0.5 w-28 text-center font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-neutral-500">Date:</span>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-neutral-300 rounded px-2 py-0.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Buyer Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-red-600">Buyer / Consignee Information *</h4>
                      <button 
                        type="button" 
                        onClick={() => setShowQuickAddCustomer(true)} 
                        className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded border border-red-200 font-bold cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Add Company
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Broker / Agent (e.g. FUTURE FLEET INVESTMENTS...)" 
                        value={broker} 
                        onChange={(e) => setBroker(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                      />
                      <div className="relative" ref={customerDropdownRef}>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input 
                            type="text" 
                            placeholder="Search Customer Masters by company, client name, email..." 
                            value={buyerCompany} 
                            onChange={(e) => {
                              setBuyerCompany(e.target.value);
                              setShowCustomerDropdown(true);
                              if (selectedCustomer && e.target.value !== (selectedCustomer.companyName || selectedCustomer.customerName)) {
                                setSelectedCustomer(null);
                              }
                            }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onClick={() => setShowCustomerDropdown(true)}
                            className="w-full text-xs pl-8 pr-8 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          />
                          {buyerCompany && (
                            <button
                              type="button"
                              onClick={() => {
                                setBuyerCompany('');
                                setSelectedCustomer(null);
                                setBuyerConsignee('');
                                setBuyerAddress('');
                                setBuyerCity('');
                                setBuyerEmail('');
                                setBuyerTel1('');
                                setShowCustomerDropdown(true);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Customer Database Sync Status Indicators */}
                        {selectedCustomer ? (
                          <div className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-150 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                              <span>Sourced from Customer Master: <strong>{selectedCustomer.companyName || selectedCustomer.customerName}</strong> (ID: {selectedCustomer.customerId || 'N/A'}, Tier: {selectedCustomer.tierName || 'Retail'})</span>
                            </span>
                            <span className="text-[8px] bg-emerald-100 px-1.5 py-0.5 rounded font-black uppercase text-emerald-800 tracking-wider">Synced</span>
                          </div>
                        ) : buyerCompany.trim() ? (
                          <div className="text-[10px] bg-amber-50 text-amber-850 border border-amber-150 px-2.5 py-1.5 rounded-lg flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                              <span>Manual Input: <strong>"{buyerCompany}"</strong> is not matched with Customer Masters.</span>
                            </div>
                            <span className="text-neutral-500 text-[9px] leading-snug">Please select from the master records below, or click <strong>Add Company</strong> above to save this client profile.</span>
                          </div>
                        ) : (
                          customers.length > 0 && (
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1 px-1">
                              <Building2 className="w-3 h-3 text-neutral-400" />
                              <span>Sourcing from <strong>{customers.length}</strong> Customer Masters</span>
                            </div>
                          )
                        )}

                        {showCustomerDropdown && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-neutral-200 rounded-lg shadow-xl z-20 font-mono text-[11px] divide-y divide-neutral-150">
                            {(() => {
                              const q = buyerCompany.trim().toLowerCase();
                              // If q is exactly matching the selected customer's company/name (e.g. on load or after select),
                              // we bypass filtering so that the full options list remains visible for alternative selections.
                              const isExactMatchSelected = selectedCustomer && (
                                q === (selectedCustomer.companyName || '').toLowerCase() ||
                                q === (selectedCustomer.customerName || '').toLowerCase()
                              );

                              const filtered = customers.filter(c => {
                                if (isExactMatchSelected || !q) return true;
                                const comp = (c.companyName || '').toLowerCase();
                                const cust = (c.customerName || '').toLowerCase();
                                const email = (c.email || '').toLowerCase();
                                const phone = (c.phone || '').toLowerCase();
                                const country = (c.country || '').toLowerCase();
                                const custId = (c.customerId || '').toLowerCase();
                                return comp.includes(q) || cust.includes(q) || email.includes(q) || phone.includes(q) || country.includes(q) || custId.includes(q);
                              });
                              if (filtered.length === 0) {
                                  return (
                                    <div className="p-4 text-neutral-500 text-center font-sans text-xs">
                                      No matching records found in Customer Masters.<br />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickCustCompany(buyerCompany);
                                          setShowQuickAddCustomer(true);
                                        }}
                                        className="text-red-600 font-bold hover:underline mt-2 text-[11px]"
                                      >
                                        + Quick Register "{buyerCompany}"
                                      </button>
                                    </div>
                                  );
                              }
                              return (
                                <>
                                  <div className="bg-neutral-50 px-3 py-1 text-[9px] uppercase tracking-wider text-neutral-400 font-bold font-sans">
                                    Customer Master Matches ({filtered.length})
                                  </div>
                                  {filtered.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectCustomer(c);
                                      }}
                                      onTouchStart={(e) => {
                                        e.preventDefault();
                                        handleSelectCustomer(c);
                                      }}
                                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 flex flex-col transition-colors cursor-pointer"
                                    >
                                      <span className="font-bold text-neutral-800 text-xs font-sans">
                                        {c.companyName || "Private Buyer"}
                                      </span>
                                      <span className="text-neutral-500 text-[10px] flex items-center gap-1.5 mt-1 flex-wrap">
                                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider font-sans">
                                          {c.customerName}
                                        </span>
                                        {c.customerId && (
                                          <span className="text-neutral-400 text-[9px]">{c.customerId}</span>
                                        )}
                                        {c.email && (
                                          <span>• {c.email}</span>
                                        )}
                                        {c.phone && <span>• {c.phone}</span>}
                                        {c.country && (
                                          <span className="bg-neutral-100 text-neutral-700 px-1 py-0.2 rounded text-[8px] font-bold font-sans">{c.country}</span>
                                        )}
                                      </span>
                                    </button>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Consignee Name" 
                        value={buyerConsignee} 
                        onChange={(e) => setBuyerConsignee(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                      />
                      <input 
                        type="text" 
                        placeholder="Street Address" 
                        value={buyerAddress} 
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="City" 
                          value={buyerCity} 
                          onChange={(e) => setBuyerCity(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <select 
                          value={buyerCountry} 
                          onChange={(e) => setBuyerCountry(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        >
                          <option value="Uganda">Uganda</option>
                          <option value="Kenya">Kenya</option>
                          <option value="Tanzania">Tanzania</option>
                          <option value="Zambia">Zambia</option>
                          <option value="Zimbabwe">Zimbabwe</option>
                          <option value="Rwanda">Rwanda</option>
                          <option value="Burundi">Burundi</option>
                          <option value="Malawi">Malawi</option>
                          <option value="Mozambique">Mozambique</option>
                          <option value="South Sudan">South Sudan</option>
                          <option value="Japan">Japan</option>
                          <option value="United Kingdom">United Kingdom</option>
                          {buyerCountry && !["Uganda", "Kenya", "Tanzania", "Zambia", "Zimbabwe", "Rwanda", "Burundi", "Malawi", "Mozambique", "South Sudan", "Japan", "United Kingdom"].includes(buyerCountry) && (
                            <option value={buyerCountry}>{buyerCountry}</option>
                          )}
                        </select>
                      </div>
                      <input 
                        type="email" 
                        placeholder="E-mail Address" 
                        value={buyerEmail} 
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="Tel No. 1" 
                          value={buyerTel1} 
                          onChange={(e) => setBuyerTel1(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <input 
                          type="text" 
                          placeholder="Tel No. 2" 
                          value={buyerTel2} 
                          onChange={(e) => setBuyerTel2(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipper Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-red-600">Shipper Information *</h4>
                      <select 
                        onChange={(e) => handleSelectShipper(e.target.value)}
                        className="text-[10px] border border-neutral-300 rounded px-1 py-0.5 bg-white"
                        value={shippers.find(s => s.companyName === shipperCompany)?.id || ''}
                      >
                        <option value="">-- Select Shipper --</option>
                        {shippers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.companyName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 text-xs">
                      <input 
                        type="text" 
                        placeholder="Company Name" 
                        value={shipperCompany} 
                        onChange={(e) => setShipperCompany(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="Address 1" 
                          value={shipperAddress1} 
                          onChange={(e) => setShipperAddress1(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <input 
                          type="text" 
                          placeholder="Address 2" 
                          value={shipperAddress2} 
                          onChange={(e) => setShipperAddress2(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input 
                          type="text" 
                          placeholder="City" 
                          value={shipperCity} 
                          onChange={(e) => setShipperCity(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <input 
                          type="text" 
                          placeholder="State" 
                          value={shipperState} 
                          onChange={(e) => setShipperState(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <input 
                          type="text" 
                          placeholder="Zip Code" 
                          value={shipperZip} 
                          onChange={(e) => setShipperZip(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="Telephone No." 
                          value={shipperTel} 
                          onChange={(e) => setShipperTel(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                        <input 
                          type="text" 
                          placeholder="Fax No." 
                          value={shipperFax} 
                          onChange={(e) => setShipperFax(e.target.value)}
                          className="text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-neutral-400 font-mono">From:</span>
                          <input 
                            type="text" 
                            value={portOfLoading} 
                            onChange={(e) => setPortOfLoading(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-neutral-400 font-mono">To:</span>
                          <input 
                            type="text" 
                            value={portOfDischarging} 
                            onChange={(e) => setPortOfDischarging(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Payment Due Date</label>
                          <input 
                            type="date" 
                            value={paymentDue} 
                            onChange={(e) => setPaymentDue(e.target.value)}
                            className="w-full text-xs px-3 py-1 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Payment Terms</label>
                          <input 
                            type="text" 
                            value={paymentTerms} 
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            placeholder="e.g. CNF"
                            className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM SECTION 2: VEHICLE INFO (AUTOMATIC & EDITABLE) */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800 flex items-center space-x-1.5">
                    <span>2. Vehicle Specifications</span>
                  </h3>
                  <div className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                    Auto-loaded from {vehicle.make} {vehicle.model}
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Image Preview */}
                  <div className="w-full lg:w-1/4 flex flex-col items-center justify-center border border-dashed border-neutral-300 rounded-xl p-4 bg-neutral-50 shrink-0">
                    <img 
                      src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400'} 
                      alt={model} 
                      className="w-full max-h-48 object-cover rounded-lg shadow-sm border border-neutral-200" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <label className="flex items-center text-xs text-neutral-600 gap-1.5 select-none font-bold">
                        <input 
                          type="checkbox" 
                          checked={showImage}
                          onChange={(e) => setShowImage(e.target.checked)}
                          className="accent-red-600"
                        />
                        <span>Show Image on PDF</span>
                      </label>
                      <button className="text-[10px] bg-neutral-100 text-neutral-600 px-3 py-1 rounded border border-neutral-200 font-bold hover:bg-neutral-200">
                        Choose Different File
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Editable Spec Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Make *</label>
                      <input 
                        type="text" 
                        value={make} 
                        onChange={(e) => setMake(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Model *</label>
                      <input 
                        type="text" 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Model Code</label>
                      <input 
                        type="text" 
                        value={modelCode} 
                        onChange={(e) => setModelCode(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Chassis No *</label>
                      <input 
                        type="text" 
                        value={chassisNo} 
                        onChange={(e) => setChassisNo(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Grade / Trim</label>
                      <input 
                        type="text" 
                        value={grade} 
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase">Mfg Year</label>
                        <select 
                          value={mfgYear} 
                          onChange={(e) => setMfgYear(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                        >
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                          <option value="2022">2022</option>
                          <option value="2021">2021</option>
                          <option value="2020">2020</option>
                          <option value="2019">2019</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase">Month</label>
                        <select 
                          value={mfgMonth} 
                          onChange={(e) => setMfgMonth(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-300 rounded animate-none"
                        >
                          <option value="01">Jan</option>
                          <option value="02">Feb</option>
                          <option value="03">Mar</option>
                          <option value="04">Apr</option>
                          <option value="05">May</option>
                          <option value="06">Jun</option>
                          <option value="07">Jul</option>
                          <option value="08">Aug</option>
                          <option value="09">Sep</option>
                          <option value="10">Oct</option>
                          <option value="11">Nov</option>
                          <option value="12">Dec</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase">Reg Year</label>
                        <select 
                          value={regYear} 
                          onChange={(e) => setRegYear(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                        >
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                          <option value="2022">2022</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase">Month</label>
                        <select 
                          value={regMonth} 
                          onChange={(e) => setRegMonth(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                        >
                          <option value="01">Jan</option>
                          <option value="02">Feb</option>
                          <option value="03">Mar</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Fuel Type</label>
                      <input 
                        type="text" 
                        value={fuel} 
                        onChange={(e) => setFuel(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Engine Size (CC)</label>
                      <input 
                        type="text" 
                        value={engineCC} 
                        onChange={(e) => setEngineCC(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Exterior Color</label>
                      <input 
                        type="text" 
                        value={exteriorColor} 
                        onChange={(e) => setExteriorColor(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold uppercase">Steering Mode</label>
                      <select 
                        value={steering} 
                        onChange={(e) => setSteering(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded"
                      >
                        <option value="Right Hand">Right Hand</option>
                        <option value="Left Hand">Left Hand</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM SECTION 3: SPECIFIC DETAILS & VISIBILITY FLAGS */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800">
                      3. Specific Logistics Attributes
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Toggle checkboxes next to fields to hide or show them on the final PDF invoice</p>
                  </div>
                  <label className="flex items-center space-x-1 text-xs text-neutral-600 font-bold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleToggleShowAll(e.target.checked)}
                      defaultChecked={true}
                      className="accent-red-600 rounded"
                    />
                    <span>Show All On Proforma</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                  
                  {/* Body Type */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showBodyType} 
                      onChange={(e) => setShowBodyType(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Body Type:</span>
                    <input 
                      type="text" 
                      value={bodyType} 
                      onChange={(e) => setBodyType(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    />
                  </div>

                  {/* Transmission */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showTransmission} 
                      onChange={(e) => setShowTransmission(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Transmission:</span>
                    <select 
                      value={transmission} 
                      onChange={(e) => setTransmission(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>

                  {/* HS Code */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showHsCode} 
                      onChange={(e) => setShowHsCode(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">HS Code:</span>
                    <input 
                      type="text" 
                      value={hsCode} 
                      onChange={(e) => setHsCode(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    />
                  </div>

                  {/* Mileage */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showMileage} 
                      onChange={(e) => setShowMileage(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Mileage (Km):</span>
                    <input 
                      type="text" 
                      value={mileage} 
                      onChange={(e) => setMileage(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    />
                  </div>

                  {/* Engine No */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showEngineNo} 
                      onChange={(e) => setShowEngineNo(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Engine No:</span>
                    <input 
                      type="text" 
                      value={engineNo} 
                      onChange={(e) => setEngineNo(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    />
                  </div>

                  {/* Seat Capacity */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showSeatCapacity} 
                      onChange={(e) => setShowSeatCapacity(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Seat Capacity:</span>
                    <input 
                      type="text" 
                      value={seatCapacity} 
                      onChange={(e) => setSeatCapacity(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    />
                  </div>

                  {/* Drive Type */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showDriveType} 
                      onChange={(e) => setShowDriveType(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Drive Type:</span>
                    <select 
                      value={driveType} 
                      onChange={(e) => setDriveType(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs font-bold"
                    >
                      <option value="2WD">2WD</option>
                      <option value="4WD">4WD</option>
                    </select>
                  </div>

                  {/* Stock Lot No */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showStockLotNo} 
                      onChange={(e) => setShowStockLotNo(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Stock/Lot No:</span>
                    <input 
                      type="text" 
                      value={stockLotNo} 
                      onChange={(e) => setStockLotNo(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono"
                    />
                  </div>

                  {/* Shipment Type */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showShipmentType} 
                      onChange={(e) => setShowShipmentType(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">Shipment Type:</span>
                    <select 
                      value={shipmentType} 
                      onChange={(e) => setShipmentType(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs"
                    >
                      <option value="Container">Container</option>
                      <option value="RoRo">RoRo</option>
                    </select>
                  </div>

                  {/* CFS */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                    <input 
                      type="checkbox" 
                      checked={showCfs} 
                      onChange={(e) => setShowCfs(e.target.checked)} 
                      className="accent-red-600 shrink-0 w-3.5 h-3.5"
                    />
                    <span className="w-24 text-neutral-600 font-mono text-[10px] uppercase">CFS:</span>
                    <input 
                      type="text" 
                      value={cfs} 
                      onChange={(e) => setCfs(e.target.value)}
                      className="flex-1 px-3 py-1 bg-neutral-50 border border-neutral-300 rounded text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase mb-1">
                      <input 
                        type="checkbox" 
                        checked={showRemarks} 
                        onChange={(e) => setShowRemarks(e.target.checked)} 
                        className="accent-red-600 w-3.5 h-3.5"
                      />
                      <span>Vehicle Remarks</span>
                    </label>
                    <div className="space-y-1.5">
                      <textarea 
                        value={remarks} 
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-neutral-50 border border-neutral-300 rounded h-16"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase mb-1">
                      <input 
                        type="checkbox" 
                        checked={showOtherRemarks} 
                        onChange={(e) => setShowOtherRemarks(e.target.checked)} 
                        className="accent-red-600 w-3.5 h-3.5"
                      />
                      <span>Other Remarks</span>
                    </label>
                    <textarea 
                      value={otherRemarks} 
                      onChange={(e) => setOtherRemarks(e.target.value)}
                      placeholder="Please Enter Other Remarks"
                      className="w-full text-xs px-3 py-2 bg-neutral-50 border border-neutral-300 rounded h-16"
                    />
                  </div>
                </div>
              </div>

              {/* FORM SECTION 4: FINANCIALS (EDITABLE PRICING BREAKDOWN) */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
                <div className="border-b border-neutral-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800 flex items-center space-x-1.5">
                    <span>4. Pricing & Freight Cost Ledger</span>
                  </h3>
                  
                  {selectedCustomer && (
                    <span className="text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Selected Client Tier: {selectedCustomer.tierName || 'Retail'}
                    </span>
                  )}
                </div>

                {/* TRADING CURRENCY & CONVERSION RATE CONTROL PANEL */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 font-sans text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-[11px] uppercase tracking-wide">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Customer Trading Currency & Exchange Conversion</span>
                    </div>
                    {currency !== 'USD' && (
                      <span className="bg-blue-600 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                        {currency} Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {/* Target Currency Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                        Trading Currency *
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full text-xs font-bold font-mono px-3 py-1.5 bg-white border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="USD">USD - US Dollar ($)</option>
                        <option value="JPY">JPY - Japanese Yen (¥)</option>
                        <option value="EUR">EUR - Euro (€)</option>
                        <option value="UGX">UGX - Ugandan Shilling (USh)</option>
                        <option value="GBP">GBP - British Pound (£)</option>
                        <option value="AUD">AUD - Australian Dollar (A$)</option>
                        <option value="CAD">CAD - Canadian Dollar (C$)</option>
                      </select>
                    </div>

                    {/* Base USD Vehicle Price */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Base USD Price (MSRP)
                      </label>
                      <div className="px-3 py-1.5 bg-white/90 border border-neutral-300 rounded font-mono font-bold text-neutral-800">
                        ${baseUsdPrice.toLocaleString()} USD
                      </div>
                    </div>

                    {/* Conversion Rate Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                        Conversion Rate (1 USD = ? {currency})
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={currency === 'USD'}
                        value={conversionRate}
                        onChange={(e) => handleRateChange(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold px-3 py-1.5 bg-white border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                    </div>

                    {/* Converted FOB Summary */}
                    <div className="bg-white border border-blue-200 rounded p-2 flex flex-col justify-center">
                      <span className="text-[9px] text-neutral-500 uppercase font-bold">Calculated FOB ({currency})</span>
                      <span className="text-sm font-black font-mono text-blue-900">
                        {currency} {fob.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {currency !== 'USD' && (
                    <div className="text-[10.5px] text-blue-800 bg-white/70 p-2 rounded border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span>
                        FOB is calculated from USD base price (${baseUsdPrice.toLocaleString()} × {conversionRate} = {currency} {fob.toLocaleString()}). Capture Freight and other charges below in <strong>{currency}</strong>.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRateChange(conversionRate)}
                        className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded cursor-pointer shrink-0 transition-colors"
                      >
                        Recalculate FOB
                      </button>
                    </div>
                  )}
                </div>

                {/* DYNAMIC TIER WEEK-RANGE DISCOUNT CALCULATOR PANEL */}
                {selectedCustomer ? (() => {
                  const disc = getDynamicTierDiscount();
                  const basePrice = Number(baseUsdPrice || vehicle.price || 0);
                  const discountAmount = Math.round(basePrice * (disc.percentage / 100));
                  const discountedUsdFob = basePrice - discountAmount;
                  const targetFobInCurrency = currency === 'USD' ? discountedUsdFob : Math.round(discountedUsdFob * conversionRate);
                  const isAlreadyApplied = Number(fob) === targetFobInCurrency;

                  return (
                    <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 font-sans text-xs space-y-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 uppercase tracking-wide border-b border-neutral-200/60 pb-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>Dynamic Week-Range Sourcing Discount Calculator</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        {/* Column 1: Date and info */}
                        <div className="md:col-span-4 space-y-2.5">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Vehicle Purchased Date</label>
                            <input 
                              type="date"
                              value={purchasedDate}
                              onChange={(e) => setPurchasedDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                            />
                          </div>
                          <div className="text-[10.5px] text-neutral-500 leading-relaxed">
                            Changing the purchased date will automatically recompute elapsed weeks and matching tier-range discounts.
                          </div>
                        </div>

                        {/* Column 2: Status & Rule Explanation */}
                        <div className="md:col-span-5 space-y-2 border-l border-neutral-200 pl-5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-neutral-400">Rule applied:</span>
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase">
                              {disc.ruleLabel || 'None'}
                            </span>
                          </div>
                          <div>
                            <span className="font-mono text-neutral-400 block mb-0.5">Calculation Breakdown:</span>
                            <span className="text-neutral-700 font-medium leading-relaxed font-sans">{disc.reason}</span>
                          </div>
                        </div>

                        {/* Column 3: Totals & Apply Action */}
                        <div className="md:col-span-3 bg-white rounded-lg border border-neutral-200 p-3 flex flex-col justify-between h-full space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between text-neutral-500 text-[10px] uppercase">
                              <span>MSRP Base Price:</span>
                              <span className="font-mono font-bold">${basePrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-bold text-[11px] uppercase">
                              <span>Discount ({disc.percentage}%):</span>
                              <span className="font-mono">-${discountAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-neutral-800 font-extrabold text-[11px] uppercase border-t border-dashed border-neutral-200 pt-1">
                              <span>Target FOB ({currency}):</span>
                              <span className="font-mono text-xs text-red-600">{currency} {targetFobInCurrency.toLocaleString()}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setBaseUsdPrice(discountedUsdFob);
                              setFob(targetFobInCurrency);
                              triggerToast(`Successfully applied ${disc.percentage}% tier discount! Target FOB: ${currency} ${targetFobInCurrency.toLocaleString()}`, 'success');
                            }}
                            disabled={disc.percentage === 0 || isAlreadyApplied}
                            className={`w-full py-1.5 px-3 rounded text-[10px] font-mono font-black uppercase tracking-wider text-center cursor-pointer transition-all ${
                              isAlreadyApplied 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : disc.percentage === 0
                                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-sm hover:shadow-md'
                            }`}
                          >
                            {isAlreadyApplied ? '✓ Discount Applied' : 'Apply Discount to FOB'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-sans flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-wide text-[10px] mb-0.5">Sourcing Client Not Identified</p>
                      <p className="leading-relaxed text-[10.5px]">To leverage dynamic, week-range customer tier discounts, please choose a registered customer in the <strong className="text-amber-900">Buyer Company Name</strong> dropdown under Section 1.</p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto border border-neutral-200 rounded-lg shadow-sm">
                  <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 font-mono text-[10px] uppercase font-bold border-b border-neutral-200">
                        <th className="py-2.5 px-3 border-r border-neutral-200 w-28 text-center">Stock No.</th>
                        <th className="py-2.5 px-3 border-r border-neutral-200 w-32 text-center text-blue-900 font-black">FOB ({currency})</th>
                        <th className="py-2.5 px-3 border-r border-neutral-200 w-32 text-center">Freight ({currency})</th>
                        <th className="py-2.5 px-3 border-r border-neutral-200 w-32 text-center">Insurance ({currency})</th>
                        <th className="py-2.5 px-3 border-r border-neutral-200 w-32 text-center">
                          <select 
                            value={inspectionType} 
                            onChange={(e) => setInspectionType(e.target.value)}
                            className="bg-transparent font-bold border-0 p-0 focus:ring-0 uppercase text-[10px] cursor-pointer text-center w-full"
                          >
                            <option value="Inspection">Inspection</option>
                            <option value="EAA">EAA</option>
                            <option value="JEVIC">JEVIC</option>
                          </select>
                          <span className="text-[9px] font-normal text-neutral-400 block">({currency})</span>
                        </th>
                        {/* Dynamic custom cost columns */}
                        {[0, 1, 2].map((idx) => (
                          <th key={idx} className="py-2 px-2 border-r border-neutral-200 min-w-[150px] text-center">
                            <select
                              value={customCosts[idx]?.category || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomCosts(prev => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], category: val };
                                  return copy;
                                });
                              }}
                              className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-[10px] font-sans font-bold text-neutral-700 w-full"
                            >
                              <option value="">-- [Select Cost Category] --</option>
                              {costItems.map((item) => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                              ))}
                            </select>
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right">Vehicle Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-100">
                      <tr className="divide-x divide-neutral-100">
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            value={stockNo} 
                            onChange={(e) => setStockNo(e.target.value)}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-mono font-bold"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            value={fob} 
                            onChange={(e) => setFob(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-bold"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            value={freight} 
                            onChange={(e) => setFreight(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-bold"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            value={insurance} 
                            onChange={(e) => setInsurance(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-bold"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            value={inspection} 
                            onChange={(e) => setInspection(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-bold"
                          />
                        </td>
                        {/* Dynamic Custom Costs inputs */}
                        {[0, 1, 2].map((idx) => (
                          <td key={idx} className="py-3 px-2">
                            <input 
                              type="number" 
                              disabled={!customCosts[idx]?.category}
                              value={customCosts[idx]?.cost || 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCustomCosts(prev => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], cost: val };
                                  return copy;
                                });
                              }}
                              className="w-full text-xs px-2 py-1 bg-neutral-50 border border-neutral-300 rounded text-center font-bold disabled:opacity-50"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-3 text-right font-black text-red-600 text-sm whitespace-nowrap bg-neutral-50 font-mono">
                          {currency} {vehicleTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 border-t border-neutral-100">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-neutral-600">Tax Basis:</span>
                    <input 
                      type="number" 
                      placeholder="Tax %" 
                      value={taxPercent} 
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="border border-neutral-300 rounded px-2 py-1 w-16 text-center text-xs font-bold"
                    />
                    <span className="font-mono text-neutral-400">%</span>
                    <span className="text-neutral-500">(${taxAmount.toLocaleString()})</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-neutral-600">G.Total Term:</span>
                    <select 
                      value={gTotalTerm} 
                      onChange={(e) => setGTotalTerm(e.target.value)}
                      className="border border-neutral-300 rounded px-2 py-1 text-xs font-bold"
                    >
                      <option value="CNF">CNF</option>
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                      <option value="C&F">C&F</option>
                    </select>
                    <span className="text-neutral-500">Terms basis pricing</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs justify-end">
                    <span className="font-bold text-neutral-600 uppercase tracking-widest text-[10px]">Sales Person:</span>
                    <select
                      value={salesPerson}
                      onChange={(e) => setSalesPerson(e.target.value)}
                      className="border border-neutral-300 rounded px-2 py-1 text-xs font-bold"
                    >
                      <option value="Select">-- Select Representative --</option>
                      <option value="Charith">Charith Sales Rep</option>
                      <option value="John Doe">John Doe</option>
                      <option value="Hiroto Sato">Hiroto Sato</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FORM SECTION 5: BANK DETAILS & TERMS */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-6">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800 flex items-center space-x-1.5">
                    <span>5. Bank & Legal Terms Ledger</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Bank Details *</label>
                    <select 
                      value={bankDetailsType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBankDetailsType(val);
                        const matched = masterBanks.find(b => b.id === val || b.title === val);
                        if (matched) {
                          setBankName(matched.bankName || '');
                          setBranchName(matched.branchName || '');
                          setAccountName(matched.accountName || '');
                          setAccountNumber(matched.accountNumber || '');
                          setSwiftCode(matched.swiftCode || '');
                          setBranchAddress(matched.address || '');
                        } else if (val === 'MUFG BANK') {
                          setBankName('MUFG BANK');
                          setBranchName('Kanayama Branch');
                          setAccountName('Car Chief Co., Ltd');
                          setAccountNumber('288-7110009');
                          setSwiftCode('BOTKJPJT');
                          setBranchAddress('Kanayama 1-14-18, Naka-Ku, Nagoya-Shi, Aichi, 460-0022, Japan.');
                        }
                      }}
                      className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none"
                    >
                      <option value="">-- Select Bank Account --</option>
                      {masterBanks.map((b) => (
                        <option key={b.id} value={b.id}>{b.title} ({b.bankType})</option>
                      ))}
                      <option value="MUFG BANK">MUFG BANK - Kanayama Branch (Default)</option>
                    </select>
                    {masterBanks.length === 0 && (
                      <p className="text-[9px] text-neutral-400 mt-1">
                        Tip: You can configure custom Bank accounts in the <strong>Admin Master Controls</strong>.
                      </p>
                    )}
                    <div className="mt-3 p-3 bg-neutral-50 border rounded-lg text-[10px] font-mono text-neutral-500 space-y-1">
                      <div><span className="font-bold">Bank:</span> {bankName}</div>
                      <div><span className="font-bold">Branch:</span> {branchName}</div>
                      <div><span className="font-bold">Account Name:</span> {accountName}</div>
                      <div><span className="font-bold">A/C No:</span> {accountNumber}</div>
                      <div><span className="font-bold">Swift:</span> {swiftCode}</div>
                      {branchAddress && <div><span className="font-bold">Address:</span> {branchAddress}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Select Terms Preset</label>
                    <select 
                      className="w-full text-xs px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none text-neutral-700 mb-2"
                      value={selectedTermsPresetId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTermsPresetId(val);
                        if (val === 'standard' || !val) {
                          setTermsDescription(defaultTermsDescription);
                        } else {
                          const matched = termsPresets.find(t => t.id === val);
                          if (matched) {
                            setTermsDescription(matched.description || '');
                          }
                        }
                      }}
                    >
                      <option value="standard">Standard Terms & Conditions (Default)</option>
                      {termsPresets.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <textarea 
                      value={termsDescription} 
                      onChange={(e) => setTermsDescription(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-neutral-50 border border-neutral-300 rounded h-40 font-mono text-[10px] leading-relaxed"
                      placeholder="Enter terms and conditions text..."
                    />
                    <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                      Select custom terms template configured in Admin Master Controls or edit the text directly above.
                    </p>
                  </div>


                </div>
              </div>

              {/* ACTION FOOTER BAR */}
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <button
                  onClick={resetForm}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Form</span>
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('preview');
                    }}
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Preview Printable PDF</span>
                  </button>

                  <button
                    onClick={saveProformaInvoice}
                    disabled={isSaving}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Invoice'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="p-6 flex flex-col items-center">
              
              {/* PRINT CONTROLS PANEL */}
              <div className="bg-white w-full max-w-[850px] p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shrink-0 no-print">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-bold text-neutral-600 uppercase font-mono">
                    {proformaInvoice ? 'Viewing Saved Proforma Invoice' : 'Invoice compiled perfectly'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={simulateSendEmail}
                    disabled={isSendingEmail}
                    className="flex-1 sm:flex-none px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center space-x-1.5 border border-neutral-200"
                  >
                    <Send className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{isSendingEmail ? 'Sending...' : 'Email Customer'}</span>
                  </button>
                  <button
                    onClick={triggerPrint}
                    className="flex-1 sm:flex-none px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md hover:scale-[1.02]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print or Save PDF</span>
                  </button>
                </div>
              </div>

              {/* PRINT TARGET PAGE CONTAINER */}
              <div id="printable-proforma-invoice" className="w-full max-w-[850px] space-y-8 bg-white border border-neutral-300 shadow-lg p-8 sm:p-12 font-sans text-neutral-800 printable-document leading-normal">
                
                {/* PAGE 1: INVOICE SHEETS */}
                <div className="space-y-6 page-break-after-always">
                  
                  {/* INVOICE HEADER ROW */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-neutral-800 pb-4 gap-4">
                    {/* Left: Brand */}
                    <div className="flex items-center space-x-3">
                      <div className="bg-red-600 text-white rounded-full p-2 h-12 w-12 flex items-center justify-center font-black text-2xl shadow-md select-none">
                        C
                      </div>
                      <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                          Car<span className="text-red-600">Chief</span>
                        </h1>
                        <p className="text-[9px] font-mono font-bold uppercase text-neutral-500 tracking-widest mt-0.5">
                          www.carchief.com
                        </p>
                      </div>
                    </div>

                    {/* Right: Address */}
                    <div className="text-right text-[10px] text-neutral-600 leading-tight">
                      <div className="font-bold text-neutral-900 text-sm">{shipperCompany || 'CARCHIEF CO. LTD'}</div>
                      <div>
                        {[shipperAddress1, shipperAddress2, shipperCity, shipperState, shipperZip].filter(Boolean).join(', ')}
                      </div>
                      {(shipperTel || shipperFax) && (
                        <div>
                          {shipperTel && `PHONE: ${shipperTel}`} {shipperFax && ` FAX: ${shipperFax}`}
                        </div>
                      )}
                      <div>E-MAIL: csd@carchief.com</div>
                    </div>
                  </div>

                  {/* GRID INFO BOX (Matches exactly table format in screenshot) */}
                  <div className="border border-neutral-700 text-[10px] leading-relaxed">
                    {/* Centered PROFORMA INVOICE Header */}
                    <div className="text-center py-1.5 border-b border-neutral-700 bg-white">
                      <h2 className="text-lg font-extrabold uppercase tracking-widest text-neutral-800">
                        PROFORMA INVOICE
                      </h2>
                    </div>

                    <div className="grid grid-cols-2">
                      {/* Left: Broker & Consignee */}
                      <div className="p-3 border-r border-neutral-700 flex flex-col space-y-4">
                        {/* Broker Row */}
                        <div className="flex items-start text-[9px]">
                          <span className="w-16 text-neutral-500 font-semibold flex-shrink-0">Broker:</span>
                          <span className="font-extrabold text-neutral-800 uppercase">
                            {broker}
                          </span>
                        </div>
                        {/* Consignee Row */}
                        <div className="flex items-start text-[9px]">
                          <span className="w-16 text-neutral-500 font-semibold flex-shrink-0">Consignee:</span>
                          <div className="font-bold text-neutral-800 leading-tight flex flex-col space-y-0.5">
                            <span className="text-[11px] font-extrabold uppercase">{buyerCompany || buyerConsignee}</span>
                            {buyerCompany && buyerConsignee && <span className="uppercase">{buyerConsignee}</span>}
                            <span className="text-neutral-600 font-normal whitespace-pre-line text-[9px] uppercase mt-0.5">
                              {buyerAddress}
                            </span>
                            {buyerEmail && <span className="text-neutral-500 font-mono text-[9.5px] normal-case mt-0.5">{buyerEmail}</span>}
                            {buyerTel1 && <span className="text-neutral-800 font-bold text-[9.5px] mt-0.5">TEL 1: {buyerTel1}</span>}
                            {buyerTel2 && <span className="text-neutral-800 font-bold text-[9.5px]">TEL 2: {buyerTel2}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right Details */}
                      <div className="flex flex-col">
                        <div className="grid grid-cols-2 border-b border-neutral-700 min-h-[36px]">
                          <div className="p-1 px-2 border-r border-neutral-700 flex flex-col justify-between">
                            <span className="text-neutral-500 font-semibold text-[8px]">Proforma No</span>
                            <span className="font-extrabold text-neutral-800 text-right text-[11px] tracking-wider pr-1 mb-0.5">{proformaNo}</span>
                          </div>
                          <div className="p-1 px-2 flex flex-col justify-between">
                            <span className="text-neutral-500 font-semibold text-[8px]">Date</span>
                            <span className="font-extrabold text-neutral-800 text-right text-[11px] pr-1 mb-0.5">
                              {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 flex-grow flex flex-col justify-center bg-white">
                          <div className="text-center font-extrabold text-neutral-800 text-[9px] uppercase tracking-wider pb-1">
                            Bank Account Details
                          </div>
                          <table className="w-full text-[9px] leading-snug font-mono text-neutral-800">
                            <tbody>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5">Bank Name</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5">:</td>
                                <td className="font-extrabold uppercase py-0.5">{bankName}</td>
                              </tr>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5">Branch Name</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5">:</td>
                                <td className="font-bold uppercase py-0.5">{branchName}</td>
                              </tr>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5">Account Name</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5">:</td>
                                <td className="font-bold uppercase py-0.5">{accountName}</td>
                              </tr>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5">Account Number</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5">:</td>
                                <td className="font-extrabold py-0.5">{accountNumber}</td>
                              </tr>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5">Swift Code</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5">:</td>
                                <td className="font-bold uppercase py-0.5">{swiftCode}</td>
                              </tr>
                              <tr>
                                <td className="w-24 text-neutral-500 font-bold py-0.5 align-top">Branch Address</td>
                                <td className="w-2 text-center text-neutral-500 py-0.5 align-top">:</td>
                                <td className="text-[8.5px] uppercase leading-tight py-0.5 whitespace-pre-line text-neutral-700">{branchAddress}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* LOADING PORTS FOOTER BAR */}
                    <div className="grid grid-cols-2 border-t border-neutral-700 text-[10px] leading-tight text-center bg-white">
                      <div className="p-1.5 px-2 border-r border-neutral-700 flex flex-col justify-between min-h-[32px]">
                        <span className="text-neutral-500 font-semibold text-[8px] text-left block">Port of Loading</span>
                        <span className="font-extrabold text-neutral-800 text-right pr-1">{portOfLoading}</span>
                      </div>
                      <div className="p-1.5 px-2 flex flex-col justify-between min-h-[32px]">
                        <span className="text-neutral-500 font-semibold text-[8px] text-left block">Port of Discharging</span>
                        <span className="font-extrabold text-neutral-800 text-right pr-1">{portOfDischarging}</span>
                      </div>
                    </div>

                    {/* TERMS BAR */}
                    <div className="grid grid-cols-2 border-t border-neutral-700 text-[10px] leading-tight text-center bg-white">
                      <div className="p-1.5 px-2 border-r border-neutral-700 flex flex-col justify-between min-h-[32px]">
                        <span className="text-neutral-500 font-semibold text-[8px] text-left block">Payment Terms</span>
                        <span className="font-extrabold text-red-600 text-right pr-1">{paymentTerms}</span>
                      </div>
                      <div className="p-1.5 px-2 flex flex-col justify-between min-h-[32px]">
                        <span className="text-neutral-500 font-semibold text-[8px] text-left block">Inspection</span>
                        <span className="font-extrabold text-neutral-800 text-right pr-1">{inspection > 0 ? 'EAA' : 'None required'}</span>
                      </div>
                    </div>
                  </div>

                  {/* DETAILS TABLE HEADER */}
                  <div className="overflow-hidden border border-neutral-300 rounded">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-red-600 text-white font-mono text-[9px] uppercase tracking-wider font-bold text-center border-b border-neutral-300">
                          <th className="py-2 px-3 border-r border-red-500 w-28">Image</th>
                          <th className="py-2 px-3 border-r border-red-500 text-left">Vehicle Details</th>
                          <th className="py-2 px-3 w-32">Amount [{currency}]</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="align-top border-b border-neutral-300">
                          {/* Image cell */}
                          <td className="p-2 border-r border-neutral-300 text-center">
                            {showImage ? (
                              <img 
                                src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400'} 
                                alt={model} 
                                className="w-full max-h-24 object-cover rounded border" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-16 bg-neutral-100 flex items-center justify-center text-[8px] text-neutral-400 uppercase font-mono">No Image</div>
                            )}
                          </td>

                          {/* Specifications info split into 2 visual columns */}
                          <td className="p-3 border-r border-neutral-300">
                            <div className="font-black text-neutral-900 text-xs mb-2 uppercase">
                              {make} {model}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] leading-relaxed">
                              <div><span className="text-neutral-400 font-mono">Chassis No:</span> <span className="font-bold text-neutral-800">{chassisNo}</span></div>
                              {showBodyType && <div><span className="text-neutral-400 font-mono">Body Type:</span> <span className="font-bold">{bodyType}</span></div>}
                              <div><span className="text-neutral-400 font-mono">Color:</span> <span className="font-medium">{exteriorColor}</span></div>
                              <div><span className="text-neutral-400 font-mono">Model Code:</span> <span className="font-bold">{modelCode}</span></div>
                              {showMileage && <div><span className="text-neutral-400 font-mono">Mileage:</span> <span className="font-medium">{mileage} KM</span></div>}
                              <div><span className="text-neutral-400 font-mono">Fuel:</span> <span className="font-medium">{fuel}</span></div>
                              <div><span className="text-neutral-400 font-mono">Steering:</span> <span className="font-medium">{steering}</span></div>
                              {showTransmission && <div><span className="text-neutral-400 font-mono">Transmission:</span> <span className="font-medium">{transmission}</span></div>}
                              <div><span className="text-neutral-400 font-mono">Reg Year/Month:</span> <span className="font-medium">{regYear}/{regMonth}</span></div>
                              <div><span className="text-neutral-400 font-mono">Engine CC:</span> <span className="font-medium">{engineCC} CC</span></div>
                              {showSeatCapacity && <div><span className="text-neutral-400 font-mono">Seat Capacity:</span> <span className="font-medium">{seatCapacity}</span></div>}
                              {showStockLotNo && <div><span className="text-neutral-400 font-mono">Stock/Lot No.:</span> <span className="font-mono">{stockLotNo}</span></div>}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3 text-right font-bold text-neutral-900 text-xs border-collapse">
                            <div className="flex justify-between items-center h-full font-mono">
                              <span className="text-[10px] text-neutral-400 font-normal">Unit Price</span>
                              <span>{currency} {Number(fob).toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>

                        {/* REMARKS BAR (Matches exactly PDF layout) */}
                        <tr className="align-middle bg-neutral-50/30">
                          <td colSpan={3} className="px-3 py-1.5 text-[9px] text-neutral-600 leading-tight border-collapse">
                            {showRemarks && <div className="mb-0.5"><span className="font-bold text-neutral-800 font-mono">Vehicle Remarks:--</span> {remarks}</div>}
                            <div className="flex justify-between items-center">
                              {showCfs && <div><span className="font-bold text-neutral-800 font-mono">CFS:</span> {cfs}</div>}
                              {showShipmentType && <div><span className="font-bold text-neutral-800 font-mono">Shipment Type:</span> {shipmentType}</div>}
                            </div>
                            {showOtherRemarks && otherRemarks && <div className="mt-0.5"><span className="font-bold text-neutral-800 font-mono">Other Remark:</span> {otherRemarks}</div>}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* TOTAL CALCULATION SECTION (Custom 2-column layout to align perfectly!) */}
                    <div className="grid grid-cols-12 text-[10px] border-t border-neutral-300">
                      {/* Left side: Unit Terms info */}
                      <div className="col-span-6 p-4 bg-white flex flex-col justify-center border-r border-neutral-300">
                        <div className="text-[11px] uppercase font-black tracking-tight text-red-600 leading-tight">
                          Total 1 Unit(s) {gTotalTerm} {portOfDischarging}
                        </div>
                        <p className="text-[8.5px] text-neutral-400 font-normal normal-case leading-snug mt-1.5 max-w-[320px]">
                          All values are represented in {getCurrencyName(currency)} ({currency}) based on standard international shipping logistics and Ocean Carrier contracts.{currency !== 'USD' ? ` (Exchange Rate: 1 USD = ${conversionRate} ${currency})` : ''}
                        </p>
                      </div>

                      {/* Right side: Ledger pricing math */}
                      <div className="col-span-6 bg-white">
                        <table className="w-full text-right text-[10px] border-collapse font-mono">
                          <tbody>
                            <tr className="border-b border-neutral-200">
                              <td className="p-2 px-3 text-neutral-500 font-normal text-left">Total (FOB)</td>
                              <td className="p-2 px-3 text-neutral-800 font-extrabold">{currency} {Number(fob).toLocaleString()}</td>
                            </tr>
                            <tr className="border-b border-neutral-200">
                              <td className="p-2 px-3 text-neutral-500 font-normal text-left">Freight</td>
                              <td className="p-2 px-3 text-neutral-800 font-extrabold">{currency} {Number(freight).toLocaleString()}</td>
                            </tr>
                            <tr className="border-b border-neutral-200">
                              <td className="p-2 px-3 text-neutral-500 font-normal text-left">EAA (Inspection)</td>
                              <td className="p-2 px-3 text-neutral-800 font-extrabold">{currency} {Number(inspection).toLocaleString()}</td>
                            </tr>
                            {customCosts.filter(c => c.category && Number(c.cost) > 0).map((c, idx) => (
                              <tr key={idx} className="border-b border-neutral-200">
                                <td className="p-2 px-3 text-neutral-500 font-normal text-left">{c.category}</td>
                                <td className="p-2 px-3 text-neutral-800 font-extrabold">{currency} {Number(c.cost).toLocaleString()}</td>
                              </tr>
                            ))}
                            {taxAmount > 0 && (
                              <tr className="border-b border-neutral-200 text-red-600 font-bold">
                                <td className="p-2 px-3 text-left">Tax ({taxPercent}%)</td>
                                <td className="p-2 px-3">{currency} {taxAmount.toLocaleString()}</td>
                              </tr>
                            )}
                            <tr className="bg-neutral-50/30 font-black text-xs">
                              <td className="p-2 px-3 text-left uppercase text-neutral-800">Total {gTotalTerm}</td>
                              <td className="p-2 px-3 text-red-600 text-right text-[11px] font-extrabold">{currency} {grandTotal.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

                {/* PAGE 2: TERMS AND CONDITIONS */}
                <div className="space-y-4 pt-12 border-t border-dashed border-neutral-300">
                  <div className="text-right text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
                    Due Date *{new Date(paymentDue).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </div>
                  
                  <div className="border-b border-neutral-800 pb-2">
                    <h3 className="text-sm font-black uppercase text-neutral-900 tracking-wider">
                      TERMS AND CONDITIONS
                    </h3>
                  </div>

                  <div className="text-[9px] text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed text-justify">
                    {termsDescription}
                  </div>

                  {/* SIGNATURE & OFFICIAL RED JAPANESE STAMP */}
                  <div className="flex justify-end pt-12">
                    <div className="w-56 text-center space-y-3 relative">
                      
                      {/* Authorized line */}
                      <div className="border-b border-neutral-400 pb-1 text-xs font-serif font-bold italic text-neutral-700">
                        H. Sato
                      </div>
                      <div className="text-[9px] uppercase font-mono font-bold tracking-widest text-neutral-400">
                        Authorized Signature
                      </div>

                      {/* RED JAPANESE STAMP (Aesthetic red stamp from screenshots) */}
                      <div className="absolute right-2 top-[-30px] h-16 w-16 border-2 border-red-500 rounded flex flex-col items-center justify-center text-[7px] text-red-500 font-extrabold uppercase leading-none select-none rotate-6 bg-white/70">
                        <div className="text-[6px] tracking-widest">株式</div>
                        <div className="text-[6px] tracking-widest">会社</div>
                        <div className="border-t border-b border-red-400 py-0.5 my-0.5 text-[8px] font-black">CAR CHIEF</div>
                        <div className="text-[6px]">OSAKA</div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* QUICK ADD CUSTOMER MODAL */}
          {showQuickAddCustomer && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-900 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Register Customer Company</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowQuickAddCustomer(false)}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleQuickAddCustomer} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={quickCustName}
                      onChange={(e) => setQuickCustName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. JOHN DOE TRADERS LTD"
                      value={quickCustCompany}
                      onChange={(e) => setQuickCustCompany(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Primary Email Address *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. john@example.com"
                      value={quickCustEmail}
                      onChange={(e) => setQuickCustEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Phone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +256 700 000000"
                      value={quickCustPhone}
                      onChange={(e) => setQuickCustPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">City</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kampala"
                        value={quickCustCity}
                        onChange={(e) => setQuickCustCity(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Country</label>
                      <select 
                        value={quickCustCountry}
                        onChange={(e) => setQuickCustCountry(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="Uganda">Uganda</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Zambia">Zambia</option>
                        <option value="Zimbabwe">Zimbabwe</option>
                        <option value="Rwanda">Rwanda</option>
                        <option value="Burundi">Burundi</option>
                        <option value="Malawi">Malawi</option>
                        <option value="Mozambique">Mozambique</option>
                        <option value="South Sudan">South Sudan</option>
                        <option value="Japan">Japan</option>
                        <option value="United Kingdom">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Street Address</label>
                    <input 
                      type="text" 
                      placeholder="e.g. P O Box 4278, Nakasero Road"
                      value={quickCustAddress}
                      onChange={(e) => setQuickCustAddress(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button 
                      type="button" 
                      onClick={() => setShowQuickAddCustomer(false)}
                      className="text-xs px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-bold transition-all cursor-pointer text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="text-xs px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all cursor-pointer shadow-md"
                    >
                      Save & Select
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

class ProformaInvoiceErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error inside ProformaInvoiceGenerator:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 font-sans max-w-4xl mx-auto my-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-red-100">
            <span className="text-xl" role="img" aria-label="warning">⚠️</span>
            <h3 className="font-bold text-sm uppercase tracking-wider text-red-950">
              Proforma Invoice Generator Error Boundary
            </h3>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-900 leading-relaxed">
              An error occurred during rendering this module:
            </p>
            <pre className="p-3 bg-red-100/50 rounded border border-red-200 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
              {this.state.error?.stack || String(this.state.error)}
            </pre>
            {this.state.errorInfo && (
              <details className="text-[11px] font-mono text-red-700 mt-2">
                <summary className="cursor-pointer font-sans font-semibold text-xs text-red-800 select-none hover:underline">
                  View Component Stack Details
                </summary>
                <pre className="p-2.5 bg-red-50/50 border border-red-200 rounded mt-1.5 overflow-x-auto whitespace-pre-wrap max-h-48 leading-normal">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="text-xs font-mono font-black uppercase tracking-wider px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer transition-all shadow-sm"
            >
              Reset Interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProformaInvoiceGenerator(props: ProformaInvoiceGeneratorProps) {
  return (
    <ProformaInvoiceErrorBoundary>
      <ProformaInvoiceGeneratorComponent {...props} />
    </ProformaInvoiceErrorBoundary>
  );
}
