/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, FileText, CreditCard, Ship, CheckCircle2, 
  ArrowRight, Landmark, Compass, HelpCircle, PhoneCall,
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';

interface HowToBuyProps {
  onNavigate: (view: 'showroom' | 'freight' | 'contact') => void;
}

export default function HowToBuy({ onNavigate }: HowToBuyProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const SLIDE_DURATION = 6000; // 6 seconds per slide

  const steps = [
    {
      id: 0,
      stepNum: '01',
      title: 'Select a Car & Get Free Quote',
      desc: 'Search for your required car from high-quality Japanese used vehicles stock ready to export at fair prices in our stock list. Send us your inquiry by clicking on the Get Free Quote button and submitting the inquiry form.',
      icon: Search,
      color: 'from-red-500 to-red-600',
    },
    {
      id: 1,
      stepNum: '02',
      title: 'Confirm Order & Receive Invoice',
      desc: 'Confirm your order as per the quotation sent for your required vehicle. We will send you an Invoice with our bank details and the final amount you need to pay to import the vehicle to your destination country.',
      icon: FileText,
      color: 'from-red-500 to-red-700',
    },
    {
      id: 2,
      stepNum: '03',
      title: 'Make Payment & Share Receipt',
      desc: 'Make complete payment in our Bank Account details as mentioned on the invoice and share the payment receipt. It will help our accounts department to track your payment at our Bank fast and proceed with further steps.',
      icon: CreditCard,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 3,
      stepNum: '04',
      title: 'Shipment & Documentation',
      desc: 'Once full payment is received we will immediately start export arrangements from the earliest shipment available. All Required documents will be couriered to you or your agent a few days after the ship leaves Japan to make sure that documents are received in time.',
      icon: Ship,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 4,
      stepNum: '05',
      title: 'Receive Your Vehicle',
      desc: 'Receive & get your vehicle registered in your country. You can hire a clearing agent to complete all import procedures and assist you with the fees and taxes to be paid during customs clearance. Complete the procedures and enjoy your New Vehicle.',
      icon: CheckCircle2,
      color: 'from-purple-500 to-fuchsia-600',
    },
  ];

  // Auto-play control logic
  useEffect(() => {
    if (isPlaying) {
      autoPlayTimer.current = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
      }, SLIDE_DURATION);
    } else {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    }

    return () => {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current);
      }
    };
  }, [isPlaying, activeStep]);

  // SEO & PPC Optimization: Metadata & structured JSON-LD HowTo Snippet
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "How To Buy | 5 Easy Steps to Import Used Cars from Japan - CarChief";

    // Meta description update
    let metaDesc = document.querySelector('meta[name="description"]');
    const hasExistingMetaDesc = !!metaDesc;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const previousDesc = metaDesc.getAttribute('content') || '';
    metaDesc.setAttribute('content', 'Follow our 5-step blueprint to purchase and import high-quality Japanese used vehicles and construction machinery. Clear instructions from quote request to final customs clearance.');

    // JSON-LD HowTo Schema
    const schemaId = 'seo-howto-jsonld';
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = schemaId;
      schemaScript.type = 'application/ld+json';
      schemaScript.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Buy and Import Used Cars & Machinery from CarChief",
        "description": "5 simple milestones for car buyers and dealership networks to select, pay for, ship, and register cars, vans, trucks, and machinery from our Japanese stock.",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "Varies by vehicle selection"
        },
        "step": steps.map((st, idx) => ({
          "@type": "HowToStep",
          "position": idx + 1,
          "name": st.title,
          "text": st.desc,
          "url": `${window.location.origin}/#/how-to-buy?step=${st.stepNum}`
        }))
      });
      document.head.appendChild(schemaScript);
    }

    return () => {
      document.title = previousTitle;
      if (metaDesc) {
        if (hasExistingMetaDesc) {
          metaDesc.setAttribute('content', previousDesc);
        } else {
          metaDesc.remove();
        }
      }
      const schemaToRemove = document.getElementById(schemaId);
      if (schemaToRemove) schemaToRemove.remove();
    };
  }, []);

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % steps.length);
  };

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const selectStepManual = (idx: number) => {
    setActiveStep(idx);
    setIsPlaying(false); // Pause autoplay on manual selection
  };

  return (
    <div className="bg-[#fafafa] min-h-screen text-neutral-900 pb-24">
      
      {/* ⚡ SEO Accessibility Layer (Invisible but indexed perfectly by Google/Bing and ad crawlers) */}
      <div className="sr-only" aria-hidden="false">
        <h2>5 Easy Steps to buy Vehicles & Machinery from CarChief Stock</h2>
        <p>Excellent Quality &amp; Well Inspected Cars, Vans, Trucks, Buses &amp; Construction Machinery available in stock ready to Export.</p>
        {steps.map((st) => (
          <article key={st.id}>
            <h3>Step {st.stepNum}: {st.title}</h3>
            <p>{st.desc}</p>
          </article>
        ))}
      </div>

      {/* Editorial Page Hero Header (Full Width with Reduced Height) */}
      <section className="relative bg-neutral-950 text-white py-10 sm:py-12 border-b border-neutral-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent z-10" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Unsplash maritime yard background */}
        <div className="absolute inset-0 opacity-15">
          <img 
            src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&auto=format&fit=crop&q=80" 
            alt="Ocean Container Port" 
            className="w-full h-full object-cover grayscale brightness-75 scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <span className="inline-block text-[10px] uppercase font-mono tracking-[0.25em] text-red-500 font-extrabold bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
              Automotive Trade Sourcing Guide
            </span>
            <h1 className="text-2xl sm:text-4xl font-display font-black uppercase tracking-tight leading-[1.1] text-white">
              5 Easy Steps to buy Vehicles & Machinery from Our Stock
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-2xl">
              Excellent Quality &amp; Well Inspected Cars, Vans, Trucks, Buses &amp; Construction Machinery available in stock ready to Export.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => onNavigate('showroom')}
              className="bg-red-600 hover:bg-red-500 text-white font-display text-xs uppercase tracking-widest font-black py-3 px-6 rounded-xl transition-all duration-300 shadow-xl shadow-red-600/15 inline-flex items-center gap-2 hover:scale-105 cursor-pointer"
              id="buy-now-showroom-link"
            >
              <Compass className="w-4 h-4" />
              <span>BUY NOW Japan Used Cars Stock</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Sourcing Slideshow Widget */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        
        {/* Play/Pause & Step Indicators Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white border border-neutral-200/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isPlaying 
                  ? 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100' 
                  : 'bg-neutral-900 border-neutral-950 text-white hover:bg-neutral-800'
              }`}
              title={isPlaying ? "Pause Slide Show" : "Auto Play Slide Show"}
              id="slideshow-play-pause-btn"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
            </button>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                Slide Show Mode
              </span>
              <span className="block text-xs font-bold text-neutral-800 uppercase tracking-tight">
                {isPlaying ? 'Auto-playing Sourcing Steps' : 'Slideshow Paused'}
              </span>
            </div>
          </div>

          {/* Sizing Indicator Dots with dynamic fill bar */}
          <div className="flex items-center gap-2.5">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => selectStepManual(idx)}
                className={`h-2.5 rounded-full transition-all relative overflow-hidden cursor-pointer ${
                  activeStep === idx 
                    ? 'w-12 bg-red-600' 
                    : 'w-2.5 bg-neutral-200 hover:bg-neutral-300'
                }`}
                title={`Jump to step ${step.stepNum}`}
                id={`indicator-dot-${step.stepNum}`}
              >
                {activeStep === idx && isPlaying && (
                  <motion.div
                    initial={{ left: '-100%' }}
                    animate={{ left: '0%' }}
                    transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
                    className="absolute inset-y-0 left-0 bg-white/30 w-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step Selector Horizontal Pipeline */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm mb-8">
          <div className="flex flex-wrap sm:flex-nowrap justify-between gap-2">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.id}
                  onClick={() => selectStepManual(idx)}
                  className={`flex-1 min-w-[120px] text-center p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-neutral-950 border-neutral-950 text-white shadow-md' 
                      : 'bg-neutral-50/50 border-neutral-100 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                  id={`pipeline-step-tab-${step.stepNum}`}
                >
                  <span className="block text-[9px] font-mono font-black tracking-wider text-red-500">
                    STEP {step.stepNum}
                  </span>
                  <span className="block text-xs font-bold uppercase font-display tracking-tight mt-0.5 truncate max-w-[140px] mx-auto">
                    {step.title.split('&')[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Panel Box with Arrow Navigations */}
        <div className="relative">
          
          {/* Slide Deck Card Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-neutral-200/85 rounded-3xl p-6.5 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.035)] relative overflow-hidden"
              id="how-to-buy-wizard-card"
            >
              {/* Top Row: Icon and Large Indicator */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-6 mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded">
                    Milestone Registry
                  </span>
                  <h3 className="text-xl sm:text-2xl font-display font-black uppercase text-neutral-950 tracking-tight mt-3">
                    {steps[activeStep].title}
                  </h3>
                </div>
                
                <div className={`w-14 h-14 bg-gradient-to-br ${steps[activeStep].color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                  {React.createElement(steps[activeStep].icon, { className: "w-6 h-6" })}
                </div>
              </div>

              {/* Core Text Section */}
              <div className="space-y-6">
                <div className="flex gap-6 items-start">
                  <span className="text-5xl sm:text-6xl font-display font-black text-neutral-100 font-mono tracking-tighter shrink-0 select-none">
                    {steps[activeStep].stepNum}
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light mt-2.5">
                    {steps[activeStep].desc}
                  </p>
                </div>

                {/* Jump to Navigation links inside the Step - as requested */}
                <div className="border-t border-neutral-100 pt-6 mt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Step jump cluster */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                        Jump to:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {steps.map((st, sIdx) => (
                          <button
                            key={st.id}
                            onClick={() => selectStepManual(sIdx)}
                            className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                              activeStep === sIdx 
                                ? 'bg-red-600 text-white font-extrabold shadow-sm' 
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-950'
                            }`}
                            id={`step-${activeStep}-jump-link-${st.stepNum}`}
                          >
                            Step {st.id + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onNavigate('showroom')}
                        className="text-[10px] font-mono font-bold uppercase text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-400 px-4 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        Browse Stock
                      </button>
                      <button
                        onClick={() => onNavigate('contact')}
                        className="text-[10px] font-mono font-bold uppercase text-white bg-neutral-950 hover:bg-neutral-900 px-4 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        Inquire Form
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>

          {/* Left Side Arrow Button */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 sm:-translate-x-7 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 border border-neutral-200 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all z-20 hover:scale-105 cursor-pointer"
            title="Previous Step"
            id="slideshow-prev-arrow"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Side Arrow Button */}
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 sm:translate-x-7 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 border border-neutral-200 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all z-20 hover:scale-105 cursor-pointer"
            title="Next Step"
            id="slideshow-next-arrow"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </section>

      {/* Trust guarantees footer card */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-neutral-950 text-white rounded-2xl border border-neutral-800 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest">Excellent Quality Ensured</h4>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              Every car, van, truck, bus, and construction machinery goes through deep operational checks, including complete engine compression checks, mileage checks, and dynamic road tests prior to export.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest">Global Export Delivery</h4>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              We arrange quick shipment from Japan &amp; Rotterdam harbors utilizing reliable carrier vessels. All original compliance documents, custom clearances, and titles are couriered express so they reach you well in time.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
