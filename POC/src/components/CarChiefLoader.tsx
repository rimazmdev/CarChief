import React from 'react';
import { motion } from 'motion/react';
import { Car, Shield, Sparkles } from 'lucide-react';

interface CarChiefLoaderProps {
  message?: string;
  submessage?: string;
}

export default function CarChiefLoader({
  message = "AUTHENTICATING SECURE WORKSPACE",
  submessage = "Verifying staff security privileges & loading CarChief ERP..."
}: CarChiefLoaderProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center py-12 px-4 relative my-6">
      {/* Brand Badge */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto space-y-5">
        
        {/* CarChief Shield Logo Icon with Red Ambient Glow */}
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-red-600/40 rounded-full blur-2xl"
            animate={{
              scale: [0.9, 1.3, 0.9],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className="p-3 relative z-10">
            <Shield className="w-14 h-14 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.7)]" />
          </div>
        </div>

        {/* Brand Name */}
        <div>
          <div className="flex items-center justify-center gap-1 text-3xl font-display font-black tracking-wider text-neutral-900 dark:text-white uppercase drop-shadow-sm">
            <span>CAR</span>
            <span className="text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">CHIEF</span>
          </div>
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-red-600 font-extrabold mt-1">
            LOGISTICS & ERP PORTAL
          </p>
        </div>

        {/* Driving Car Animation Track */}
        <div className="w-full max-w-xs relative pt-2 pb-1">
          {/* Track Line */}
          <div className="h-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-full"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ width: '60%' }}
            />
          </div>

          {/* Driving Car Icon */}
          <div className="relative h-9 overflow-hidden mt-2">
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-red-600"
              animate={{
                x: ['-20%', '110%']
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="relative">
                <Car className="w-7 h-7 text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transform -scale-x-100" />
                {/* Car Headlight Beam */}
                <div className="absolute top-2.5 -right-5 w-6 h-2 bg-gradient-to-r from-yellow-400/70 to-transparent blur-[1px] transform rotate-3" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider font-display">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span>{message}</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-xs mx-auto">
            {submessage}
          </p>
        </div>

      </div>
    </div>
  );
}
