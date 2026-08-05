/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Globe, Anchor, Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw, Layers, Coins, Truck, Landmark, Edit2, FileText, MessageSquare, Notebook } from 'lucide-react';
import { CountryMaster, PortMaster, ShipperMaster, BankMaster, TermsPresetMaster } from '../types';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';

const PRESET_COUNTRIES = [
  { name: 'Kenya', code: 'KE' },
  { name: 'United States', code: 'US' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Japan', code: 'JP' },
  { name: 'Australia', code: 'AU' },
  { name: 'Germany', code: 'DE' },
  { name: 'Singapore', code: 'SG' },
  { name: 'United Arab Emirates', code: 'AE' }
];

const PRESET_PORTS = [
  { name: 'Mombasa', countryName: 'Kenya' },
  { name: 'Los Angeles', countryName: 'United States' },
  { name: 'Rotterdam', countryName: 'Netherlands' },
  { name: 'Tokyo', countryName: 'Japan' },
  { name: 'Sydney', countryName: 'Australia' },
  { name: 'Hamburg', countryName: 'Germany' },
  { name: 'Singapore Hub', countryName: 'Singapore' },
  { name: 'Dubai Port', countryName: 'United Arab Emirates' }
];

const PRESET_COST_ITEMS = [
  { name: '08 Units' },
  { name: 'ADDITIONAL PARTS & SERVICES' },
  { name: 'Advance' },
  { name: 'ALLOY WHEELS' },
  { name: 'Auction Deposit' },
  { name: 'AUCTION TRANSPORT SURCHARGE' },
  { name: 'Bid Advance' },
  { name: 'Bid Deposit' },
  { name: 'Cash Hand over' },
  { name: 'charge' },
  { name: 'Defaulted Fee' },
  { name: 'Delivery' },
  { name: 'Delivery & clearance (Gabaron)' },
  { name: 'Destination Inspection' },
  { name: 'Discount' },
  { name: 'Extras tires' },
  { name: 'FOB Slab A' },
  { name: 'Freight' }
];

const PRESET_SHIPPERS = [
  {
    companyName: 'CARCHIEF CO. LTD',
    address1: '1-6-8 NISHIAWAJI,',
    address2: 'HIGASHIYODOGAWA-KU',
    city: 'OSAKA',
    state: 'JAPAN',
    zipCode: '533-0013',
    telephone: '+81-66-795-9867',
    fax: '+81-66-795-9869'
  }
];

export default function AdminMasterControls() {
  const [countries, setCountries] = useState<CountryMaster[]>([]);
  const [ports, setPorts] = useState<PortMaster[]>([]);
  const [costItems, setCostItems] = useState<{ id: string; name: string }[]>([]);
  const [shippers, setShippers] = useState<ShipperMaster[]>([]);
  const [banks, setBanks] = useState<BankMaster[]>([]);
  const [activeMasterTab, setActiveMasterTab] = useState<'country' | 'port' | 'cost' | 'shipper' | 'bank' | 'termsPreset' | 'remarksPreset' | 'bankNotesPreset'>('country');

  // Form states
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [portName, setPortName] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [costItemName, setCostItemName] = useState('');

  // Shipper Form states
  const [shipperCompanyName, setShipperCompanyName] = useState('');
  const [shipperAddress1, setShipperAddress1] = useState('');
  const [shipperAddress2, setShipperAddress2] = useState('');
  const [shipperCity, setShipperCity] = useState('');
  const [shipperState, setShipperState] = useState('');
  const [shipperZipCode, setShipperZipCode] = useState('');
  const [shipperTelephone, setShipperTelephone] = useState('');
  const [shipperFax, setShipperFax] = useState('');

  // Bank Form states
  const [bankSubTab, setBankSubTab] = useState<'add' | 'manage'>('add');
  const [bankTitle, setBankTitle] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [bankBranchName, setBankBranchName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSwiftCode, setBankSwiftCode] = useState('');
  const [bankType, setBankType] = useState<'Japan' | 'Overseas'>('Japan');
  const [bankAddress, setBankAddress] = useState('');
  const [bankShipperId, setBankShipperId] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankOptionDisplay, setBankOptionDisplay] = useState(true);

  // New Presets state lists
  const [termsPresets, setTermsPresets] = useState<TermsPresetMaster[]>([]);

  // Form states for Terms Presets
  const [termsPresetTitle, setTermsPresetTitle] = useState('');
  const [termsPresetDisplayStatus, setTermsPresetDisplayStatus] = useState<'Yes' | 'No'>('No');
  const [termsPresetDescription, setTermsPresetDescription] = useState('');
  const [editingTermsPreset, setEditingTermsPreset] = useState<TermsPresetMaster | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit states
  const [editingCountry, setEditingCountry] = useState<CountryMaster | null>(null);
  const [editingPort, setEditingPort] = useState<PortMaster | null>(null);
  const [editingCostItem, setEditingCostItem] = useState<{ id: string; name: string } | null>(null);
  const [editingShipper, setEditingShipper] = useState<ShipperMaster | null>(null);
  const [editingBank, setEditingBank] = useState<BankMaster | null>(null);

  useEffect(() => {
    // Reset all form inputs and editing states when active master tab changes
    setEditingCountry(null);
    setEditingPort(null);
    setEditingCostItem(null);
    setEditingShipper(null);
    setEditingBank(null);
    setEditingTermsPreset(null);

    setCountryName('');
    setCountryCode('');
    setPortName('');
    setSelectedCountryId('');
    setCostItemName('');
    
    setShipperCompanyName('');
    setShipperAddress1('');
    setShipperAddress2('');
    setShipperCity('');
    setShipperState('');
    setShipperZipCode('');
    setShipperTelephone('');
    setShipperFax('');

    setBankTitle('');
    setFormBankName('');
    setBankBranchName('');
    setBankAccountName('');
    setBankAccountNumber('');
    setBankSwiftCode('');
    setBankAddress('');
    setBankShipperId('');
    setBankIban('');
    setBankOptionDisplay(true);

    setTermsPresetTitle('');
    setTermsPresetDisplayStatus('No');
    setTermsPresetDescription('');

    setError(null);
    setSuccess(null);
    firestoreCache.clearAll();
  }, [activeMasterTab]);

  // Load countries, ports and cost items from Firestore (Optimized with Cache)
  useEffect(() => {
    setLoading(true);
    const unsubCountries = firestoreCache.subscribeToCollection('countries', (data) => {
      setCountries(data as CountryMaster[]);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching countries:", err);
      setError("Failed to load country master lists. Please try again.");
      setLoading(false);
    });

    const unsubPorts = firestoreCache.subscribeToCollection('ports', (data) => {
      setPorts(data as PortMaster[]);
    }, (err) => {
      console.error("Error fetching ports:", err);
      setError("Failed to load port master lists. Please try again.");
    });

    const unsubCostItems = firestoreCache.subscribeToCollection('costItems', (data) => {
      const list = data.map(doc => ({ id: doc.id, name: doc.name } as any));
      setCostItems(list);
    }, (err) => {
      console.error("Error fetching cost items:", err);
      setError("Failed to load costing items master list.");
    });

    const unsubShippers = firestoreCache.subscribeToCollection('shippers', (data) => {
      setShippers(data as ShipperMaster[]);
    }, (err) => {
      console.error("Error fetching shippers:", err);
      setError("Failed to load shippers master list.");
    });

    const unsubBanks = firestoreCache.subscribeToCollection('banks', (data) => {
      setBanks(data as BankMaster[]);
    }, (err) => {
      console.error("Error fetching banks:", err);
      setError("Failed to load bank details master list.");
    });

    const unsubTermsPresets = firestoreCache.subscribeToCollection('termsPresets', (data) => {
      setTermsPresets(data as TermsPresetMaster[]);
    }, (err) => {
      console.error("Error fetching terms presets:", err);
    });

    return () => {
      unsubCountries();
      unsubPorts();
      unsubCostItems();
      unsubShippers();
      unsubBanks();
      unsubTermsPresets();
    };
  }, []);

  // Preset Seeding Functionality
  const handleSeedPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const batch = writeBatch(db);

      // Check existing countries, cost items, and shippers
      const countriesSnap = await getDocs(collection(db, 'countries'));
      const portsSnap = await getDocs(collection(db, 'ports'));
      const costItemsSnap = await getDocs(collection(db, 'costItems'));
      const shippersSnap = await getDocs(collection(db, 'shippers'));

      let currentCountries = [...countries];
      
      if (countriesSnap.empty) {
        for (const p of PRESET_COUNTRIES) {
          const docRef = doc(collection(db, 'countries'));
          batch.set(docRef, { name: p.name, code: p.code });
        }
        await batch.commit();
        setSuccess("Countries seeded successfully!");
        
        // Wait briefly for snapshot or re-fetch to register countries before seeding ports
        const freshCountriesSnap = await getDocs(collection(db, 'countries'));
        const freshCountries: CountryMaster[] = [];
        freshCountriesSnap.forEach(d => {
          freshCountries.push({ id: d.id, ...d.data() } as CountryMaster);
        });
        currentCountries = freshCountries;
      }

      if (portsSnap.empty && currentCountries.length > 0) {
        const portBatch = writeBatch(db);
        for (const p of PRESET_PORTS) {
          const matchedCountry = currentCountries.find(c => c.name.toLowerCase() === p.countryName.toLowerCase());
          if (matchedCountry) {
            const portDocRef = doc(collection(db, 'ports'));
            portBatch.set(portDocRef, {
              name: p.name,
              countryId: matchedCountry.id,
              countryName: matchedCountry.name
            });
          }
        }
        await portBatch.commit();
      }

      if (costItemsSnap.empty) {
        const costBatch = writeBatch(db);
        for (const c of PRESET_COST_ITEMS) {
          const costDocRef = doc(collection(db, 'costItems'));
          costBatch.set(costDocRef, { name: c.name });
        }
        await costBatch.commit();
      }

      if (shippersSnap.empty) {
        const shipperBatch = writeBatch(db);
        for (const s of PRESET_SHIPPERS) {
          const sDocRef = doc(collection(db, 'shippers'));
          shipperBatch.set(sDocRef, s);
        }
        await shipperBatch.commit();
      }

      const banksSnap = await getDocs(collection(db, 'banks'));
      if (banksSnap.empty) {
        const freshShippersSnap = await getDocs(collection(db, 'shippers'));
        let carchiefShipperId = '';
        let carchiefShipperName = 'CARCHIEF CO. LTD';
        freshShippersSnap.forEach(d => {
          const s = d.data();
          if (s.companyName === 'CARCHIEF CO. LTD') {
            carchiefShipperId = d.id;
            carchiefShipperName = s.companyName;
          }
        });

        const bankBatch = writeBatch(db);
        const presetBanks = [
          {
            title: 'MUFG BANK - USD A/C',
            bankName: 'MUFG BANK, LTD.',
            branchName: 'OSAKA BRANCH',
            accountName: 'CARCHIEF CO. LTD',
            accountNumber: '123-456789',
            swiftCode: 'BOTKJPJTXXX',
            bankType: 'Japan',
            address: '1-6-8 NISHIAWAJI, HIGASHIYODOGAWA-KU, OSAKA, JAPAN',
            shipperId: carchiefShipperId,
            shipperCompanyName: carchiefShipperName,
            iban: '',
            optionDisplay: true
          }
        ];
        for (const b of presetBanks) {
          const bDocRef = doc(collection(db, 'banks'));
          bankBatch.set(bDocRef, b);
        }
        await bankBatch.commit();
      }

      // Seed Terms Presets
      const termsSnap = await getDocs(collection(db, 'termsPresets'));
      if (termsSnap.empty) {
        const termsBatch = writeBatch(db);
        const presetTerms = [
          {
            title: 'CarChief Dubai',
            displayStatus: 'No',
            description: `Agreement between Buyer and Seller for the above Invoice
WITNESSSETH

WHEREAS, Seller desires to sell a used vehicle, details of which are specified on the Proforma Invoice attached herewith, to Buyer and agrees to handle the exporting arrangements; and, WHEREAS Buyer is willing to purchase the vehicle from Seller at the mutually agreed total price as specified on the Proforma Invoice. NOW THEREFORE, in consideration of the mutual agreements contained herein, the parties agree as follows:Buyer shall pay the agreed amount for the vehicle under the conditions set forth below, and Seller shall guarantee the sale when Buyer complies with these processes.

Proforma Invoice`
          }
        ];
        for (const t of presetTerms) {
          const tDocRef = doc(collection(db, 'termsPresets'));
          termsBatch.set(tDocRef, t);
        }
        await termsBatch.commit();
      }

      setSuccess("Default Master records seeded successfully!");
    } catch (err) {
      console.error("Error seeding presets:", err);
      setError("Failed to seed default presets. Please manually create entries.");
    } finally {
      setLoading(false);
    }
  };

  // Add Country
  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryName.trim()) return;

    try {
      setError(null);
      setSuccess(null);
      
      // Prevent duplicates
      const exists = countries.some(c => c.name.toLowerCase() === countryName.trim().toLowerCase());
      if (exists) {
        setError("Country already exists in master.");
        return;
      }

      await addDoc(collection(db, 'countries'), {
        name: countryName.trim(),
        code: countryCode.trim().toUpperCase() || 'N/A'
      });

      setCountryName('');
      setCountryCode('');
      setSuccess("Country successfully registered to master ledger.");
    } catch (err) {
      console.error("Error adding country:", err);
      setError("Failed to save country master record.");
    }
  };

  // Add Port
  const handleAddPort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portName.trim() || !selectedCountryId) return;

    const selectedCountry = countries.find(c => c.id === selectedCountryId);
    if (!selectedCountry) {
      setError("Invalid country selection.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Prevent duplicates in same country
      const exists = ports.some(p => p.name.toLowerCase() === portName.trim().toLowerCase() && p.countryId === selectedCountryId);
      if (exists) {
        setError("Port already exists for this country.");
        return;
      }

      await addDoc(collection(db, 'ports'), {
        name: portName.trim(),
        countryId: selectedCountryId,
        countryName: selectedCountry.name
      });

      setPortName('');
      setSuccess("Port successfully registered to master ledger.");
    } catch (err) {
      console.error("Error adding port:", err);
      setError("Failed to save port master record.");
    }
  };

  // Delete Country
  const handleDeleteCountry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this country from the master database? This may orphan mapped ports.")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'countries', id));
      setSuccess("Country removed from master.");
    } catch (err) {
      console.error("Error deleting country:", err);
      setError("Failed to delete country master record.");
    }
  };

  // Delete Port
  const handleDeletePort = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this port from the master database?")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'ports', id));
      setSuccess("Port removed from master.");
    } catch (err) {
      console.error("Error deleting port:", err);
      setError("Failed to delete port master record.");
    }
  };

  // Add Cost Item
  const handleAddCostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costItemName.trim()) return;

    try {
      setError(null);
      setSuccess(null);

      // Prevent duplicates
      const exists = costItems.some(c => c.name.toLowerCase() === costItemName.trim().toLowerCase());
      if (exists) {
        setError("Costing item already exists in master.");
        return;
      }

      await addDoc(collection(db, 'costItems'), {
        name: costItemName.trim()
      });

      setCostItemName('');
      setSuccess("Costing item successfully registered to master ledger.");
    } catch (err) {
      console.error("Error adding costing item:", err);
      setError("Failed to save costing item master record.");
    }
  };

  // Delete Cost Item
  const handleDeleteCostItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this costing item? Existing invoices referring to it will not be modified, but it will be unavailable for new invoices.")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'costItems', id));
      setSuccess("Costing item removed from master.");
    } catch (err) {
      console.error("Error deleting costing item:", err);
      setError("Failed to delete costing item master record.");
    }
  };

  // Add Shipper
  const handleAddShipper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipperCompanyName.trim() || !shipperAddress1.trim() || !shipperCity.trim()) {
      setError("Company Name, Address 1, and City are required fields for Shipper Master.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Prevent duplicates based on companyName
      const exists = shippers.some(s => s.companyName.toLowerCase() === shipperCompanyName.trim().toLowerCase());
      if (exists) {
        setError("A Shipper with this Company Name already exists in the master list.");
        return;
      }

      await addDoc(collection(db, 'shippers'), {
        companyName: shipperCompanyName.trim(),
        address1: shipperAddress1.trim(),
        address2: shipperAddress2.trim(),
        city: shipperCity.trim(),
        state: shipperState.trim(),
        zipCode: shipperZipCode.trim(),
        telephone: shipperTelephone.trim(),
        fax: shipperFax.trim()
      });

      // Clear Form
      setShipperCompanyName('');
      setShipperAddress1('');
      setShipperAddress2('');
      setShipperCity('');
      setShipperState('');
      setShipperZipCode('');
      setShipperTelephone('');
      setShipperFax('');

      setSuccess("Shipper successfully added to master records.");
    } catch (err) {
      console.error("Error adding shipper:", err);
      setError("Failed to save shipper master record.");
    }
  };

  // Delete Shipper
  const handleDeleteShipper = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Shipper master record? Existing Proforma Invoices will retain their shipper details, but this shipper will no longer be available for selection on new ones.")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'shippers', id));
      setSuccess("Shipper master record successfully removed.");
    } catch (err) {
      console.error("Error deleting shipper:", err);
      setError("Failed to delete shipper master record.");
    }
  };

  // Add Bank Detail Master
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankTitle.trim() || !formBankName.trim() || !bankBranchName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim() || !bankSwiftCode.trim()) {
      setError("Please fill in all required fields marked with *");
      return;
    }

    try {
      setError(null);
      const selectedShipper = shippers.find(s => s.id === bankShipperId);
      const newBank = {
        title: bankTitle,
        bankName: formBankName,
        branchName: bankBranchName,
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        swiftCode: bankSwiftCode,
        bankType,
        address: bankAddress,
        shipperId: bankShipperId,
        shipperCompanyName: selectedShipper ? selectedShipper.companyName : '',
        iban: bankIban,
        optionDisplay: bankOptionDisplay
      };

      await addDoc(collection(db, 'banks'), newBank);
      
      // Clear form states
      setBankTitle('');
      setFormBankName('');
      setBankBranchName('');
      setBankAccountName('');
      setBankAccountNumber('');
      setBankSwiftCode('');
      setBankAddress('');
      setBankShipperId('');
      setBankIban('');
      setBankOptionDisplay(true);

      setSuccess("Bank Details Master record successfully added.");
    } catch (err) {
      console.error("Error adding bank:", err);
      setError("Failed to save bank details master record.");
    }
  };

  // Delete Bank Record
  const handleDeleteBank = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bank master record?")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'banks', id));
      setSuccess("Bank master record successfully removed.");
    } catch (err) {
      console.error("Error deleting bank:", err);
      setError("Failed to delete bank master record.");
    }
  };

  // Update Country
  const handleUpdateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCountry) return;
    if (!countryName.trim()) {
      setError("Country name is required.");
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      
      const countryRef = doc(db, 'countries', editingCountry.id);
      await updateDoc(countryRef, {
        name: countryName.trim(),
        code: countryCode.trim().toUpperCase() || 'N/A'
      });

      // Update mapped ports countryName in Firestore
      const batch = writeBatch(db);
      const portsToUpdate = ports.filter(p => p.countryId === editingCountry.id);
      for (const p of portsToUpdate) {
        batch.update(doc(db, 'ports', p.id), { countryName: countryName.trim() });
      }
      await batch.commit();

      setEditingCountry(null);
      setCountryName('');
      setCountryCode('');
      setSuccess("Country master record updated successfully.");
    } catch (err) {
      console.error("Error updating country:", err);
      setError("Failed to update country master record.");
    }
  };

  // Update Port
  const handleUpdatePort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPort) return;
    if (!portName.trim() || !selectedCountryId) return;

    const selectedCountry = countries.find(c => c.id === selectedCountryId);
    if (!selectedCountry) {
      setError("Invalid country selection.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      await updateDoc(doc(db, 'ports', editingPort.id), {
        name: portName.trim(),
        countryId: selectedCountryId,
        countryName: selectedCountry.name
      });

      setEditingPort(null);
      setPortName('');
      setSelectedCountryId('');
      setSuccess("Port master record updated successfully.");
    } catch (err) {
      console.error("Error updating port:", err);
      setError("Failed to update port master record.");
    }
  };

  // Update Cost Item
  const handleUpdateCostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCostItem) return;
    if (!costItemName.trim()) return;

    try {
      setError(null);
      setSuccess(null);

      await updateDoc(doc(db, 'costItems', editingCostItem.id), {
        name: costItemName.trim()
      });

      setEditingCostItem(null);
      setCostItemName('');
      setSuccess("Costing item updated successfully.");
    } catch (err) {
      console.error("Error updating costing item:", err);
      setError("Failed to update costing item master record.");
    }
  };

  // Update Shipper
  const handleUpdateShipper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipper) return;
    if (!shipperCompanyName.trim() || !shipperAddress1.trim() || !shipperCity.trim()) {
      setError("Company Name, Address 1, and City are required fields for Shipper.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      await updateDoc(doc(db, 'shippers', editingShipper.id), {
        companyName: shipperCompanyName.trim(),
        address1: shipperAddress1.trim(),
        address2: shipperAddress2.trim(),
        city: shipperCity.trim(),
        state: shipperState.trim(),
        zipCode: shipperZipCode.trim(),
        telephone: shipperTelephone.trim(),
        fax: shipperFax.trim()
      });

      // Update associated banks shipperCompanyName in Firestore
      const batch = writeBatch(db);
      const banksToUpdate = banks.filter(b => b.shipperId === editingShipper.id);
      for (const b of banksToUpdate) {
        batch.update(doc(db, 'banks', b.id), { shipperCompanyName: shipperCompanyName.trim() });
      }
      await batch.commit();

      setEditingShipper(null);
      setShipperCompanyName('');
      setShipperAddress1('');
      setShipperAddress2('');
      setShipperCity('');
      setShipperState('');
      setShipperZipCode('');
      setShipperTelephone('');
      setShipperFax('');
      setSuccess("Shipper master record updated successfully.");
    } catch (err) {
      console.error("Error updating shipper:", err);
      setError("Failed to update shipper master record.");
    }
  };

  // Update Bank
  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank) return;
    if (!bankTitle.trim() || !formBankName.trim() || !bankBranchName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim() || !bankSwiftCode.trim()) {
      setError("Please fill in all required fields marked with *");
      return;
    }

    try {
      setError(null);
      const selectedShipper = shippers.find(s => s.id === bankShipperId);

      await updateDoc(doc(db, 'banks', editingBank.id), {
        title: bankTitle,
        bankName: formBankName,
        branchName: bankBranchName,
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        swiftCode: bankSwiftCode,
        bankType,
        address: bankAddress,
        shipperId: bankShipperId,
        shipperCompanyName: selectedShipper ? selectedShipper.companyName : '',
        iban: bankIban,
        optionDisplay: bankOptionDisplay
      });

      setEditingBank(null);
      setBankTitle('');
      setFormBankName('');
      setBankBranchName('');
      setBankAccountName('');
      setBankAccountNumber('');
      setBankSwiftCode('');
      setBankAddress('');
      setBankShipperId('');
      setBankIban('');
      setBankOptionDisplay(true);
      setBankSubTab('manage');
      setSuccess("Bank Details Master record updated successfully.");
    } catch (err) {
      console.error("Error updating bank:", err);
      setError("Failed to update bank details master record.");
    }
  };

  // Add Terms Preset
  const handleAddTermsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsPresetTitle.trim() || !termsPresetDescription.trim()) {
      setError("Please fill in both preset title and description.");
      return;
    }
    try {
      setError(null);
      setSuccess(null);

      await addDoc(collection(db, 'termsPresets'), {
        title: termsPresetTitle.trim(),
        displayStatus: termsPresetDisplayStatus,
        description: termsPresetDescription.trim()
      });

      setTermsPresetTitle('');
      setTermsPresetDisplayStatus('No');
      setTermsPresetDescription('');
      setSuccess("Terms preset created successfully.");
    } catch (err) {
      console.error("Error adding terms preset:", err);
      setError("Failed to save terms preset.");
    }
  };

  // Update Terms Preset
  const handleUpdateTermsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTermsPreset) return;
    if (!termsPresetTitle.trim() || !termsPresetDescription.trim()) {
      setError("Please fill in both preset title and description.");
      return;
    }
    try {
      setError(null);
      setSuccess(null);

      await updateDoc(doc(db, 'termsPresets', editingTermsPreset.id), {
        title: termsPresetTitle.trim(),
        displayStatus: termsPresetDisplayStatus,
        description: termsPresetDescription.trim()
      });

      setEditingTermsPreset(null);
      setTermsPresetTitle('');
      setTermsPresetDisplayStatus('No');
      setTermsPresetDescription('');
      setSuccess("Terms preset updated successfully.");
    } catch (err) {
      console.error("Error updating terms preset:", err);
      setError("Failed to update terms preset.");
    }
  };

  // Delete Terms Preset
  const handleDeleteTermsPreset = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this terms preset?")) return;
    try {
      setError(null);
      setSuccess(null);
      await deleteDoc(doc(db, 'termsPresets', id));
      setSuccess("Terms preset removed successfully.");
    } catch (err) {
      console.error("Error deleting terms preset:", err);
      setError("Failed to delete terms preset.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6" id="admin-master-controls-ledger">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
            <Layers className="text-red-600 w-4.5 h-4.5 stroke-[3]" />
            Admin Master Controls
          </h3>
          <p className="text-xs text-neutral-500">
            Configure system masters such as Country Master, Port Master, Costing Items Master, Shipper Master, and Bank Details Master for downstream logistics
          </p>
        </div>
 
        {/* Preset seed button if collections are empty */}
        {(countries.length === 0 || ports.length === 0 || costItems.length === 0 || shippers.length === 0 || banks.length === 0) && (
          <button
            onClick={handleSeedPresets}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            Seed Default Presets
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <ShieldCheck className="text-emerald-600 w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Selector Sub Tabs */}
      <div className="flex border-b border-neutral-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveMasterTab('country')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'country'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            Country Master ({countries.length})
          </div>
        </button>
        <button
          onClick={() => setActiveMasterTab('port')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'port'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Anchor className="w-4 h-4" />
            Port Master ({ports.length})
          </div>
        </button>
        <button
          onClick={() => setActiveMasterTab('cost')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'cost'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            Costing Items Master ({costItems.length})
          </div>
        </button>
        <button
          onClick={() => setActiveMasterTab('shipper')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'shipper'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            Shipper Master ({shippers.length})
          </div>
        </button>
        <button
          onClick={() => setActiveMasterTab('bank')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'bank'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Landmark className="w-4 h-4" />
            Bank Master ({banks.length})
          </div>
        </button>
        <button
          onClick={() => setActiveMasterTab('termsPreset')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeMasterTab === 'termsPreset'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Terms Presets ({termsPresets.length})
          </div>
        </button>

      </div>

      {/* COUNTRY MASTER VIEW */}
      {activeMasterTab === 'country' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / Edit Country Form */}
          <div className="lg:col-span-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-150">
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {editingCountry ? <Edit2 className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                {editingCountry ? 'Edit Country Master' : 'Add Country Master'}
              </span>
              {editingCountry && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCountry(null);
                    setCountryName('');
                    setCountryCode('');
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-600 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              )}
            </h4>
            <form onSubmit={editingCountry ? handleUpdateCountry : handleAddCountry} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Country Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">ISO Country Code (Optional)</label>
                <input
                  type="text"
                  maxLength={3}
                  placeholder="e.g. KE"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors"
              >
                {editingCountry ? 'Update Country' : 'Register Country'}
              </button>
            </form>
          </div>

          {/* Country List Table */}
          <div className="lg:col-span-8">
            <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                    <th className="py-3 px-4">Country ID</th>
                    <th className="py-3 px-4">Country Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400 animate-pulse">
                        Loading master records...
                      </td>
                    </tr>
                  ) : countries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400">
                        No countries registered. Use the panel on the left or click "Seed Default Presets" to begin.
                      </td>
                    </tr>
                  ) : (
                    countries.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[10px] text-neutral-400">{c.id}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900">{c.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
                            {c.code || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCountry(c);
                              setCountryName(c.name);
                              setCountryCode(c.code || '');
                            }}
                            className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Country Master"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCountry(c.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Country Master"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PORT MASTER VIEW */}
      {activeMasterTab === 'port' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / Edit Port Form */}
          <div className="lg:col-span-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-150">
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {editingPort ? <Edit2 className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                {editingPort ? 'Edit Port Master' : 'Add Port Master'}
              </span>
              {editingPort && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPort(null);
                    setPortName('');
                    setSelectedCountryId('');
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-600 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              )}
            </h4>
            <form onSubmit={editingPort ? handleUpdatePort : handleAddPort} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Select Country *</label>
                <select
                  required
                  value={selectedCountryId}
                  onChange={(e) => setSelectedCountryId(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                >
                  <option value="">-- Choose Country --</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Port Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mombasa"
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={countries.length === 0}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingPort ? 'Update Port' : 'Register Port'}
              </button>
            </form>
          </div>

          {/* Port List Table */}
          <div className="lg:col-span-8">
            <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                    <th className="py-3 px-4">Port ID</th>
                    <th className="py-3 px-4">Port Name</th>
                    <th className="py-3 px-4">Mapped Country</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400 animate-pulse">
                        Loading master records...
                      </td>
                    </tr>
                  ) : ports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400">
                        No ports registered. Use the panel on the left or click "Seed Default Presets" to begin.
                      </td>
                    </tr>
                  ) : (
                    ports.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[10px] text-neutral-400">{p.id}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900">{p.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-neutral-500 flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-neutral-400" />
                            {p.countryName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingPort(p);
                              setPortName(p.name);
                              setSelectedCountryId(p.countryId);
                            }}
                            className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Port Master"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePort(p.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Port Master"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COSTING ITEMS MASTER VIEW */}
      {activeMasterTab === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / Edit Costing Item Form */}
          <div className="lg:col-span-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-150">
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {editingCostItem ? <Edit2 className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                {editingCostItem ? 'Edit Costing Item' : 'Add Costing Item'}
              </span>
              {editingCostItem && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCostItem(null);
                    setCostItemName('');
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-600 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              )}
            </h4>
            <form onSubmit={editingCostItem ? handleUpdateCostItem : handleAddCostItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Costing Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADDITIONAL PARTS & SERVICES"
                  value={costItemName}
                  onChange={(e) => setCostItemName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors"
              >
                {editingCostItem ? 'Update Costing Item' : 'Register Costing Item'}
              </button>
            </form>
          </div>

          {/* Costing Item List Table */}
          <div className="lg:col-span-8">
            <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                    <th className="py-3 px-4">Item ID</th>
                    <th className="py-3 px-4">Costing Item Name</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-neutral-400 animate-pulse">
                        Loading costing items...
                      </td>
                    </tr>
                  ) : costItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-neutral-400">
                        No costing items registered. Use the panel on the left or click "Seed Default Presets" to begin.
                      </td>
                    </tr>
                  ) : (
                    costItems.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[10px] text-neutral-400">{c.id}</td>
                        <td className="py-3 px-4 font-bold text-neutral-900">{c.name}</td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCostItem(c);
                              setCostItemName(c.name);
                            }}
                            className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Costing Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCostItem(c.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Costing Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SHIPPER MASTER VIEW */}
      {activeMasterTab === 'shipper' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / Edit Shipper Form */}
          <div className="lg:col-span-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-150">
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {editingShipper ? <Edit2 className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                {editingShipper ? 'Edit Shipper Record' : 'Add Shipper Record'}
              </span>
              {editingShipper && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingShipper(null);
                    setShipperCompanyName('');
                    setShipperAddress1('');
                    setShipperAddress2('');
                    setShipperCity('');
                    setShipperState('');
                    setShipperZipCode('');
                    setShipperTelephone('');
                    setShipperFax('');
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-600 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              )}
            </h4>
            <form onSubmit={editingShipper ? handleUpdateShipper : handleAddShipper} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CARCHIEF CO. LTD"
                  value={shipperCompanyName}
                  onChange={(e) => setShipperCompanyName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-6-8 NISHIAWAJI"
                  value={shipperAddress1}
                  onChange={(e) => setShipperAddress1(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. HIGASHIYODOGAWA-KU"
                  value={shipperAddress2}
                  onChange={(e) => setShipperAddress2(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OSAKA"
                    value={shipperCity}
                    onChange={(e) => setShipperCity(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">State / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. OSAKA"
                    value={shipperState}
                    onChange={(e) => setShipperState(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Zip / Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 533-0013"
                    value={shipperZipCode}
                    onChange={(e) => setShipperZipCode(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Telephone</label>
                  <input
                    type="text"
                    placeholder="e.g. +81-66-795-9867"
                    value={shipperTelephone}
                    onChange={(e) => setShipperTelephone(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Fax Number</label>
                <input
                  type="text"
                  placeholder="e.g. +81-66-795-9869"
                  value={shipperFax}
                  onChange={(e) => setShipperFax(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors"
              >
                {editingShipper ? 'Update Shipper Record' : 'Register Shipper'}
              </button>
            </form>
          </div>

          {/* Shipper List Table */}
          <div className="lg:col-span-8">
            <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                    <th className="py-3 px-4">Company & Address</th>
                    <th className="py-3 px-4">City / State / Zip</th>
                    <th className="py-3 px-4">Contact Detail</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400 animate-pulse">
                        Loading shippers master list...
                      </td>
                    </tr>
                  ) : shippers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400">
                        No shippers registered in master database. Use the panel on the left or click "Seed Default Presets" to begin.
                      </td>
                    </tr>
                  ) : (
                    shippers.map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{s.companyName}</div>
                          <div className="text-[10px] text-neutral-500">{s.address1}</div>
                          {s.address2 && <div className="text-[10px] text-neutral-400">{s.address2}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-700">{s.city}</div>
                          <div className="text-[10px] text-neutral-500">{s.state || '-'} {s.zipCode ? `(${s.zipCode})` : ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          {s.telephone && (
                            <div className="text-[10px] text-neutral-600">
                              <span className="font-bold">Tel:</span> {s.telephone}
                            </div>
                          )}
                          {s.fax && (
                            <div className="text-[10px] text-neutral-500">
                              <span className="font-bold">Fax:</span> {s.fax}
                            </div>
                          )}
                          {!s.telephone && !s.fax && <span className="text-neutral-400">-</span>}
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingShipper(s);
                              setShipperCompanyName(s.companyName);
                              setShipperAddress1(s.address1);
                              setShipperAddress2(s.address2 || '');
                              setShipperCity(s.city);
                              setShipperState(s.state || '');
                              setShipperZipCode(s.zipCode || '');
                              setShipperTelephone(s.telephone || '');
                              setShipperFax(s.fax || '');
                            }}
                            className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Shipper"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteShipper(s.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Shipper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BANK DETAILS MASTER VIEW */}
      {activeMasterTab === 'bank' && (
        <div className="space-y-6">
          {/* Sub-tabs inside bank master */}
          <div className="flex gap-2 border-b border-neutral-100 pb-3">
            <button
              onClick={() => setBankSubTab('add')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                bankSubTab === 'add'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              Add New
            </button>
            <button
              onClick={() => setBankSubTab('manage')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                bankSubTab === 'manage'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              Manage ({banks.length})
            </button>
          </div>

          {bankSubTab === 'add' ? (
            <div className="max-w-4xl bg-neutral-50 p-6 rounded-2xl border border-neutral-150">
              <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-6 flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="flex items-center gap-1.5">
                  {editingBank ? <Edit2 className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                  {editingBank ? 'Edit Bank Account Master Record' : 'Add Bank Account Master Record'}
                </span>
                {editingBank && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(null);
                      setBankTitle('');
                      setFormBankName('');
                      setBankBranchName('');
                      setBankAccountName('');
                      setBankAccountNumber('');
                      setBankSwiftCode('');
                      setBankAddress('');
                      setBankShipperId('');
                      setBankIban('');
                      setBankOptionDisplay(true);
                    }}
                    className="text-[10px] text-neutral-500 hover:text-red-600 font-bold uppercase tracking-wider"
                  >
                    Cancel Edit
                  </button>
                )}
              </h4>
              <form onSubmit={editingBank ? handleUpdateBank : handleAddBank} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="Title"
                      value={bankTitle}
                      onChange={(e) => setBankTitle(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  {/* Bank Name* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Bank Name"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Branch* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Branch *</label>
                    <input
                      type="text"
                      required
                      placeholder="Branch Name"
                      value={bankBranchName}
                      onChange={(e) => setBankBranchName(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  {/* A/c Name* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">A/c Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Account Name"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* A/c No* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">A/c No *</label>
                    <input
                      type="text"
                      required
                      placeholder="Account Number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>

                  {/* Swift Code* */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Swift Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="Swift Code"
                      value={bankSwiftCode}
                      onChange={(e) => setBankSwiftCode(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Bank Type</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-1.5 text-xs text-neutral-700 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="bankType"
                          checked={bankType === 'Japan'}
                          onChange={() => setBankType('Japan')}
                          className="text-red-600 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer"
                        />
                          Japan
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-neutral-700 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="bankType"
                          checked={bankType === 'Overseas'}
                          onChange={() => setBankType('Overseas')}
                          className="text-red-600 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer"
                        />
                          Overseas
                      </label>
                    </div>
                  </div>

                  {/* Option Display */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Option Display</label>
                    <label className="flex items-center gap-2 mt-2 text-xs text-neutral-700 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bankOptionDisplay}
                        onChange={(e) => setBankOptionDisplay(e.target.checked)}
                        className="rounded border-neutral-300 text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                      />
                      Yes
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipper */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Shipper</label>
                    <select
                      value={bankShipperId}
                      onChange={(e) => setBankShipperId(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    >
                      <option value="">Select Shipper</option>
                      {shippers.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>

                  {/* IBan */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">IBan</label>
                    <input
                      type="text"
                      placeholder="Iban"
                      value={bankIban}
                      onChange={(e) => setBankIban(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Address</label>
                  <textarea
                    placeholder="Bank Address"
                    value={bankAddress}
                    onChange={(e) => setBankAddress(e.target.value)}
                    rows={2}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-xs uppercase tracking-wider transition-colors"
                  >
                    {editingBank ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(null);
                      setBankTitle('');
                      setFormBankName('');
                      setBankBranchName('');
                      setBankAccountName('');
                      setBankAccountNumber('');
                      setBankSwiftCode('');
                      setBankAddress('');
                      setBankShipperId('');
                      setBankIban('');
                      setBankOptionDisplay(true);
                    }}
                    className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold py-2 px-6 rounded text-xs uppercase tracking-wider transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Manage Table View */
            <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                    <th className="py-3 px-4">Title / Bank Name</th>
                    <th className="py-3 px-4">Branch & Swift</th>
                    <th className="py-3 px-4">A/c Name & No.</th>
                    <th className="py-3 px-4">Shipper / Type</th>
                    <th className="py-3 px-4">Iban / Display</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {banks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-neutral-400">
                        No bank accounts registered. Use the "Add New" tab to configure bank accounts.
                      </td>
                    </tr>
                  ) : (
                    banks.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{b.title}</div>
                          <div className="text-[10px] text-neutral-500">{b.bankName}</div>
                          {b.address && <div className="text-[10px] text-neutral-400 max-w-[250px] truncate" title={b.address}>{b.address}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-700">{b.branchName}</div>
                          <div className="text-[10px] text-neutral-500">Swift: <span className="font-mono">{b.swiftCode}</span></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-700">{b.accountName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">No: {b.accountNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-700">{b.shipperCompanyName || '-'}</div>
                          <div className="text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.bankType === 'Japan' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              {b.bankType}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[10px] font-mono text-neutral-600">{b.iban || '-'}</div>
                          <div className="text-[10px]">
                            <span className={`font-bold ${b.optionDisplay ? 'text-emerald-600' : 'text-neutral-400'}`}>
                              Display: {b.optionDisplay ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingBank(b);
                              setBankTitle(b.title);
                              setFormBankName(b.bankName);
                              setBankBranchName(b.branchName);
                              setBankAccountName(b.accountName);
                              setBankAccountNumber(b.accountNumber);
                              setBankSwiftCode(b.swiftCode);
                              setBankType(b.bankType);
                              setBankAddress(b.address || '');
                              setBankShipperId(b.shipperId || '');
                              setBankIban(b.iban || '');
                              setBankOptionDisplay(b.optionDisplay);
                              setBankSubTab('add');
                            }}
                            className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Edit Bank Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBank(b.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Bank Details"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TERMS PRESETS VIEW */}
      {activeMasterTab === 'termsPreset' && (
        <div className="space-y-6">
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <h4 className="text-xs font-black uppercase text-neutral-800 mb-3">
              {editingTermsPreset ? 'Edit Terms & Conditions Preset' : 'Add New Terms & Conditions Preset'}
            </h4>
            <form onSubmit={editingTermsPreset ? handleUpdateTermsPreset : handleAddTermsPreset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Terms Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CarChief Dubai"
                    value={termsPresetTitle}
                    onChange={(e) => setTermsPresetTitle(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Display Status *</label>
                  <select
                    value={termsPresetDisplayStatus}
                    onChange={(e) => setTermsPresetDisplayStatus(e.target.value as 'Yes' | 'No')}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="md:col-span-12">
                  <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Terms Description *</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Agreement between Buyer and Seller..."
                    value={termsPresetDescription}
                    onChange={(e) => setTermsPresetDescription(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white font-mono text-[11px] leading-relaxed"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingTermsPreset && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTermsPreset(null);
                      setTermsPresetTitle('');
                      setTermsPresetDisplayStatus('No');
                      setTermsPresetDescription('');
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingTermsPreset ? 'Update Preset' : 'Add Preset'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" disabled className="rounded border-neutral-300 text-red-600 focus:ring-red-500" />
                  </th>
                  <th className="py-3 px-4 uppercase tracking-wider">Terms Title</th>
                  <th className="py-3 px-4 uppercase tracking-wider w-32">Display Status</th>
                  <th className="py-3 px-4 uppercase tracking-wider">Terms Description</th>
                  <th className="py-3 px-4 uppercase tracking-wider text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {termsPresets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-neutral-400">
                      No terms presets configured. Click "Seed Default Presets" above to load defaults.
                    </td>
                  </tr>
                ) : (
                  termsPresets.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <input type="checkbox" disabled className="rounded border-neutral-300 text-red-600 focus:ring-red-500" />
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-900">{t.title}</td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={t.displayStatus === 'Yes' ? 'text-green-600' : 'text-red-600'}>
                          {t.displayStatus || 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 font-mono text-[11px] whitespace-pre-line max-w-[500px] truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="py-3 px-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingTermsPreset(t);
                            setTermsPresetTitle(t.title || '');
                            setTermsPresetDisplayStatus(t.displayStatus || 'No');
                            setTermsPresetDescription(t.description || '');
                          }}
                          className="text-neutral-600 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors inline-flex items-center"
                          title="Edit Preset"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTermsPreset(t.id)}
                          className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
