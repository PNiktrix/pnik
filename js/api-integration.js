/**
 * api-integration.js
 * Generic API client wrapper used by Shiprocket, EmailJS, and future integrations.
 * Handles retries, timeouts, and error normalisation.
 */
const API = {
  DEFAULT_TIMEOUT: 12000, // ms

  /**
   * Wrapper around fetch with timeout and retry.
   * @param {string} url
   * @param {Object} options  - fetch options
   * @param {number} [retries]
   * @returns {Promise<Object>}
   */
  async request(url, options = {}, retries = 2) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (retries > 0 && e.name !== 'AbortError') {
        console.warn(`[API] Retrying (${retries} left):`, url);
        await new Promise(r => setTimeout(r, 800));
        return this.request(url, options, retries - 1);
      }
      console.error('[API] Request failed:', url, e.message);
      throw e;
    }
  },

  get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  },

  post(url, body, headers = {}) {
    return this.request(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body:    JSON.stringify(body),
    });
  },
};
