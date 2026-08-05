/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, MessageSquare, ShieldCheck, CheckCircle2, Quote, Send, Award, Globe } from 'lucide-react';

interface TestimonialData {
  id?: string;
  name: string;
  location: string;
  vehicleModel: string;
  rating: number;
  review: string;
  createdAt: string;
  isApproved?: boolean;
}

interface TestimonialsProps {
  onNavigateToShowroom: () => void;
}

const PRESET_TESTIMONIALS: TestimonialData[] = [
  {
    name: 'Julian Vance',
    location: 'Geneva, Switzerland',
    vehicleModel: '2023 Porsche 911 GT3 RS',
    rating: 5,
    review: 'The paint-thickness meter files and direct suspension video files provided by CarChief were flawless. Delivery inside a vacuum-sealed sea container preserved the paint completely. Simply outstanding.',
    createdAt: new Date('2026-03-15').toISOString(),
  },
  {
    name: 'Sophia Chen',
    location: 'Singapore',
    vehicleModel: '2024 Mercedes-AMG G63',
    rating: 5,
    review: 'Apex Import Corp has imported over fifteen vehicles via CarChief’s Rotterdam logistics gate. Their customs brokerage pre-filing eliminates delays entirely. Unparalleled professional logistics.',
    createdAt: new Date('2026-04-10').toISOString(),
  },
  {
    name: 'Marcus Sterling',
    location: 'London, United Kingdom',
    vehicleModel: '1992 Ferrari F40 Spec',
    rating: 5,
    review: 'Purchasing a classic halo supercar of this caliber across seas is highly stressful. CarChief coordinated escrow lines and arranged special mechanical clearance with extreme care. Trustworthy.',
    createdAt: new Date('2026-05-02').toISOString(),
  },
  {
    name: 'Hassan Al-Mansoori',
    location: 'Dubai, UAE',
    vehicleModel: '2022 McLaren 720S Spider',
    rating: 5,
    review: 'CarChief’s dynamic ocean cargo freight quotes are incredibly accurate. No unexpected terminal surcharges or port compliance fees. Highly recommended for elite overseas logistics.',
    createdAt: new Date('2026-06-12').toISOString(),
  },
  {
    name: 'Klaus Meier',
    location: 'Munich, Germany',
    vehicleModel: '2023 Audi RS6 Avant',
    rating: 5,
    review: 'Flawless communication, precise inspection logs, and direct updates from port to carrier. The vehicle arrived in absolutely pristine condition. The ultimate standard for international auto trade.',
    createdAt: new Date('2026-06-25').toISOString(),
  }
];

