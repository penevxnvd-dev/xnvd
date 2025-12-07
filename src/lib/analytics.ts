// Analytics and monitoring setup
// Supports multiple providers: Sentry, Google Analytics, Plausible

interface AnalyticsEvent {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;
}

class Analytics {
  private initialized = false;

  init() {
    if (this.initialized) return;
    
    // Initialize Sentry if DSN is provided
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (sentryDsn) {
      // Sentry will be initialized here when package is added
      // import * as Sentry from '@sentry/react';
      // Sentry.init({ dsn: sentryDsn });
    }

    // Initialize Google Analytics if ID is provided
    const gaId = import.meta.env.VITE_GA_ID;
    if (gaId) {
      this.initGoogleAnalytics(gaId);
    }

    // Initialize Plausible if domain is provided
    const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    if (plausibleDomain) {
      this.initPlausible(plausibleDomain);
    }

    this.initialized = true;
  }

  private initGoogleAnalytics(gaId: string) {
    // Load gtag script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(script2);
  }

  private initPlausible(domain: string) {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', domain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }

  track(event: AnalyticsEvent) {
    if (!this.initialized) this.init();

    // Track in Google Analytics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gtag('event', event.name, event.properties);
    }

    // Track in Plausible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).plausible) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).plausible(event.name, { props: event.properties });
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log('Analytics Event:', event);
    }
  }

  trackError(error: Error, context?: Record<string, unknown>) {
    // Send to Sentry if available
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error, { contexts: { custom: context } });
    // }

    // Track as analytics event
    this.track({
      name: 'error',
      properties: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    });
  }

  trackPageView(path: string) {
    this.track({
      name: 'page_view',
      properties: { path },
    });
  }
}

export const analytics = new Analytics();

// Initialize on import
if (typeof window !== 'undefined') {
  analytics.init();
}

