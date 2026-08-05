/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Award, Globe2, Target, Milestone, Compass, ArrowRight, Building2, Landmark, HelpCircle, Heart } from 'lucide-react';

interface AboutUsProps {
  onNavigate: (view: 'showroom' | 'freight' | 'contact') => void;
}

export default function AboutUs({ onNavigate }: AboutUsProps) {
  const stats = [
    { label: 'YEARS', value: '35', icon: Milestone },
    { label: 'COUNTRIES', value: '14', icon: Globe2 },
    { label: 'CONTINENTS', value: '4', icon: Compass },
    { label: 'OFFICES', value: '9', icon: Building2 },
  ];

  // Dynamic SEO and PPC Meta optimization
  useEffect(() => {
    // 1. Update Title and Meta Tags dynamically for search bots & PPC Quality Score scans
    const previousTitle = document.title;
    document.title = "About Us | CarChief - Global Japanese Used Cars Sourcing & Export";
    
    // Dynamic meta description for crawlers
    let metaDesc = document.querySelector('meta[name="description"]');
    const hasExistingMetaDesc = !!metaDesc;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const previousDesc = metaDesc.getAttribute('content') || '';
    metaDesc.setAttribute('content', 'Learn more about CarChief. Our vision is to transform dreams into reality, serving automotive dealers across 14 countries and 4 continents with secure used vehicle export from Japan.');

    // 2. Structured JSON-LD Organization Data (Crucial for Google Rich snippets & SEO scoring)
    const schemaId = 'seo-about-jsonld';
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = schemaId;
      schemaScript.type = 'application/ld+json';
      schemaScript.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        "name": "CarChief",
        "url": window.location.origin,
        "logo": `${window.location.origin}/logo.png`,
        "description": "Premium global automotive curators and logistics brokers. Sourcing and exporting high-quality used cars, vans, trucks, and machinery from Japan.",
        "foundingDate": "1991",
        "knowsAbout": ["Japanese Used Car Sourcing", "Marine Cargo Shipping", "Automotive Trade Logistics"],
        "areaServed": ["Global", "14 Countries", "Rotterdam", "East Africa", "Caribbean", "Pacific Islands"],
        "numberOfEmployees": "120"
      });
      document.head.appendChild(schemaScript);
    }

    return () => {
      // Restore previous state upon unmounting
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

  return (
    <div className="bg-[#fafafa] min-h-screen text-neutral-900 overflow-hidden">
      
      {/* Editorial Page Hero (Full Width with Reduced Height) */}
      <section className="relative bg-neutral-950 text-white py-10 sm:py-12 border-b border-neutral-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent z-10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Background Unsplash Image */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1562591176-f3029cf2e263?w=1600&auto=format&fit=crop&q=80" 
            alt="Munich Corporate Showroom" 
            className="w-full h-full object-cover grayscale object-center scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <span className="inline-block text-[10px] uppercase font-mono tracking-[0.25em] text-amber-500 font-extrabold bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full">
              Global Operations Heritage
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight leading-[1.1]" id="about-welcome-title">
              Welcome To <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">CarChief!</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-2xl leading-relaxed">
              We are the premier global automotive curators and logistics broker network, specializing in seamless intercontinental vehicle export and dealer empowerment.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate Statistics Section: CarChief Operations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12" id="about-operations-stats">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
          <div className="text-center mb-6">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600 font-extrabold">Global Infrastructure</span>
            <h3 className="text-sm font-display font-black uppercase tracking-tight text-neutral-950 mt-0.5">CarChief Operations</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center space-y-2 border-r last:border-0 border-neutral-100/80 last:pr-0">
                  <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl w-fit mx-auto border border-amber-100/40">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-display font-black text-neutral-950 font-mono tracking-tight">{stat.value}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-extrabold">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vision & Mission Core Philosophy Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="about-vision-mission-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Vision */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-neutral-200/80 rounded-3xl p-8 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-6"
            id="about-vision-card"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl border border-amber-100/50">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 font-bold">Strategic Pillar</span>
                  <h3 className="text-xl font-display font-black text-neutral-950 uppercase tracking-tight">Our Vision</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider font-display border-b border-neutral-100 pb-2">
                  To Transform Dreams Into Reality
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed">
                  Our vision is to become the trusted partner of choice for dealers, known for our reliability and integrity. We are committed to creating a seamless and transparent experience that empowers dealers to grow their businesses confidently. Through exceptional service, innovative solutions, and unwavering integrity, we aim to be the trusted ally for dealers seeking long-term success.
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed italic">
                  We aim to establish ourselves as a trusted ally for dealers looking to achieve long-term success.
                </p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-neutral-100/80 flex items-center justify-between text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              <span>EST. OPERATIONS</span>
              <span>GLOBAL ALLY REGISTERED</span>
            </div>
          </motion.div>

          {/* Card 2: Mission */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-neutral-200/80 rounded-3xl p-8 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between space-y-6"
            id="about-mission-card"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl border border-amber-100/50">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 font-bold">Operations Mandate</span>
                  <h3 className="text-xl font-display font-black text-neutral-950 uppercase tracking-tight">Our Mission</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider font-display border-b border-neutral-100 pb-2">
                  Convenience, Happiness, And Distinction
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed">
                  Our mission is to be the industry leaders in online car sales, constantly adapting to market trends. We aim to surpass expectations by offering a wide range of cars and reliable, secure delivery through our dedicated fleet. By doing so, we strive to set new standards both online and offline. Our mission is driven by our commitment to dealers, providing them with unmatched opportunities for success in the automotive industry. Together, let's redefine the online car buying experience and empower dealers for long-term growth.
                </p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-neutral-100/80 flex items-center justify-between text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              <span>UNIFIED FLEET</span>
              <span>DEALER DEDICATED</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Global Partnership CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 text-center">
        <div className="bg-neutral-950 text-white p-8 sm:p-12 rounded-3xl shadow-xl space-y-6 relative overflow-hidden border border-neutral-800">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-xl mx-auto space-y-4 relative z-10">
            <h3 className="text-2xl font-display font-black uppercase text-white tracking-tight">Redefining online car procurement</h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              Connect directly with one of our operations coordinators for professional dealer services. We manage the entire loop from export diagnostics to container offloading.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate('contact')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-display text-xs uppercase tracking-wider font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 cursor-pointer shadow-lg shadow-amber-600/10"
                id="about-cta-contact"
              >
                Inquire With An Agent
              </button>
              <button
                onClick={() => onNavigate('showroom')}
                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-display text-xs uppercase tracking-wider font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 cursor-pointer"
                id="about-cta-showroom"
              >
                Browse Stock List
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
