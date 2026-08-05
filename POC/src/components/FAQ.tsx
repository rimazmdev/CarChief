/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, ChevronDown, PhoneCall, Search, Sparkles, AlertCircle, 
  RefreshCw, CheckCircle2, ShieldCheck, ArrowRight, CornerDownRight, 
  Layers, HelpCircle as HelpIcon, ArrowUpRight, X
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemFAQItem } from '../types';

interface FAQProps {
  onNavigate: (view: 'showroom' | 'freight' | 'contact') => void;
}

const STATIC_FALLBACK_FAQS: Omit<SystemFAQItem, 'id'>[] = [
  {
    Question: 'Is CarChief an authorized vehicle dealership or an export agency?',
    Answer: 'CarChief functions as a premium curator and global maritime logistics broker. We acquire vehicles directly from European and Japanese dealer networks, execute 150-point diagnostics, and manage deep-sea container freight to high-net-worth individuals and corporate dealerships worldwide.',
    Category: 'Buying Vehicles',
    Keywords: 'agency, broker, dealership, stock, license',
    Priority: 1,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'Are all vehicles shown in the catalog actually in stock?',
    Answer: 'Yes. Every model listed as "Available" in our showroom represents an inspected specimen car either staged at our Munich headquarters, stationed at our Rotterdam shipping warehouses, or clearing final export paperwork.',
    Category: 'Buying Vehicles',
    Keywords: 'inventory, catalog, stock, Munich, Rotterdam',
    Priority: 2,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'What is included in the shown vehicle price?',
    Answer: 'The showroom price includes the cost of the physical vehicle, German/Dutch VAT clearing, certified pre-sealing diagnostic inspection, and standard export paper preparations. It excludes international ocean cargo and customs tax which can be calculated via the dynamic Freight Estimator on any vehicle details page.',
    Category: 'Payments',
    Keywords: 'price, cost, vat, tax, customs, estimator',
    Priority: 3,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'Can you source specific models or color specs that are not currently in the showroom?',
    Answer: 'Absolutely. Submit a request via our Contact form. Our Sourcing Agents have direct access to restricted European manufacturer archives and major supercar dealer grids.',
    Category: 'Buying Vehicles',
    Keywords: 'source, custom, select, supercar, contact, order',
    Priority: 4,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'What is the average transit time for ocean cargo container delivery?',
    Answer: 'Transit times depend strictly on the final destination port. Standard RoRo (Roll-On/Roll-Off) delivery to major US East Coast ports averages 14–21 days. Full high-cube container shipping to major Asian hubs averages 28–35 days.',
    Category: 'Shipping',
    Keywords: 'transit, transport, container, duration, time, port',
    Priority: 5,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'How is my vehicle protected inside the maritime container?',
    Answer: 'Vehicles are loaded exclusively into high-cube dry containers. We lock the vehicle in place using heavy-duty nylon wheel-binding harness straps anchored to steel container eyelets. No metal contact is made with chassis components.',
    Category: 'Shipping',
    Keywords: 'protection, cargo, tie down, straps, damage, safety',
    Priority: 6,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'How are customs clearing and EPA compliance handled?',
    Answer: 'CarChief’s integrated freight agency coordinates with registered customs brokers in Rotterdam and destination ports. We file full pre-manifest records (ISF), clear port duties, and supply official customs clearance stamped documents (e.g. EPA Form 3520-1 and DOT Form HS-7).',
    Category: 'Documentation',
    Keywords: 'customs, customs clearance, epa, dot, forms, duties',
    Priority: 7,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'Will I receive a clean title to register the vehicle in my home country?',
    Answer: 'Yes. Every delivery is accompanied by the full title provenance: the original Certificate of Origin, German Export Title (Fahrzeugbrief), official customs clearance gate stamps, and a formal commercial bill of sale.',
    Category: 'Documentation',
    Keywords: 'title, registration, bill of sale, paperwork, stamps',
    Priority: 8,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  }
];

