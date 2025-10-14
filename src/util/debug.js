/**
 * Utility to manage debug logging based on a query parameter.
 * Checks for '?debug' in the URL.
 */

class DebugUtil {
  constructor() {
    // Check URL for ?debug query parameter
    const urlParams = new URLSearchParams(window.location.search);
    this.isEnabled = urlParams.has('debug');
    console.log(`[DEBUG] Debug mode is ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Log a debug message if debug mode is enabled.
   * @param {...any} args - Arguments to pass to console.log
   */
  log(...args) {
    if (this.isEnabled) {
      console.log("[DEBUG]", ...args);
    }
  }

  /**
   * Log a debug error message if debug mode is enabled.
   * @param {...any} args - Arguments to pass to console.error
   */
  error(...args) {
    if (this.isEnabled) {
      console.error("[DEBUG]", ...args);
    }
  }

   /**
   * Log a debug warn message if debug mode is enabled.
   * @param {...any} args - Arguments to pass to console.warn
   */
  warn(...args) {
    if (this.isEnabled) {
      console.warn("[DEBUG]", ...args);
    }
  }
}

// Create a singleton instance
const debug = new DebugUtil();

// Export the instance for use in other modules
export default debug;