/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Calendar, Gauge, Cog, Fuel, Compass, ShieldCheck, Mail, Phone, ChevronLeft, ChevronRight, HelpCircle, Landmark, Palette, Clock, RefreshCw } from 'lucide-react';
import { Vehicle, Lead } from '../types';
import FreightCalculator from './FreightCalculator';
import { useCustomerPortal } from '../customer/contexts/CustomerPortalContext';
import { getTierDiscountPercentage, getDiscountedPrice } from '../utils/pricing';
import { db } from '../firebase';
import { updateDoc, doc, collection, getDocs, query, where, addDoc, getDoc } from 'firebase/firestore';

function LogisticsAndDetailedSpecs({ vehicle: v }: { vehicle: Vehicle }) {
  const displayEngine = v.enginesize || (v.displacement ? `${v.displacement} CC` : '') || v.engine || '—';
  const displayMileage = v.mileage ? `${Number(v.mileage).toLocaleString()} KM` : '—';
  const displayFuel = v.fuelType || '—';
  const displayTransmission = v.transmission || '—';
  const displayColor = v.exteriorColor || v.color || '—';

  const formatChassis = (ch?: string) => {
    if (!ch) return '—';
    if (ch.length > 4) {
      return ch.substring(0, ch.length - 4) + '****';
    }
    return ch;
  };

  const formatDim = (val?: string) => {
    if (!val) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num > 1000) return Math.round(num / 10).toString(); // mm to cm
    return Math.round(num).toString();
  };

  const getLxWxH = () => {
    if (v.vehicleLength && v.vehicleWidth && v.vehicleHeight) {
      return `${formatDim(v.vehicleLength)}X${formatDim(v.vehicleWidth)}X${formatDim(v.vehicleHeight)}`;
    }
    return '—';
  };

  const getM3ValueOnly = (): string => {
    if (v.m3) {
      return v.m3;
    }
    if (v.vehicleLength && v.vehicleWidth && v.vehicleHeight) {
      const l = parseFloat(v.vehicleLength);
      const w = parseFloat(v.vehicleWidth);
      const h = parseFloat(v.vehicleHeight);
      if (!isNaN(l) && !isNaN(w) && !isNaN(h) && l > 0 && w > 0 && h > 0) {
        return ((l / 1000) * (w / 1000) * (h / 1000)).toFixed(2);
      }
    }
    return '—';
  };

  // The 11 rows:
  const specRows = [
    {
      leftLabel: "Stock No.",
      leftValue: <strong className="font-bold text-neutral-900">{v.stkNumber || v.erpStockNo || '—'}</strong>,
      rightLabel: "Make",
      rightValue: v.make || '—'
    },
    {
      leftLabel: "Model",
      leftValue: v.model || '—',
      rightLabel: "Model Code",
      rightValue: v.modelCode || '—'
    },
    {
      leftLabel: "Chassis No",
      leftValue: formatChassis(v.chassis),
      rightLabel: "Version/Class",
      rightValue: v.versionClass || '—'
    },
    {
      leftLabel: "REG Year/Mon",
      isRegYear: true,
      leftValue: v.registerYear || '—',
      rightLabel: "MFG Year/Mon",
      isMfgYear: true,
      rightValue: v.mfgYear || v.yearMonth || '—'
    },
    {
      leftLabel: "Mileage",
      leftValue: displayMileage,
      rightLabel: "Fuel",
      rightValue: displayFuel
    },
    {
      leftLabel: "Transmission",
      leftValue: displayTransmission,
      rightLabel: "Engine",
      rightValue: displayEngine
    },
    {
      leftLabel: "2WD/4WD",
      leftValue: v.driveType || '—',
      rightLabel: "Exterior Color",
      rightValue: displayColor
    },
    {
      leftLabel: "Doors",
      leftValue: v.door || '—',
      rightLabel: "Steering",
      rightValue: v.steering || '—'
    },
    {
      leftLabel: "Seats",
      leftValue: v.passengers || '—',
      rightLabel: "Gross Weight",
      rightValue: '—'
    },
    {
      leftLabel: "LxWxH",
      leftValue: getLxWxH(),
      rightLabel: "M3 Size",
      rightValue: getM3ValueOnly()
    },
    {
      leftLabel: "Type",
      leftValue: v.type || v.bodytype || '—',
      rightLabel: "",
      rightValue: ""
    }
  ];

  const highlights = [
    { icon: <Cog className="w-6 h-6 text-neutral-500" />, value: displayEngine },
    { icon: <Gauge className="w-6 h-6 text-neutral-500" />, value: displayMileage },
    { icon: <Fuel className="w-6 h-6 text-neutral-500" />, value: displayFuel },
    { icon: <Cog className="w-6 h-6 text-neutral-500" />, value: displayTransmission },
    { icon: <Palette className="w-6 h-6 text-neutral-500" />, value: displayColor }
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 md:p-8 shadow-sm space-y-6" id="specifications-section">
      
      {/* Title with RED underlines */}
      <div className="border-b-2 border-neutral-100 pb-4">
        <h3 className="text-lg font-black tracking-wider text-[#d32f2f] uppercase relative inline-block border-b-4 border-[#d32f2f] pb-2 pr-4">
          SPECIFICATIONS
        </h3>
      </div>

      {/* Five Highlighted Badges row exactly like image */}
      <div className="hidden sm:flex items-center justify-between border border-neutral-200 rounded-xl p-4 bg-white shadow-xs">
        {highlights.map((h, idx) => (
          <React.Fragment key={idx}>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {h.icon}
              <span className="text-[11px] sm:text-[13px] font-bold text-neutral-600 mt-2 tracking-tight uppercase">
                {h.value}
              </span>
            </div>
            {idx < highlights.length - 1 && (
              <div className="h-10 w-[1px] bg-neutral-200" />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="sm:hidden grid grid-cols-2 gap-3">
        {highlights.map((h, idx) => (
          <div key={idx} className="bg-neutral-50/50 border border-neutral-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            {h.icon}
            <span className="text-xs font-bold text-neutral-700 mt-1.5 tracking-tight uppercase">
              {h.value}
            </span>
          </div>
        ))}
      </div>

      {/* Specifications table with grid look exactly like image */}
      <div className="hidden sm:block overflow-x-auto border border-neutral-300 rounded-lg shadow-sm">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <tbody>
            {specRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-neutral-300 last:border-0">
                {/* Left label cell */}
                <td className="bg-neutral-50/85 text-neutral-600 font-semibold p-3 border-r border-neutral-300 w-[20%] min-w-[120px]">
                  {row.leftLabel}
                </td>
                
                {/* Left value cell */}
                <td className="p-3 border-r border-neutral-300 text-neutral-800 bg-white w-[30%] font-mono select-all uppercase">
                  {row.leftValue}
                </td>

                {/* Right label cell */}
                {row.rightLabel ? (
                  <td className="bg-neutral-50/85 text-neutral-600 font-semibold p-3 border-r border-neutral-300 w-[20%] min-w-[120px]">
                    {row.rightLabel}
                  </td>
                ) : (
                  <td className="bg-neutral-50/85 p-3 border-r border-neutral-300 w-[20%] min-w-[120px]" />
                )}

                {/* Right value cell */}
                <td className="p-3 text-neutral-800 bg-white w-[30%] font-mono select-all uppercase">
                  {row.rightValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-200 bg-white shadow-xs">
        {specRows.map((row, rIdx) => {
          const items = [];
          if (row.leftLabel) {
            items.push({ label: row.leftLabel, value: row.leftValue });
          }
          if (row.rightLabel && row.rightValue) {
            items.push({ label: row.rightLabel, value: row.rightValue });
          }
          return items.map((item, itemIdx) => (
            <div key={`${rIdx}-${itemIdx}`} className="flex justify-between items-center p-3 text-xs bg-white">
              <span className="text-neutral-500 font-semibold">{item.label}</span>
              <span className="text-neutral-900 font-mono font-medium select-all uppercase text-right max-w-[60%] truncate">
                {item.value}
              </span>
            </div>
          ));
        })}
      </div>
    </div>
  );
}

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSubmitLead: (leadData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
    freightDetails?: {
      destination: string;
      shippingMethod: string;
      estimatedCost: number;
    };
  }) => void;
}

export default function VehicleDetailsModal({ vehicle, onClose, onSubmitLead }: VehicleDetailsModalProps) {
  const { customer, customerTier, refreshAllData } = useCustomerPortal();
  const discountPercent = getTierDiscountPercentage(customerTier, vehicle);
  const finalPrice = getDiscountedPrice(vehicle.price, discountPercent);

  const [activeTab, setActiveTab] = useState<'specs' | 'freight' | 'inquiry'>('specs');
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Online Reservation states
  const [reserving, setReserving] = useState(false);
  const [reservationMessage, setReservationMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleReserveOnline = async () => {
    if (!customer) return;
    setReserving(true);
    setReservationMessage(null);
    try {
      // 1. Fetch real-time count of active online reservations
      const vQuery = query(
        collection(db, 'vehicles'),
        where('reservedCustomerId', '==', customer.id)
      );
      const vSnap = await getDocs(vQuery);
      const activeCount = vSnap.docs.filter(docSnap => {
        const d = docSnap.data();
        return d.status === 'Reserved' && d.isOnlineReservation === true;
      }).length;
      
      const maxLimit = customerTier?.maxOnlineReservations !== undefined ? customerTier.maxOnlineReservations : 2; // Default to 2 if not defined or fallback
      
      if (activeCount >= maxLimit) {
        setReservationMessage({
          text: `Limit Exceeded: Your tier (${customerTier?.name || 'Premium Dealer'}) allows a maximum of ${maxLimit} active online reservations. You currently have ${activeCount} active online reservations.`,
          type: 'error'
        });
        setReserving(false);
        return;
      }
      
      // 2. Perform reservation updates
      const now = new Date();
      const reservationHours = 48; // default 48 hours for online reservations
      const until = new Date(now.getTime() + reservationHours * 60 * 60 * 1000);
      
      const vehicleRef = doc(db, 'vehicles', vehicle.id);
      await updateDoc(vehicleRef, {
        status: 'Reserved',
        reservedAt: now.toISOString(),
        reservedUntil: until.toISOString(),
        customer: customer.customerName,
        reservedCustomerName: customer.customerName,
        reservedCustomerEmail: customer.email,
        reservedCustomerId: customer.id,
        reservationHours: reservationHours,
        reservedByUserId: customer.uid,
        reservedByUserName: customer.customerName,
        reservedByUserEmail: customer.email,
        isOnlineReservation: true,
      });

      // 2.5 Generate System/Salesperson Notification for Online Reservation
      try {
        let salesmanEmail = '';
        let salesmanName = customer.assignedSalesPersonName || 'Sales Staff';
        
        if (customer.assignedSalesPersonId) {
          const userDocSnap = await getDoc(doc(db, 'users', customer.assignedSalesPersonId));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            salesmanEmail = userData.email || '';
            if (userData.name || userData.displayName) {
              salesmanName = userData.name || userData.displayName;
            }
          }
        }
        
        await addDoc(collection(db, 'systemNotifications'), {
          type: 'online_reservation',
          title: 'New Customer Online Reservation',
          message: `Customer "${customer.customerName}" has reserved "${vehicle.year} ${vehicle.make} ${vehicle.model}" online from the Customer Portal. Active countdown timer has started (48 hours limit).`,
          vehicleId: vehicle.id,
          customerId: customer.id,
          salesmanEmail: salesmanEmail || '',
          salesmanName: salesmanName || '',
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (notifErr) {
        console.error("Failed creating salesperson online reservation notification:", notifErr);
      }

      // 3. Log customer activity log inside customer portal
      try {
        await addDoc(collection(db, 'customerActivityLogs'), {
          customerId: customer.id,
          customerName: customer.customerName,
          activityType: 'profile_update',
          description: `Customer reserved vehicle online: ${vehicle.year} ${vehicle.make} ${vehicle.model} (ID: ${vehicle.id})`,
          createdAt: new Date().toISOString()
        });
      } catch (logErr) {
        console.error("Failed writing activity log:", logErr);
      }

      setReservationMessage({
        text: `Success! This vehicle has been locked and reserved in your name for 48 hours.`,
        type: 'success'
      });
      
      // Trigger context state refresh
      if (refreshAllData) {
        await refreshAllData();
      }
    } catch (err: any) {
      console.error("Failed to reserve vehicle online:", err);
      setReservationMessage({
        text: `Error securing reservation: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setReserving(false);
    }
  };

  // Inquiry form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState(`Hello, I am interested in purchasing the ${vehicle.year} ${vehicle.make} ${vehicle.model}. Please let me know its availability and the next steps.`);
  const [success, setSuccess] = useState('');

  const [dynamicImages, setDynamicImages] = useState<Record<string, string[]>>({
    auctionPictures: [],
    auctionSheet: [],
    japanPictures: [],
    durbanPictures: []
  });

  React.useEffect(() => {
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
        console.error("Error fetching high quality images inside details modal:", err);
      }
    };
    
    if (vehicle?.id) {
      fetchImages();
    }
    return () => {
      active = false;
    };
  }, [vehicle.id]);

  const publicImages = React.useMemo(() => {
    const list: string[] = [];
    
    const auctionPics = dynamicImages.auctionPictures.length > 0 ? dynamicImages.auctionPictures : (vehicle.auctionPictures || []);
    const japanPics = dynamicImages.japanPictures.length > 0 ? dynamicImages.japanPictures : (vehicle.japanPictures || []);
    const durbanPics = dynamicImages.durbanPictures.length > 0 ? dynamicImages.durbanPictures : (vehicle.durbanPictures || []);

    if (vehicle.showAuctionPictures !== false && auctionPics.length > 0) {
      list.push(...auctionPics);
    }
    if (vehicle.showJapanPictures !== false && japanPics.length > 0) {
      list.push(...japanPics);
    }
    if (vehicle.showDurbanPictures !== false && durbanPics.length > 0) {
      list.push(...durbanPics);
    }

    // Fallback if none of the categorized lists exist but `images` does (for legacy vehicles)
    if (list.length === 0 && vehicle.images && vehicle.images.length > 0) {
      list.push(...vehicle.images);
    }
    return list;
  }, [vehicle, dynamicImages]);

  const nextImage = () => {
    if (publicImages.length > 0) {
      setActiveImgIndex((prev) => (prev + 1) % publicImages.length);
    }
  };

  const prevImage = () => {
    if (publicImages.length > 0) {
      setActiveImgIndex((prev) => (prev - 1 + publicImages.length) % publicImages.length);
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    onSubmitLead({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      message: msg,
    });

    setSuccess('Inquiry submitted successfully! A CarChief representative will get back to you within 24 hours.');
    
    setTimeout(() => {
      onClose();
    }, 4000);
  };

  const handleFreightLead = (freightLeadData: any) => {
    onSubmitLead(freightLeadData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 md:p-6 lg:p-10">
      <div 
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-neutral-900/60 text-white hover:bg-red-600 p-2 rounded-full transition-all duration-200"
          aria-label="Close details modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content - Scrollable */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* LEFT COLUMN: HIGH QUALITY IMAGE GALLERIES (Span 7) */}
            <div className="lg:col-span-7 bg-neutral-950 p-4 sm:p-6 flex flex-col justify-center">
              {/* Active Large Image view */}
              <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-neutral-900 shadow-inner flex items-center justify-center group/img">
                {publicImages.length > 0 ? (
                  <img
                    src={publicImages[activeImgIndex]}
                    alt={`${vehicle.make} ${vehicle.model} - view ${activeImgIndex + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-neutral-500 font-mono text-xs">No images uploaded</div>
                )}

                {/* Left/Right arrows on hover */}
                {publicImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover/img:opacity-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover/img:opacity-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Picture Index indicator */}
                {publicImages.length > 0 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white px-2.5 py-1 rounded border border-white/10 font-bold">
                    IMAGE {activeImgIndex + 1} OF {publicImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {publicImages.length > 1 && (
                <div className="flex gap-2.5 mt-4 overflow-x-auto py-1">
                  {publicImages.map((img, idx) => (
                    <button
                      key={img}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`relative w-20 aspect-[16/10] rounded overflow-hidden border-2 flex-shrink-0 transition-all ${
                        idx === activeImgIndex 
                          ? 'border-red-600 scale-102 shadow-lg shadow-red-600/10' 
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt="Thumbnail" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: VEHICLE DETAILS & TABS (Span 5) */}
            <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-50/50">
              <div>
                {/* Header Meta */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] uppercase font-mono bg-neutral-950 text-white px-3 py-1 rounded-md font-extrabold tracking-widest">
                    {vehicle.condition}
                  </span>
                  <div className="text-right">
                    {discountPercent > 0 ? (
                      <>
                        <span className="text-[10px] uppercase font-mono text-neutral-400 block tracking-wider leading-none">
                          MSRP <span className="line-through">${vehicle.price.toLocaleString()}</span>
                        </span>
                        <span className="text-xl font-display font-black text-red-600 leading-tight block mt-0.5">
                          ${finalPrice.toLocaleString()}
                        </span>
                        <span className="text-[9px] uppercase font-mono font-bold text-red-600 tracking-wider">
                          {customerTier?.name} (-{discountPercent}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-mono text-neutral-400 block tracking-wider leading-none">MSRP VALUE</span>
                        <span className="text-xl font-display font-black text-red-600 leading-tight block">
                          ${vehicle.price.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-200/60 pt-3">
                  <p className="text-xs uppercase font-mono tracking-widest text-red-600 font-extrabold leading-tight">
                    {vehicle.make}
                  </p>
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase font-sans mt-0.5 mb-1.5">
                    {vehicle.model}
                  </h2>
                  <div className="text-xs font-mono text-neutral-500 font-medium mb-5 flex gap-4">
                    <span className="bg-neutral-100 px-2 py-1 rounded">YEAR: <b className="text-neutral-800">{vehicle.year}</b></span>
                    <span className="bg-neutral-100 px-2 py-1 rounded">MILEAGE: <b className="text-neutral-800">{vehicle.mileage.toLocaleString()} mi</b></span>
                  </div>
                </div>

                {/* Tab Navigation selectors */}
                <div className="flex border-b border-neutral-200 mb-5 text-sm">
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`flex-1 text-center py-2.5 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all ${
                      activeTab === 'specs'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Specifications
                  </button>
                  <button
                    onClick={() => setActiveTab('freight')}
                    className={`flex-1 text-center py-2.5 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all ${
                      activeTab === 'freight'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Freight Calculator
                  </button>
                  <button
                    onClick={() => setActiveTab('inquiry')}
                    className={`flex-1 text-center py-2.5 font-bold uppercase text-[11px] tracking-wider border-b-2 transition-all ${
                      activeTab === 'inquiry'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Inquire / Book
                  </button>
                </div>

                {/* Tab Contents */}
                {activeTab === 'specs' && (
                  <div className="space-y-4">
                    <p className="text-xs text-neutral-600 leading-relaxed font-sans bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                      {vehicle.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-neutral-100 shadow-sm text-xs">
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><Compass className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Vehicle Type</span>
                          <span className="font-bold text-neutral-800">{vehicle.type || 'Sedan'}</span>
                        </div>
                      </div>
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><Cog className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Transmission</span>
                          <span className="font-bold text-neutral-800">{vehicle.transmission}</span>
                        </div>
                      </div>
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><Fuel className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Fuel Type</span>
                          <span className="font-bold text-neutral-800">{vehicle.fuelType}</span>
                        </div>
                      </div>
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><Gauge className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Engine Spec</span>
                          <span className="font-bold text-neutral-800">{vehicle.engine}</span>
                        </div>
                      </div>
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><Calendar className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Exterior Color</span>
                          <span className="font-bold text-neutral-800">{vehicle.color}</span>
                        </div>
                      </div>
                      <div className="border-b border-neutral-100 pb-2 flex items-start gap-2">
                        <div className="mt-0.5 text-neutral-400"><ShieldCheck className="w-3.5 h-3.5" /></div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider font-semibold">Listing Status</span>
                          <span className="font-bold text-green-600">{vehicle.status}</span>
                        </div>
                      </div>
                      <div className="col-span-2 pt-1 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>DATABASE REF:</span>
                        <span className="font-bold text-neutral-600">{vehicle.id}</span>
                      </div>
                    </div>

                    <LogisticsAndDetailedSpecs vehicle={vehicle} />
                  </div>
                )}

                {activeTab === 'freight' && (
                  <div className="max-h-[50vh] overflow-y-auto pr-1">
                    <FreightCalculator vehicle={vehicle} onSubmitLead={handleFreightLead} />
                  </div>
                )}

                {activeTab === 'inquiry' && (
                  <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm">
                    {success ? (
                      <div className="bg-green-50 text-green-800 text-xs p-4 rounded-lg border border-green-200 text-center font-medium">
                        {success}
                      </div>
                    ) : (
                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                          Submit Deal Inquiry Lead
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="modal-name" className="sr-only">Full Name</label>
                            <input
                              id="modal-name"
                              type="text"
                              required
                              placeholder="Full Name *"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500 bg-neutral-50"
                            />
                          </div>
                          <div>
                            <label htmlFor="modal-email" className="sr-only">Email Address</label>
                            <input
                              id="modal-email"
                              type="email"
                              required
                              placeholder="Email Address *"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500 bg-neutral-50"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="modal-phone" className="sr-only">Phone Number</label>
                          <input
                            id="modal-phone"
                            type="tel"
                            placeholder="Phone Number (e.g., +1 555-0199)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500 bg-neutral-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="modal-msg" className="sr-only">Logistics Inquiry Message</label>
                          <textarea
                            id="modal-msg"
                            required
                            rows={4}
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            className="w-full text-xs border border-neutral-200 rounded-lg p-2.5 focus:outline-none focus:border-red-500 bg-neutral-50 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-red-600/10 text-xs transition-colors"
                        >
                          Send Inquiry to Agents
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Portal Reservation Action */}
              {customer && (
                <div className="mt-5 bg-neutral-900 text-white rounded-xl p-4 border border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Customer Online Lock Engine</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                    Lock this unit instantly in your name under active benefits of <b className="text-white font-mono">{customerTier?.name || 'Retail'}</b> tier. 
                  </p>
                  
                  {vehicle.status === 'Reserved' || vehicle.status === 'Reserved with PI' || vehicle.status === 'Sold' || vehicle.status === 'Invoiced' ? (
                    <div className="text-xs text-amber-500 font-mono font-bold bg-amber-500/10 p-2 border border-amber-500/15 rounded text-center">
                      STATUS: {vehicle.status.toUpperCase()} (UNAVAILABLE FOR RESERVATION)
                    </div>
                  ) : (
                    <button
                      onClick={handleReserveOnline}
                      disabled={reserving}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-lg transition-all uppercase tracking-widest cursor-pointer shadow-lg shadow-red-600/15 flex items-center justify-center gap-2"
                    >
                      {reserving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Reserve Lock...</span>
                        </>
                      ) : (
                        <span>Reserve Online Now</span>
                      )}
                    </button>
                  )}
                  {reservationMessage && (
                    <p className={`text-[11px] font-mono font-bold text-center mt-1 p-2 rounded ${reservationMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {reservationMessage.text}
                    </p>
                  )}
                </div>
              )}

              {/* Bottom security assurance */}
              <div className="mt-6 border-t border-neutral-100 pt-4 flex items-center justify-between text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-500" /> CarChief Certified Transaction
                </span>
                <span className="font-mono">REF: {vehicle.id.slice(0, 8)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
