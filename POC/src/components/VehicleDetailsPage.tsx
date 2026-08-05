/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, Gauge, Cog, Fuel, Compass, ShieldCheck, Mail, Phone, 
  ChevronLeft, ChevronRight, Share2, Printer, MapPin, CheckCircle, Landmark, Info,
  Anchor, Palette, Clock, RefreshCw
} from 'lucide-react';
import { Vehicle, RoleConfig } from '../types';
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
    <div className="bg-white rounded-2xl border border-neutral-200/60 p-4 sm:p-6 md:p-8 shadow-sm space-y-6" id="specifications-section">
      
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

interface VehicleDetailsPageProps {
  vehicle: Vehicle;
  onBack: () => void;
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
  currentRole?: RoleConfig;
}

export default function VehicleDetailsPage({ vehicle, onBack, onSubmitLead, currentRole }: VehicleDetailsPageProps) {
  const { customer, customerTier, refreshAllData } = useCustomerPortal();
  const discountPercent = getTierDiscountPercentage(customerTier, vehicle);
  const finalPrice = getDiscountedPrice(vehicle.price, discountPercent);

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
  const [freightSuccess, setFreightSuccess] = useState('');

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
        console.error("Error fetching high quality images inside details page:", err);
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
    
    // Clear form states
    setName('');
    setEmail('');
    setPhone('');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard! Share it with friends or clients.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Reserved':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Reserved with PI':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'Sold':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const mainImage = publicImages.length > 0 
    ? publicImages[activeImgIndex] 
    : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20 font-sans" id="vehicle-detail-page">
      {/* Editorial Page Top Breadcrumbs Nav Bar */}
      <div className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 hover:text-red-600 transition-colors py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back<span className="hidden sm:inline"> to Catalog</span></span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={handleShare}
              className="p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              title="Copy link to share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePrint}
              className="hidden sm:inline-flex p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors print:hidden"
              title="Print spec sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <span className="text-base sm:text-xl font-display font-black tracking-tight text-neutral-900 uppercase">
              CAR<span className="text-red-600">CHIEF</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-8">
        {/* Mobile-Friendly Main Title & Price Header - Visible only on Mobile/Tablets */}
        <div className="lg:hidden bg-white rounded-2xl p-5 border border-neutral-200/60 shadow-sm mb-6 space-y-4">
          <div>
            <span className="text-[9px] font-mono uppercase text-neutral-400 tracking-[0.2em] font-bold block mb-1">
              {vehicle.make} Inventory ID
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-neutral-900 leading-tight uppercase">
              {vehicle.model}
            </h1>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-mono px-2.5 py-1.5 rounded font-bold uppercase tracking-wider">
                Model Year: {vehicle.year}
              </span>
              <span className="bg-neutral-100 text-neutral-700 text-[10px] font-mono px-2.5 py-1.5 rounded font-bold uppercase tracking-wider">
                {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} KM` : '—'}
              </span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 flex justify-between items-center shadow-sm">
            <div>
              <span className="text-[9px] font-mono tracking-wider text-neutral-400 font-bold uppercase block">
                {discountPercent > 0 ? `${customerTier?.name || 'Tier'} PRICE` : 'FOB PRICE'}
              </span>
              {discountPercent > 0 ? (
                <span className="text-xl sm:text-2xl font-display font-black text-red-600 tracking-tight leading-none mt-1 block">
                  ${finalPrice.toLocaleString()} <span className="text-xs font-mono font-normal text-neutral-400">USD</span>
                  <span className="text-[10px] font-mono font-normal text-neutral-400 line-through ml-2">
                    ${vehicle.price.toLocaleString()}
                  </span>
                </span>
              ) : (
                <span className="text-xl sm:text-2xl font-display font-black text-neutral-900 tracking-tight leading-none mt-1 block">
                  ${vehicle.price.toLocaleString()} <span className="text-xs font-mono font-normal text-neutral-450">USD</span>
                </span>
              )}
            </div>
            <div className="text-right border-l border-neutral-200/80 pl-4 sm:pl-6">
              <span className="text-[9px] font-mono tracking-wider text-neutral-400 font-bold uppercase block">EST. DEPOSIT</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-neutral-700 leading-none mt-1.5 block">
                ${Math.round(finalPrice * 0.1).toLocaleString()} USD
              </span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-neutral-400 font-mono flex justify-between items-center border-t border-neutral-100">
            <span>DATABASE REF ID:</span>
            <span className="font-bold text-neutral-700 font-mono">{vehicle.id}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: GALLERY & DESCRIPTION (Col span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Gallery Card Container - bounded maximum height for standard proportions */}
            <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg border border-neutral-200/40 relative group">
              
              {/* Dynamic Badges */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="text-[10px] font-mono font-bold uppercase bg-neutral-900/85 text-white px-3 py-1.5 rounded-lg backdrop-blur border border-white/10 tracking-wider">
                  {vehicle.condition}
                </span>
                <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-lg border backdrop-blur ${getStatusStyle(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>

              {/* Bounded Image Viewport (Prevents overly tall images on wide monitors) */}
              <div className="relative aspect-[16/10] max-h-[360px] sm:max-h-[400px] lg:max-h-[380px] w-full flex items-center justify-center overflow-hidden bg-neutral-900">
                <img
                  src={mainImage}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-500 ease-out"
                />

                {publicImages && publicImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-neutral-900 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 duration-200 shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-neutral-900 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 duration-200 shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Multi-Image Thumbnails Bar */}
              {publicImages && publicImages.length > 1 && (
                <div className="bg-neutral-950 border-t border-neutral-800 p-3.5 flex gap-2 overflow-x-auto scrollbar-thin">
                  {publicImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`relative w-16 aspect-[16/10] rounded overflow-hidden flex-shrink-0 transition-all ${
                        activeImgIndex === idx 
                          ? 'ring-2 ring-red-600 opacity-100 scale-95' 
                          : 'opacity-40 hover:opacity-80'
                      }`}
                    >
                      <img src={img} alt="thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Premium Dealer Description & Narrative */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-neutral-200/60 shadow-sm space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                Condition Assessment & Overview
              </h3>
              <p className="text-neutral-700 text-sm leading-relaxed whitespace-pre-line font-sans">
                {vehicle.description || "No professional description is currently available for this elite specification inventory item."}
              </p>
              
              <div className="bg-neutral-50 rounded-xl p-4.5 border border-neutral-200/60 flex items-start gap-3 mt-4">
                <Info className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  <b>CARCHIEF SECURED INVENTORY GUARANTEE:</b> This vehicle is backed by our pre-purchase inspection certification program. All specifications are certified by certified auto engineers prior to entering dynamic freight cargo export channels.
                </p>
              </div>
            </div>

            {/* Technical Specifications inside Left Column to balance heights beautifully */}
            <LogisticsAndDetailedSpecs vehicle={vehicle} />

          </div>

          {/* RIGHT AREA: TITLE, PRICE & ACTION TILES (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Technical Title and Price Panel */}
            <div className="hidden lg:block bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/60 shadow-sm space-y-5">
              <div>
                <span className="text-[9px] font-mono uppercase text-neutral-400 tracking-[0.2em] font-bold block mb-1">
                  {vehicle.make} Inventory ID
                </span>
                <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-neutral-900 leading-tight uppercase">
                  {vehicle.model}
                </h1>
                
                <div className="flex flex-wrap gap-2 mt-3.5">
                  <span className="bg-neutral-100 text-neutral-700 text-[10px] font-mono px-2.5 py-1.5 rounded font-bold uppercase tracking-wider">
                    Model Year: {vehicle.year}
                  </span>
                  <span className="bg-neutral-100 text-neutral-700 text-[10px] font-mono px-2.5 py-1.5 rounded font-bold uppercase tracking-wider">
                    {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} KM` : '—'}
                  </span>
                </div>
              </div>

              {/* Price Callout (High-contrast, elegant style - no harsh red text) */}
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[9px] font-mono tracking-wider text-neutral-400 font-bold uppercase block">
                    {discountPercent > 0 ? `${customerTier?.name || 'Tier'} PRICE` : 'FOB PRICE'}
                  </span>
                  {discountPercent > 0 ? (
                    <span className="text-2xl sm:text-3xl font-display font-black text-red-600 tracking-tight leading-none mt-1 block">
                      ${finalPrice.toLocaleString()} <span className="text-xs font-mono font-normal text-neutral-400">USD</span>
                      <span className="text-xs font-mono font-normal text-neutral-400 line-through ml-2">
                        ${vehicle.price.toLocaleString()}
                      </span>
                    </span>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-display font-black text-neutral-900 tracking-tight leading-none mt-1 block">
                      ${vehicle.price.toLocaleString()} <span className="text-xs font-mono font-normal text-neutral-400">USD</span>
                    </span>
                  )}
                </div>
                <div className="text-right border-l border-neutral-200/80 pl-6">
                  <span className="text-[9px] font-mono tracking-wider text-neutral-400 font-bold uppercase block">EST. DEPOSIT</span>
                  <span className="text-sm font-bold font-mono text-neutral-700 leading-none mt-1.5 block">
                    ${Math.round(finalPrice * 0.1).toLocaleString()} USD
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-neutral-400 font-mono flex justify-between items-center border-t border-neutral-100">
                <span>DATABASE REF ID:</span>
                <span className="font-bold text-neutral-700 font-mono">{vehicle.id}</span>
              </div>
            </div>

            {/* Customer Portal Reservation Action */}
            {customer && (
              <div className="bg-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 space-y-4 shadow-md">
                <div className="flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Customer Online Lock Engine</span>
                </div>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Lock this unit instantly in your name under active benefits of <b className="text-white font-mono">{customerTier?.name || 'Retail'}</b> tier.
                </p>
                
                {vehicle.status === 'Reserved' || vehicle.status === 'Reserved with PI' || vehicle.status === 'Sold' || vehicle.status === 'Invoiced' ? (
                  <div className="text-xs text-amber-500 font-mono font-bold bg-amber-500/10 p-3 border border-amber-500/15 rounded-xl text-center">
                    STATUS: {vehicle.status.toUpperCase()} (UNAVAILABLE FOR RESERVATION)
                  </div>
                ) : (
                  <button
                    onClick={handleReserveOnline}
                    disabled={reserving}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all uppercase tracking-widest cursor-pointer shadow-lg shadow-red-600/15 flex items-center justify-center gap-2"
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
                  <p className={`text-xs font-mono font-bold text-center mt-2 p-3 rounded-xl ${reservationMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {reservationMessage.text}
                  </p>
                )}
              </div>
            )}

            {/* Card 1: CIF Freight Calculator (Always Visible) */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
              <div>
                <h3 className="text-sm font-display font-black text-neutral-900 uppercase tracking-tight flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                  <Anchor className="w-4 h-4 text-red-600" />
                  Ocean Freight Estimator (CIF)
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                  Calculate global logistics ocean cargo fees and marine insurance for exporting this <b>{vehicle.make}</b>.
                </p>
              </div>

              {freightSuccess ? (
                <div className="bg-green-50 text-green-700 border border-green-200/60 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Freight Inquiry Logged
                  </div>
                  <p>{freightSuccess}</p>
                </div>
              ) : (
                <FreightCalculator 
                  vehicle={vehicle}
                  onSubmitLead={(freightLead) => {
                    onSubmitLead({
                      ...freightLead,
                      message: `Automatic Logistics Quote generated for ${vehicle.year} ${vehicle.make} ${vehicle.model}. ${freightLead.message}`
                    });
                    setFreightSuccess('Freight Logistics Inquiry successfully submitted! A coordinator will contact you with shipping dates.');
                  }} 
                />
              )}
            </div>

            {/* Card 2: Specs Inquiry & Booking Form (Always Visible) */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
              <div>
                <h3 className="text-sm font-display font-black text-neutral-900 uppercase tracking-tight flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                  <Mail className="w-4 h-4 text-red-600" />
                  Specs Inquiry & Booking Form
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                  Send a secure sales inquiry regarding this <b>{vehicle.year} {vehicle.make}</b>. Our customer representatives will provide customized export estimates.
                </p>
              </div>

              {success ? (
                <div className="bg-green-50 text-green-700 border border-green-200/60 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Inquiry Logged
                  </div>
                  <p>{success}</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Phone (Optional)</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555-0199"
                        className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Inquiry Message</label>
                    <textarea
                      rows={3}
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:shadow-lg transition-all"
                  >
                    Submit Inquiry Spec File
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

        {/* Master Salesperson & Logistics Spec Sheet */}
        {currentRole && (currentRole.id === 'Admin' || currentRole.id === 'Dealer' || currentRole.id === 'Sales') && (
          <SalespersonSpecSheet vehicle={vehicle} />
        )}

      </div>
    </div>
  );
}

function SalespersonSpecSheet({ vehicle }: { vehicle: Vehicle }) {
  const sections = [
    {
      title: "Commercial & Sourcing Records",
      color: "border-emerald-500 bg-emerald-50/10 text-emerald-700",
      fields: [
        { label: "Item Type", value: vehicle.itemType },
        { label: "STK Number", value: vehicle.stkNumber },
        { label: "Reference No", value: vehicle.referenceNo },
        { label: "Document Title", value: vehicle.title },
        { label: "Purchased Date", value: vehicle.purchasedDate },
        { label: "Trading Currency", value: vehicle.currency },
        { label: "Bottom Price", value: vehicle.bottomPrice },
        { label: "BTM Price", value: vehicle.btmPrice },
        { label: "Laying Cost", value: vehicle.layingCost ? `${vehicle.layingCostCurrency || ''} ${vehicle.layingCost}` : '' },
        { label: "Laying Supplier", value: vehicle.layingSupplier },
        { label: "Pay Trade Status", value: vehicle.payTrade },
      ]
    },
    {
      title: "Technical & Mechanical Blueprint",
      color: "border-blue-500 bg-blue-50/10 text-blue-700",
      fields: [
        { label: "Make", value: vehicle.make },
        { label: "Model", value: vehicle.model },
        { label: "Register Year", value: vehicle.registerYear },
        { label: "Model Code", value: vehicle.modelCode },
        { label: "Chassis / Frame No", value: vehicle.chassis },
        { label: "Version / Class", value: vehicle.versionClass },
        { label: "Steering Config", value: vehicle.steering },
        { label: "Transmission Type", value: vehicle.transmission },
        { label: "Doors Count", value: vehicle.door },
        { label: "Engine Size Spec", value: vehicle.enginesize },
        { label: "Displacement (cc)", value: vehicle.displacement },
        { label: "Passengers Capacity", value: vehicle.passengers },
        { label: "Fuel Type", value: vehicle.fuelType },
        { label: "Drive Type", value: vehicle.driveType },
      ]
    },
    {
      title: "Aesthetics & Physical Dimensions",
      color: "border-amber-500 bg-amber-50/10 text-amber-700",
      fields: [
        { label: "Exterior Color", value: vehicle.exteriorColor || vehicle.color },
        { label: "Interior Color", value: vehicle.interiorColor },
        { label: "Vehicle Width (mm)", value: vehicle.vehicleWidth },
        { label: "Vehicle Length (mm)", value: vehicle.vehicleLength },
        { label: "Vehicle Height (mm)", value: vehicle.vehicleHeight },
        { label: "Odometer Mileage", value: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} miles` : '' },
        { label: "Vehicle Condition", value: vehicle.condition },
      ]
    },
    {
      title: "Logistics, Shipping & Quality Control",
      color: "border-red-500 bg-red-50/10 text-red-700",
      fields: [
        { label: "Country Stock Location", value: vehicle.countryStock },
        { label: "Estimated Departure (ETD)", value: vehicle.etdDate },
        { label: "Estimated Arrival (ETA)", value: vehicle.etaDate },
        { label: "Port Stock Location", value: vehicle.portStock },
        { label: "Yard In Location", value: vehicle.yardIn },
        { label: "Vessel Carrier ETD", value: vehicle.loadEtd },
        { label: "Carrier ATD", value: vehicle.carrierAtd },
        { label: "Carrier ETA", value: vehicle.carrierEta },
        { label: "Vanning Status", value: vehicle.vanning },
        { label: "Accessories Fitted", value: vehicle.accessories },
        { label: "Mechanical Issues", value: vehicle.mechanicalProblem },
        { label: "Other Options Fitted", value: vehicle.otherOptions },
        { label: "Sales Comments / Notes", value: vehicle.salescomment },
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 md:p-8 shadow-sm space-y-6 mt-8 sm:mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-widest text-red-600 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded uppercase font-mono animate-pulse">
              Salesperson Special Access
            </span>
          </div>
          <h2 className="text-xl font-display font-black text-neutral-900 uppercase tracking-tight mt-1">
            Salesperson Spec Sheet & Master Logistics Specifications
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Comprehensive commercial, mechanical, dimensional, and logistics dataset uploaded via CSV.
          </p>
        </div>
        <div className="text-xs font-mono text-neutral-400 self-start sm:self-center bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/50">
          STK: <span className="font-bold text-neutral-800">{vehicle.stkNumber || 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, sIdx) => {
          const activeFields = section.fields.filter(f => f.value !== undefined && f.value !== null && f.value !== '');
          if (activeFields.length === 0) return null;

          return (
            <div key={sIdx} className="bg-neutral-50/30 rounded-xl border border-neutral-200/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full border-2 ${section.color.split(' ')[0]}`} />
                <h3 className="text-xs font-black uppercase text-neutral-800 tracking-wider">
                  {section.title}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {activeFields.map((field, fIdx) => (
                  <div key={fIdx} className="border-b border-neutral-100 pb-1 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">
                      {field.label}
                    </span>
                    <span className="text-xs font-mono font-semibold text-neutral-800 mt-0.5 break-words">
                      {String(field.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
