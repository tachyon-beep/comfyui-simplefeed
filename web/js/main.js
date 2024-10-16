/**
 * main.js - Entry point for the simple image feed and lightbox for ComfyUI.
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

import { app } from '../../../scripts/app.js';
import { ImageFeed } from './imageFeed.js';

const CSS_FILES = [
    '../css/imageFeed.css',
    '../css/modal.css',
    '../css/lightbox.css'
];

/**
 * Loads a CSS file by creating a link element and appending it to the document head.
 * @param {string} filename - The name of the CSS file to load.
 */
function loadCSS(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = filename;
    document.head.appendChild(link);
}

/**
 * Loads all required CSS files.
 */
function loadAllCSS() {
    CSS_FILES.forEach(loadCSS);
}

app.registerExtension({
    name: 'simpleTray.imageFeed',
    async setup() {
        loadAllCSS();
        const imageFeed = new ImageFeed();
        await imageFeed.setup();
    },
});