export default function FAQ({ onNavigate }: FAQProps) {
  const [faqs, setFaqs] = useState<SystemFAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // AI Answering states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [matchedFaq, setMatchedFaq] = useState<SystemFAQItem | null>(null);
  const [askingQuery, setAskingQuery] = useState<string>('');

  // Fetch FAQs from Firestore on mount
  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'faq'), orderBy('Priority', 'asc'));
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemFAQItem[];

        if (records.length > 0) {
          setFaqs(records);
        } else {
          // If Firestore collection is empty, fall back to default structured static records
          const mappedStatic = STATIC_FALLBACK_FAQS.map((item, index) => ({
            id: `static-${index}`,
            ...item
          })) as SystemFAQItem[];
          setFaqs(mappedStatic);
        }
      } catch (err) {
        console.warn('Firestore FAQ fetch failed or missing security rules. Using robust static fallback:', err);
        const mappedStatic = STATIC_FALLBACK_FAQS.map((item, index) => ({
          id: `static-${index}`,
          ...item
        })) as SystemFAQItem[];
        setFaqs(mappedStatic);
      } finally {
        setLoading(false);
      }
    };
    loadFAQs();
  }, []);

  // Filter out disabled items
  const activeFaqs = faqs.filter(f => f.Status !== 'disabled' && (f as any).status !== 'disabled');

  // Extract unique categories dynamically from active FAQs
  const categories: string[] = ['All', ...(Array.from(new Set(activeFaqs.map(f => String(f.Category || '')))) as string[])];

  // Heuristic Search and Filter of FAQ Accordions
  const filteredFaqs = activeFaqs.filter(faq => {
    const matchesSearch = 
      faq.Question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.Answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.Keywords.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || faq.Category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // 3-Step Intelligent Search & Ask AI logic
  const handleAskAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    setAiLoading(true);
    setAiAnswer(null);
    setAiError(null);
    setMatchedFaq(null);
    setAskingQuery(queryStr);

    try {
      // STEP 1 & 2: Local cache / Optimized Search Heuristic
      const lowercaseQuery = queryStr.toLowerCase();
      
      // Let's find if there is an exact or highly relevant keyword matches locally
      const perfectMatch = activeFaqs.find(f => {
        const qLower = f.Question.toLowerCase();
        const kwLower = f.Keywords.toLowerCase();
        
        // Exact match or highly close matching
        const containsQuestion = qLower.includes(lowercaseQuery) || lowercaseQuery.includes(qLower);
        const containsKeywords = kwLower.split(',').map(k => k.trim()).some(k => k && lowercaseQuery.includes(k));
        
        return containsQuestion || containsKeywords;
      });

      if (perfectMatch) {
        // High confidence match found locally in cache without calling Gemini, saving tokens and latency!
        setTimeout(() => {
          setAiAnswer(perfectMatch.Answer);
          setMatchedFaq(perfectMatch);
          setAiLoading(false);
        }, 500); // Small delay to signify database search lookup
        return;
      }

      // STEP 3: Server-side Gemini AI Ask
      const response = await fetch('/api/faq-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryStr, faqs: activeFaqs })
      });

      if (!response.ok) {
        throw new Error('Gemini API search request unsuccessful.');
      }

      const data = await response.json();
      setAiAnswer(data.answer);
    } catch (err: any) {
      console.error('FAQ AI process failed:', err);
      setAiError('Our intelligent lookup assistant is experiencing transient cargo. Please refer to our static categories below or contact our desk advisors.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuickQuestion = (qText: string) => {
    setSearchQuery(qText);
    // Scroll smoothly to top search input block
    window.scrollTo({ top: 120, behavior: 'smooth' });
    // Trigger Ask AI with the question text
    setTimeout(() => {
      const askBtn = document.getElementById('ask-ai-submit-btn');
      if (askBtn) askBtn.click();
    }, 100);
  };

  return (
    <div className="bg-[#fafafa] min-h-screen text-neutral-900 pb-20">
      
      {/* Dynamic Header Hero */}
      <section className="relative bg-neutral-950 text-white py-20 border-b border-neutral-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent z-10" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Background illustration image */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=1600&auto=format&fit=crop&q=80" 
            alt="Munich logistics dry storage facility" 
            className="w-full h-full object-cover grayscale brightness-75 scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
          <div className="max-w-3xl space-y-4">
            <span className="inline-block text-[10px] uppercase font-mono tracking-[0.25em] text-amber-500 font-extrabold bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full">
              Intelligent Verified Archive
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight leading-[1.05]">
              AI-POWERED LOGISTICS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">KNOWLEDGE BASE</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-2xl leading-relaxed">
              Ask questions in plain English. Our grounded AI assistant answers questions strictly using our approved logistical guidelines, preventing false statements or hallucinations.
            </p>
          </div>
        </div>
      </section>

      {/* SEARCH AND ASK AI BAR SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-30">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleAskAI} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                <Search className="w-4.5 h-4.5 text-amber-600" />
              </span>
              <input
                type="text"
                placeholder="Ask our AI: 'What is CIF shipping?' or 'How long does container delivery take?'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white text-xs sm:text-sm border border-neutral-200 focus:border-amber-600 rounded-xl pl-10.5 p-3.5 outline-none transition-all font-sans"
                id="faq-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setAiAnswer(null);
                    setMatchedFaq(null);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              id="ask-ai-submit-btn"
              disabled={aiLoading || !searchQuery.trim()}
              className="bg-neutral-950 hover:bg-neutral-900 text-white font-display text-xs font-bold uppercase tracking-wider px-6 py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Ask CarChief AI</span>
            </button>
          </form>

          {/* Prompt Recommendations */}
          <div className="mt-3.5 pt-3.5 border-t border-neutral-100 flex flex-wrap gap-2 items-center text-[11px]">
            <span className="text-neutral-400 font-mono uppercase font-bold tracking-wider">Suggested:</span>
            {[
              'How long does container shipping take?',
              'What is CIF?',
              'Will I receive a clean title?',
              'What documents are supplied?'
            ].map((suggested, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(suggested)}
                className="text-neutral-600 hover:text-amber-600 bg-neutral-50 hover:bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200/60 transition-colors cursor-pointer font-medium"
              >
                {suggested}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI RESPONSE DISPLAY AREA */}
      <AnimatePresence mode="wait">
        {(aiLoading || aiAnswer || aiError) && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 relative z-20">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
            >
              {/* Card Header Banner */}
              <div className="bg-neutral-950 text-white px-5 py-4 flex justify-between items-center border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-amber-500">
                    Grounded AI Consultant
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>VERIFIED KNOWLEDGE</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {aiLoading ? (
                  <div className="py-8 text-center space-y-3.5">
                    <div className="relative w-10 h-10 mx-auto">
                      <div className="absolute inset-0 border-2 border-neutral-100 rounded-full" />
                      <div className="absolute inset-0 border-2 border-amber-600 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest animate-pulse">
                      Consulting approved knowledge base...
                    </p>
                  </div>
                ) : aiError ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-wide">Lookup Failure</p>
                      <p className="font-light leading-relaxed">{aiError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* The Question asked */}
                    <div className="flex items-start gap-2 text-neutral-400 font-mono text-xs border-b border-neutral-100 pb-3">
                      <CornerDownRight className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Question: "{askingQuery}"</span>
                    </div>

                    {/* The Answer text */}
                    <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-light font-sans whitespace-pre-wrap">
                      {aiAnswer}
                    </div>

                    {/* Display Grounding Source if matched locally */}
                    {matchedFaq && (
                      <div className="bg-amber-50/45 border border-amber-100 rounded-xl p-3 flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Direct local cache match: <strong>{matchedFaq.Category}</strong></span>
                        </div>
                        <span className="text-[9px] font-mono text-neutral-400">Heuristic Lookup</span>
                      </div>
                    )}

                    {/* Fallback Advisor Button in case question was not answered */}
                    {(aiAnswer?.includes('not covered') || aiAnswer?.includes('Contact Advisor')) && (
                      <div className="bg-neutral-50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border border-neutral-150 mt-4">
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-bold text-neutral-950">Connect with a Live Specialist</p>
                          <p className="text-[11px] text-neutral-500">Submit a direct verification ticket and a logistics coordinator will reply within 4 hours.</p>
                        </div>
                        <button
                          onClick={() => onNavigate('contact')}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] uppercase tracking-wider font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Contact Desk</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </section>
        )}
      </AnimatePresence>

      {/* Main FAQ Panel with Categories & Accordions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Search & Category Selection */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Filter Search */}
            <div className="bg-white border border-neutral-200/60 rounded-2xl p-5.5 space-y-4 shadow-[0_2px_15px_rgba(0,0,0,0.015)]">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                Keyword Filter
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                  <Search className="w-4 h-4 text-amber-600" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Title, Rotterdam, Escrow..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-xl pl-9.5 p-3.5 focus:outline-none focus:border-amber-600 bg-neutral-50/50 focus:bg-white transition-all"
                  id="faq-search-filter"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white border border-neutral-200/60 rounded-2xl p-5.5 space-y-3.5 shadow-[0_2px_15px_rgba(0,0,0,0.015)]">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                Operation Categories
              </label>
              <div className="flex flex-wrap lg:flex-col gap-2.5">
                {categories.map((cat) => {
                  const count = cat === 'All' ? activeFaqs.length : activeFaqs.filter(f => f.Category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setExpandedId(null);
                      }}
                      className={`text-left text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all duration-300 w-full cursor-pointer flex justify-between items-center ${
                        selectedCategory === cat
                          ? 'bg-neutral-950 border-neutral-950 text-white font-bold shadow-sm'
                          : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                      id={`faq-cat-btn-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <span>{cat === 'All' ? 'All Questions' : cat}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        selectedCategory === cat ? 'bg-amber-600 text-white' : 'bg-neutral-200/60 text-neutral-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Accordion */}
          <div className="lg:col-span-8">
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white border border-neutral-200 p-12 text-center rounded-2xl space-y-3 shadow-sm">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    Synchronizing logistics database...
                  </p>
                </div>
              ) : filteredFaqs.length === 0 ? (
                <div className="bg-white border border-dashed border-neutral-200/80 p-12 text-center rounded-2xl space-y-3 shadow-sm">
                  <HelpIcon className="w-10 h-10 text-neutral-300 mx-auto animate-pulse" />
                  <p className="text-sm font-bold text-neutral-800 uppercase tracking-wider">No matching answers</p>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                    We could not find any archived questions matching your exact keyword. Try asking our <strong>CarChief AI</strong> above for a semantic lookup, or submit a lead to our desk advisors.
                  </p>
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isExpanded = expandedId === faq.id;
                  return (
                    <div
                      key={faq.id || idx}
                      className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-all duration-300"
                    >
                      <button
                        onClick={() => faq.id && toggleExpand(faq.id)}
                        className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-display hover:bg-neutral-50/45 transition-colors cursor-pointer"
                        id={`faq-question-btn-${faq.id || idx}`}
                      >
                        <div className="space-y-1.5 pr-2">
                          <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                            {faq.Category}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-950 uppercase tracking-tight mt-1">
                            {faq.Question}
                          </h4>
                        </div>
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
                            transition={{ duration: 0.3 }}
                            className="border-t border-neutral-100 bg-neutral-50/20"
                          >
                            <div className="p-5 sm:p-6 text-xs sm:text-sm text-neutral-600 leading-relaxed font-light font-sans">
                              {faq.Answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick help desk CTA */}
            <div className="bg-white border border-neutral-200/80 p-6 sm:p-8 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.015)] mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold uppercase tracking-tight text-neutral-950">Still have unanswered queries?</h4>
                <p className="text-xs text-neutral-500 font-light leading-relaxed">
                  Our direct desk agents are available 6 days a week to clear up any deep-sea shipping uncertainties.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('contact')}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-display text-xs uppercase tracking-wider font-bold py-2.5 px-5 rounded-lg transition-all flex items-center gap-1.5 hover:scale-105 cursor-pointer"
                  id="faq-contact-btn"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Contact Advisor
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
