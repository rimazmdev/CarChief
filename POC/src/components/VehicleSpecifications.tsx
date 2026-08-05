import React from 'react';
import { Vehicle } from '../types';
import { Layers, Settings, DollarSign, Navigation, Ship, Calendar, MapPin, Tag } from 'lucide-react';

interface VehicleSpecificationsProps {
  vehicle: Vehicle;
}

export const VehicleSpecifications: React.FC<VehicleSpecificationsProps> = ({ vehicle: v }) => {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-5 md:p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header banner with vehicle quick description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 flex items-center gap-1.5 font-mono">
            <Layers className="w-4 h-4 text-red-500 shrink-0" />
            Logistic Control Database — 37 Fields Mapped
          </span>
          <h4 className="text-base font-extrabold text-neutral-900 tracking-tight mt-0.5 uppercase">
            {v.year} {v.make} {v.model} Specs
          </h4>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Logistics, commercial indexes, and voyages tracking profile.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="bg-neutral-50 text-neutral-600 px-3 py-1.5 rounded-lg font-bold border border-neutral-200/60">
            ID: {v.id}
          </span>
          <span className={`px-3 py-1.5 rounded-lg font-extrabold uppercase border ${
            v.status === 'Available'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : v.status?.startsWith('Reserved')
              ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
              : 'bg-blue-50 text-blue-700 border-blue-100'
          }`}>
            {v.status || 'Available'}
          </span>
        </div>
      </div>

      {/* Bento Grid Categories - Clean High-Density Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Col 1: Core Technical specs */}
        <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50 shadow-3xs">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-red-600 border-b border-neutral-200/60 pb-2 mb-3 font-sans flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-red-500 shrink-0" />
            Core Technical Specs
          </h5>
          <div className="divide-y divide-neutral-100 text-[11px] space-y-0.5">
            {[
              { label: 'Model Code', value: v.modelCode || '—' },
              { label: 'Engine Code', value: v.engineCode || '—' },
              { label: 'Engine CC', value: v.enginesize || (v.displacement ? `${v.displacement} CC` : '') || '—' },
              { label: 'Transmission', value: v.transmission || '—' },
              { label: 'Fuel Type', value: v.fuelType || '—' },
              { label: 'Body Color', value: v.exteriorColor || v.color || '—' },
              { label: 'Mileage (KM)', value: v.mileage ? `${Number(v.mileage).toLocaleString()} KM` : '—' },
              { label: 'Mfg Year/Month', value: v.mfgYear || v.yearMonth || '—' },
              { label: 'Reg Year/Month', value: v.registerYear || '—' },
              { label: 'Stock Location', value: v.stockLocation || '—' }
            ].map((item, idx) => (
              <div key={`col1-${idx}`} className="flex items-center justify-between py-1.5 hover:bg-white/40 px-1 rounded transition-colors gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide shrink-0">
                  {item.label}
                </span>
                <span className="text-xs font-bold text-neutral-800 font-mono truncate select-all text-right" title={item.value}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Commercial Ledger */}
        <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50 shadow-3xs">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-600 border-b border-neutral-200/60 pb-2 mb-3 font-sans flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
            Commercial Ledger
          </h5>
          <div className="divide-y divide-neutral-100 text-[11px] space-y-0.5">
            {[
              { label: 'Reference Number', value: v.referenceNo || '—' },
              { label: 'STK Number', value: v.stkNumber || '—' },
              { label: 'Chassis #', value: v.chassis || '—' },
              { label: 'BTM Price', value: v.btmPrice || v.bottomPrice ? `$${Number(v.btmPrice || v.bottomPrice).toLocaleString()}` : '—' },
              { label: 'MSRP Price', value: v.price ? `$${Number(v.price).toLocaleString()}` : '—' },
              { label: 'Label Status', value: v.labelStatus || v.specialOffer || '—' },
              { label: 'Source', value: v.source || v.dataSource || '—' },
              { label: 'Purchased Date', value: v.purchasedDate || '—' },
              { label: 'Created On', value: v.createdAt ? new Date(v.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—' }
            ].map((item, idx) => (
              <div key={`col2-${idx}`} className="flex items-center justify-between py-1.5 hover:bg-white/40 px-1 rounded transition-colors gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide shrink-0">
                  {item.label}
                </span>
                <span className="text-xs font-bold text-neutral-800 font-mono truncate select-all text-right" title={item.value}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Shipping & Logistics */}
        <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50 shadow-3xs">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-purple-600 border-b border-neutral-200/60 pb-2 mb-3 font-sans flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-purple-500 shrink-0" />
            Shipping & Logistics
          </h5>
          <div className="divide-y divide-neutral-100 text-[11px] space-y-0.5">
            {[
              { label: 'Yard-In', value: v.yardIn || '—' },
              { label: 'Ship Method', value: v.shipMethod || '—' },
              { label: 'Shipping Co.', value: v.shippingCompany || '—' },
              { label: 'BL Number', value: v.blNumber || '—' },
              { label: 'Vanning', value: v.vanning || '—' },
              { label: 'Seal No.', value: v.sealNo || '—' },
              { label: 'Shipping Mark', value: v.shippingMark || '—' },
              { label: 'Stack Date', value: v.stackDate || '—' },
              { label: 'Shipping Notes', value: v.shippingRemarks || '—' }
            ].map((item, idx) => (
              <div key={`col3-${idx}`} className="flex items-center justify-between py-1.5 hover:bg-white/40 px-1 rounded transition-colors gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide shrink-0">
                  {item.label}
                </span>
                <span className="text-xs font-bold text-neutral-800 font-mono truncate select-all text-right" title={item.value}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 4: Vessel & Voyages */}
        <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50 shadow-3xs">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-neutral-200/60 pb-2 mb-3 font-sans flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-blue-500 shrink-0" />
            Vessel & Voyages
          </h5>
          <div className="divide-y divide-neutral-100 text-[11px] space-y-0.5">
            {[
              { label: 'Booking Status', value: v.bookingStatus || '—' },
              { label: 'Booking Date', value: v.bookingDate || '—' },
              { label: 'Trip Phase', value: v.tripPhase || '—' },
              { label: 'Load ETD', value: v.loadEtd || '—' },
              { label: 'Load Plan Ref', value: v.loadPlanReference || '—' },
              { label: 'SO Cut-off', value: v.soCutOffDate || '—' },
              { label: 'Inspection Date', value: v.destinationInspectionDate || v.inspectionDate || '—' },
              { label: 'Dep. Vessel', value: v.departureVessel || '—' },
              { label: 'Dep. Voyage', value: v.departureVoyage || '—' }
            ].map((item, idx) => (
              <div key={`col4-${idx}`} className="flex items-center justify-between py-1.5 hover:bg-white/40 px-1 rounded transition-colors gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide shrink-0">
                  {item.label}
                </span>
                <span className="text-xs font-bold text-neutral-800 font-mono truncate select-all text-right" title={item.value}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
