import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Block old project connections early
import "./lib/blockOldProject";

// Filter out development-only warnings that don't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter CORS errors from Lovable development API
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    const allArgsStr = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message || ''} ${arg.stack || ''}`;
      }
      return String(arg);
    }).join(' ').toLowerCase();
    
    // Filter out requests to old Supabase project (XHR, fetch, etc.)
    if (message.includes('ufpeftuanzmkiryohesd') ||
        allArgsStr.includes('ufpeftuanzmkiryohesd') ||
        message.includes('ufpeftuanzmkiryohesd.supabase.co') ||
        allArgsStr.includes('ufpeftuanzmkiryohesd.supabase.co')) {
      return; // Silently ignore old project connection attempts
    }
    
    // Filter out CORS errors from api.lovable.dev (development tools)
    if (message.includes('Cross-Origin Request Blocked') && message.includes('api.lovable.dev')) {
      return; // Silently ignore these development-only errors
    }
    // Filter out 403 errors from development tools (Lovable, BrowserAutomation, etc.)
    if (message.includes('Failed to load resource') && message.includes('register-iframe')) {
      return; // Silently ignore these development-only errors
    }
    // Filter out BrowserAutomation errors (Cursor/VS Code browser automation)
    if (message.includes('BrowserAutomation') || message.includes('registerWithMCP') || message.includes('localhost:46197')) {
      return; // Silently ignore browser automation tool errors
    }
    // Filter out 403 errors from Supabase RLS only if they're expected (e.g., during initial load)
    // But log them for debugging in development
    if (message.includes('Failed to load resource') && (message.includes('403') || message.includes('Forbidden'))) {
      const url = args.find(arg => typeof arg === 'string' && (arg.includes('supabase.co') || arg.includes('supabase.io')));
      if (url) {
        // In development, log 403 errors for debugging
        if (import.meta.env.DEV) {
          console.warn('⚠️ Supabase 403 error (RLS policy):', url);
          console.warn('   This may indicate an authentication or permission issue.');
          console.warn('   Check: 1) User is authenticated, 2) RLS policies allow access, 3) User has correct role');
        }
        // Still filter in production to reduce console noise
        if (!import.meta.env.DEV) {
          return;
        }
      }
      // Also filter localhost MCP server errors
      const localhostUrl = args.find(arg => typeof arg === 'string' && arg.includes('localhost:46197'));
      if (localhostUrl) {
        return; // Silently ignore MCP server registration errors
      }
    }
    // Filter out temporary network errors from Supabase Auth (will retry automatically)
    if (message.includes('Failed to fetch') && message.includes('auth.supabase.io')) {
      // Don't show these errors - they're handled with retry logic
      return;
    }
    // Filter out WebSocket/Realtime connection errors (not critical if Realtime isn't used)
    // Also filter old project WebSocket attempts - VERY AGGRESSIVE
    if (message.includes('websocket') || 
        message.includes('WebSocket') || 
        message.includes('realtime') ||
        message.includes('Realtime') ||
        message.includes('NS_ERROR_WEBSOCKET') ||
        message.includes('ufpeftuanzmkiryohesd') ||
        message.includes('wss://ufpeftuanzmkiryohesd') ||
        message.includes('realtime/v1/websocket') ||
        allArgsStr.includes('websocket') ||
        allArgsStr.includes('realtime/v1/websocket') ||
        allArgsStr.includes('ns_error_websocket') ||
        allArgsStr.includes('connection_refused') ||
        allArgsStr.includes('ufpeftuanzmkiryohesd') ||
        allArgsStr.includes('wss://ufpeftuanzmkiryohesd') ||
        allArgsStr.includes('__cf_bm')) {
      // These are non-critical - Realtime is disabled and old project is cached
      return; // Always filter these - they're from cached old project data
    }
    // Filter out cookie domain warnings (browser security, not app errors)
    if (message.includes('Cookie') && message.includes('rejected') && message.includes('domain')) {
      return; // Browser security warnings, not app errors
    }
    // Filter out "Old Supabase project" errors (these are handled gracefully)
    if (message.includes('Old Supabase project') || 
        message.includes('update environment variables') ||
        allArgsStr.includes('Old Supabase project') ||
        allArgsStr.includes('ufpeftuanzmkiryohesd')) {
      // This error is logged but doesn't need to be shown to user
      // The app will handle it gracefully
      return;
    }
    
    // Filter out SES (Secure EcmaScript) lockdown errors
    // These are caused by browser extensions (like MetaMask) injecting SES code
    // They don't affect the app's functionality and are safe to ignore
    
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('ses_uncaught_exception') ||
        messageLower.includes('ses removing') ||
        messageLower.includes('ses ') ||
        messageLower.includes('lockdown-install') ||
        allArgsStr.includes('ses_uncaught_exception') ||
        allArgsStr.includes('ses removing') ||
        allArgsStr.includes('lockdown-install') ||
        allArgsStr.includes('removing unpermitted intrinsics') ||
        allArgsStr.includes('removing intrinsics') ||
        allArgsStr.includes('removing intrinsics.%') ||
        allArgsStr.includes('totemporalinstant') ||
        allArgsStr.includes('getorinsert') ||
        allArgsStr.includes('getorinsertcomputed') ||
        allArgsStr.includes('mapprototype') ||
        allArgsStr.includes('weakmapprototype') ||
        allArgsStr.includes('dateprototype') ||
        allArgsStr.includes('intrinsics.%')) {
      return; // Silently ignore SES security-related errors from browser extensions
    }
    originalError.apply(console, args);
  };
  
  // Filter preload warnings from Lovable assets
  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    // Filter out preload warnings for Lovable fonts (optimization hints, not errors)
    if (message.includes('preloaded with link preload was not used') && message.includes('lovable.dev')) {
      return; // Silently ignore these optimization warnings
    }
    // Filter out SES (Secure EcmaScript) lockdown warnings about removing intrinsics
    // These are normal security-related messages and don't affect functionality
    const allWarnArgsStr = args.map(arg => String(arg)).join(' ').toLowerCase();
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('removing unpermitted intrinsics') || 
        messageLower.includes('removing intrinsics') ||
        messageLower.includes('ses removing') ||
        messageLower.includes('ses ') ||
        messageLower.includes('lockdown-install') ||
        allWarnArgsStr.includes('lockdown-install') ||
        allWarnArgsStr.includes('removing intrinsics') ||
        allWarnArgsStr.includes('removing intrinsics.%') ||
        allWarnArgsStr.includes('totemporalinstant') ||
        allWarnArgsStr.includes('getorinsert') ||
        allWarnArgsStr.includes('getorinsertcomputed') ||
        allWarnArgsStr.includes('mapprototype') ||
        allWarnArgsStr.includes('weakmapprototype') ||
        allWarnArgsStr.includes('dateprototype') ||
        allWarnArgsStr.includes('intrinsics.%')) {
      return; // Silently ignore these SES security warnings
    }
    // Filter out BrowserAutomation warnings (Cursor/VS Code browser automation)
    if (message.includes('BrowserAutomation') || message.includes('MCP server') || message.includes('Tab ID already registered')) {
      return; // Silently ignore browser automation tool warnings
    }
    // Filter out WebSocket/Realtime warnings (non-critical)
    if (message.includes('websocket') || 
        message.includes('WebSocket') || 
        message.includes('realtime') ||
        message.includes('Realtime') ||
        allWarnArgsStr.includes('websocket') ||
        allWarnArgsStr.includes('realtime')) {
      return; // Silently ignore Realtime warnings
    }
    // Filter out cookie domain warnings (browser security, not app errors)
    if (message.includes('Cookie') && message.includes('rejected') && message.includes('domain')) {
      return; // Browser security warnings, not app errors
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
