import axios from 'axios';
import { API_BASE_URL, DEV_API_ORIGIN } from './api';

const rewriteUrl = (url) => {
  if (typeof url !== 'string') return url;
  if (!url.startsWith(DEV_API_ORIGIN)) return url;
  // If API_BASE_URL is '', we want to keep only the path (same-origin)
  return url.replace(DEV_API_ORIGIN, API_BASE_URL);
};

export const patchNetworkLayer = () => {
  if (typeof window === 'undefined') return;

  // Patch fetch so existing hardcoded localhost URLs still work on Render
  const originalFetch = window.fetch?.bind(window);
  if (originalFetch) {
    window.fetch = (input, init) => {
      try {
        if (typeof input === 'string') {
          return originalFetch(rewriteUrl(input), init);
        }

        if (input instanceof Request) {
          const newUrl = rewriteUrl(input.url);
          if (newUrl !== input.url) {
            const newRequest = new Request(newUrl, input);
            return originalFetch(newRequest, init);
          }
        }
      } catch {
        // fall through
      }

      return originalFetch(input, init);
    };
  }

  // Patch axios requests similarly
  axios.interceptors.request.use((config) => {
    if (config?.url) config.url = rewriteUrl(config.url);
    return config;
  });
};