export default function Testimonials({ onNavigateToShowroom }: TestimonialsProps) {
  const [reviews, setReviews] = useState<TestimonialData[]>(PRESET_TESTIMONIALS);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Submit states
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formReview, setFormReview] = useState('');

  const fetchUserReviews = async () => {
    try {
      const colRef = collection(db, 'testimonials');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      
      const userList = querySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestimonialData[];
      
      if (userList.length > 0) {
        setReviews([...userList, ...PRESET_TESTIMONIALS]);
      } else {
        setReviews(PRESET_TESTIMONIALS);
      }
    } catch (err) {
      console.warn("Failed to load custom testimonials, defaulting to presets:", err);
    }
  };

  useEffect(() => {
    fetchUserReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const newReview: Omit<TestimonialData, 'id'> = {
        name: formName,
        location: formLocation,
        vehicleModel: formVehicle,
        rating: formRating,
        review: formReview,
        createdAt: new Date().toISOString(),
        isApproved: true,
      };

      const colRef = collection(db, 'testimonials');
      await addDoc(colRef, newReview);
      
      setSuccess(true);
      setFormName('');
      setFormLocation('');
      setFormVehicle('');
      setFormRating(5);
      setFormReview('');
      
      // Reload reviews
      await fetchUserReviews();
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg('Failed to store review. Verify network rules.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-50 min-h-screen text-neutral-900 pb-20 overflow-hidden">
      {/* Delicate layout accents */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neutral-200/50 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Hero Header Section - Dark & Premium Consistent Theme */}
      <section className="relative bg-neutral-950 text-white py-12 border-b border-neutral-800 overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent z-10" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Background Image Accent */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1600&auto=format&fit=crop&q=80" 
            alt="Prestige vehicle warehouse" 
            className="w-full h-full object-cover grayscale object-center scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 z-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase font-mono tracking-[0.2em] text-red-500 font-extrabold bg-red-500/10 border border-red-500/20 px-3.5 py-1.5 rounded-full"
          >
            <Award className="w-3.5 h-3.5 text-red-500" />
            Vetted Sourcing Logs
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight leading-[1.1] text-white"
          >
            TRUSTED BY WORLD CLASS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">COLLECTORS & FRANCHISES</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs sm:text-sm text-neutral-400 font-light max-w-xl mx-auto leading-relaxed"
          >
            Verified logs and experiences from leading dealers, prestige vehicle buyers, and fleet networks globally.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-1 flex flex-wrap justify-center gap-4 text-[11px] text-neutral-300 font-mono"
          >
            <div className="flex items-center gap-1.5 bg-neutral-900 px-3.5 py-1.5 rounded-xl border border-neutral-800">
              <Globe className="w-3.5 h-3.5 text-red-500" />
              <span>14+ Export Countries</span>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-900 px-3.5 py-1.5 rounded-xl border border-neutral-800">
              <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>4.9 Average Sourcing Score</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid of Clean Elegant Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev, index) => {
            const initials = rev.name.split(' ').map(n => n[0]).join('').slice(0, 2);
            return (
              <motion.div
                key={rev.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.08, 0.4) }}
                whileHover={{ y: -4, borderColor: 'rgba(220, 38, 38, 0.3)' }}
                className="bg-white border border-neutral-200/80 hover:border-red-500/30 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_12px_24px_-10px_rgba(220, 38, 38, 0.12)] transition-all duration-300 group"
                id={`testimonial-card-${index}`}
              >
                {/* Quotation Watermark */}
                <Quote className="absolute right-4 top-4 w-10 h-10 text-neutral-200/40 group-hover:text-red-500/5 transition-colors pointer-events-none z-0" />
                
                <div className="space-y-3.5 relative z-10">
                  {/* Rating Stars */}
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, starIdx) => (
                      <Star 
                        key={starIdx} 
                        className={`w-3.5 h-3.5 ${starIdx < rev.rating ? 'fill-red-500 text-red-500' : 'text-neutral-200'}`} 
                      />
                    ))}
                  </div>
                  
                  {/* Body Review */}
                  <p className="text-xs sm:text-sm text-neutral-700 italic leading-relaxed font-light font-sans">
                    "{rev.review}"
                  </p>
                </div>

                {/* Client Profile Info Bar */}
                <div className="border-t border-neutral-100 pt-4 mt-5 flex items-center gap-3 relative z-10">
                  {/* Initials Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-mono font-black text-xs text-white shrink-0 shadow-md shadow-red-600/10">
                    {initials}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold font-display uppercase tracking-wider text-neutral-900 truncate">{rev.name}</h4>
                    <p className="text-[10px] text-neutral-400 font-medium font-sans truncate">{rev.location}</p>
                  </div>
                  
                  <div className="shrink-0">
                    <span className="inline-block text-[9px] font-mono text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-extrabold uppercase tracking-tight">
                      {rev.vehicleModel}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Experience Submission Form */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 relative overflow-hidden"
        >
          {/* Subtle accent border at top */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-red-500" />
          
          <div className="border-b border-neutral-100 pb-5">
            <h3 className="text-lg sm:text-xl font-display font-black text-neutral-950 uppercase tracking-tight flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-red-500" />
              Publish Your Experience
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-light mt-1.5">
              Have you recently imported a high-end vehicle through CarChief? Share your logistics speed, pricing clarity, and quality metrics with global dealer networks.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3"
                id="testimonial-success"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider text-emerald-900">Testimonial Published</p>
                  <p className="font-light mt-1 leading-relaxed text-emerald-700">Your review was compiled and stored securely. It is now instantly visible across our dealer logs.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jonathan Mercer"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-500 bg-neutral-50 focus:bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  id="testimonial-form-name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Location (City, Country)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Zurich, Switzerland"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-500 bg-neutral-50 focus:bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  id="testimonial-form-location"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Vehicle Model Sourced</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2021 Ferrari Roma"
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-500 bg-neutral-50 focus:bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  id="testimonial-form-vehicle"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Operational Rating</label>
                <select
                  value={formRating}
                  onChange={(e) => setFormRating(Number(e.target.value))}
                  className="w-full text-xs border border-neutral-200 rounded-xl p-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-red-500 text-neutral-900 cursor-pointer"
                  id="testimonial-form-rating"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5 Perfect Sourcing)</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5 Highly Recommended)</option>
                  <option value={3}>⭐⭐⭐ (3/5 Average Sourcing)</option>
                  <option value={2}>⭐⭐ (2/5 Suboptimal)</option>
                  <option value={1}>⭐ (1/5 Unsatisfied)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Review Comments</label>
              <textarea
                rows={4}
                required
                placeholder="Detail your ocean logistics speed, documentation clarity, vehicle inspection alignment, and transport team responsiveness..."
                value={formReview}
                onChange={(e) => setFormReview(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-500 bg-neutral-50 focus:bg-white transition-all text-neutral-900 placeholder-neutral-400 resize-none leading-relaxed"
                id="testimonial-form-review"
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-neutral-100">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl tracking-wider uppercase font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5 text-red-500 shrink-0" /> Verified Sourcing Network
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-display text-xs uppercase tracking-wider font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                id="testimonial-form-submit"
              >
                {submitting ? 'Transmitting Review...' : 'Publish Testimonial'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </motion.div>
      </section>
    </div>
  );
}
