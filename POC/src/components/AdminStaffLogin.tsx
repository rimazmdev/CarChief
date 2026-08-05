/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight, RefreshCw, UserCheck, AlertCircle, Building2, CheckCircle2, Car } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { RoleConfig, hasStaffErpAccess } from '../types';

interface AdminStaffLoginProps {
  user: FirebaseUser | null;
  currentRole: RoleConfig;
  onLogin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  onNavigateToBackend: () => void;
  onNavigateToShowroom: () => void;
  onRefreshUserRole?: () => Promise<void>;
}

export default function AdminStaffLogin({
  user,
  currentRole,
  onLogin,
  onNavigateToBackend,
  onNavigateToShowroom,
  onRefreshUserRole,
}: AdminStaffLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshingRole, setRefreshingRole] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isStaffLoggedIn = Boolean(user && hasStaffErpAccess(currentRole));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your staff email and security password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onLogin(email, password, rememberMe);
      setSuccessMsg('Authentication successful! Directing to ERP Workspace...');
      onNavigateToBackend();
    } catch (err: any) {
      console.error('Staff Login Error:', err);
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid staff email or password. Please try again.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 text-neutral-900 font-sans">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Branding & Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-mono tracking-widest uppercase font-bold shadow-sm">
            <Shield className="w-3.5 h-3.5 text-red-600" />
            <span>SECURE ADMIN & STAFF PORTAL</span>
          </div>

          <h2 className="text-3xl font-display font-black tracking-tight text-neutral-900 uppercase">
            CAR<span className="text-red-600">CHIEF</span> ERP ACCESS
          </h2>
          <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
            Authorized logistics managers, sales directors, and administrators login gateway.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {isStaffLoggedIn ? (
            /* Already logged in view */
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-900 uppercase tracking-wide">Active Staff Session</h3>
                <p className="text-xs text-neutral-600">
                  Logged in as <span className="font-mono text-amber-700 font-bold">{user?.email}</span>
                </p>
                <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold">
                  Role: {currentRole.name}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={onNavigateToBackend}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-display text-xs uppercase tracking-wider font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Open ERP Management Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onNavigateToShowroom}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-neutral-700 font-display text-xs uppercase tracking-wider font-bold py-2.5 px-4 rounded-xl transition-all duration-300 cursor-pointer border border-neutral-200"
                >
                  Return to Showroom Catalog
                </button>
              </div>
            </div>
          ) : user && !hasStaffErpAccess(currentRole) ? (
            /* Logged in with restricted role view */
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-900 uppercase tracking-wide">Restricted Role Access</h3>
                <p className="text-xs text-neutral-600">
                  Logged in as <span className="font-mono text-amber-700 font-bold">{user?.email}</span>
                </p>
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-neutral-700 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold">
                  Assigned Role: {currentRole.name || 'Guest'}
                </span>
                <p className="text-[11px] text-amber-900 bg-amber-50/90 p-3 rounded-xl border border-amber-200 leading-relaxed text-left font-medium">
                  Your account is logged in, but your assigned role lacks ERP workspace permissions. Please request a Super Admin to assign a staff role (e.g. Admin, Sales, or Dealer) in the User Security Matrix.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {onRefreshUserRole && (
                  <button
                    type="button"
                    onClick={async () => {
                      setRefreshingRole(true);
                      await onRefreshUserRole();
                      setRefreshingRole(false);
                    }}
                    disabled={refreshingRole}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-display text-xs uppercase tracking-wider font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingRole ? 'animate-spin' : ''}`} />
                    <span>Re-check Staff Permissions</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onNavigateToShowroom}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-neutral-700 font-display text-xs uppercase tracking-wider font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer border border-neutral-200"
                >
                  Return to Showroom
                </button>
              </div>
            </div>
          ) : (
            /* Staff Login Form */
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              
              {/* Alert Messages */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 tracking-wider">
                  Staff Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@carchief.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 tracking-wider">
                  Security Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-600 hover:text-neutral-900 select-none font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-300 text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <span>Remember Session</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-900 disabled:text-neutral-300 text-white font-display text-xs uppercase tracking-wider font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer mt-2 overflow-hidden relative"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ x: [-10, 10, -10] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                    >
                      <Car className="w-5 h-5 text-red-400 transform -scale-x-100 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    </motion.div>
                    <span className="font-mono text-[11px] tracking-widest text-amber-300 animate-pulse font-extrabold uppercase">
                      CarChief Authenticating...
                    </span>
                  </div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Login to Staff Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[10px] text-neutral-400 font-mono space-y-1">
          <p>256-BIT END-TO-END ENCRYPTED STAFF GATEWAY</p>
          <p>© 2026 CARCHIEF AUTO GROUP LOGISTICS SECURITY</p>
        </div>

      </div>
    </div>
  );
}
