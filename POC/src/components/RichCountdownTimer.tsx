import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface RichCountdownTimerProps {
  reservedUntil?: string;
  size?: 'sm' | 'lg';
  agentName?: string;
}

export const RichCountdownTimer: React.FC<RichCountdownTimerProps> = ({
  reservedUntil,
  size = 'sm',
  agentName
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    totalMs: 0
  });

  useEffect(() => {
    if (!reservedUntil) {
      setTimeLeft(prev => ({ ...prev, isExpired: true, totalMs: 0 }));
      return;
    }

    const updateTimer = () => {
      const diff = new Date(reservedUntil).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          totalMs: 0
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        totalMs: diff
      });
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [reservedUntil]);

  if (!reservedUntil) {
    return (
      <span className="text-xs font-semibold text-neutral-400 italic">
        No limit
      </span>
    );
  }

  // Determine colors based on time remaining (urgency levels)
  const isUrgent = !timeLeft.isExpired && timeLeft.totalMs < 4 * 60 * 60 * 1000; // Less than 4 hours left
  const themeClass = timeLeft.isExpired
    ? 'border-red-200 bg-red-50 text-red-700'
    : isUrgent
    ? 'border-rose-200 bg-rose-50 text-rose-700 ring-rose-500/20'
    : 'border-amber-200 bg-amber-50 text-amber-800 ring-amber-500/15';

  if (size === 'sm') {
    return (
      <div className="flex flex-col gap-1 mt-1 font-sans">
        {agentName && (
          <span className="text-[10px] font-medium text-neutral-400 block truncate max-w-[140px]">
            Agent: <span className="font-bold text-neutral-600">{agentName}</span>
          </span>
        )}
        {timeLeft.isExpired ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 w-max shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            Expired
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight border ${themeClass} w-max shadow-xs transition-all duration-300`}>
            <Clock className={`w-3.5 h-3.5 shrink-0 ${isUrgent ? 'text-rose-600 animate-spin-slow' : 'text-amber-500 animate-pulse'}`} />
            <span className="font-mono font-black">
              {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
              {timeLeft.hours.toString().padStart(2, '0')}h{' '}
              {timeLeft.minutes.toString().padStart(2, '0')}m{' '}
              {timeLeft.seconds.toString().padStart(2, '0')}s
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 ml-0.5">left</span>
          </div>
        )}
      </div>
    );
  }

  // Large attractive layout (Bento card style with countdown boxes, made highly compact and horizontal)
  return (
    <div className="mt-2.5 font-sans select-none max-w-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          Time Remaining
        </div>
        {agentName && (
          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/60 truncate max-w-[150px]">
            {agentName}
          </span>
        )}
      </div>

      {timeLeft.isExpired ? (
        <div className="bg-red-50 border border-red-200 rounded-lg py-1 px-2.5 flex items-center gap-2 w-max shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Expired</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Days Badge */}
          {timeLeft.days > 0 && (
            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md border shadow-xs text-xs font-extrabold transition-colors duration-300 ${
              isUrgent ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <span className="font-mono font-black">{timeLeft.days}</span>
              <span className="text-[9px] font-black uppercase tracking-wider opacity-75">d</span>
            </div>
          )}

          {/* Hours Badge */}
          <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md border shadow-xs text-xs font-extrabold transition-colors duration-300 ${
            isUrgent ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="font-mono font-black">
              {timeLeft.hours.toString().padStart(2, '0')}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-75">h</span>
          </div>

          <span className={`text-xs font-black font-mono animate-pulse ${isUrgent ? 'text-rose-500' : 'text-amber-500'}`}>:</span>

          {/* Minutes Badge */}
          <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md border shadow-xs text-xs font-extrabold transition-colors duration-300 ${
            isUrgent ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="font-mono font-black">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-75">m</span>
          </div>

          <span className={`text-xs font-black font-mono animate-pulse ${isUrgent ? 'text-rose-500' : 'text-amber-500'}`}>:</span>

          {/* Seconds Badge */}
          <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md border shadow-xs text-xs font-extrabold transition-colors duration-300 ${
            isUrgent ? 'bg-rose-600 border-rose-600 text-white' : 'bg-neutral-900 border-neutral-900 text-white'
          }`}>
            <span className="font-mono font-black">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-85">s</span>
          </div>

          {/* Urgently visual helper */}
          {isUrgent && (
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200/50 px-1.5 py-0.5 rounded animate-pulse shrink-0">
              Closing
            </span>
          )}
        </div>
      )}
    </div>
  );
};
