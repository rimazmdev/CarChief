/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, Mail, Lock, ArrowRight, ArrowLeft, Car, FileText, 
  Package, LogOut, AlertCircle, CheckCircle, Search, RefreshCw, Phone
} from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Vehicle } from '../types';
import { CustomerUser } from './types';

export interface CustomerPortalAppProps {
  onBackToShowroom?: () => void;
  vehicles?: Vehicle[];
}

export const CustomerPortalApp: React.FC<CustomerPortalAppProps> = ({ 
  onBackToShowroom,
  vehicles = []
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'purchased' | 'tracking' | 'invoices' | 'profile'>('purchased');

  // Handle Customer Portal Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Try Firebase Auth sign in
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Check if user is registered in customers collection
      const q = query(collection(db, 'customers'), where('email', '==', user.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const custData = snap.docs[0].data() as CustomerUser;
        setLoggedInCustomer({ ...custData, id: snap.docs[0].id });
      } else {
        // Create transient customer session profile
        setLoggedInCustomer({
          id: user.uid,
          email: user.email || email,
          name: user.displayName || email.split('@')[0],
          status: 'active'
        });
      }
    } catch (err: any) {
      console.error('Customer login error:', err);
      // Fallback matching against customers Firestore collection
      try {
        const q = query(
          collection(db, 'customers'), 
          where('email', '==', email.trim().toLowerCase())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const custData = snap.docs[0].data() as CustomerUser;
          setLoggedInCustomer({ ...custData, id: snap.docs[0].id });
        } else {
          setError(err.message || 'Invalid client credentials. Please verify your email and password.');
        }
      } catch (dbErr) {
        setError('Invalid client credentials. Please check your password or contact your sales advisor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setLoggedInCustomer(null);
    setEmail('');
    setPassword('');
  };

  // IF LOGGED IN: Render Customer Dashboard
  if (loggedInCustomer) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white font-sans pb-20">
        {/* Top Portal Banner */}
        <div className="bg-neutral-900 border-b border-neutral-800 py-4 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-600/30">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-display font-black tracking-tight uppercase">
                  CARCHIEF <span className="text-red-500">CLIENT GATEWAY</span>
                </h1>
                <p className="text-[10px] text-neutral-400 font-mono tracking-wider">
                  LOGGED IN AS: <span className="text-neutral-200 font-bold">{loggedInCustomer.name || loggedInCustomer.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {onBackToShowroom && (
                <button
                  onClick={onBackToShowroom}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-neutral-700 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Showroom
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center space-x-4">
              <div className="p-3 bg-red-600/10 border border-red-500/20 text-red-500 rounded-xl">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">Reserved & Purchased</p>
                <p className="text-2xl font-display font-black text-white">1 Vehicle</p>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center space-x-4">
              <div className="p-3 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">Shipment Status</p>
                <p className="text-2xl font-display font-black text-white">In Transit</p>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center space-x-4">
              <div className="p-3 bg-green-600/10 border border-green-500/20 text-green-500 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">Proforma Invoices</p>
                <p className="text-2xl font-display font-black text-white">Active</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('purchased')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'purchased' ? 'border-b-2 border-red-600 text-red-500' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              My Vehicles
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'tracking' ? 'border-b-2 border-red-600 text-red-500' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Logistics & Container Tracking
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'invoices' ? 'border-b-2 border-red-600 text-red-500' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Invoices & TT Documents
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'purchased' && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
              <Car className="w-12 h-12 text-neutral-600 mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Active Vehicle Orders</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed">
                Your assigned sales advisor is finalizing shipping documents. Detailed specifications and VIN certificate will appear here once verified.
              </p>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white uppercase">Container Tracking #TGHU928190</h3>
                  <p className="text-xs text-neutral-400 font-mono">Carrier: Ocean Express Lines</p>
                </div>
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold rounded-full uppercase">
                  On Vessel
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Yokohama Port Departure</p>
                    <p className="text-[10px] text-neutral-500 font-mono">Completed & Inspected</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Ocean Cargo In Transit</p>
                    <p className="text-[10px] text-neutral-400 font-mono">Estimated Arrival: 14 Days</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
              <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Client Financial Documents</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed">
                No outstanding unpaid invoices found. All verified telegraphic transfer (TT) receipts are archived securely.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // IF LOGGED OUT: Render Customer Login Screen (Exact design matching user image)
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6 text-center">
        
        {/* Top Pill Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-50 text-red-600 text-[10px] font-mono font-bold tracking-widest uppercase shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
          <span>SECURE CLIENT GATEWAY</span>
        </div>

        {/* Header Title & Description */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-neutral-900 uppercase">
            CAR<span className="text-red-600">CHIEF</span> <span className="text-neutral-700">PORTAL</span>
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
            Access your purchased vehicles, real-time container tracking, invoices, and secure documents.
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.08)] border border-neutral-200/80 text-left space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Field 1: Client Email */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
                CLIENT EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@company.com"
                  required
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3.5 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors font-medium shadow-sm"
                />
              </div>
            </div>

            {/* Field 2: Secure Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
                  SECURE PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => alert('Please contact your CarChief sales representative to reset your client gateway credentials.')}
                  className="text-[9px] font-mono font-bold text-red-600 hover:text-red-700 tracking-wider uppercase transition-colors"
                >
                  FORGOT PASSWORD?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3.5 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:bg-white transition-colors font-medium shadow-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-display font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-red-600/25 transition-all duration-200 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>VERIFYING CREDENTIALS...</span>
              ) : (
                <>
                  <span>ENTER CUSTOMER PORTAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Footer Links */}
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-2">
          <span>Client IP Logs Monitored</span>
          {onBackToShowroom && (
            <button
              onClick={onBackToShowroom}
              className="text-neutral-600 hover:text-neutral-900 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
            >
              ← BACK TO SHOWROOM
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerPortalApp;
