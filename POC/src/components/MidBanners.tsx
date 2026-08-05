/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Ship, 
  ShieldCheck, 
  Globe, 
  Clock, 
  Coins, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Award,
  Headphones,
  Check,
  ChevronRight
} from 'lucide-react';

interface MidBannersProps {
  onExploreStock: () => void;
  onNavigate: (view: any) => void;
  onOpenConsultation?: () => void;
}

export default function MidBanners({ onExploreStock, onNavigate, onOpenConsultation }: MidBannersProps) {
  return (
    <div className="space-y-6 sm:space-y-12 my-6 sm:my-12" id="mid-banners-wrapper">
      
      {/* 1. GLOBAL LOGISTICS & EXPORT HUB (Worldwide Made Easy) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden p-6 sm:p-10"
        id="banner-global-logistics"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text and Features Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-amber-500 font-black bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase">
                <Globe className="w-3 h-3 text-amber-500 animate-pulse" /> Intercontinental Freight Pipeline
              </span>
              <h2 className="text-base sm:text-3xl lg:text-4xl font-display font-black uppercase tracking-tight leading-[1.1] text-white">
                EXPORTING WORLDWIDE <br className="hidden sm:inline" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
                  MADE EFFORTLESS
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-xl leading-relaxed">
                CarChief integrates direct maritime deep-sea container lines, custom documentation handoffs, and door-to-port routing. Sourcing and delivering luxury vehicles from any hub straight to your local harbor with unmatched reliability.
              </p>
            </div>

            {/* Feature Badges Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-neutral-900/60 backdrop-blur border border-neutral-800/80 p-3 rounded-xl hover:border-neutral-700/80 transition-all">
                <div className="p-1.5 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 shrink-0">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase text-white tracking-wider">Fast Shipping</h4>
                  <p className="text-[9px] text-neutral-400 font-light mt-0.5">Priority slot booking with premier carrier lines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-900/60 backdrop-blur border border-neutral-800/80 p-3 rounded-xl hover:border-neutral-700/80 transition-all">
                <div className="p-1.5 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase text-white tracking-wider">Customs Cleared</h4>
                  <p className="text-[9px] text-neutral-400 font-light mt-0.5">Full pre-clearing & bilateral transit tariff filings.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-900/60 backdrop-blur border border-neutral-800/80 p-3 rounded-xl hover:border-neutral-700/80 transition-all">
                <div className="p-1.5 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase text-white tracking-wider">Door-to-Port Delivery</h4>
                  <p className="text-[9px] text-neutral-400 font-light mt-0.5">Direct transport coordination from source to docks.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-900/60 backdrop-blur border border-neutral-800/80 p-3 rounded-xl hover:border-neutral-700/80 transition-all">
                <div className="p-1.5 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase text-white tracking-wider">Real-Time Tracking</h4>
                  <p className="text-[9px] text-neutral-400 font-light mt-0.5">Maritime vessel tracking with automated ETA updates.</p>
                </div>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('how-to-buy')}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-display font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-600/15 transition-all text-[11px] uppercase tracking-wider flex items-center justify-center space-x-2 hover:scale-105 active:scale-95 border border-amber-500/25 cursor-pointer"
              >
                <span>Learn About Shipping</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={onExploreStock}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-300 font-display font-semibold py-2.5 px-6 rounded-xl transition-all text-[11px] uppercase tracking-wider hover:scale-105 hover:text-white cursor-pointer"
              >
                Estimate Shipping Rates
              </button>
            </div>
          </div>

          {/* Right Vector Illustration Column (Sleek Cargo Ship + World Routes Map - Fast & Interactive) */}
          <div className="lg:col-span-5 h-56 sm:h-64 lg:h-full relative flex items-center justify-center min-h-[220px]">
            {/* World Route Map Background Visual */}
            <div className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-screen scale-110">
              <svg viewBox="0 0 1000 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-amber-500 stroke-[1.5]">
                <path d="M150,150 Q300,100 500,250 T850,200" strokeDasharray="5,5" />
                <path d="M100,350 Q250,450 450,300 T750,450" strokeDasharray="5,5" />
                <path d="M200,200 Q400,350 600,150 T900,400" strokeDasharray="5,5" />
                <circle cx="150" cy="150" r="5" className="fill-amber-500 animate-ping" />
                <circle cx="150" cy="150" r="3" className="fill-amber-500" />
                <circle cx="500" cy="250" r="4" className="fill-amber-500" />
                <circle cx="850" cy="200" r="5" className="fill-amber-500 animate-ping" />
                <circle cx="850" cy="200" r="3" className="fill-amber-500" />
                <circle cx="450" cy="300" r="4" className="fill-amber-500" />
                <circle cx="750" cy="450" r="5" className="fill-amber-500 animate-ping" />
                <circle cx="750" cy="450" r="3" className="fill-amber-500" />
              </svg>
            </div>

            {/* Container Ship & Luxury Car Backdrop */}
            <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-inner border border-neutral-800 bg-neutral-900/40">
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80" 
                alt="Cargo Container Ship" 
                className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-4 z-20">
                <span className="block text-[8px] font-mono text-amber-500 uppercase tracking-widest font-black">VESSEL DEPARTURE</span>
                <span className="text-[11px] font-display font-bold text-white uppercase tracking-tight">Active Maritime Registry</span>
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 2. DUAL BENTO EXPORT METRICS & OPERATIONS HIGHLIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="banner-financing-bento">
        
        {/* Left: Tailored Export & Logistics Configurations */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="hidden sm:flex lg:col-span-7 bg-white border border-neutral-200/75 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex-col justify-between"
          id="banner-financing-card"
        >
          {/* Subtle Background Maritime Ship Silhouette SVG Accent */}
          <div className="absolute right-[-20px] bottom-[-20px] w-60 h-60 text-neutral-100 pointer-events-none opacity-[0.5]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
              <path d="M2 21h20M19.3 14.8C21.1 13.5 22 11.7 22 10c0-3.3-3.1-6-7-6-1.5 0-2.9.4-4 1.1C9.9 4.4 8.5 4 7 4c-3.9 0-7 2.7-7 6 0 1.7.9 3.5 2.7 4.8L1 21h22l-1.7-6.2z" />
            </svg>
          </div>

          <div className="space-y-4 max-w-lg relative z-10">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono tracking-widest text-amber-600 font-extrabold uppercase bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
              <Ship className="w-3.5 h-3.5" /> Customized Transit Pipelines
            </span>
            <h3 className="text-xl sm:text-2xl font-display font-black uppercase text-neutral-950 tracking-tight leading-none">
              TAILORED EXPORT <br />
              <span className="text-amber-600">SOLUTIONS</span>
            </h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Choose from high-efficiency transit options optimized for your port's infrastructure and volume requirement. We secure premium freight schedules for single or bulk dealer consignments.
            </p>

            {/* Checklist with Custom Bullets */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 font-sans">
              <li className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 border border-emerald-100 bg-emerald-50 rounded-full p-0.5" />
                <span>Roll-on/Roll-off (RoRo)</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 border border-emerald-100 bg-emerald-50 rounded-full p-0.5" />
                <span>Dedicated Containerized Loading</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 border border-emerald-100 bg-emerald-50 rounded-full p-0.5" />
                <span>Consolidated Multi-Unit Freight</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 border border-emerald-100 bg-emerald-50 rounded-full p-0.5" />
                <span>Pre-Shipment Port Inspections</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 relative z-10 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('contact')}
              className="bg-amber-600 hover:bg-amber-500 text-white font-display font-bold py-2.5 px-6 rounded-xl shadow-md shadow-amber-600/10 hover:shadow-amber-600/20 transition-all text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 hover:scale-105 active:scale-95 border border-amber-500 cursor-pointer"
            >
              <span>Get Export Quote</span>
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
            
            <button
              onClick={() => onNavigate('how-to-buy')}
              className="bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-display font-semibold py-2.5 px-5 rounded-xl transition-all text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer"
            >
              Learn Shipping Blueprint
            </button>
          </div>
        </motion.div>

        {/* Right: Quick Performance Snapshot Banner */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border border-neutral-800/80 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col justify-between"
          id="banner-perf-snapshot"
        >
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          </div>

          <div className="space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-amber-500 font-extrabold uppercase">
              ● Live Registry Statistics
            </span>
            <h3 className="text-xl font-display font-black uppercase text-white tracking-tight leading-none">
              SECURED GLOBAL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">OPERATIONS</span>
            </h3>
            <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
              We monitor vessel transit vectors, custom duties, escrow balances, and legal documentation in real-time.
            </p>

            {/* Quick Metrics mini cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl">
                <span className="block text-[7.5px] font-mono text-neutral-500 uppercase tracking-widest">Global Escrow</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">$42.8M+</span>
              </div>
              <div className="bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl">
                <span className="block text-[7.5px] font-mono text-neutral-500 uppercase tracking-widest">Total Sourced</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">14,200+ Units</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span>LOGISTICS DECK COMPLIANT</span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* 3. "EXPLORE OUR PREMIUM STOCK" DECK (Wide Conversion Section) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative bg-neutral-950 text-white rounded-3xl border border-neutral-850 shadow-2xl overflow-hidden p-6 sm:p-8"
        id="banner-why-carchief"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent z-10" />
        <div className="absolute top-0 right-0 sm:w-[450px] sm:h-[300px] w-[180px] h-[120px] pointer-events-none opacity-30 mix-blend-luminosity">
          <img 
            src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80" 
            alt="Premium Luxury Sports Car" 
            className="w-full h-full object-cover scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative z-20 flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-neutral-800/60 mb-6">
          <div className="space-y-1">
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase text-amber-500 tracking-[0.25em]">Ultimate Sourcing Trust</span>
            <h3 className="text-sm sm:text-2xl font-display font-black uppercase text-white tracking-tight">
              EXPLORE OUR <span className="text-amber-500">PREMIUM STOCK</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-neutral-400 max-w-xl font-light">
              Discover an exquisite collection of luxury SUVs, high-performance supercars, and premium family vehicles. Sourced directly from elite Japanese networks and meticulously pre-vetted.
            </p>
          </div>

          <button
            onClick={onExploreStock}
            className="bg-amber-600 hover:bg-amber-500 text-white border border-amber-600 hover:border-amber-500 font-display font-bold py-2 px-4 rounded-xl transition-all duration-300 text-[9px] sm:text-xs uppercase tracking-wider hover:scale-105 shrink-0 self-start xl:self-auto cursor-pointer shadow-lg shadow-amber-600/15"
          >
            Browse Premium Stock
          </button>
        </div>

        {/* 5-Column Grid of Value Props */}
        <div className="relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          <div className="space-y-2 group">
            <div className="w-8 h-8 bg-amber-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-600/20 transition-all">
              <Award className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-mono font-bold uppercase text-white tracking-wider">Hand-Picked Grades</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-light">Sourced strictly from premium auction grades 4.5+ or S-grade with flawless condition reports.</p>
            </div>
          </div>

          <div className="space-y-2 group">
            <div className="w-8 h-8 bg-amber-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-600/20 transition-all">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-mono font-bold uppercase text-white tracking-wider">Certified Inspection</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-light">Rigorous 150-point diagnostics, paint gauge verification, and mechanical evaluation.</p>
            </div>
          </div>

          <div className="space-y-2 group">
            <div className="w-8 h-8 bg-amber-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-600/20 transition-all">
              <Coins className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-mono font-bold uppercase text-white tracking-wider">VIP Concierge</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-light">Can't find a specific spec? Our bespoke agents tap into private dealer circles globally.</p>
            </div>
          </div>

          <div className="space-y-2 group">
            <div className="w-8 h-8 bg-amber-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-600/20 transition-all">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-mono font-bold uppercase text-white tracking-wider">Document Integrity</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-light">Direct delivery of original export certificates, certified auction sheets, and history logs.</p>
            </div>
          </div>

          <div className="space-y-2 group">
            <div className="w-8 h-8 bg-amber-600/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-600/20 transition-all">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-mono font-bold uppercase text-white tracking-wider">Climate-Safe Transit</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-light">Premium containerized and lash-secured logistics to safeguard luxury automotive paint.</p>
            </div>
          </div>

        </div>
      </motion.div>

    </div>
  );
}
