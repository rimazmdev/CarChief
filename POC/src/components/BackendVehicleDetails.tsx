/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, ShieldCheck, Info, Coins, Truck, Anchor, HelpCircle, 
  ChevronLeft, ChevronRight, Share2, Printer, MapPin, CheckCircle, 
  Wrench, Activity, AlertCircle, FileText, ClipboardList, Eye, EyeOff, Camera
} from 'lucide-react';
import { Vehicle } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface BackendVehicleDetailsProps {
  vehicle: Vehicle;
  onBack: () => void;
}

export default function BackendVehicleDetails({ vehicle, onBack }: BackendVehicleDetailsProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const [dynamicImages, setDynamicImages] = useState<Record<string, string[]>>({
    auctionPictures: [],
    auctionSheet: [],
    japanPictures: [],
    durbanPictures: []
  });

  useEffect(() => {
    let active = true;
    const fetchImages = async () => {
      try {
        const q = query(collection(db, 'vehicleImages'), where('vehicleId', '==', vehicle.id));
        const snap = await getDocs(q);
        if (!active) return;
        
        if (!snap.empty) {
          const fetched: Record<string, string[]> = {
            auctionPictures: [],
            auctionSheet: [],
            japanPictures: [],
            durbanPictures: []
          };
          
          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const cat = data.category;
            if (fetched[cat]) {
              fetched[cat].push(data.url);
            }
          });
          
          setDynamicImages(fetched);
        } else {
          setDynamicImages({
            auctionPictures: [],
            auctionSheet: [],
            japanPictures: [],
            durbanPictures: []
          });
        }
      } catch (err) {
        console.error("Error fetching high quality images inside backend details:", err);
      }
    };
    
    if (vehicle?.id) {
      fetchImages();
    }
    return () => {
      active = false;
    };
  }, [vehicle.id]);

  const staffAllImages = useMemo(() => {
    const list: { url: string; category: string; showOnDetail?: boolean }[] = [];
    
    const auctionPics = dynamicImages.auctionPictures.length > 0 ? dynamicImages.auctionPictures : (vehicle.auctionPictures || []);
    const auctionSheetPics = dynamicImages.auctionSheet.length > 0 ? dynamicImages.auctionSheet : (vehicle.auctionSheet || []);
    const japanPics = dynamicImages.japanPictures.length > 0 ? dynamicImages.japanPictures : (vehicle.japanPictures || []);
    const durbanPics = dynamicImages.durbanPictures.length > 0 ? dynamicImages.durbanPictures : (vehicle.durbanPictures || []);

    if (auctionPics.length > 0) {
      auctionPics.forEach(img => list.push({ url: img, category: 'Auction Picture', showOnDetail: vehicle.showAuctionPictures !== false }));
    }
    if (auctionSheetPics.length > 0) {
      auctionSheetPics.forEach(img => list.push({ url: img, category: 'Auction Sheet', showOnDetail: false }));
    }
    if (japanPics.length > 0) {
      japanPics.forEach(img => list.push({ url: img, category: 'Japan Picture', showOnDetail: vehicle.showJapanPictures !== false }));
    }
    if (durbanPics.length > 0) {
      durbanPics.forEach(img => list.push({ url: img, category: 'Durban Picture', showOnDetail: vehicle.showDurbanPictures !== false }));
    }

    // Fallback if none of the categorized lists exist but `images` does (for legacy vehicles)
    if (list.length === 0 && vehicle.images && vehicle.images.length > 0) {
      vehicle.images.forEach(img => list.push({ url: img, category: 'Auction Picture', showOnDetail: true }));
    }
    return list;
  }, [vehicle, dynamicImages]);

  const nextImage = () => {
    if (staffAllImages.length > 0) {
      setActiveImgIndex((prev) => (prev + 1) % staffAllImages.length);
    }
  };

  const prevImage = () => {
    if (staffAllImages.length > 0) {
      setActiveImgIndex((prev) => (prev - 1 + staffAllImages.length) % staffAllImages.length);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Internal link copied to clipboard! Share it with administrators or dealers.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-600/10 text-green-600 border-green-500/20';
      case 'Pending':
        return 'bg-amber-600/10 text-amber-600 border-amber-500/20';
      case 'Sold':
        return 'bg-red-600/10 text-red-600 border-red-500/20';
      default:
        return 'bg-neutral-600/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const mainImage = staffAllImages.length > 0 
    ? staffAllImages[activeImgIndex]?.url 
    : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80';

  // 1. Pricing and Sourcing Metrics
  const pricingFields = [
    { label: "MSRP Price (USD)", value: vehicle.price ? `$${vehicle.price.toLocaleString()}` : '—', highlight: true },
    { label: "Bottom MSRP Price (BTM)", value: vehicle.bottomPrice || vehicle.btmPrice ? `$${(vehicle.bottomPrice || vehicle.btmPrice)}` : '—' },
    { label: "Silver Tier Price", value: vehicle.silverTierPrice ? `$${vehicle.silverTierPrice}` : '—' },
    { label: "Gold Tier Price", value: vehicle.goldTierPrice ? `$${vehicle.goldTierPrice}` : '—' },
    { label: "Platinum Tier Price", value: vehicle.platinumTierPrice ? `$${vehicle.platinumTierPrice}` : '—' },
    { label: "Price Domestic", value: vehicle.priceDomestic || '—' },
    { label: "Trading Currency", value: vehicle.currency || '—' },
    { label: "Pay Trade Status", value: vehicle.payTrade || '—' },
    { label: "Laying Cost", value: vehicle.layingCost ? `${vehicle.layingCostCurrency || ''} ${vehicle.layingCost}` : '—' },
    { label: "Laying Supplier", value: vehicle.layingSupplier || '—' },
    { label: "Laying Date", value: vehicle.layingDate || '—' },
  ];

  // 2. Registry & Stock Specifications
  const registryFields = [
    { label: "Stock Number", value: vehicle.stkNumber || vehicle.erpStockNo || '—' },
    { label: "Reference No", value: vehicle.referenceNo || '—' },
    { label: "VIN / Serial No", value: vehicle.vinSerialNo || '—' },
    { label: "Model Code", value: vehicle.modelCode || '—' },
    { label: "Chassis / Frame No", value: vehicle.chassis || '—' },
    { label: "Grade / Trim", value: vehicle.gradeTrimDomestic || '—' },
    { label: "Version / Class", value: vehicle.versionClass || '—' },
    { label: "Registration Year", value: vehicle.registerYear || '—' },
    { label: "Manufacture Year", value: vehicle.year || vehicle.mfgYear || '—' },
    { label: "Year Month Spec", value: vehicle.yearMonth || '—' },
    { label: "Title / Certificate", value: vehicle.title || '—' },
    { label: "Engine Code / Spec", value: vehicle.engine || vehicle.engineCode || '—' },
    { label: "Gearbox Type", value: vehicle.transmission || '—' },
    { label: "Fuel Specification", value: vehicle.fuelType || '—' },
    { label: "Steering Position", value: vehicle.steering || '—' },
    { label: "Doors Count", value: vehicle.door || '—' },
  ];

  // 3. Dimensions & Physical Configuration
  const physicalFields = [
    { label: "Exterior paint", value: vehicle.exteriorColor || vehicle.color || '—' },
    { label: "Interior color Spec", value: vehicle.interiorColor || '—' },
    { label: "Vehicle Width (mm)", value: vehicle.vehicleWidth || '—' },
    { label: "Vehicle Length (mm)", value: vehicle.vehicleLength || '—' },
    { label: "Vehicle Height (mm)", value: vehicle.vehicleHeight || '—' },
    { label: "M3 Size", value: vehicle.m3 ? `${vehicle.m3} m³` : '—' },
    { label: "Seats / Passengers", value: vehicle.passengers || '—' },
    { label: "Drive Type Config", value: vehicle.driveType || '—' },
    { label: "Body Style 1", value: vehicle.bodyStyle1 || '—' },
    { label: "Body Style 2", value: vehicle.bodyStyle2 || '—' },
    { label: "Body Type", value: vehicle.bodytype || vehicle.type || '—' },
    { label: "Odometer Mileage", value: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} KM` : '—' },
    { label: "Condition Level", value: vehicle.condition || '—' },
    { label: "Other Options", value: vehicle.otherOptions || '—' },
  ];

  // 4. Logistics, Cargo & Port Tracking
  const logisticsFields = [
    { label: "Country Stock Location", value: vehicle.countryStock || '—' },
    { label: "Yard In Location", value: vehicle.yardIn || '—' },
    { label: "Port Stock Location", value: vehicle.portStock || '—' },
    { label: "Destination Port", value: vehicle.port || '—' },
    { label: "Sourcing Channel", value: vehicle.source || vehicle.dataSource || '—' },
    { label: "Responsible Staff", value: vehicle.staff || '—' },
    { label: "Freight Adjustment", value: vehicle.freightAdjustment || '—' },
    { label: "Estimated Departure (ETD)", value: vehicle.etdDate || '—' },
    { label: "Estimated Arrival (ETA)", value: vehicle.etaDate || '—' },
    { label: "Actual Arrival (ATA)", value: vehicle.ata || '—' },
    { label: "Departure Vessel", value: vehicle.departureVessel || '—' },
    { label: "Departure Voyage", value: vehicle.departureVoyage || '—' },
    { label: "Arrival Vessel", value: vehicle.arrivalVessel || '—' },
    { label: "Arrival Voyage", value: vehicle.arrivalVoyage || '—' },
    { label: "Carrier ETD", value: vehicle.loadEtd || '—' },
    { label: "Carrier ATD", value: vehicle.carrierAtd || '—' },
    { label: "Carrier ETA", value: vehicle.carrierEta || '—' },
    { label: "Booking Date", value: vehicle.bookingDate || '—' },
    { label: "Booking Status (API)", value: vehicle.bookingStatusApi || '—' },
    { label: "Vanning Status", value: vehicle.vanning || '—' },
    { label: "Trip Phase", value: vehicle.tripPhase || '—' },
    { label: "Inspection Date", value: vehicle.inspectionDate || '—' },
    { label: "Inspection Status", value: vehicle.inspectionStatus || '—' },
    { label: "Re-Inspection Date", value: vehicle.reInspectionDate || '—' },
    { label: "Re-Inspection Status", value: vehicle.reInspectionStatus || '—' },
    { label: "Accessories Remark", value: vehicle.accessoriesRemark || '—' },
  ];

  // Parse accessories
  const accessoriesList = vehicle.accessories 
    ? vehicle.accessories.split(/[\s,;]+/).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-neutral-900 pb-24 font-sans text-white selection:bg-red-600 selection:text-white" id="backend-detail-page">
      
      {/* Editorial Page Top Audit Nav Bar */}
      <div className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-red-500 transition-colors py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to ERP Console
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-red-500 bg-red-600/10 border border-red-500/20 px-3 py-1 rounded">
              INTERNAL AUDIT MODE
            </span>
            <button 
              onClick={handleShare}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800"
              title="Copy share link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePrint}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800 print:hidden"
              title="Print spec sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <span className="text-xl font-display font-black tracking-tight text-white uppercase">
              CAR<span className="text-red-500">CHIEF</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Title Header Card */}
        <div className="bg-neutral-950 rounded-2xl p-6 md:p-8 border border-neutral-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-mono font-black tracking-wider text-red-500 bg-red-600/10 px-2 py-0.5 rounded border border-red-500/10">
                {vehicle.make} Database Node
              </span>
              <span className="text-xs font-mono text-neutral-500">REF: {vehicle.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white uppercase">
              {vehicle.model}
            </h1>
            <div className="flex flex-wrap gap-2 text-neutral-400 font-mono text-xs">
              <span className="bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 font-bold uppercase">
                Model Year: {vehicle.year}
              </span>
              <span className="bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 font-bold uppercase">
                Odometer: {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} KM` : '—'}
              </span>
              <span className="bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 font-bold uppercase">
                Type: {vehicle.type || 'Sedan'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 self-start md:self-center border-l md:border-l-2 border-neutral-800 pl-0 md:pl-6">
            <span className="text-[9px] font-mono tracking-wider text-neutral-500 font-bold uppercase block">STOCK RECORD STATUS</span>
            <span className={`text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-lg border ${getStatusStyle(vehicle.status)}`}>
              ● {vehicle.status}
            </span>
          </div>
        </div>

        {/* Audit Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: GALLERY & NARRATIVE (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Gallery Card Container */}
            <div className="bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative group">
              
              {/* Image Viewport */}
              <div className="relative aspect-[16/10] max-h-[300px] w-full flex items-center justify-center overflow-hidden bg-black">
                <img
                  src={mainImage}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-500 ease-out"
                />

                 {staffAllImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-neutral-900 text-white rounded-full border border-neutral-800 transition-colors opacity-0 group-hover:opacity-100 duration-200 shadow-md z-10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-neutral-900 text-white rounded-full border border-neutral-800 transition-colors opacity-0 group-hover:opacity-100 duration-200 shadow-md z-10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Photo Category HUD overlay badge */}
                {staffAllImages.length > 0 && (
                  <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-neutral-800 text-[9px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5 z-10">
                    <Camera className="w-3.5 h-3.5 text-red-500" />
                    <span>{staffAllImages[activeImgIndex]?.category}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    {staffAllImages[activeImgIndex]?.showOnDetail ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <Eye className="w-3 h-3 inline" /> Shown on Detail Page
                      </span>
                    ) : (
                      <span className="text-neutral-500 flex items-center gap-1">
                        <EyeOff className="w-3 h-3 inline" /> Staff Only / Hidden
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-Image Thumbnails Bar */}
              {staffAllImages.length > 1 && (
                <div className="bg-black/90 border-t border-neutral-800 p-3 flex gap-2 overflow-x-auto scrollbar-thin">
                  {staffAllImages.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`relative w-16 aspect-[16/10] rounded overflow-hidden flex-shrink-0 transition-all ${
                        activeImgIndex === idx 
                          ? 'ring-2 ring-red-500 opacity-100 scale-95 shadow-md shadow-red-500/20' 
                          : 'opacity-40 hover:opacity-80'
                      }`}
                    >
                      <img src={item.url} alt="thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {/* overlay category snippet */}
                      <span className="absolute bottom-0 inset-x-0 bg-neutral-950/85 text-[7px] text-neutral-300 py-0.5 text-center truncate font-mono tracking-tighter">
                        {item.category === 'Auction Picture' ? 'Auction' : item.category === 'Auction Sheet' ? 'Sheet' : item.category === 'Japan Picture' ? 'Japan' : 'Durban'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Narrative */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                Narrative & Condition Assessment
              </h3>
              <p className="text-neutral-300 text-xs leading-relaxed whitespace-pre-line font-sans">
                {vehicle.description || "No professional catalog description has been saved for this listing spec record."}
              </p>
              
              {vehicle.salescomment && (
                <div className="border-t border-neutral-800 pt-4 mt-2 space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">SALES COMMENTS:</span>
                  <p className="text-xs text-neutral-400 italic">"{vehicle.salescomment}"</p>
                </div>
              )}
            </div>

            {/* Quality Control & Accessories fitted */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-red-500" />
                Equipment & Condition Flags
              </h3>
              
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block tracking-wider">ACCESSORIES ATTACHED:</span>
                {accessoriesList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {accessoriesList.map((item, idx) => (
                      <span key={idx} className="text-[10px] font-mono font-bold text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-neutral-500 font-mono italic">No accessories split keys identified in file.</span>
                )}
              </div>

              {vehicle.mechanicalProblem ? (
                <div className="border-t border-neutral-800 pt-4 mt-2 space-y-1 bg-red-950/20 p-3 rounded-lg border border-red-900/30">
                  <span className="text-[10px] font-mono text-red-400 uppercase font-black flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    MECHANICAL DEFICIENCY FLAGS:
                  </span>
                  <p className="text-xs text-red-300 font-semibold">{vehicle.mechanicalProblem}</p>
                </div>
              ) : (
                <div className="border-t border-neutral-800 pt-4 mt-2 flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/60">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono">Mechanically Clear (No defects registered)</span>
                </div>
              )}
            </div>

            {/* Sourced Media Vault (Audit Mode) */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-500" />
                Sourced Media Vault (Audit Mode)
              </h3>
              
              <div className="space-y-4 text-xs">
                {/* Category 1: Auction Pictures */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-neutral-900/40 p-2 rounded border border-neutral-800/60">
                    <span className="font-bold text-neutral-200">Auction Pictures</span>
                    {vehicle.showAuctionPictures !== false ? (
                      <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Publicly Visible
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400 bg-neutral-800/50 border border-neutral-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </div>
                  {vehicle.auctionPictures && vehicle.auctionPictures.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {vehicle.auctionPictures.map((img, idx) => {
                        const globalIdx = staffAllImages.findIndex(x => x.url === img);
                        return (
                          <button
                            key={idx}
                            onClick={() => globalIdx !== -1 && setActiveImgIndex(globalIdx)}
                            className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                              globalIdx !== -1 && activeImgIndex === globalIdx ? 'border-red-500 scale-95 shadow' : 'border-neutral-800 hover:border-neutral-600'
                            }`}
                          >
                            <img src={img} alt="Auction" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500 italic pl-1">No auction pictures uploaded.</p>
                  )}
                </div>

                {/* Category 2: Auction Sheet */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-neutral-900/40 p-2 rounded border border-neutral-800/60">
                    <span className="font-bold text-neutral-200">Auction Sheet</span>
                    <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Staff Only (Always Hidden)
                    </span>
                  </div>
                  {vehicle.auctionSheet && vehicle.auctionSheet.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {vehicle.auctionSheet.map((img, idx) => {
                        const globalIdx = staffAllImages.findIndex(x => x.url === img);
                        return (
                          <button
                            key={idx}
                            onClick={() => globalIdx !== -1 && setActiveImgIndex(globalIdx)}
                            className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                              globalIdx !== -1 && activeImgIndex === globalIdx ? 'border-red-500 scale-95 shadow' : 'border-neutral-800 hover:border-neutral-600'
                            }`}
                          >
                            <img src={img} alt="Auction Sheet" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500 italic pl-1">No auction sheets uploaded.</p>
                  )}
                </div>

                {/* Category 3: Japan Pictures */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-neutral-900/40 p-2 rounded border border-neutral-800/60">
                    <span className="font-bold text-neutral-200">Japan Pictures</span>
                    {vehicle.showJapanPictures !== false ? (
                      <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Publicly Visible
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400 bg-neutral-800/50 border border-neutral-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </div>
                  {vehicle.japanPictures && vehicle.japanPictures.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {vehicle.japanPictures.map((img, idx) => {
                        const globalIdx = staffAllImages.findIndex(x => x.url === img);
                        return (
                          <button
                            key={idx}
                            onClick={() => globalIdx !== -1 && setActiveImgIndex(globalIdx)}
                            className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                              globalIdx !== -1 && activeImgIndex === globalIdx ? 'border-red-500 scale-95 shadow' : 'border-neutral-800 hover:border-neutral-600'
                            }`}
                          >
                            <img src={img} alt="Japan" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500 italic pl-1">No Japan pictures uploaded.</p>
                  )}
                </div>

                {/* Category 4: Durban Pictures */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-neutral-900/40 p-2 rounded border border-neutral-800/60">
                    <span className="font-bold text-neutral-200">Durban Pictures</span>
                    {vehicle.showDurbanPictures !== false ? (
                      <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Publicly Visible
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400 bg-neutral-800/50 border border-neutral-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </div>
                  {vehicle.durbanPictures && vehicle.durbanPictures.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {vehicle.durbanPictures.map((img, idx) => {
                        const globalIdx = staffAllImages.findIndex(x => x.url === img);
                        return (
                          <button
                            key={idx}
                            onClick={() => globalIdx !== -1 && setActiveImgIndex(globalIdx)}
                            className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                              globalIdx !== -1 && activeImgIndex === globalIdx ? 'border-red-500 scale-95 shadow' : 'border-neutral-800 hover:border-neutral-600'
                            }`}
                          >
                            <img src={img} alt="Durban" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500 italic pl-1">No Durban pictures uploaded.</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR: AUDITING SPEC TABLES (Col span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Commercial Pricing Section */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-black text-red-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2.5">
                <Coins className="w-4 h-4 text-red-500" />
                Commercial & Deal Sourcing Ledger
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pricingFields.map((field, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      field.highlight 
                        ? 'bg-neutral-900 border-red-500/30 ring-1 ring-red-500/10' 
                        : 'bg-neutral-900/50 border-neutral-800'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                      {field.label}
                    </span>
                    <span className={`font-mono mt-1 break-words ${
                      field.highlight 
                        ? 'text-xl font-black text-red-500' 
                        : 'text-xs font-bold text-white'
                    }`}>
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. core identification parameters */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-black text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2.5">
                <FileText className="w-4 h-4 text-red-500" />
                Registry & core Stock Parameters
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs bg-neutral-900/20 p-4.5 rounded-xl border border-neutral-800/85">
                {registryFields.map((field, idx) => (
                  <div key={idx} className="border-b border-neutral-800 pb-2 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                      {field.label}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-neutral-200 mt-1 break-all">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. physical configuration parameters */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-black text-neutral-400 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2.5">
                <Activity className="w-4 h-4 text-red-500" />
                Aesthetic Specifications & Dimensions
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs bg-neutral-900/20 p-4.5 rounded-xl border border-neutral-800/85">
                {physicalFields.map((field, idx) => (
                  <div key={idx} className="border-b border-neutral-800 pb-2 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                      {field.label}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-neutral-200 mt-1 break-all">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. global logistics and cargo shipping tracking */}
            <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 space-y-4">
              <h3 className="text-xs font-mono font-black text-red-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2.5">
                <Truck className="w-4 h-4 text-red-500" />
                Cargo Shipment & Ocean Logistics records
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs bg-neutral-900/20 p-4.5 rounded-xl border border-neutral-800/85">
                {logisticsFields.map((field, idx) => (
                  <div key={idx} className="border-b border-neutral-800 pb-2 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                      {field.label}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-neutral-200 mt-1 break-all">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Security / Audit Footnote Assurance */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-400 gap-4">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" />
            CarChief Verified Audit Record • Encrypted Node Log Entry
          </span>
          <span className="font-mono text-[10px]">VERIFIED TIMESTAMP: {new Date().toISOString().slice(0, 19)} UTC</span>
        </div>

      </div>
    </div>
  );
}
