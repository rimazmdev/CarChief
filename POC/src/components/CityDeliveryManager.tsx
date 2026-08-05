/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw, Layers, DollarSign, MapPin, Anchor } from 'lucide-react';
import { PortMaster, CityDeliveryRate } from '../types';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { firestoreCache } from '../lib/firestoreCache';

const PRESET_CITY_DELIVERIES = [
  { portName: 'Mombasa', destinationCity: 'Nairobi', m3Range: '0-999', costPerM3: 35, duration: '20-30 Days' },
  { portName: 'Mombasa', destinationCity: 'Kampala', m3Range: '0-999', costPerM3: 55, duration: '22-32 Days' },
  { portName: 'Mombasa', destinationCity: 'Kigali', m3Range: '0-999', costPerM3: 75, duration: '24-34 Days' }
];

export default function CityDeliveryManager() {
  const [ports, setPorts] = useState<PortMaster[]>([]);
  const [rates, setRates] = useState<CityDeliveryRate[]>([]);

  // Form states
  const [selectedPortId, setSelectedPortId] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [m3Range, setM3Range] = useState('0-999');
  const [costPerM3, setCostPerM3] = useState<number | ''>('');
  const [duration, setDuration] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load ports and city delivery rates from Firestore (Optimized with Cache)
  useEffect(() => {
    setLoading(true);

    const unsubPorts = firestoreCache.subscribeToCollection('ports', (data) => {
      const sorted = [...data] as PortMaster[];
      // Sort alphabetically
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      setPorts(sorted);
    });

    const unsubRates = firestoreCache.subscribeToCollection('cityDeliveryRates', (data) => {
      setRates(data as CityDeliveryRate[]);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching city delivery rates:", err);
      setError("Failed to load city delivery rates. Please try again.");
      setLoading(false);
    });

    return () => {
      unsubPorts();
      unsubRates();
    };
  }, []);

  // Seed default presets
  const handleSeedPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (ports.length === 0) {
        setError("Please make sure ports are seeded in 'Admin Master Controls' first!");
        return;
      }

      const existingRatesSnap = await getDocs(collection(db, 'cityDeliveryRates'));
      if (!existingRatesSnap.empty) {
        setError("City delivery rates are already populated.");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      for (const p of PRESET_CITY_DELIVERIES) {
        const matchedPort = ports.find(pt => pt.name.toLowerCase().includes(p.portName.toLowerCase()));

        if (matchedPort) {
          const docRef = doc(collection(db, 'cityDeliveryRates'));
          batch.set(docRef, {
            portId: matchedPort.id,
            portName: matchedPort.name,
            destinationCity: p.destinationCity,
            m3Range: p.m3Range,
            costPerM3: p.costPerM3,
            duration: p.duration
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        setSuccess(`Successfully seeded ${count} default city delivery rates!`);
      } else {
        setError("Could not match Mombasa port to any existing ports in the master. Please ensure Mombasa Port is configured under Core Config.");
      }
    } catch (err) {
      console.error("Error seeding city delivery rates:", err);
      setError("Failed to seed city delivery rates.");
    } finally {
      setLoading(false);
    }
  };

  // Add City Delivery Rate
  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortId || !destinationCity.trim() || !m3Range.trim() || costPerM3 === '') return;

    const matchedPort = ports.find(p => p.id === selectedPortId);

    if (!matchedPort) {
      setError("Invalid Port selection.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Prevent duplicate port + city + m3Range
      const exists = rates.some(r => 
        r.portId === selectedPortId && 
        r.destinationCity.trim().toLowerCase() === destinationCity.trim().toLowerCase() &&
        r.m3Range.trim().toLowerCase() === m3Range.trim().toLowerCase()
      );

      if (exists) {
        setError("A mapping with this destination and M3 range already exists for this port.");
        return;
      }

      await addDoc(collection(db, 'cityDeliveryRates'), {
        portId: selectedPortId,
        portName: matchedPort.name,
        destinationCity: destinationCity.trim(),
        m3Range: m3Range.trim(),
        costPerM3: Number(costPerM3),
        duration: duration.trim() || '20-30 Days'
      });

      firestoreCache.invalidate('cityDeliveryRates');
      setSuccess(`Successfully added city delivery cost mapping for ${destinationCity}!`);
      setDestinationCity('');
      setCostPerM3('');
      setDuration('');
    } catch (err) {
      console.error("Error adding city delivery rate:", err);
      setError("Failed to save city delivery rate.");
    }
  };

  // Delete City Delivery Rate
  const handleDeleteRate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this city delivery mapping?")) return;
    try {
      setError(null);
      setSuccess(null);
      await deleteDoc(doc(db, 'cityDeliveryRates', id));
      firestoreCache.invalidate('cityDeliveryRates');
      setSuccess("Successfully deleted city delivery mapping.");
    } catch (err) {
      console.error("Error deleting city delivery rate:", err);
      setError("Failed to delete mapping.");
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold flex items-center gap-2 text-red-500">
            <Truck className="w-5 h-5" />
            Inland City Delivery Master
          </h2>
          <p className="text-xs text-neutral-400">
            Configure rates for inland city delivery options linked to destination ports based on cubic meters (m³).
          </p>
        </div>
        {rates.length === 0 && (
          <button
            onClick={handleSeedPresets}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-neutral-700"
          >
            <RefreshCw className="w-4 h-4 text-red-500" />
            Seed Presets (Nairobi, Kampala, Kigali)
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span className="text-xs text-red-200 font-medium leading-relaxed">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-950/40 border border-green-900/60 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <span className="text-xs text-green-200 font-medium leading-relaxed">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create / Add Rate Form */}
        <div className="lg:col-span-1 bg-neutral-950/50 p-5 rounded-2xl border border-neutral-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-500" />
            Add New Rate Mapping
          </h3>

          <form onSubmit={handleAddRate} className="space-y-4">
            {/* Arrival Port */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Departure/Arrival Port <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                required
                value={selectedPortId}
                onChange={(e) => setSelectedPortId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600"
              >
                <option value="">-- Select Port --</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.countryName})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination City */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Inland Destination City <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="e.g. Nairobi, Kampala"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>

            {/* M3 Range */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Cubic Meter (M3) Range <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={m3Range}
                onChange={(e) => setM3Range(e.target.value)}
                placeholder="e.g. 0-999 or 0-10, 10-20"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
              />
            </div>

            {/* Cost per M3 */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Cost Per 1 m³ (USD) <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-neutral-500 text-xs">$</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={costPerM3}
                  onChange={(e) => setCostPerM3(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 35"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 pl-7 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                />
              </div>
            </div>

            {/* Shipment Duration */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Shipment Duration / Transit Time
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 20-30 Days (additional 2-4 days)"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs uppercase font-bold tracking-wider py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Save Mapping Rate
            </button>
          </form>
        </div>

        {/* Right Side: Rates Listing Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" />
            Configured Rates ({rates.length})
          </h3>

          {loading ? (
            <div className="py-20 text-center flex flex-col justify-center items-center gap-2 border border-neutral-800 rounded-2xl bg-neutral-950/20">
              <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
              <span className="text-xs text-neutral-400 font-mono">Loading mappings from Firestore...</span>
            </div>
          ) : rates.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col justify-center items-center gap-3">
              <MapPin className="w-10 h-10 text-neutral-600" />
              <p className="text-xs text-neutral-400">No city delivery mappings found in database.</p>
              <button
                onClick={handleSeedPresets}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-neutral-700 text-white"
              >
                Seed Default Rates
              </button>
            </div>
          ) : (
            <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900 text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-semibold text-[10px]">Port</th>
                      <th className="py-3.5 px-4 font-semibold text-[10px]">Destination City</th>
                      <th className="py-3.5 px-4 font-semibold text-[10px]">M3 Range</th>
                      <th className="py-3.5 px-4 font-semibold text-[10px] text-right">Cost Per 1 m³</th>
                      <th className="py-3.5 px-4 font-semibold text-[10px]">Transit</th>
                      <th className="py-3.5 px-4 font-semibold text-[10px] text-center w-[10%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-200">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="py-3.5 px-4 flex items-center gap-1.5 font-medium">
                          <Anchor className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>{rate.portName}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            {rate.destinationCity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-400">
                          {rate.m3Range}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400">
                          ${rate.costPerM3.toLocaleString()} USD
                        </td>
                        <td className="py-3.5 px-4 text-neutral-400 font-medium">
                          {rate.duration || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteRate(rate.id)}
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-red-500 transition-all cursor-pointer"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
