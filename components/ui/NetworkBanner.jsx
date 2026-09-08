'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * NetworkBanner Component
 * Real-time offline/online detection with animated banners.
 * - Offline: Fixed amber banner with warning icon
 * - Back online: Green success banner auto-dismisses after 3s
 */
export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [wasEverOffline, setWasEverOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setWasEverOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setWasEverOffline(true);
      setShowOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Only show the "Back online" banner if the user was offline before
      setShowOnline(true);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Auto-dismiss the "Back online" banner after 3 seconds
  useEffect(() => {
    if (!showOnline) return;
    const timer = setTimeout(() => setShowOnline(false), 3000);
    return () => clearTimeout(timer);
  }, [showOnline]);

  // Offline banner
  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You are currently offline. Changes will sync when reconnected.</span>
      </div>
    );
  }

  // Back online success banner (only if was previously offline)
  if (showOnline && wasEverOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <Wifi className="h-4 w-4 shrink-0" />
        <span>Back online! Your connection has been restored.</span>
      </div>
    );
  }

  return null;
}
