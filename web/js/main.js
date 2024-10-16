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

app.registerExtension({
    name: 'simpleTray.imageFeed',
    async setup() {
        const imageFeed = new ImageFeed();
        await imageFeed.setup();
    },
});