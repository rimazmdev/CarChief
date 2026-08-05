/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ship, Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw, Layers, DollarSign, Globe, Anchor } from 'lucide-react';
import { CountryMaster, PortMaster, FreightMapping } from '../types';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';

const PRESET_FREIGHT_RATES = [
  { countryName: 'Kenya', portName: 'Mombasa', m3Range: '0-1', costPerM3: 10 },
  { countryName: 'Kenya', portName: 'Mombasa', m3Range: '1-5', costPerM3: 9 },
  { countryName: 'Kenya', portName: 'Mombasa', m3Range: '5-10', costPerM3: 8 },
  { countryName: 'United States', portName: 'Los Angeles', m3Range: '0-1', costPerM3: 12 },
  { countryName: 'United States', portName: 'Los Angeles', m3Range: '1-5', costPerM3: 11 },
  { countryName: 'United States', portName: 'Los Angeles', m3Range: '5-10', costPerM3: 10 },
  { countryName: 'Japan', portName: 'Tokyo', m3Range: '0-1', costPerM3: 8 },
  { countryName: 'Japan', portName: 'Tokyo', m3Range: '1-10', costPerM3: 7 }
];

export default function FreightMappingManager() {
  const [countries, setCountries] = useState<CountryMaster[]>([]);
  const [ports, setPorts] = useState<PortMaster[]>([]);
  const [freightRates, setFreightRates] = useState<FreightMapping[]>([]);

  // Form states
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedPortId, setSelectedPortId] = useState('');
  const [m3Range, setM3Range] = useState('');
  const [costPerM3, setCostPerM3] = useState<number | ''>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load countries, ports, and freight mappings from Firestore (Optimized with Cache)
  useEffect(() => {
    setLoading(true);
    const unsubCountries = firestoreCache.subscribeToCollection('countries', (data) => {
      setCountries(data as CountryMaster[]);
    });

    const unsubPorts = firestoreCache.subscribeToCollection('ports', (data) => {
      setPorts(data as PortMaster[]);
    });

    const unsubRates = firestoreCache.subscribeToCollection('freightRates', (data) => {
      setFreightRates(data as FreightMapping[]);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching freight rates:", err);
      setError("Failed to load freight rates. Please try again.");
      setLoading(false);
    });

    return () => {
      unsubCountries();
      unsubPorts();
      unsubRates();
    };
  }, []);

  // Filtered ports based on selected country
  const filteredPorts = ports.filter(p => p.countryId === selectedCountryId);

  // Seed default freight presets
  const handleSeedFreightPresets = async () => {
    try {
      setLoading(true);
      setError(null);

      if (countries.length === 0 || ports.length === 0) {
        setError("Please make sure countries and ports are seeded in 'Admin Master Controls' tab first!");
        return;
      }

      const existingRatesSnap = await getDocs(collection(db, 'freightRates'));
      if (!existingRatesSnap.empty) {
        setError("Freight mappings are already populated.");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      for (const p of PRESET_FREIGHT_RATES) {
        const matchedCountry = countries.find(c => c.name.toLowerCase() === p.countryName.toLowerCase());
        const matchedPort = ports.find(pt => pt.name.toLowerCase() === p.portName.toLowerCase() && pt.countryName.toLowerCase() === p.countryName.toLowerCase());

        if (matchedCountry && matchedPort) {
          const docRef = doc(collection(db, 'freightRates'));
          batch.set(docRef, {
            countryId: matchedCountry.id,
            countryName: matchedCountry.name,
            portId: matchedPort.id,
            portName: matchedPort.name,
            m3Range: p.m3Range,
            costPerM3: p.costPerM3
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        setSuccess(`Successfully seeded ${count} default freight mappings!`);
      } else {
        setError("Could not map presets to existing countries/ports. Check if 'Admin Master Controls' presets are seeded first.");
      }
    } catch (err) {
      console.error("Error seeding freight mappings:", err);
      setError("Failed to seed default freight mappings.");
    } finally {
      setLoading(false);
    }
  };

  // Add Freight Mapping Rate
  const handleAddFreightRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountryId || !selectedPortId || !m3Range.trim() || costPerM3 === '') return;

    const matchedCountry = countries.find(c => c.id === selectedCountryId);
    const matchedPort = ports.find(p => p.id === selectedPortId);

    if (!matchedCountry || !matchedPort) {
      setError("Invalid Country or Port selection.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Prevent exact range duplicate for same country-port
      const exists = freightRates.some(r => 
        r.countryId === selectedCountryId && 
        r.portId === selectedPortId && 
        r.m3Range.trim().toLowerCase() === m3Range.trim().toLowerCase()
      );

      if (exists) {
        setError("A mapping with this exact M3 range already exists for this Country-Port combination.");
        return;
      }

      await addDoc(collection(db, 'freightRates'), {
        countryId: selectedCountryId,
        countryName: matchedCountry.name,
        portId: selectedPortId,
        portName: matchedPort.name,
        m3Range: m3Range.trim(),
        costPerM3: Number(costPerM3)
      });

      firestoreCache.invalidate('freightRates');
      setM3Range('');
      setCostPerM3('');
      setSuccess("Freight calculation mapping successfully added!");
    } catch (err) {
      console.error("Error adding freight rate:", err);
      setError("Failed to save freight calculation mapping.");
    }
  };

  // Delete Freight Mapping Rate
  const handleDeleteFreightRate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this freight calculation mapping?")) return;
    try {
      setError(null);
      await deleteDoc(doc(db, 'freightRates', id));
      firestoreCache.invalidate('freightRates');
      setSuccess("Freight mapping removed successfully.");
    } catch (err) {
      console.error("Error deleting freight rate:", err);
      setError("Failed to delete freight rate.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6" id="freight-mapping-manager-dashboard">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-1 flex items-center gap-2">
            <Ship className="text-red-600 w-4.5 h-4.5 stroke-[2]" />
            Freight Calculator mapping
          </h3>
          <p className="text-xs text-neutral-500">
            Define Cubic Meter (M3) ranges and cost rules mapped to Country/Port combinations for automatic freight quotes
          </p>
        </div>

        {/* Preset seed button if mappings are empty */}
        {freightRates.length === 0 && (
          <button
            onClick={handleSeedFreightPresets}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors animate-pulse"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Seed Freight Mappings
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Add M3 Mapping Form */}
        <div className="lg:col-span-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-150">
          <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 mb-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-red-600" />
            Add Freight Mapping
          </h4>
          <form onSubmit={handleAddFreightRate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Select Country *</label>
              <select
                required
                value={selectedCountryId}
                onChange={(e) => {
                  setSelectedCountryId(e.target.value);
                  setSelectedPortId('');
                }}
                className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
              >
                <option value="">-- Choose Country --</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Select Port *</label>
              <select
                required
                value={selectedPortId}
                disabled={!selectedCountryId}
                onChange={(e) => setSelectedPortId(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white disabled:opacity-50"
              >
                <option value="">-- Choose Port --</option>
                {filteredPorts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedCountryId && filteredPorts.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No ports found for this country. Please add them in Master Controls tab first.</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">M3 Range *</label>
              <input
                type="text"
                required
                placeholder="e.g. 0-1, 1-5, 5-10"
                value={m3Range}
                onChange={(e) => setM3Range(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded p-2 focus:outline-none focus:border-red-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Cost for 1M3 (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-400 text-xs">$</span>
                <input
                  type="number"
                  required
                  min={0.1}
                  step={0.01}
                  placeholder="e.g. 10.00"
                  value={costPerM3}
                  onChange={(e) => setCostPerM3(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="w-full text-xs border border-neutral-200 rounded p-2 pl-6 focus:outline-none focus:border-red-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedCountryId || !selectedPortId || countries.length === 0}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 px-4 rounded-lg uppercase tracking-wider text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Freight Cost Range
            </button>
          </form>
        </div>

        {/* Freight Mapping List Table */}
        <div className="lg:col-span-8">
          <div className="border border-neutral-100 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs min-w-[500px]">
              <thead>
                <tr className="bg-neutral-50 text-neutral-400 font-mono text-[10px] uppercase font-bold border-b border-neutral-150">
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Port</th>
                  <th className="py-3 px-4">M3 Range</th>
                  <th className="py-3 px-4">Cost for 1M3</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-neutral-400 animate-pulse">
                      Loading mapping records...
                    </td>
                  </tr>
                ) : freightRates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-neutral-400">
                      No freight mappings found. Select Country, Port, specify M3 Range and Cost to create new mappings.
                    </td>
                  </tr>
                ) : (
                  freightRates.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-neutral-400" />
                          {r.countryName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-700 flex items-center gap-1">
                          <Anchor className="w-3.5 h-3.5 text-neutral-400" />
                          {r.portName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-neutral-600 bg-neutral-50/50">
                        {r.m3Range}
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-900 text-[13px]">
                        ${r.costPerM3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteFreightRate(r.id)}
                          className="text-red-600 hover:text-white hover:bg-red-600 p-1.5 rounded-lg transition-colors inline-flex items-center"
                          title="Delete Freight Mapping"
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
    </div>
  );
}
