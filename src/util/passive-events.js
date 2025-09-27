/**
 * Monkey-patches EventTarget.prototype.addEventListener to automatically
 * set `passive: true` for scroll-blocking events (touchstart, touchmove, wheel)
 * if not specified. This helps silence console violation warnings from
 * third-party libraries like Eruda.
 *
 * This module has a side effect and should be imported once at the very
 * top level of the application's entry point.
 * 
 * Without this we'll get warnings like:
 * [Violation] Added non-passive event listener to a scroll-blocking 'wheel' event. Consider marking event handler as 'passive' to make the page more responsive
 */

// Feature-detect support for the options object
var supportsPassive = false;
try {
  var opts = {};
  Object.defineProperty(opts, 'passive', {
    get() { supportsPassive = true; return false; }
  });
  window.addEventListener('testpassive', null, opts);
  window.removeEventListener('testpassive', null, opts);
} catch (e) {
  // This can fail in some environments, which is fine.
}

if (supportsPassive) {
  var origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    var usesObj = options && typeof options === 'object';
    var useCapture = usesObj ? options.capture : options;

    var finalOptions = usesObj ? Object.assign({}, options) : {};

    // If passive is not explicitly defined, default it for specific events.
    if (finalOptions.passive === undefined) {
      if (type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
        finalOptions.passive = true;
      }
    }

    // Ensure capture is correctly set.
    if (finalOptions.capture === undefined) {
      finalOptions.capture = !!useCapture;
    }

    return origAdd.call(this, type, listener, finalOptions);
  };
}