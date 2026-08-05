/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, ShieldCheck, CheckCircle2, User, HelpCircle } from 'lucide-react';

interface ContactUsProps {
  onSubmitLead: (leadData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
  }) => Promise<void>;
  onNavigateToFaq: () => void;
}

export default function ContactUs({ onSubmitLead, onNavigateToFaq }: ContactUsProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmitLead({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        message: message,
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg('Failed to submit your inquiry. Please verify network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const offices = [
    {
      city: 'Munich Headquarters',
      address: 'Maximilianstraße 45, 80539 München, Germany',
      phone: '+49 89 2424 990',
      email: 'munich@carchief.com',
    },
    {
      city: 'Rotterdam Logistics Gate',
      address: 'Boompjes 40, 3011 XB Rotterdam, Netherlands',
      phone: '+31 10 440 2201',
      email: 'rotterdam@carchief.com',
    },
  ];

  return (
    <div className="bg-[#fafafa] min-h-screen text-neutral-900 pb-20">
      {/* Editorial Page Hero */}
      <section className="relative bg-neutral-950 text-white py-20 border-b border-neutral-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent z-10" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Background image */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80" 
            alt="HQ Glass Office" 
            className="w-full h-full object-cover grayscale brightness-75 scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
          <div className="max-w-3xl space-y-4">
            <span className="inline-block text-[10px] uppercase font-mono tracking-[0.25em] text-red-500 font-extrabold bg-red-500/10 border border-red-500/20 px-3.5 py-1.5 rounded-full">
              Global Communications
            </span>
            <h1 className="text-4xl sm:text-5xl font-display font-black uppercase tracking-tight leading-[1.05]">
              CONNECT WITH OUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">OPERATIONS AGENTS</span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-light max-w-2xl leading-relaxed">
              Have questions regarding deep-sea shipping, custom container locks, currency conversions, or certified pre-sealing? Submit an inquiry below.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Info & Contact Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Office details & hours */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-600 font-bold">Contact Directory</h2>
              <h3 className="text-2xl font-display font-black uppercase tracking-tight text-neutral-950">International Offices</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-light">
                Direct communication links to our regional hubs. Visited strictly by pre-scheduled custom consultations.
              </p>
            </div>

            <div className="space-y-6">
              {offices.map((office, idx) => (
                <div key={idx} className="bg-white border border-neutral-200/60 p-6 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.01)] space-y-4" id={`office-card-${idx}`}>
                  <h4 className="text-sm font-bold uppercase tracking-tight font-display text-neutral-950 border-b border-neutral-100 pb-2 flex items-center justify-between">
                    <span>{office.city}</span>
                    <MapPin className="w-4 h-4 text-red-600" />
                  </h4>
                  <div className="space-y-2 text-xs text-neutral-600">
                    <p className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>{office.address}</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>{office.phone}</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="font-mono">{office.email}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Business Hours */}
            <div className="bg-neutral-950 text-white p-6 rounded-2xl border border-neutral-800 space-y-4 relative overflow-hidden" id="hours-card">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
              <h4 className="text-xs font-mono font-bold uppercase text-red-500 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Operating Hours
              </h4>
              <div className="space-y-2.5 text-xs text-neutral-400 font-light">
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span>Monday – Friday</span>
                  <span className="font-mono text-white">08:00 – 18:00 CET</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span>Saturday</span>
                  <span className="font-mono text-white">09:00 – 14:00 CET</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Sunday</span>
                  <span className="font-mono uppercase font-bold tracking-wider text-red-500">Port Operations Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-6.5 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] space-y-6">
              
              <div className="border-b border-neutral-100 pb-5">
                <h3 className="text-lg font-display font-black text-neutral-950 uppercase tracking-tight">Direct Lead Submission</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-light mt-1">
                  Submitting this form dispatches a real operational record straight to our logistics backend ledger.
                </p>
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3"
                  id="contact-success-banner"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider">Inquiry Logs Generated</p>
                    <p className="font-light mt-1 leading-relaxed">Thank you. Your inquiry was securely routed to our Operations team. A coordinator will call or email you within 2 hours.</p>
                  </div>
                </motion.div>
              )}

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3.5 rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Your Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Charles Sterling"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-xl pl-10 p-3 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-all"
                        id="contact-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Work Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="e.g., customer@sterling.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-xl pl-10 p-3 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-all"
                        id="contact-email"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Mobile Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 pointer-events-none">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g., +1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-xl pl-10 p-3 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-all"
                      id="contact-phone"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Detailed Message / Specifications Sought</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Provide details about the vehicles you are searching for, target shipping ports, or standard timing parameters..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-all resize-none leading-relaxed"
                    id="contact-message"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-red-500 bg-red-600/5 border border-red-500/10 px-3 py-1.5 rounded-lg tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> SECURE INTEGRATED PIPELINE
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-500 disabled:bg-neutral-300 text-white font-display text-xs uppercase tracking-wider font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-red-600/15 flex items-center justify-center gap-2 hover:scale-105"
                    id="contact-submit"
                  >
                    {submitting ? 'Transmitting Inquiries...' : 'Send Inquiry'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Redirect to FAQ Link */}
              <div className="border-t border-neutral-100 pt-5 text-center">
                <button
                  type="button"
                  onClick={onNavigateToFaq}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 font-semibold transition-colors font-mono"
                >
                  <HelpCircle className="w-4 h-4 text-red-600" />
                  <span>Have standard logistics questions? Read our full FAQ portal</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
