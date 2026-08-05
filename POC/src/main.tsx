import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CustomerPortalProvider } from './customer/contexts/CustomerPortalContext';
import './index.css';

// Prevent tree-shaking of React binding in classic JSX runtime
// @ts-ignore
window.React = React;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerPortalProvider>
      <App />
    </CustomerPortalProvider>
  </StrictMode>,
);

// Centralized Service Worker management
if (import.meta.env.PROD) {
  if ('serviceWorker' in navigator) {
    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
} else {
  // Ensure the Service Worker is NEVER registered in development, and clean up any existing ones.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        let unregisteredAny = false;
        const unregisterPromises = registrations.map((registration) => {
          unregisteredAny = true;
          return registration.unregister();
        });
        return Promise.all(unregisterPromises).then(() => {
          if (unregisteredAny) {
            console.log('Dev: Stale Service Worker detected and unregistered successfully.');
            // Clear all caches as well to clean up any remaining compiled dev scripts
            return caches.keys().then((keys) => {
              return Promise.all(keys.map((key) => caches.delete(key)));
            }).then(() => {
              console.log('Dev: Cache storage cleaned up.');
              // Only reload once to make sure the app works with completely fresh assets
              if (!sessionStorage.getItem('sw_cleaned')) {
                sessionStorage.setItem('sw_cleaned', '1');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.error('Dev: Failed to query active Service Workers for cleanup:', err);
      });
  }
}

