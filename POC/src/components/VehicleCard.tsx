/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Vehicle } from '../types';
import { motion } from 'motion/react';
import { useCustomerPortal } from '../customer/contexts/CustomerPortalContext';
import { getTierDiscountPercentage, getDiscountedPrice } from '../utils/pricing';

interface VehicleCardProps {
  key?: string;
  vehicle: Vehicle;
  onSelect: (vehicle: Vehicle) => void;
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'Available':
      return 'bg-emerald-600/95 border-emerald-400/40 text-white';
    case 'Reserved':
      return 'bg-amber-500/95 border-amber-400/40 text-white';
    case 'Reserved with PI':
      return 'bg-purple-600/95 border-purple-500/40 text-white';
    case 'Pending':
      return 'bg-orange-500/95 border-orange-400/40 text-white';
    case 'Invoice Created':
      return 'bg-sky-600/95 border-sky-500/40 text-white';
    case 'Invoiced':
      return 'bg-neutral-800/95 border-neutral-700/40 text-white';
    case 'Sold':
      return 'bg-red-600/95 border-red-500/40 text-white';
    case 'Draft':
      return 'bg-neutral-500/95 border-neutral-400/40 text-white';
    default:
      return 'bg-neutral-600/95 border-neutral-500/40 text-white';
  }
}

function getStatusDotStyle(status: string) {
  switch (status) {
    case 'Available':
      return 'bg-emerald-200 shadow-[0_0_8px_#34d399] animate-pulse';
    case 'Reserved':
    case 'Reserved with PI':
      return 'bg-amber-200 shadow-[0_0_8px_#fbbf24]';
    case 'Pending':
      return 'bg-orange-200 shadow-[0_0_8px_#fb923c]';
    case 'Invoice Created':
      return 'bg-sky-200 shadow-[0_0_8px_#38bdf8]';
    case 'Invoiced':
      return 'bg-neutral-300 shadow-[0_0_8px_#cbd5e1]';
    case 'Sold':
      return 'bg-red-200 shadow-[0_0_8px_#f87171] animate-ping';
    case 'Draft':
      return 'bg-neutral-300';
    default:
      return 'bg-neutral-300';
  }
}

export default function VehicleCard({ vehicle, onSelect }: VehicleCardProps) {
  const { customerTier } = useCustomerPortal();
  
  const discountPercent = getTierDiscountPercentage(customerTier, vehicle);
  const finalPrice = getDiscountedPrice(vehicle.price, discountPercent);

  const rawImage = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0] 
    : 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&auto=format&fit=crop&q=70';

  let displayImage = rawImage;
  if (rawImage.includes('images.unsplash.com')) {
    displayImage = rawImage.replace(/w=\d+/, 'w=400').replace(/q=\d+/, 'q=70');
    if (!displayImage.includes('w=400')) {
      displayImage += '&w=400&q=70';
    }
  }

  const statusVal = vehicle.status || 'Available';

  return (
    <div 
      onClick={() => onSelect(vehicle)}
      className="group bg-white rounded-lg border border-neutral-200/70 hover:border-red-500/30 hover:shadow-[0_12px_24px_-8px_rgba(220,38,38,0.08)] transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full text-left transform-gpu hover:-translate-y-0.5 active:scale-[0.98]"
      id={`vehicle-card-${vehicle.id}`}
    >
      {/* Image Thumbnail Section */}
      <div className="relative w-full aspect-[4/3] bg-neutral-100 overflow-hidden shrink-0">
        <img
          src={displayImage}
          alt={`${vehicle.make} ${vehicle.model}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />
        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`inline-flex items-center gap-1.5 text-[8px] uppercase font-extrabold px-2 py-0.5 rounded-md shadow-md border font-mono tracking-wider backdrop-blur-xs ${getStatusStyles(statusVal)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotStyle(statusVal)}`} />
            {statusVal}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

      {/* Specifications Summary Body Section - Only Year, Make, Model and Price */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Year and Make Info */}
          <span className="text-[9px] font-bold uppercase font-mono tracking-wider text-red-600 block">
            {vehicle.year} {vehicle.make}
          </span>
          {/* Model Info */}
          <h4 className="text-[10px] sm:text-xs font-extrabold text-neutral-900 tracking-tight leading-snug uppercase mt-0.5 break-words" title={vehicle.model}>
            {vehicle.model}
          </h4>

          {discountPercent > 0 && (
            <div className="flex justify-start mt-2.5">
              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200/60 text-red-600 text-[8.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono shadow-3xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                -{discountPercent}% TIER DISCOUNT
              </span>
            </div>
          )}
        </div>

        {/* Price row */}
        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[8px] uppercase font-bold text-neutral-400 tracking-wider">
            {discountPercent > 0 ? `${customerTier?.name || 'Tier'} Price` : 'Retail Price'}
          </span>
          <div className="flex flex-col items-end">
            {discountPercent > 0 ? (
              <>
                <span className="text-[10px] text-neutral-400 line-through">
                  ${vehicle.price.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-black text-red-600 leading-none mt-0.5">
                  ${finalPrice.toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-black text-neutral-950 leading-none">
                ${vehicle.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

