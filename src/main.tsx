import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out development-only warnings that don't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter CORS errors from Lovable development API
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out CORS errors from api.lovable.dev (development tools)
    if (message.includes('Cross-Origin Request Blocked') && message.includes('api.lovable.dev')) {
      return; // Silently ignore these development-only errors
    }
    // Filter out 403 errors from Lovable iframe registration (development tools)
    if (message.includes('Failed to load resource') && (message.includes('register-iframe') || message.includes('403'))) {
      return; // Silently ignore these development-only errors
    }
    originalError.apply(console, args);
  };
  
  // Filter preload warnings from Lovable assets
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out preload warnings for Lovable fonts (optimization hints, not errors)
    if (message.includes('preloaded with link preload was not used') && message.includes('lovable.dev')) {
      return; // Silently ignore these optimization warnings
    }
    // Filter out SES (Secure EcmaScript) lockdown warnings about removing intrinsics
    // These are normal security-related messages and don't affect functionality
    if (message.includes('Removing unpermitted intrinsics') || 
        message.includes('Removing intrinsics') ||
        message.includes('lockdown-install.js') ||
        message.includes('toTemporalInstant') ||
        message.includes('getOrInsert')) {
      return; // Silently ignore these SES security warnings
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
