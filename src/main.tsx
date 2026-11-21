import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Block old project connections early
import "./lib/blockOldProject";

// Filter only known noisy development / extension messages.
// Real application and Supabase errors are left visible.
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  const isNoisy = (args: unknown[]): boolean => {
    const all = args.map(arg => {
      if (arg instanceof Error) return `${arg.message || ''} ${arg.stack || ''}`;
      return String(arg);
    }).join(' ').toLowerCase();

    // Old Supabase project remnants
    if (all.includes('ufpeftuanzmkiryohesd')) return true;

    // Browser automation / MCP tools
    if (all.includes('browserautomation') || all.includes('registerwithmcp') || all.includes('localhost:46197')) return true;

    // SES lockdown from extensions (MetaMask etc.)
    if (all.includes('ses_uncaught_exception') || all.includes('lockdown-install') || all.includes('removing unpermitted intrinsics')) return true;

    // Non-critical Realtime (disabled in this app)
    if (all.includes('websocket') && all.includes('realtime')) return true;

    return false;
  };

  console.error = (...args: unknown[]) => {
    if (isNoisy(args)) return;
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    if (isNoisy(args)) return;
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
