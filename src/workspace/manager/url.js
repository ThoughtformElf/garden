/**
 * Manages URL parameters that are "sticky" for the current browser session.
 */
export class UrlManager {
  constructor() {
    this.sessionParams = new URLSearchParams();
    // Run this once on initial load.
    this.updateFromUrl();
  }

  /**
   * Reads parameters from the current URL hash, normalizes them (lowercase keys, decoded values),
   * and updates the session state. This is the single source of truth for the session.
   */
  updateFromUrl() {
    const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    
    if (queryStringIndex !== -1) {
      const queryString = hash.substring(queryStringIndex + 1);
      const urlParams = new URLSearchParams(queryString);
      
      const normalizedParams = {};
      for (const [key, value] of urlParams.entries()) {
        normalizedParams[key.toLowerCase()] = value;
      }
      
      this.sessionParams = new URLSearchParams(normalizedParams);
      sessionStorage.setItem('thoughtform_session_params', JSON.stringify(normalizedParams));
      
    } else {
      // If the URL has no params, but we have stored ones, it means the user manually
      // navigated back to a clean URL. We should clear the session state.
      if (sessionStorage.getItem('thoughtform_session_params')) {
        this.sessionParams = new URLSearchParams();
        sessionStorage.removeItem('thoughtform_session_params');
      }
    }
  }

  /**
   * @returns {URLSearchParams} The current session parameters.
   */
  getSessionParams() {
    return this.sessionParams;
  }

  /**
   * Builds a complete, valid application URL, automatically appending any sticky session parameters.
   * @param {string} garden - The name of the target garden.
   * @param {string} path - The file path within the garden.
   * @param {boolean} isForWindow - If true, ensures the '?windowed=true' param is set.
   * @returns {string} The full URL path including hash and query string.
   */
  buildUrl(garden, path, isForWindow = false) {
    const fullUrlPath = new URL(import.meta.url).pathname;
    const srcIndex = fullUrlPath.lastIndexOf('/src/');
    const basePath = srcIndex > -1 ? fullUrlPath.substring(0, srcIndex) : '';
    
    const pathname = `${basePath}/${encodeURIComponent(garden)}`;
    const hashPath = `#${encodeURI(path)}`;

    const finalParams = new URLSearchParams(this.sessionParams);

    if (isForWindow) {
      finalParams.set('windowed', 'true');
    }

    const finalQueryString = finalParams.toString();
    const finalHash = hashPath + (finalQueryString ? `?${finalQueryString}` : '');

    return `${pathname}${finalHash}`;
  }
}