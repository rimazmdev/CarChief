/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SystemFAQItem } from '../types';
import { 
  Plus, Edit, Trash2, Search, Check, X, AlertCircle, HelpCircle, 
  Eye, EyeOff, Sparkles, Filter, RefreshCw, Layers, CheckCircle2 
} from 'lucide-react';

const FAQ_CATEGORIES = [
  'Buying Vehicles',
  'Payments',
  'Finance',
  'Shipping',
  'Documentation',
  'Vehicle Inspection',
  'Auction Process',
  'Delivery',
  'Tracking',
  'Warranty',
  'Company Policies',
  'General Questions'
];

const DEFAULT_SEED_FAQS: Omit<SystemFAQItem, 'id'>[] = [
  {
    Question: 'How do I buy a vehicle?',
    Answer: 'First, select a vehicle from our premium catalog. You can use our dynamic Freight Estimator to calculate custom shipping. Submit an inquiry lead to connect with a dedicated desk agent who will issue your Pro-Forma Invoice and walk you through secure wire payment.',
    Category: 'Buying Vehicles',
    Keywords: 'purchase, guide, acquire, buy car',
    Priority: 1,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'How long does shipping take?',
    Answer: 'Transit times vary based on port infrastructure. Roll-On/Roll-Off (RoRo) shipment to major European and North American terminals averages 14–21 days. Full dry-container shipping to Asian or Middle Eastern hubs ranges between 28–35 days.',
    Category: 'Shipping',
    Keywords: 'transit, time, logistics, duration, port',
    Priority: 2,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'Can I finance a vehicle?',
    Answer: 'Yes. Partner dealerships and corporate clients can request credit lines or split-escrow options. Individual international clients must clear 100% of the Pro-Forma Invoice prior to ocean cargo loading, or arrange domestic financing with local banks.',
    Category: 'Finance',
    Keywords: 'loan, credit, pay, options, escrow',
    Priority: 3,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'What is CIF?',
    Answer: 'CIF (Cost, Insurance, and Freight) is a global maritime trade term. It means CarChief manages and pays for the vehicle purchase price, marine transit insurance, and ocean cargo container freight to your selected port. You only handle local customs clearing and inland transport upon arrival.',
    Category: 'General Questions',
    Keywords: 'cif, shipping terms, insurance, trade, incoterms',
    Priority: 4,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'How do I reserve a car?',
    Answer: 'You can request an online reservation directly on any vehicle detail screen. Standard reservations hold the vehicle for 48 hours for general guests, or up to 72 hours once a Pro-Forma Invoice has been generated. This prevents any other client from purchasing your selected specimen.',
    Category: 'Buying Vehicles',
    Keywords: 'reserve, hold, lock car, duration',
    Priority: 5,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'Can I inspect before buying?',
    Answer: 'Absolutely. Every vehicle undergoes a rigorous 150-point diagnostic seal test at our headquarters in Munich. We supply full high-resolution digital inspection portfolios. You can also deploy independent third-party inspection firms (e.g., SGS, TÜV) to verify structural status.',
    Category: 'Vehicle Inspection',
    Keywords: 'inspect, sgs, tuv, check vehicle, diagnostics',
    Priority: 6,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  },
  {
    Question: 'What documents do I need?',
    Answer: 'To register the car in your home country, we supply the complete Title provenance pack: the original German Export Title (Fahrzeugbrief), original Certificate of Origin, signed bill of sale, customs clearance receipts, and official EPA Form 3520-1 / DOT HS-7 stamps.',
    Category: 'Documentation',
    Keywords: 'title, registry, paperwork, stamps, epa, dot',
    Priority: 7,
    Status: 'enabled',
    UpdatedDate: new Date().toISOString()
  }
];

