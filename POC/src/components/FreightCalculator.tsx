/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { Globe, Anchor, ShieldCheck, Check, Info, HelpCircle, Loader, DollarSign, Calendar } from 'lucide-react';
import { Vehicle, CountryMaster, PortMaster, FreightMapping, CityDeliveryRate } from '../types';
import { db } from '../firebase';
import { firestoreCache } from '../lib/firestoreCache';
import { CustomerPortalContext } from '../customer/contexts/CustomerPortalContext';
import { getTierDiscountPercentage, getDiscountedPrice } from '../utils/pricing';

interface FreightCalculatorProps {
  vehicle?: Vehicle; // Optional: If loaded from a specific vehicle
  onSubmitLead?: (leadData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
    freightDetails: {
      destination: string;
      shippingMethod: string;
      estimatedCost: number;
    };
  }) => void;
}

export default function FreightCalculator({ vehicle, onSubmitLead }: FreightCalculatorProps) {
  // Database states
  const [countries, setCountries] = useState<CountryMaster[]>([]);
  const [ports, setPorts] = useState<PortMaster[]>([]);
  const [freightRates, setFreightRates] = useState<FreightMapping[]>([]);
  const [cityRates, setCityRates] = useState<CityDeliveryRate[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Form selections
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [selectedCityRateId, setSelectedCityRateId] = useState<string | null>(null);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(false);

  // Modal / lead states
  const [showPayModal, setShowPayModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Countries, Ports, and Freight Rates from Firestore (Optimized with Cache)
  useEffect(() => {
    setDbLoading(true);
    
    const unsubCountries = firestoreCache.subscribeToCollection('countries', (data) => {
      const sorted = [...data] as CountryMaster[];
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      setCountries(sorted);
    });

    const unsubPorts = firestoreCache.subscribeToCollection('ports', (data) => {
      setPorts(data as PortMaster[]);
    });

    const unsubRates = firestoreCache.subscribeToCollection('freightRates', (data) => {
      setFreightRates(data as FreightMapping[]);
    });

    const unsubCityRates = firestoreCache.subscribeToCollection('cityDeliveryRates', (data) => {
      setCityRates(data as CityDeliveryRate[]);
      setDbLoading(false);
    }, (err) => {
      console.error("Error loading city delivery rates:", err);
      setDbLoading(false);
    });

    return () => {
      unsubCountries();
      unsubPorts();
      unsubRates();
      unsubCityRates();
    };
  }, []);

  // 2. Calculate Vehicle M3 Size
  const calculateVehicleM3 = (): number => {
    if (vehicle) {
      // Prioritize the direct m3 field from the database
      if (vehicle.m3 !== undefined && vehicle.m3 !== null && String(vehicle.m3).trim() !== '') {
        const val = parseFloat(String(vehicle.m3));
        if (!isNaN(val) && val > 0) {
          return val;
        }
      }
      // Calculate from length, width, height if direct m3 is not provided or is empty/invalid
      if (vehicle.vehicleLength && vehicle.vehicleWidth && vehicle.vehicleHeight) {
        const l = parseFloat(String(vehicle.vehicleLength));
        const w = parseFloat(String(vehicle.vehicleWidth));
        const h = parseFloat(String(vehicle.vehicleHeight));
        if (!isNaN(l) && !isNaN(w) && !isNaN(h) && l > 0 && w > 0 && h > 0) {
          // formula: (L * W * H in mm) / 1,000,000,000 to get cubic meters (m³)
          return Number(((l / 1000) * (w / 1000) * (h / 1000)).toFixed(2));
        }
      }
    }
    // Fallback exactly as shown in screenshot or a robust average
    return 16.56;
  };

  const vehicleM3 = calculateVehicleM3();

  // Filter ports based on selected country
  const countryPorts = ports.filter(p => p.countryId === selectedCountryId);

  // 3. Robust M3 Range Matcher
  const matchM3Range = (m3: number, rangeStr: string): boolean => {
    const cleanRange = rangeStr.replace(/\s+/g, '');
    
    // Check for "min+" (e.g. "10+")
    if (cleanRange.endsWith('+')) {
      const minVal = parseFloat(cleanRange.slice(0, -1));
      return !isNaN(minVal) && m3 >= minVal;
    }
    
    // Check for "min-max" (e.g. "0-1", "1-5", "5-10")
    const parts = cleanRange.split('-');
    if (parts.length === 2) {
      const minVal = parseFloat(parts[0]);
      const maxVal = parseFloat(parts[1]);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return m3 >= minVal && m3 <= maxVal;
      }
    }
    
    return false;
  };

  // Get transit time estimates based on port name
  const getShipmentDuration = (portName: string): string => {
    const name = portName.toLowerCase();
    if (name.includes('mombasa')) return '18-28 Days';
    if (name.includes('hambantota')) return '14-26 Days';
    if (name.includes('colombo')) return '14-24 Days';
    if (name.includes('los angeles')) return '12-20 Days';
    if (name.includes('rotterdam')) return '22-35 Days';
    if (name.includes('tokyo')) return '7-14 Days';
    if (name.includes('sydney')) return '10-18 Days';
    if (name.includes('hamburg')) return '22-35 Days';
    if (name.includes('singapore')) return '5-12 Days';
    if (name.includes('dubai')) return '14-22 Days';
    return '15-30 Days';
  };

  // 4. Mapped ports with computed prices
  const mappedPortsWithCosts = countryPorts.map(port => {
    // Find all freight mapping rates for this country and port
    const portRates = freightRates.filter(r => r.countryId === selectedCountryId && r.portId === port.id);
    
    // Find rate that matches the vehicle M3
    const matchedRate = portRates.find(r => matchM3Range(vehicleM3, r.m3Range));
    
    const duration = getShipmentDuration(port.name);

    if (matchedRate) {
      const costPerM3 = matchedRate.costPerM3;
      const freightCost = Math.round(costPerM3 * vehicleM3);
      return {
        port,
        hasRate: true,
        freightCost,
        duration,
        costPerM3
      };
    }

    return {
      port,
      hasRate: false,
      freightCost: 0,
      duration: '',
      costPerM3: 0
    };
  });

  // Auto-select the first mapped port with a rate, or just first port
  useEffect(() => {
    if (mappedPortsWithCosts.length > 0) {
      const active = mappedPortsWithCosts.find(p => p.hasRate);
      if (active) {
        setSelectedPortId(active.port.id);
        setSelectedCityRateId(null);
      } else {
        setSelectedPortId(mappedPortsWithCosts[0].port.id);
        setSelectedCityRateId(null);
      }
    } else {
      setSelectedPortId('');
      setSelectedCityRateId(null);
    }
  }, [selectedCountryId, freightRates, ports]);

  // Selected row interaction
  const handleSelectRow = (portId: string, cityRateId: string | null) => {
    setSelectedPortId(portId);
    setSelectedCityRateId(cityRateId);
  };

  // Selected port calculation
  const context = useContext(CustomerPortalContext);
  const customerTier = context?.customerTier || null;
  const discountPercent = vehicle ? getTierDiscountPercentage(customerTier, vehicle) : 0;

  const baseVehiclePrice = vehicle?.price || 0;
  const discountedVehiclePrice = vehicle ? getDiscountedPrice(baseVehiclePrice, discountPercent) : 0;

  const selectedPortData = mappedPortsWithCosts.find(p => p.port.id === selectedPortId);
  const hasRateSet = !!(selectedPortData && selectedPortData.hasRate);
  const freightCost = hasRateSet ? (selectedPortData?.freightCost || 0) : 0;

  // Selected city cost
  const selectedCityRate = cityRates.find(cr => cr.id === selectedCityRateId);
  const cityDeliveryCost = selectedCityRate ? Math.round(selectedCityRate.costPerM3 * vehicleM3) : 0;

  const insuranceCost = includeInsurance ? Math.max(150, Math.round(discountedVehiclePrice * 0.0035)) : 0;
  const finalPrice = discountedVehiclePrice + freightCost + cityDeliveryCost + insuranceCost;

  const handlePayPalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custEmail) return;

    if (onSubmitLead) {
      const methodLabel = selectedCityRateId
        ? `Inland City Delivery to ${selectedCityRate?.destinationCity} (via ${selectedPortData?.port.name})`
        : (includeInsurance ? 'CIF (Cost, Insurance & Freight)' : 'C&F (Cost & Freight)');

      const additionalMessage = selectedCityRateId
        ? `Includes City Delivery Cost: $${cityDeliveryCost.toLocaleString()} USD.`
        : '';

      onSubmitLead({
        customerName: custName,
        customerEmail: custEmail,
        customerPhone: custPhone,
        message: `Customer initiated booking checkout via PayPal for ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}. Method: ${methodLabel}. Selected Total Price: ${hasRateSet ? `$${finalPrice.toLocaleString()} USD` : 'ASK'}. ${additionalMessage}`,
        freightDetails: {
          destination: selectedCityRateId
            ? `${selectedCityRate?.destinationCity}, ${countries.find(c => c.id === selectedCountryId)?.name || ''}`
            : `${selectedPortData?.port.name || 'Unknown'}, ${countries.find(c => c.id === selectedCountryId)?.name || ''}`,
          shippingMethod: methodLabel,
          estimatedCost: hasRateSet ? (freightCost + cityDeliveryCost + insuranceCost) : 0
        }
      });
    }

    setSuccessMsg('Booking submission sent! Redirecting to secure sandbox checkout portal...');
    setTimeout(() => {
      setShowPayModal(false);
      setSuccessMsg('');
      setCustName('');
      setCustEmail('');
      setCustPhone('');
    }, 4000);
  };

  return (
    <div className="bg-[#f4f4f4] border border-neutral-200 rounded-lg p-6 shadow-sm font-sans" id="cif-calculator-container">
      {/* Title block strictly matching screenshot */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#d31111] uppercase">
          CIF Calculator
        </h2>
        <div className="w-16 h-1 bg-[#d31111] mt-1"></div>
      </div>

      {dbLoading ? (
        <div className="py-12 text-center flex flex-col justify-center items-center gap-2">
          <Loader className="w-6 h-6 text-[#d31111] animate-spin" />
          <span className="text-xs text-neutral-400 font-mono">Loading dynamic master rates...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Country Selection Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="final-country-select" className="block text-xs font-semibold text-neutral-800 mb-1">
                Choose Final Country<span className="text-[#d31111] font-bold">*</span>
              </label>
              <select
                id="final-country-select"
                value={selectedCountryId}
                onChange={(e) => setSelectedCountryId(e.target.value)}
                className="w-full text-sm border-2 border-neutral-800 rounded-md p-2 bg-white font-medium focus:outline-none"
              >
                <option value="">-- Select Destination --</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-[#d31111] leading-relaxed font-semibold md:mt-5">
                Please select the country where your vehicle(s) will be shipped.
              </p>
            </div>
          </div>
          {/* Calculator Table & Options displayed only after selecting country */}
          {selectedCountryId && (() => {
            // Generate all flat table rows including ports and city sub-rows
            const tableRows = mappedPortsWithCosts.flatMap(({ port, hasRate, freightCost, duration }) => {
              const list = [];
              
              // Main Port Row
              list.push({
                type: 'port',
                id: port.id,
                portId: port.id,
                cityRateId: null,
                name: port.name,
                hasRate,
                logisticsCost: freightCost,
                duration,
                isSubRow: false,
              });

              // Associated Inland City Delivery Rows
              if (hasRate) {
                const matchedCityRates = cityRates.filter(cr => cr.portId === port.id && matchM3Range(vehicleM3, cr.m3Range));
                matchedCityRates.forEach(cr => {
                  const cityCost = Math.round(cr.costPerM3 * vehicleM3);
                  list.push({
                    type: 'city',
                    id: cr.id,
                    portId: port.id,
                    cityRateId: cr.id,
                    name: cr.destinationCity,
                    hasRate: true,
                    logisticsCost: freightCost + cityCost,
                    duration: cr.duration || 'Contact Agent',
                    isSubRow: true,
                  });
                });
              }

              return list;
            });

            return (
              <>
                {/* Calculator Table */}
                <div className="border border-neutral-300 rounded-none overflow-hidden bg-white mt-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      {/* Spanned Header displaying M3 size */}
                      <tr className="bg-neutral-50 border-b border-neutral-300">
                        <th colSpan={3} className="py-2.5 px-4 font-sans font-bold text-neutral-700 text-xs text-center border-b border-neutral-300">
                          M3 Size (LxWxH) : <span className="text-neutral-900 font-extrabold">{vehicleM3} m³</span>
                        </th>
                      </tr>
                      <tr className="bg-white text-neutral-900 font-bold text-xs border-b border-neutral-300">
                        <th className="py-2 px-4 w-[35%] text-left border-r border-neutral-300 uppercase">Arrival Port</th>
                        <th className="py-2 px-4 w-[45%] text-left border-r border-neutral-300 uppercase">SHIPMENT DURATION AFTER DEPARTURE</th>
                        <th className="py-2 px-4 w-[20%] text-center uppercase">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-300">
                      {tableRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-neutral-400 font-mono text-[10px]">
                            No mapped arrival ports or freight rates found for this country.
                          </td>
                        </tr>
                      ) : (
                        tableRows.map((row) => {
                          const isSelected = selectedPortId === row.portId && selectedCityRateId === row.cityRateId;
                          return (
                            <tr 
                              key={row.type + '-' + row.id} 
                              onClick={() => handleSelectRow(row.portId, row.cityRateId)}
                              className={`cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-neutral-50 font-semibold text-neutral-900' 
                                  : 'hover:bg-neutral-50/55 text-neutral-800'
                              } ${row.isSubRow ? 'bg-neutral-50/20' : ''}`}
                            >
                              <td className="py-2.5 px-4 border-r border-neutral-300 flex items-center gap-2">
                                <div className={`flex items-center gap-2 ${row.isSubRow ? 'pl-5' : ''}`}>
                                  <input
                                    type="radio"
                                    name="arrivalPort"
                                    checked={isSelected}
                                    onChange={() => handleSelectRow(row.portId, row.cityRateId)}
                                    className="text-[#d31111] focus:ring-[#d31111] w-4 h-4"
                                  />
                                  {row.isSubRow ? (
                                    <span className="flex items-center gap-1.5 text-neutral-700">
                                      <span className="text-neutral-400 text-[10px]">↳</span>
                                      <span className="font-bold text-neutral-800 text-xs capitalize">{row.name}</span>
                                      <span className="text-[9px] text-[#d31111] bg-red-50 px-1 py-0.5 rounded border border-red-100 uppercase tracking-tight font-sans font-semibold">City Delivery</span>
                                    </span>
                                  ) : (
                                    <span className="font-sans text-xs text-neutral-900 font-bold">{row.name}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 border-r border-neutral-300 text-neutral-700 text-xs font-medium">
                                {row.hasRate ? row.duration : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-xs text-[#d31111]">
                                {row.hasRate ? (
                                  <div className="flex flex-col items-center leading-tight">
                                    <span>{row.logisticsCost.toLocaleString()} USD</span>
                                    <span className="text-[9px] text-neutral-500 font-normal">
                                      Total: ${(discountedVehiclePrice + row.logisticsCost).toLocaleString()} USD
                                    </span>
                                  </div>
                                ) : (
                                  <span>ASK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Additional Options */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-base font-bold text-[#d31111] uppercase tracking-wide">
                    Additional Options
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <input
                      type="checkbox"
                      checked={includeInsurance}
                      onChange={(e) => setIncludeInsurance(e.target.checked)}
                      className="rounded border-neutral-400 text-[#d31111] focus:ring-[#d31111] w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-neutral-700">
                      Insurance {includeInsurance && <span className="text-xs text-neutral-500 font-normal">(${Math.max(150, Math.round(discountedVehiclePrice * 0.0035))} USD)</span>}
                    </span>
                  </label>
                </div>

                {/* Action Row - Pay with Paypal & Price Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => setShowPayModal(true)}
                    disabled={!selectedPortId}
                    className="w-full sm:w-auto bg-[#d31111] hover:bg-[#b00e0e] text-white font-bold px-6 py-3 rounded-none text-sm uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    Pay With PayPal
                  </button>
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-800 uppercase">
                        {selectedCityRateId ? 'C&F + Inland' : (includeInsurance ? 'CIF' : 'C&F')}:
                      </span>
                      <span className="text-2xl font-black text-[#d31111]">
                        {hasRateSet ? `${finalPrice.toLocaleString()} USD` : 'ASK'}
                      </span>
                    </div>
                    {discountPercent > 0 && (
                      <span className="text-[10px] text-green-600 font-bold tracking-tight">
                        Includes {discountPercent}% Customer Discount (Vehicle: ${discountedVehiclePrice.toLocaleString()} USD)
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Secure PayPal Booking Form
              </h4>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {successMsg ? (
              <div className="bg-green-50 text-green-800 text-xs p-4 rounded-xl border border-green-200 text-center font-semibold space-y-2">
                <Check className="w-6 h-6 text-green-600 mx-auto" />
                <p>{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handlePayPalSubmit} className="space-y-4">
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  You are reserving the <b>{vehicle?.year} {vehicle?.make} {vehicle?.model}</b> shipped via <b>{selectedPortData?.port.name}</b>. 
                  Please enter your contact details to generate the secure sandbox PayPal gateway.
                </p>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase font-mono">Full Name*</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase font-mono">Email Address*</label>
                  <input
                    type="email"
                    required
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase font-mono">Phone Number</label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-[#f4f4f4]"
                  />
                </div>

                <div className="bg-neutral-50 border border-neutral-200/80 p-3.5 rounded-xl text-xs space-y-1 text-neutral-700">
                  <div className="flex justify-between font-medium">
                    <span>Vehicle FOB Price:</span>
                    {discountPercent > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="line-through text-neutral-400 text-[10px]">${baseVehiclePrice.toLocaleString()} USD</span>
                        <span className="font-bold text-green-600">${discountedVehiclePrice.toLocaleString()} USD</span>
                      </div>
                    ) : (
                      <span>${baseVehiclePrice.toLocaleString()} USD</span>
                    )}
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Ocean Freight Cost:</span>
                    <span>{hasRateSet ? `$${freightCost.toLocaleString()} USD` : 'ASK'}</span>
                  </div>
                  {selectedCityRate && (
                    <div className="flex justify-between font-medium">
                      <span>Inland City Delivery ({selectedCityRate.destinationCity}):</span>
                      <span>${cityDeliveryCost.toLocaleString()} USD</span>
                    </div>
                  )}
                  {includeInsurance && (
                    <div className="flex justify-between font-medium">
                      <span>Marine Insurance Cost:</span>
                      <span>${insuranceCost.toLocaleString()} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-neutral-200/60 pt-2 font-extrabold text-[#d31111]">
                    <span>Total Amount:</span>
                    <span>{hasRateSet ? `$${finalPrice.toLocaleString()} USD` : 'ASK'}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#d31111] hover:bg-[#b00e0e] text-white font-bold py-3.5 rounded-none text-xs uppercase tracking-wider transition-all"
                >
                  Generate PayPal Invoice
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
