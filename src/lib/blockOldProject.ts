/**
 * Block connections to old Supabase project
 * This prevents any network requests to the old project URL
 */

if (typeof window !== 'undefined') {
  // Override XMLHttpRequest to block old project
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends OriginalXHR {
    open(method: string, url: string | URL, ...args: unknown[]) {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('ufpeftuanzmkiryohesd')) {
        console.warn('[BlockOldProject] Blocked XHR request to old project:', urlString);
        // Don't actually open the connection
        return;
      }
      return super.open(method, url, ...args);
    }
  } as typeof XMLHttpRequest;

  // Override fetch to block old project (additional safety)
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    if (urlString.includes('ufpeftuanzmkiryohesd')) {
      console.warn('[BlockOldProject] Blocked fetch request to old project:', urlString);
      return Promise.reject(new Error('Old project connection blocked - please update Vercel environment variables'));
    }
    
    return originalFetch(input, init);
  };
}

