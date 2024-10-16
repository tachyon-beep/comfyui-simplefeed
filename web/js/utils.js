/**
 * utils.js - Utility functions and constants for the simple image feed and lightbox.
 *
 * Version: 1.3.0
 * Repository: https://github.com/tachyon-beep/comfyui-simplefeed
 * License: MIT License
 * Author: John Morrissey (tachyon-beep)
 * Year: 2024
 *
 * Based on the imagetray from the ComfyUI - Custom Scripts extension by pythongosssss
 * Repository: https://github.com/pythongosssss/ComfyUI-Custom-Scripts
 * License: MIT License
 */

'use strict';

/**
 * Creates a debounced function that delays invoking the provided function until after
 * the specified wait time has elapsed since the last time the debounced function was invoked.
 * Optionally, it can invoke the function immediately on the leading edge.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @param {boolean} [immediate=false] - Whether to invoke the function on the leading edge.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait, immediate = false) {
    let timeout;

    function debounced(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) {
            func.apply(context, args);
        }
    }

    debounced.cancel = () => {
        clearTimeout(timeout);
    };

    return debounced;
}

/**
 * Creates a throttled function that only invokes the provided function at most once every
 * specified number of milliseconds, ensuring consistent intervals between calls.
 *
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The number of milliseconds to wait before allowing another call.
 * @returns {Function} The throttled function.
 */
export function throttle(func, limit) {
    let lastFunc;
    let lastRan;

    return function (...args) {
        const context = this;

        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);

            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Loads a CSS file by creating a link element and appending it to the document head.
 * @param {string} filename - The name of the CSS file to load.
 */
export function loadCSS(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    document.head.appendChild(link);
}
