/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, Mail, User, Shield, ArrowRight, RefreshCw, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  onSignup: (name: string, email: string, password: string, role: string) => Promise<void>;
}

export default function AuthModal({ isOpen, onClose, onLogin, onSignup }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Sales'); // Default role request
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setSelectedRole('Sales');
    setErrorMsg('');
    setShowSuccess(false);
    setShowPassword(false);
    setRememberMe(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLoginMode && !name)) {
      setErrorMsg('Please populate all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (isLoginMode) {
        await onLogin(email, password, rememberMe);
      } else {
        await onSignup(name, email, password, selectedRole);
      }
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        resetFields();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication encountered an unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white border border-neutral-200 shadow-[0_30px_70px_rgba(0,0,0,0.25)] rounded-2xl w-full max-w-md overflow-hidden z-10"
        >
          {showSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center flex flex-col items-center justify-center space-y-5 bg-neutral-950 text-white min-h-[380px] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 to-neutral-900 pointer-events-none z-0" />
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none z-0" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none z-0" />
              
              <div className="relative z-10 space-y-5 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 animate-pulse">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500 font-bold">
                    Operations Secure Verification
                  </span>
                  <h3 className="text-xl font-display font-black uppercase tracking-tight">
                    Sign In Successful
                  </h3>
                </div>
                
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed font-light">
                  Welcome to CarChief Logistics core operations. We are establishing your session and navigating you to the Management Portal...
                </p>
                
                <div className="flex items-center space-x-2 text-[9px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="bg-neutral-950 text-white p-6 relative">
                {/* Subtle red ambient light in background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                
                <button
                  onClick={onClose}
                  className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors"
                  title="Close modal"
                  id="auth-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3 mb-1">
                  <div className="bg-red-600 p-2 rounded-lg">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-[0.15em] text-red-500 font-bold">
                    CarChief Internal
                  </span>
                </div>
                
                <h3 className="text-xl font-display font-bold tracking-tight mt-2">
                  {isLoginMode ? 'Staff Operations Sign In' : 'Agent Operations Access Request'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {isLoginMode 
                    ? 'Authorized dealer personnel and administration sign in only.' 
                    : 'Create an internal agent account to manage vehicles and buyer leads.'}
                </p>
              </div>

              {/* Form Area */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs py-2.5 px-3.5 rounded-lg font-medium">
                    {errorMsg}
                  </div>
                )}

                {!isLoginMode && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
                      Full Agent Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Alexander Mercer"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-lg pl-9 p-2.5 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-colors"
                        id="auth-name-input"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="e.g., agent@carchief.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-lg pl-9 p-2.5 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-colors"
                      id="auth-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
                    Security Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-lg pl-9 pr-10 p-2.5 focus:outline-none focus:border-red-600 bg-neutral-50/50 focus:bg-white transition-colors"
                      id="auth-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                      id="auth-password-toggle-btn"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLoginMode && (
                  <div className="flex items-center justify-between pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-neutral-300 text-red-600 focus:ring-red-600 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                        id="auth-remember-me-checkbox"
                      />
                      <span className="text-xs font-semibold text-neutral-600">Remember me</span>
                    </label>
                  </div>
                )}

                {!isLoginMode && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
                      Requested Operations Role
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {[
                        { id: 'Admin', label: 'Admin', desc: 'Full permissions' },
                        { id: 'Dealer', label: 'Dealer', desc: 'Edit & Import' },
                        { id: 'Sales', label: 'Sales', desc: 'Lead tracking' }
                      ].map((role) => (
                        <label 
                          key={role.id}
                          className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                            selectedRole === role.id 
                              ? 'border-red-600 bg-red-50/10 text-red-600 ring-1 ring-red-600/30 font-semibold' 
                              : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="authRoleGroup"
                            value={role.id}
                            checked={selectedRole === role.id}
                            onChange={() => setSelectedRole(role.id)}
                            className="sr-only"
                          />
                          <span className="text-xs uppercase font-bold tracking-wider">{role.label}</span>
                          <span className="text-[8px] text-neutral-400 mt-0.5 leading-none">{role.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-neutral-300 text-white font-display text-xs uppercase tracking-wider font-bold py-3 px-5 rounded-xl transition-all duration-300 shadow-lg shadow-red-600/10 flex items-center justify-center gap-2"
                    id="auth-submit-btn"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{isLoginMode ? 'Sign In to Operations' : 'Submit Access Registration'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Mode Switcher */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      resetFields();
                    }}
                    className="text-neutral-500 hover:text-neutral-900 transition-colors text-xs font-semibold"
                    id="auth-switch-mode-btn"
                  >
                    {isLoginMode 
                      ? "Don't have a staff account yet? Register here" 
                      : "Already registered? Sign in to your account"}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
