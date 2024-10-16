/**
 * lightbox.js - Lightbox functionality for the simple image feed in ComfyUI.
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

import { throttle } from './utils.js';

const BASE_PAN_SPEED_MULTIPLIER = 1; // Normal speed
const SHIFT_PAN_SPEED_MULTIPLIER = 3; // Double speed when Shift is held
const BASE_ZOOM_MULTIPLIER = 1.2;
const SHIFT_ZOOM_MULTIPLIER = 3.6;

class Lightbox {
    #el;
    #img;
    #link;
    #closeBtn;
    #prev;
    #next;
    #spinner;
    #images = [];
    #index = 0;

    #minScale = 1; // Dynamic minimum scale based on fit
    #maxScale = 10; // Fixed maximum scale

    isPanning = false;
    panX = 0;
    panY = 0;
    mouseMovedDuringPan = false;

    constructor(getImagesFunction) {
        this.getImages = getImagesFunction;

        // Event handlers for various elements
        this.handleElClick = (e) => {
            if (e.target === this.#el) {
                this.close();
            }
        };
        this.handleCloseBtnClick = () => this.close();
        this.handlePrevClick = () => {
            this.#triggerArrowClickEffect(this.#prev);
            this.#update(-1);
        };
        this.handleNextClick = () => {
            this.#triggerArrowClickEffect(this.#next);
            this.#update(1);
        };

        // Bind methods and store them
        this.startPanHandler = this.#startPanWithPointerLock.bind(this);
        this.panHandler = this.#panWithPointerLock.bind(this);
        this.endPanHandler = this.#endPanWithPointerLock.bind(this);
        this.handleKeyDownHandler = this.#handleKeyDown.bind(this);
        this.handleZoomHandler = throttle(this.#handleZoom.bind(this), 50);
        this.resetZoomPanHandler = this.#resetZoomPan.bind(this);
        this.pointerLockChangeHandler = this.#onPointerLockChange.bind(this);
        this.pointerLockErrorHandler = this.#onPointerLockError.bind(this);

        // Create DOM elements and add event listeners
        this.#createElements();
        this.#addEventListeners();
    }

    destroy() {
        // Remove event listeners
        this.#el.removeEventListener('click', this.handleElClick);
        this.#closeBtn.removeEventListener('click', this.handleCloseBtnClick);
        this.#prev.removeEventListener('click', this.handlePrevClick);
        this.#next.removeEventListener('click', this.handleNextClick);
        this.#img.removeEventListener('mousedown', this.startPanHandler);
        document.removeEventListener('mouseup', this.endPanHandler);
        document.removeEventListener('keydown', this.handleKeyDownHandler);
        this.#img.removeEventListener('wheel', this.handleZoomHandler);
        this.#img.removeEventListener('dblclick', this.resetZoomPanHandler);
        document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
        document.removeEventListener('pointerlockerror', this.pointerLockErrorHandler);
        // Remove DOM elements
        document.body.removeChild(this.#el);
    }

    registerForUpdates(updateCallback) {
        this.updateCallback = updateCallback;
    }

    #handleZoom(e) {
        e.preventDefault();
        let delta = e.deltaY;

        // Normalize deltaY for consistent behavior across browsers
        if (delta === 0) {
            delta = e.wheelDelta ? -e.wheelDelta : 0;
        }

        // Determine if shift key is pressed
        const isModifierPressed = e.shiftKey;

        // Set the zoom factor based on whether the shift key is pressed
        let zoomFactor = isModifierPressed ? SHIFT_ZOOM_MULTIPLIER : BASE_ZOOM_MULTIPLIER;

        if (delta < 0) {
            // Zoom in
            this.imageScale = Math.min(this.imageScale * zoomFactor, this.#maxScale);
        } else if (delta > 0) {
            // Zoom out
            this.imageScale = Math.max(this.imageScale / zoomFactor, this.#minScale);
        }

        // Update pan bounds after scaling
        this.#updatePanBounds();

        // Update image transform and cursor
        this.#updateImageTransform();
        this.#updateCursor();

        // Reset pan offsets if panning is not possible
        if (this.maxPanX <= 1 && this.maxPanY <= 1) { // Using threshold
            this.panX = 0;
            this.panY = 0;
            this.isPanning = false;
        }
    }

    #startPanWithPointerLock(e) {
        this.#updatePanBounds();
        const canPan = (this.imageScale > this.#minScale);

        if (canPan && e.button === 0) { // Left mouse button
            e.preventDefault();
            this.#img.requestPointerLock();
        }
    }

    #panWithPointerLock(e) {
        if (this.isPanning) {
            // Determine if Shift key is held
            const isShiftPressed = e.shiftKey;

            // Set speed multiplier based on Shift key state
            const speedMultiplier = isShiftPressed ? SHIFT_PAN_SPEED_MULTIPLIER : BASE_PAN_SPEED_MULTIPLIER;

            // Apply pan speed multiplier to movement
            const deltaX = e.movementX * speedMultiplier;
            const deltaY = e.movementY * speedMultiplier;

            this.panX += deltaX;
            this.panY += deltaY;

            this.mouseMovedDuringPan = true;

            // Constrain panX and panY within bounds
            this.panX = Math.min(Math.max(this.panX, -this.maxPanX), this.maxPanX);
            this.panY = Math.min(Math.max(this.panY, -this.maxPanY), this.maxPanY);

            this.#updateImageTransform();
        }
    }

    #endPanWithPointerLock() {
        if (this.isPanning) {
            document.exitPointerLock();
        }
    }

    #updatePanBounds() {
        // Panning is only possible if imageScale > minScale
        if (this.imageScale <= this.#minScale) {
            // Panning is not possible
            this.maxPanX = 0;
            this.maxPanY = 0;
            return;
        }

        // Get the dimensions of the container and the scaled image
        const containerRect = this.#link.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        const scaledImageWidth = this.originalWidth * this.imageScale;
        const scaledImageHeight = this.originalHeight * this.imageScale;

        // Calculate the maximum allowable panning distances
        this.maxPanX = Math.max((scaledImageWidth - containerWidth) / 2, 0);
        this.maxPanY = Math.max((scaledImageHeight - containerHeight) / 2, 0);
    }

    #resetZoomPan() {
        // Reset zoom level and pan offsets to default values
        this.imageScale = this.#minScale;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;

        // Update the transform and cursor
        this.#updateImageTransform();
        this.#updateCursor();
    }

    #updateImageTransform() {
        if (this.imageScale <= this.#minScale) {
            // Reset pan and scale if at minimum scale
            this.panX = 0;
            this.panY = 0;
            this.#img.style.transform = `scale(${this.#minScale})`;
        } else {
            // Constrain panX and panY within bounds
            this.panX = Math.min(Math.max(this.panX, -this.maxPanX), this.maxPanX);
            this.panY = Math.min(Math.max(this.panY, -this.maxPanY), this.maxPanY);

            // Apply translation and scaling to the image
            this.#img.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.imageScale})`;
        }
    }

    #updateCursor() {
        // Update cursor style depending on whether panning is possible
        const canPan = (this.imageScale > this.#minScale);
        if (canPan) {
            this.#img.style.cursor = this.isPanning ? 'grabbing' : 'grab';
        } else {
            this.#img.style.cursor = 'auto';
        }
    }

    #createElements() {
        // Create the lightbox container element
        this.#el = this.#createElement('div', 'lightbox');
        this.#closeBtn = this.#createElement('div', 'lightbox__close', this.#el);

        // Create arrow containers and add inner arrow elements
        this.#prev = this.#createElement('div', 'lightbox__prev', this.#el);
        this.#createElement('div', 'arrow-inner', this.#prev);

        const main = this.#createElement('div', 'lightbox__main', this.#el);

        this.#next = this.#createElement('div', 'lightbox__next', this.#el);
        this.#createElement('div', 'arrow-inner', this.#next);

        // Create the container for the image and spinner
        this.#link = this.#createElement('div', 'lightbox__link', main);

        this.#spinner = this.#createElement('div', 'lightbox__spinner', this.#link);
        this.#img = this.#createElement('img', 'lightbox__img', this.#link);
        document.body.appendChild(this.#el);
    }

    #createElement(tag, className, parent, attrs = {}) {
        // Helper function to create and configure a DOM element
        const el = document.createElement(tag);
        el.className = className;
        if (parent) {
            parent.appendChild(el);
        }
        Object.entries(attrs).forEach(([key, value]) =>
            el.setAttribute(key, value)
        );
        return el;
    }

    #addEventListeners() {
        // Add event listeners for various elements in the lightbox
        this.#el.addEventListener('click', this.handleElClick);
        this.#closeBtn.addEventListener('click', this.handleCloseBtnClick);
        this.#prev.addEventListener('click', this.handlePrevClick);
        this.#next.addEventListener('click', this.handleNextClick);

        this.#img.addEventListener('mousedown', this.startPanHandler);
        document.addEventListener('mouseup', this.endPanHandler);
        document.addEventListener('keydown', this.handleKeyDownHandler);
        this.#img.addEventListener('wheel', this.handleZoomHandler);
        this.#img.addEventListener('dblclick', this.resetZoomPanHandler);

        // Add Pointer Lock specific event listeners
        document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
        document.addEventListener('pointerlockerror', this.pointerLockErrorHandler);

        // Handle resizing the window
        window.addEventListener('resize', () => {
            if (this.isOpen()) {
                // Keep maxScale as a fixed constant
                this.#maxScale = 10;

                // Update pan bounds and transforms
                this.#updatePanBounds();
                this.#updateImageTransform();
                this.#updateCursor();
            }
        });

        // Stop propagation when clicking on the image itself (to avoid closing the lightbox)
        this.#img.addEventListener('click', (e) => e.stopPropagation());

        // Prevent context menu when panning
        this.#img.addEventListener('contextmenu', (e) => {
            if (this.isPanning) {
                e.preventDefault();
            }
        });
    }

    #onPointerLockChange() {
        // Handle pointer lock changes (used for panning)
        if (document.pointerLockElement === this.#img) {
            this.isPanning = true;
            this.mouseMovedDuringPan = false;
            this.#img.style.cursor = 'grabbing';

            // Add event listener for mouse movement during pointer lock
            document.addEventListener('mousemove', this.panHandler);
        } else {
            this.isPanning = false;
            this.#img.style.cursor = this.mouseMovedDuringPan ? 'grabbing' : 'grab';

            // Remove the mousemove listener
            document.removeEventListener('mousemove', this.panHandler);
        }
    }

    #onPointerLockError() {
        console.error('Pointer Lock failed.');
    }

    forceReflow(element) {
        // Reading a property that requires layout will force a reflow
        return element.offsetHeight;
    }

    #triggerArrowClickEffect(arrowElement) {
        // Trigger a visual effect on arrow click
        const innerArrow = arrowElement.querySelector('.arrow-inner');

        if (innerArrow) {
            innerArrow.classList.remove('arrow-click-effect');
            // Force a reflow by getting and setting a layout property
            this.forceReflow(innerArrow);
            innerArrow.classList.add('arrow-click-effect');

            innerArrow.addEventListener(
                'animationend',
                () => {
                    innerArrow.classList.remove('arrow-click-effect');
                },
                { once: true }
            );
        }
    }

    #handleKeyDown(event) {
        // Handle key presses for navigation and closing
        if (this.#el.style.display === 'none') {
            return;
        }
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
                this.#update(-1);
                break;
            case 'ArrowRight':
            case 'd':
                this.#update(1);
                break;
            case 'Escape':
                this.close();
                break;
        }
    }

    show(images, index = 0) {
        // Show the lightbox with the specified images and starting index
        this.#images = images;
        this.#index = index;
        this.#updateArrowStyles();
        this.#update(0);
        this.#el.style.display = 'flex';
        setTimeout(() => (this.#el.style.opacity = 1), 0);
    }

    close() {
        // Close the lightbox with a fade-out effect
        this.#el.style.opacity = 0;
        setTimeout(() => {
            this.#el.style.display = 'none';
        }, 300); // Match the transition duration
    }

    initializeImages(images) {
        // Initialize the image list
        this.#images = images;
    }

    async #update(shift, resetZoomPan = true) {
        // Ensure images are available
        if (!Array.isArray(this.#images) || this.#images.length === 0) {
            console.debug('Initialising Lightbox - No images available.');
            return;
        }

        let newIndex = this.#index + shift;

        // Implement wrapping behavior for navigation
        if (newIndex < 0) {
            newIndex = this.#images.length - 1; // Wrap to the last image
        } else if (newIndex >= this.#images.length) {
            newIndex = 0; // Wrap to the first image
        }

        // Check if we are updating the same image without needing to reset
        const isSameImage = newIndex === this.#index;

        this.#index = newIndex;

        // Update arrow styles based on the current index
        this.#updateArrowStyles();

        // If we're not resetting zoom/pan and the image hasn't changed, skip reloading
        if (isSameImage && !resetZoomPan) {
            // Only update pan bounds and cursor without reloading the image
            this.#updatePanBounds();
            this.#updateImageTransform();
            this.#updateCursor();
            return;
        }

        const img = this.#images[this.#index];

        // Ensure the image source is valid
        if (!img) {
            console.error(`Image at index ${this.#index} is undefined or invalid.`);
            this.#spinner.style.display = 'none';
            this.#img.alt = 'Image not available';
            return;
        }

        this.#img.style.opacity = 0;
        this.#spinner.style.display = 'block';
        try {
            await this.#loadImage(img);
            this.#img.src = img;

            // Await the main image's load event to ensure naturalWidth and naturalHeight are available
            await new Promise((resolve, reject) => {
                this.#img.onload = resolve;
                this.#img.onerror = () => {
                    reject(new Error(`Failed to load image: ${img}`));
                };
            });

            this.originalWidth = this.#img.naturalWidth;
            this.originalHeight = this.#img.naturalHeight;

            // Calculate fitScale to make the image as large as possible within the container
            const containerRect = this.#link.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            const widthRatio = containerWidth / this.originalWidth;
            const heightRatio = containerHeight / this.originalHeight;
            const fitScale = Math.min(widthRatio, heightRatio); // Allow scaling up and down

            this.#minScale = fitScale;
            this.#maxScale = 10; // Ensure maxScale remains fixed

            if (resetZoomPan) {
                this.imageScale = this.#minScale;
                this.panX = 0;
                this.panY = 0;
            }

            this.#img.style.opacity = 1;
        } catch (err) {
            console.error('Failed to load image:', img, err);
            this.#img.alt = 'Failed to load image';
        } finally {
            this.#spinner.style.display = 'none';
        }

        // Use requestAnimationFrame to ensure styles are applied before calculating pan bounds
        requestAnimationFrame(() => {
            this.#updatePanBounds();
            this.#updateImageTransform();
            this.#updateCursor();
        });
    }

    #updateArrowStyles() {
        const totalImages = this.#images.length;
        const isAtFirstImage = this.#index === 0;
        const isAtLastImage = this.#index === totalImages - 1;

        // Handle arrow visibility and disabled state
        if (totalImages <= 1) {
            this.#prev.classList.add('disabled');
            this.#next.classList.add('disabled');
            this.#prev.classList.remove('lightbox__prev--wrap');
            this.#next.classList.remove('lightbox__next--wrap');
        } else {
            // Multiple images
            this.#prev.classList.remove('disabled');
            this.#next.classList.remove('disabled');

            // Handle wrap classes for the arrows
            this.#prev.classList.toggle('lightbox__prev--wrap', isAtFirstImage);
            this.#next.classList.toggle('lightbox__next--wrap', isAtLastImage);
        }
    }

    #loadImage(url) {
        // Load an image and return a promise that resolves on success
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
    }

    isOpen() {
        // Check if the lightbox is currently open
        return this.#el.style.display === 'flex';
    }

    getCurrentIndex() {
        // Get the current image index
        return this.#index;
    }

    handleImageListChange(newImageArray) {
        // Update the image list without resetting zoom and pan
        this.updateImageList(newImageArray, false);
    }

    updateImageList(newImages, resetZoomPan = true) {
        // Update the image list and optionally reset zoom/pan
        const currentImage = this.#images[this.#index];
        this.#images = newImages;

        const newIndex = this.#images.indexOf(currentImage);
        if (newIndex !== -1) {
            this.#index = newIndex;
        } else {
            this.#index = Math.min(this.#index, this.#images.length - 1);
        }

        this.#updateArrowStyles();
        this.#update(0, resetZoomPan);
    }

    updateCurrentImage(newIndex) {
        // Update the currently displayed image to the specified index
        if (newIndex >= 0 && newIndex < this.#images.length) {
            this.#index = newIndex;
            this.#update(0); // Update without moving
        }
    }
}

export { Lightbox };