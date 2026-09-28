'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * NetworkBanner Component
 * Real-time offline/online detection with animated banners.
 * - Offline: Fixed amber banner with warning icon
 * - Back online: Green success banner auto-dismisses after 3s
 *
 * Connectivity is exposed as an external store and read with
 * useSyncExternalStore, so the component never copies browser state into React
 * state inside an effect and hydrates safely (the server snapshot is "online").
 */

const ONLINE_STATE = { isOnline: true, cameBackOnline: false };
const ONLINE_BANNER_DURATION_MS = 3000;

let snapshot = ONLINE_STATE;
let wasOffline = false;
let dismissTimer = null;
const listeners = new Set();

function emit(nextSnapshot) {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function handleOffline() {
  wasOffline = true;
  clearDismissTimer();
  emit({ isOnline: false, cameBackOnline: false });
}

function handleOnline() {
  clearDismissTimer();

  // Only show the "Back online" banner if the user was offline before
  if (!wasOffline) {
    emit(ONLINE_STATE);
    return;
  }

  wasOffline = false;
  emit({ isOnline: true, cameBackOnline: true });

  // Auto-dismiss the "Back online" banner after 3 seconds
  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    emit(ONLINE_STATE);
  }, ONLINE_BANNER_DURATION_MS);
}

function subscribe(onStoreChange) {
  // First subscriber: adopt the real connectivity state and start listening
  if (listeners.size === 0) {
    const isOnline = navigator.onLine;
    wasOffline = !isOnline;
    snapshot = isOnline ? ONLINE_STATE : { isOnline: false, cameBackOnline: false };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
  }

  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);

    // Last subscriber unmounted: stop listening and drop pending timers
    if (listeners.size === 0) {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearDismissTimer();
      wasOffline = false;
      snapshot = ONLINE_STATE;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => ONLINE_STATE;

export default function NetworkBanner() {
  const { isOnline, cameBackOnline } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You are currently offline. Changes will sync when reconnected.</span>
      </div>
    );
  }

  // Back online success banner (only if was previously offline)
  if (cameBackOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-500 text-white text-center py-2 px-4 text-sm font-medium shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
        <Wifi className="h-4 w-4 shrink-0" />
        <span>Back online! Your connection has been restored.</span>
      </div>
    );
  }

  return null;
}