export default function AdminFAQManager() {
  const [faqs, setFaqs] = useState<SystemFAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState(FAQ_CATEGORIES[0]);
  const [keywords, setKeywords] = useState('');
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');

  const fetchFaqs = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'faq'), orderBy('Priority', 'asc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemFAQItem[];
      setFaqs(items);
    } catch (err: any) {
      console.error('Error fetching FAQs:', err);
      setError('Could not retrieve FAQs from database. Ensure Firebase is configured.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSeedDefaults = async () => {
    setLoading(true);
    setError(null);
    try {
      let count = 0;
      for (const item of DEFAULT_SEED_FAQS) {
        // Prevent exact duplicates by question name
        if (!faqs.some(f => f.Question.toLowerCase() === item.Question.toLowerCase())) {
          await addDoc(collection(db, 'faq'), item);
          count++;
        }
      }
      setSuccess(`Successfully seeded ${count} high-quality FAQ questions in Firestore!`);
      fetchFaqs();
    } catch (err: any) {
      setError(`Seeding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setCategory(FAQ_CATEGORIES[0]);
    setKeywords('');
    setPriority(faqs.length + 1);
    setStatus('enabled');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleOpenAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: SystemFAQItem) => {
    setEditingId(item.id || null);
    setQuestion(item.Question);
    setAnswer(item.Answer);
    setCategory(item.Category);
    setKeywords(item.Keywords);
    setPriority(item.Priority);
    setStatus(item.Status === 'disabled' ? 'disabled' : 'enabled');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Please fill in both the Question and Answer fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      Question: question.trim(),
      Answer: answer.trim(),
      Category: category,
      Keywords: keywords.trim(),
      Priority: Number(priority) || 1,
      Status: status,
      UpdatedDate: new Date().toISOString()
    };

    try {
      if (editingId) {
        // Update
        const docRef = doc(db, 'faq', editingId);
        await updateDoc(docRef, payload);
        setSuccess('FAQ item updated successfully!');
      } else {
        // Create
        await addDoc(collection(db, 'faq'), payload);
        setSuccess('New FAQ item added to database successfully!');
      }
      resetForm();
      fetchFaqs();
    } catch (err: any) {
      console.error('Error saving FAQ:', err);
      setError(`Failed to save FAQ: ${err.message}`);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this FAQ item? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteDoc(doc(db, 'faq', id));
      setSuccess('FAQ item deleted successfully.');
      fetchFaqs();
    } catch (err: any) {
      setError(`Failed to delete FAQ: ${err.message}`);
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: SystemFAQItem) => {
    if (!item.id) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const newStatus = item.Status === 'disabled' ? 'enabled' : 'disabled';
    try {
      await updateDoc(doc(db, 'faq', item.id), {
        Status: newStatus,
        UpdatedDate: new Date().toISOString()
      });
      setSuccess(`FAQ "${item.Question.substring(0, 30)}..." status changed to ${newStatus}.`);
      fetchFaqs();
    } catch (err: any) {
      setError(`Failed to toggle status: ${err.message}`);
      setLoading(false);
    }
  };

  // Filter & Search local list
  const filteredFaqs = faqs.filter(f => {
    const queryStr = searchQuery.toLowerCase();
    const matchSearch = 
      f.Question.toLowerCase().includes(queryStr) || 
      f.Answer.toLowerCase().includes(queryStr) ||
      f.Keywords.toLowerCase().includes(queryStr);
    
    const matchCategory = selectedCategory === 'All' || f.Category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-600/10 border border-red-500/20 text-red-600 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-500">
                AI Knowledge Management
              </span>
              <h2 className="text-xl font-display font-black uppercase tracking-tight text-neutral-950">
                FAQ Management Portal
              </h2>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1.5 max-w-2xl leading-relaxed">
            Manage the primary knowledge repository used by our dynamic user-facing interface and Gemini AI copilot search.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {faqs.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/10"
              title="Add recommended default FAQs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Defaults</span>
            </button>
          )}

          <button
            onClick={handleOpenAddForm}
            className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-neutral-950 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500">
                  Knowledge Editor
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  {editingId ? 'Modify FAQ Item' : 'Create New FAQ Spec'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={resetForm}
                className="text-neutral-400 hover:text-white bg-neutral-800 p-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Question (Natural Language Prompt)
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How do I finance a vehicle purchase?"
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Answer (Approved Knowledge Payload)
                </label>
                <textarea
                  required
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Provide a highly factual, precise answer. Avoid vague statements or promises."
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                    Category Group
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all cursor-pointer font-sans"
                  >
                    {FAQ_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                      Priority Rank
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                      Status State
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Search Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. loan, finance, wire transfer, swift, bank"
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs p-3 rounded-xl outline-none transition-all font-mono"
                />
                <p className="text-[9px] text-neutral-400 font-mono">
                  Used by our search heuristic optimizer to deliver lightning-fast client matches without calling Gemini.
                </p>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-neutral-100 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-750 font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-500 text-white font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? 'Save Changes' : 'Publish Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Filter Bar */}
      <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
            <Search className="w-4 h-4 text-red-600" />
          </span>
          <input
            type="text"
            placeholder="Search questions, answers, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 focus:border-red-600 text-xs rounded-xl pl-9.5 p-3 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Selection */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 md:flex-initial w-full bg-white border border-neutral-200 text-xs rounded-xl p-3 outline-none cursor-pointer focus:border-red-600 transition-colors"
          >
            <option value="All">All Categories ({faqs.length})</option>
            {FAQ_CATEGORIES.map(cat => {
              const count = faqs.filter(f => f.Category === cat).length;
              return (
                <option key={cat} value={cat}>{cat} ({count})</option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading && faqs.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600" />
          <p className="text-xs font-mono uppercase tracking-wider">Synchronizing FAQ Records...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="border border-dashed border-neutral-200 p-12 text-center rounded-2xl space-y-3 bg-neutral-50/50">
          <HelpCircle className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            No FAQ Items Match Filters
          </p>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto leading-relaxed">
            There are no FAQ specifications registered under this category or search keyword. Add a new item or clear the filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-neutral-200/60 rounded-xl shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-950 text-white font-mono text-[9px] uppercase tracking-wider border-b border-neutral-800">
                <th className="p-4 w-12 text-center">Rank</th>
                <th className="p-4 w-1/3">Question / Category</th>
                <th className="p-4 w-1/3">Answer Payload</th>
                <th className="p-4">Keywords</th>
                <th className="p-4 text-center w-24">Status</th>
                <th className="p-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredFaqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-neutral-50/30 transition-colors">
                  <td className="p-4 text-center font-mono text-neutral-500 font-bold">
                    {faq.Priority}
                  </td>
                  <td className="p-4 space-y-1.5">
                    <p className="font-bold text-neutral-900 leading-snug">
                      {faq.Question}
                    </p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                        {faq.Category}
                      </span>
                      {faq.UpdatedDate && (
                        <span className="text-[8px] font-mono text-neutral-400">
                          Updated: {new Date(faq.UpdatedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-neutral-600 leading-relaxed font-light line-clamp-3">
                    {faq.Answer}
                  </td>
                  <td className="p-4">
                    <p className="text-[10px] font-mono text-neutral-500 bg-neutral-100/60 px-2 py-1 rounded border border-neutral-150 inline-block max-w-[150px] truncate" title={faq.Keywords}>
                      {faq.Keywords || '(None)'}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(faq)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider border transition-all cursor-pointer ${
                        faq.Status === 'disabled'
                          ? 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:bg-neutral-100'
                          : 'bg-green-50 border-green-100 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {faq.Status === 'disabled' ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Disabled</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleOpenEditForm(faq)}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-lg transition-colors cursor-pointer"
                        title="Edit FAQ Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => faq.id && handleDelete(faq.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
