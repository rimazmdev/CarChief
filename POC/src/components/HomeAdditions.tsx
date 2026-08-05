/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Award, Ship, Star, Quote, ChevronDown, Compass, BookOpen, MessageSquare, HelpCircle, ArrowRight } from 'lucide-react';
import { AppView } from './Header';

interface HomeAdditionsProps {
  onNavigate: (view: AppView) => void;
}

export default function HomeAdditions({ onNavigate }: HomeAdditionsProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const stepsPreview = [
    { step: '01', title: 'Select Car & Get Quote', desc: 'Browse our high-quality stock list ready to export and click Get Free Quote to submit an inquiry.' },
    { step: '02', title: 'Confirm Order & Invoice', desc: 'Confirm your order details and receive a formal invoice containing our bank details and final payment amounts.' },
    { step: '03', title: 'Make Payment & Share', desc: 'Complete your bank wire transfer and upload/share the receipt so our accounts department can track it fast.' },
    { step: '04', title: 'Shipment & Documents', desc: 'We book the earliest maritime container shipment and courier original export title papers right after departure.' },
    { step: '05', title: 'Receive Your Vehicle', desc: 'Hire a local clearing agent to handle import clearance, settle local taxes, and register your vehicle.' },
  ];

  const miniFaqs = [
    {
      question: 'Is CarChief an authorized vehicle dealership or an export agency?',
      answer: 'CarChief functions as a premium curator and global maritime logistics broker. We acquire vehicles directly from European and Japanese dealer networks, execute 150-point diagnostics, and manage deep-sea container freight to high-net-worth individuals and corporate dealerships worldwide.'
    },
    {
      question: 'Will I receive a clean title to register the vehicle in my home country?',
      answer: 'Yes. Every delivery is accompanied by the full title provenance: the original Certificate of Origin, German Export Title (Fahrzeugbrief), official customs clearance gate stamps, and a formal commercial bill of sale.'
    },
    {
      question: 'What is included in the shown vehicle price?',
      answer: 'The showroom price includes the cost of the physical vehicle, German/Dutch VAT clearing, certified pre-sealing diagnostic inspection, and standard export paper preparations. It excludes international ocean cargo and customs tax which can be calculated via the dynamic Freight Estimator on any vehicle details page.'
    }
  ];

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as any } 
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }
    }
  };

  return (
    <div className="space-y-10 sm:space-y-24 mt-10 sm:mt-24" id="home-additions-root">
      
      {/* 1. Welcome To CarChief & Operations Stats */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch" 
        id="home-welcome-stats"
      >
        {/* Left column: Welcome, Vision & Mission Teaser */}
        <div className="hidden sm:flex lg:col-span-6 bg-neutral-950 text-white rounded-3xl p-8 border border-neutral-800 shadow-xl flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-4 relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-500 font-extrabold">Corporate Statement</span>
            <h3 className="text-2xl font-display font-black uppercase tracking-tight text-white leading-none">
              Welcome To <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">CarChief!</span>
            </h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              We are premium curators and global maritime logistics brokers. Together with our dealer partners, we redefine the online car buying experience, turning dreams into reality.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-amber-500 uppercase tracking-wider font-extrabold">OUR VISION</span>
                <p className="text-xs font-bold text-neutral-200">To Transform Dreams Into Reality</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-amber-500 uppercase tracking-wider font-extrabold">OUR MISSION</span>
                <p className="text-xs font-bold text-neutral-200">Convenience, Happiness, And Distinction</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 relative z-10">
            <button
              onClick={() => onNavigate('about')}
              className="text-xs font-bold text-amber-500 hover:text-amber-400 font-mono tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer hover:translate-x-1 transition-transform"
              id="home-welcome-about-btn"
            >
              <span>Explore our full vision</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right column: CarChief Operations Stats */}
        <div className="lg:col-span-6 bg-white border border-neutral-200/60 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-2 mb-6 sm:mb-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600 font-extrabold">Global Footprint</span>
            <h3 className="text-lg font-display font-black uppercase tracking-tight text-neutral-950">
              CarChief Operations
            </h3>
            <p className="text-xs text-neutral-400 font-light font-sans leading-relaxed">
              Serving the automotive dealership sector worldwide with high-quality stock lists, expert diagnostics, and secure container shipping.
            </p>
          </div>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-2 gap-4"
          >
            <motion.div variants={staggerItem} className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-center space-y-1 shadow-inner hover:bg-neutral-100/50 transition-colors">
              <span className="block text-3xl font-display font-black text-neutral-950 font-mono tracking-tight">35</span>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">YEARS</span>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-center space-y-1 shadow-inner hover:bg-neutral-100/50 transition-colors">
              <span className="block text-3xl font-display font-black text-neutral-950 font-mono tracking-tight">14</span>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">COUNTRIES</span>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-center space-y-1 shadow-inner hover:bg-neutral-100/50 transition-colors">
              <span className="block text-3xl font-display font-black text-neutral-950 font-mono tracking-tight">4</span>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">CONTINENTS</span>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-center space-y-1 shadow-inner hover:bg-neutral-100/50 transition-colors">
              <span className="block text-3xl font-display font-black text-neutral-950 font-mono tracking-tight">9</span>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">OFFICES</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. Sourcing Blueprint Summary */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
        className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-10 items-center" 
        id="home-blueprint-section"
      >
        <div className="lg:col-span-5 space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-600 tracking-[0.2em] bg-amber-600/10 px-3 py-1 rounded-full border border-amber-500/10">Sourcing Guide</span>
          <h3 className="text-3xl font-display font-black uppercase text-neutral-950 tracking-tight leading-none">
            THE CARCHIEF <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">5-STEP BLUEPRINT</span>
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
            Acquiring intercontinental vehicles requires absolute logistics precision. We manage the entire loop from export diagnostics to final driveway offloading.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('how-to-buy')}
              className="bg-neutral-950 hover:bg-neutral-900 text-white font-display text-xs uppercase tracking-wider font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 hover:scale-105 shadow-md shadow-neutral-900/10 cursor-pointer"
              id="home-blueprint-view-btn"
            >
              <span>View Sourcing Timeline</span>
              <ArrowRight className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>

        <motion.div 
          variants={staggerContainer}
          className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {stepsPreview.map((item, idx) => {
            return (
              <motion.div 
                key={idx} 
                variants={staggerItem}
                className="bg-white border border-neutral-200/60 p-5 rounded-2xl space-y-2 shadow-sm flex gap-4 hover:border-amber-500/20 hover:shadow-md transition-all duration-300"
              >
                <span className="text-xl font-display font-black text-amber-500 font-mono tracking-tighter shrink-0">{item.step}</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-950 uppercase tracking-tight font-display">{item.title}</h4>
                  <p className="text-[10px] sm:text-xs text-neutral-400 font-light leading-normal">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* 3. High-Contrast Beautiful Testimonials Showcase */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
        className="hidden sm:block bg-white rounded-3xl p-8 sm:p-10 border border-neutral-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] relative overflow-hidden" 
        id="home-endorsement-banner"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-neutral-100 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-neutral-100 pb-8 mb-8">
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-600 tracking-[0.2em] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Client Logs
            </span>
            <h3 className="text-2xl font-display font-black uppercase text-neutral-950 tracking-tight">
              COLLECTOR ENDORSEMENTS
            </h3>
            <p className="text-xs text-neutral-500 max-w-md">
              Read real logs from international automobile collectors, fleet buyers, and prestige dealers who import with us.
            </p>
          </div>
          <button
            onClick={() => onNavigate('testimonials')}
            className="bg-neutral-950 hover:bg-neutral-900 text-white font-display text-[10px] sm:text-xs uppercase tracking-wider font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-md shadow-neutral-950/10 flex items-center gap-2 cursor-pointer hover:scale-105"
            id="home-endorsement-view-btn"
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Submit / Read All logs</span>
          </button>
        </div>

        {/* Mini 3-Card Grid of Elegant Testimonials */}
        <motion.div 
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10"
        >
          {[
            {
              name: 'Julian Vance',
              location: 'Geneva, Switzerland',
              vehicle: 'Porsche 911 GT3 RS',
              text: 'The paint-thickness meter files and direct suspension video files provided by CarChief were flawless. Delivery inside a vacuum-sealed sea container preserved the paint completely. Simply outstanding.',
              initials: 'JV'
            },
            {
              name: 'Sophia Chen',
              location: 'Singapore',
              vehicle: 'Mercedes-AMG G63',
              text: 'Apex Import Corp has imported over fifteen vehicles via CarChief’s Rotterdam logistics gate. Their customs brokerage pre-filing eliminates delays entirely. Unparalleled professional logistics.',
              initials: 'SC'
            },
            {
              name: 'Marcus Sterling',
              location: 'London, United Kingdom',
              vehicle: 'Ferrari F40 Spec',
              text: 'Purchasing a classic halo supercar of this caliber across seas is highly stressful. CarChief coordinated escrow lines and arranged special mechanical clearance with extreme care. Trustworthy.',
              initials: 'MS'
            }
          ].map((item, i) => (
            <motion.div 
              key={i} 
              variants={staggerItem}
              className="bg-neutral-50 border border-neutral-200/80 p-5 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-amber-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, starIdx) => (
                    <Star key={starIdx} className="w-3 h-3 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs text-neutral-600 italic leading-relaxed font-sans font-light">
                  "{item.text}"
                </p>
              </div>
              
              <div className="flex items-center gap-2.5 pt-4 mt-4 border-t border-neutral-200/40">
                <div className="w-7 h-7 rounded-full bg-neutral-950 flex items-center justify-center font-mono font-black text-[10px] text-white shrink-0">
                  {item.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-bold font-display uppercase tracking-wider text-neutral-900 truncate">{item.name}</h4>
                  <p className="text-[9px] text-neutral-400 font-sans truncate">{item.location}</p>
                </div>
                <span className="shrink-0 text-[8px] font-mono text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-bold uppercase">
                  {item.vehicle}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* 4. Mini FAQ Preview */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
        className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-10" 
        id="home-mini-faq-section"
      >
        <div className="lg:col-span-4 space-y-4">
          <span className="text-[10px] font-mono font-bold uppercase text-amber-600 tracking-[0.2em] bg-amber-600/10 px-3 py-1 rounded-full border border-amber-500/10">Help Desk</span>
          <h3 className="text-2xl font-display font-black uppercase text-neutral-950 tracking-tight leading-none">
            FREQUENTLY <br />
            ASKED LOGS
          </h3>
          <p className="text-xs text-neutral-500 font-light leading-relaxed">
            Review standard operating procedures regarding customs compliance, clean titles, and vehicle specifications.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('faq')}
              className="text-xs font-bold text-amber-600 hover:text-amber-500 font-mono tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer hover:translate-x-1 transition-transform"
              id="home-mini-faq-all-btn"
            >
              <span>Explore full FAQ archive</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <motion.div 
          variants={staggerContainer}
          className="lg:col-span-8 space-y-3"
        >
          {miniFaqs.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <motion.div 
                key={idx} 
                variants={staggerItem}
                className="bg-white border border-neutral-200/60 rounded-xl overflow-hidden shadow-sm hover:border-neutral-300 transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="w-full text-left p-4 flex justify-between items-center gap-4 font-display hover:bg-neutral-50/40 transition-colors cursor-pointer"
                  id={`home-faq-btn-${idx}`}
                >
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-tight">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180 text-amber-600' : ''
                  }`} />
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-neutral-100 bg-neutral-50/20"
                    >
                      <p className="p-4 text-xs text-neutral-600 leading-relaxed font-sans font-light">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

    </div>
  );
}
