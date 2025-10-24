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
   * Reads parameters from the current URL hash and updates the session state.
   * This is the single source of truth for session-wide parameters and MUST be
   * called at the beginning of any navigation event.
   */
  updateFromUrl() {
    const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    
    if (queryStringIndex !== -1) {
      const queryString = hash.substring(queryStringIndex + 1);
      const urlParams = new URLSearchParams(queryString);
      
      this.sessionParams = urlParams;
      sessionStorage.setItem('thoughtform_session_params', this.sessionParams.toString());
      
    } else {
      // If the URL has no params, we CLEAR the session params. This allows the user
      // to create a "clean" session by manually removing the query string.
      this.sessionParams = new URLSearchParams();
      sessionStorage.removeItem('thoughtform_session_params');
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

    // Create a mutable copy of the session params to work with.
    const finalParams = new URLSearchParams(this.sessionParams);

    if (isForWindow) {
      finalParams.set('windowed', 'true');
    }

    const finalQueryString = finalParams.toString();
    const finalHash = hashPath + (finalQueryString ? `?${finalQueryString}` : '');

    return `${pathname}${finalHash}`;
  }
}