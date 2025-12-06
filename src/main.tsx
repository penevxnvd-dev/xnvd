import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out development-only warnings that don't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter CORS errors from Lovable development API
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
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
    // Filter out 403 errors from Supabase RLS (expected when not authenticated)
    if (message.includes('Failed to load resource') && (message.includes('403') || message.includes('Forbidden'))) {
      const url = args.find(arg => typeof arg === 'string' && (arg.includes('supabase.co') || arg.includes('supabase.io')));
      if (url) {
        return; // Silently ignore Supabase 403 errors - they're handled by the app
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
    if (message.includes('Removing unpermitted intrinsics') || 
        message.includes('Removing intrinsics') ||
        message.includes('lockdown-install.js') ||
        message.includes('toTemporalInstant') ||
        message.includes('getOrInsert')) {
      return; // Silently ignore these SES security warnings
    }
    // Filter out BrowserAutomation warnings (Cursor/VS Code browser automation)
    if (message.includes('BrowserAutomation') || message.includes('MCP server') || message.includes('Tab ID already registered')) {
      return; // Silently ignore browser automation tool warnings
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
