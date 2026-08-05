/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { 
  Car, ShieldAlert, User, Compass, Anchor, LogIn, LogOut, UserCheck, 
  BookOpen, MessageSquare, HelpCircle, PhoneCall, Menu, X, RefreshCw
} from 'lucide-react';
import { RoleConfig, BrandingSettings } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

export type AppView = 'showroom' | 'all-stock' | 'backend' | 'freight' | 'about' | 'how-to-buy' | 'contact' | 'testimonials' | 'faq' | 'customer' | 'admin-login';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  currentRole: RoleConfig;
  user: FirebaseUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  loading?: boolean;
  branding?: BrandingSettings;
}

export default function Header({
  currentView,
  onViewChange,
  currentRole,
  user,
  onLoginClick,
  onLogout,
  loading = false,
  branding,
}: HeaderProps) {
  const isStaff = user !== null && currentRole.id !== 'Guest';
  const [isOpen, setIsOpen] = useState(false);

  // Lock background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const renderLogoElement = (isMobile = false) => {
    const sizeClass = isMobile ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
    const iconSizeClass = isMobile ? 'w-4 h-4' : 'w-5 h-5';
    
    const brand = branding || {
      logoType: 'icon',
      logoIcon: 'Car',
      logoColor: 'bg-red-600',
      logoBgColor: '#dc2626',
      logoIconColor: '#ffffff',
      logoImageUrl: '',
      logoSvgCode: '',
    };

    if (brand.logoType === 'image' && brand.logoImageUrl) {
      return (
        <div className={`relative ${sizeClass} overflow-hidden shrink-0 flex items-center justify-center`}>
          <img 
            src={brand.logoImageUrl} 
            alt="Logo" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    if (brand.logoType === 'svg' && brand.logoSvgCode) {
      return (
        <div 
          className={`relative ${sizeClass} overflow-hidden shrink-0 flex items-center justify-center p-1.5`}
          style={{ backgroundColor: brand.logoBgColor || '#dc2626' }}
          dangerouslySetInnerHTML={{ __html: brand.logoSvgCode }}
        />
      );
    }

    const IconComponent = (Icons as any)[brand.logoIcon] || Icons.Car;
    
    return (
      <div 
        className={`relative flex items-center justify-center font-bold font-display shadow-lg transition-all duration-500 shrink-0 ${sizeClass} ${
          loading 
            ? 'bg-gradient-to-tr from-red-600 via-red-500 to-rose-500 shadow-red-500/30 animate-pulse ring-2 ring-red-500/20' 
            : ''
        }`}
        style={!loading ? { backgroundColor: brand.logoBgColor || '#dc2626' } : undefined}
      >
        <IconComponent 
          className={`${iconSizeClass} ${loading ? 'animate-bounce' : ''}`} 
          style={{ color: brand.logoIconColor || '#ffffff' }}
        />
      </div>
    );
  };

  const navItems = [
    { view: 'showroom', label: 'Showroom', icon: Compass },
    { view: 'all-stock', label: 'All Stock', icon: Car },
    { view: 'how-to-buy', label: 'How to Buy', icon: BookOpen },
    { view: 'about', label: 'About Us', icon: User },
    { view: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { view: 'faq', label: 'FAQ', icon: HelpCircle },
    { view: 'contact', label: 'Contact', icon: PhoneCall }
  ] as const;

  return (
    <>
      <header className="bg-neutral-950/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-xl border-b border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Elegant Brand Logo */}
            <div className="flex items-center space-x-3.5">
              <div 
                onClick={() => {
                  onViewChange('showroom');
                  setIsOpen(false);
                }}
                className="flex items-center space-x-3 cursor-pointer group"
                id="header-logo-container"
              >
                {renderLogoElement(false)}
                <div className="flex items-center whitespace-nowrap">
                  <span className="text-lg sm:text-xl font-display font-black tracking-tight text-white uppercase">
                    CAR<span className="text-red-600">CHIEF</span>
                  </span>
                </div>
              </div>

              {/* Elegant Loading / Sync Status Badge */}
              <div className="hidden sm:flex items-center">
                {loading ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-mono tracking-widest uppercase animate-pulse select-none cursor-wait">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                    <span>SYNCING</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-green-500/20 text-green-400 rounded-full text-[10px] font-mono tracking-widest uppercase">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    <span>ONLINE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links - Desktop Only */}
            <nav className="hidden lg:flex items-center lg:space-x-0.5 xl:space-x-1.5">
              {navItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onViewChange(item.view)}
                    className={`px-2.5 py-2 rounded-lg text-[10px] xl:text-[11px] uppercase font-bold tracking-wider font-display transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent'
                    }`}
                    id={`nav-${item.view}-btn`}
                  >
                    {item.label}
                  </button>
                );
              })}

              {/* SECURE: Management Portal is ONLY visible if user is logged in with a staff role */}
              {isStaff && (
                <button
                  onClick={() => onViewChange('backend')}
                  className={`px-2.5 py-2 rounded-lg text-[10px] xl:text-[11px] uppercase font-bold tracking-wider font-display transition-all duration-300 whitespace-nowrap ${
                    currentView === 'backend'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent'
                  }`}
                  id="nav-management-btn"
                >
                  Management
                </button>
              )}
            </nav>

            {/* Right Action Center - Desktop Only */}
            <div className="hidden lg:flex items-center space-x-4">
              {isStaff ? (
                /* Logged In Agent Session Badge */
                <div className="flex items-center space-x-3.5 border-l border-neutral-800 pl-4">
                  <div className="hidden lg:block text-right leading-tight">
                    <p className="text-xs font-semibold text-neutral-200">
                      {user?.displayName || 'Active Agent'}
                    </p>
                    <span className="text-[9px] font-mono font-bold text-amber-500 tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {currentRole.name}
                    </span>
                  </div>
                  
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2 rounded-full hidden sm:block">
                    <UserCheck className="w-4 h-4" />
                  </div>

                  <button
                    onClick={onLogout}
                    className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800 text-neutral-300 hover:text-amber-500 p-2.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    title="Sign Out"
                    id="header-logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                /* Logged Out state: Customer Portal Trigger */
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewChange('customer')}
                    className="bg-neutral-900 border border-neutral-850 hover:border-amber-500/30 text-neutral-300 hover:text-white font-display text-xs uppercase tracking-wider font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                    id="header-customer-btn"
                  >
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    Customer Portal
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu Icon - Mobile Only */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 transition-all hover:bg-neutral-850 active:scale-95 focus:outline-none"
                aria-label="Toggle Menu"
              >
                <div className="w-5 h-4 flex flex-col justify-between relative">
                  <span className={`w-5 h-0.5 bg-white rounded transition-all duration-300 transform origin-center ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                  <span className={`w-5 h-0.5 bg-white rounded transition-all duration-300 ${isOpen ? 'opacity-0 scale-0' : ''}`} />
                  <span className={`w-5 h-0.5 bg-white rounded transition-all duration-300 transform origin-center ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                </div>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Modern Slide-In Mobile Navigation Drawer */}
      {/* Backdrop Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sliding Drawer Container */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-neutral-950 border-l border-neutral-900 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 lg:hidden flex flex-col justify-between overflow-y-auto transition-all duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-900">
            <div className="flex items-center space-x-3">
              {renderLogoElement(true)}
              <span className="text-base font-display font-black uppercase tracking-tight text-white">
                CAR<span className="text-red-600">CHIEF</span>
              </span>
              {loading && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 animate-pulse">
                  SYNC
                </span>
              )}
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    onViewChange(item.view);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-extrabold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {isStaff && (
              <button
                onClick={() => {
                  onViewChange('backend');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  currentView === 'backend'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-extrabold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                }`}
                style={{ minHeight: '44px' }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Management</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="pt-6 border-t border-neutral-900 mt-6 space-y-4">
          {isStaff ? (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-900 flex items-center justify-between">
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-neutral-200">
                    {user?.displayName || 'Active Agent'}
                  </p>
                  <span className="text-[9px] font-mono font-bold text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded mt-1.5 inline-block">
                    {currentRole.name}
                  </span>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2 rounded-full">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                style={{ minHeight: '44px' }}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  onViewChange('customer');
                  setIsOpen(false);
                }}
                className="w-full bg-neutral-900 border border-neutral-850 hover:border-amber-500/30 text-neutral-300 hover:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                style={{ minHeight: '44px' }}
              >
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>Customer Portal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
