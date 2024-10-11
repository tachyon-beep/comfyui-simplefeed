/**
 * A simple image feed tray and lightbox for ComfyUI.
 * Version: 1.1.1
 * Repository: https://github.com/tachyon-beep/comfyui-simplefeed
 * License: MIT License
 * Author: John Morrissey (tachyon-beep)
 * Year: 2024
 *
 * Based on the imagetray from the ComfyUI - Custom Scripts extension by pythongosssss
 * Repository: https://github.com/pythongosssss/ComfyUI-Custom-Scripts
 * License: MIT License
 */

import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

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

  constructor(getImagesFunction) {
    this.getImages = getImagesFunction;
    this.scale = 1;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.panX = 0;
    this.panY = 0;
    //this.maxScale = 1; 
    this.containerScale = 1;
    this.imageScale = 1;
    this.mouseMovedDuringPan = false;

    // Bind methods and store them
    this.startPanHandler = this.#startPan.bind(this);
    this.panHandler = this.#pan.bind(this);
    this.endPanHandler = this.#endPan.bind(this);
    this.handleKeyDownHandler = this.#handleKeyDown.bind(this);
    this.handleZoomHandler = this.#handleZoom.bind(this);
    this.resetZoomPanHandler = this.#resetZoomPan.bind(this);
    this.#createElements();
    this.#addEventListeners();
  }

  #handleZoom(e) {
    e.preventDefault();
    let delta = e.deltaY;

    // Normalize deltaY for consistent behavior across browsers
    if (delta === 0) {
      delta = e.wheelDelta ? -e.wheelDelta : 0;
    }

    // Determine the zoom direction
    const zoomFactor = 1.1;

    // Maximum container size (80% of window size)
    const maxContainerWidth = window.innerWidth * 0.8;
    const maxContainerHeight = window.innerHeight * 0.8;

    // Minimum container size (original image size)
    const minContainerWidth = this.originalWidth;
    const minContainerHeight = this.originalHeight;

    // Current container dimensions
    let containerWidth = this.originalWidth * this.containerScale;
    let containerHeight = this.originalHeight * this.containerScale;

    if (delta < 0) {
      // Zoom in
      if (containerWidth < maxContainerWidth && containerHeight < maxContainerHeight) {
        // Increase container size
        this.containerScale *= zoomFactor;
      } else {
        // Increase image scale
        this.imageScale *= zoomFactor;
      }
    } else if (delta > 0) {
      // Zoom out
      if (this.imageScale > 1) {
        // Decrease image scale
        this.imageScale /= zoomFactor;
      } else if (this.containerScale > 1) {
        // Decrease container size
        this.containerScale /= zoomFactor;
      }
    }

    // Ensure scales are within bounds
    this.containerScale = Math.max(this.containerScale, 1);
    this.imageScale = Math.max(this.imageScale, 1);

    containerWidth = this.originalWidth * this.containerScale;
    containerHeight = this.originalHeight * this.containerScale;

    // Ensure container does not exceed max size
    containerWidth = Math.min(containerWidth, maxContainerWidth);
    containerHeight = Math.min(containerHeight, maxContainerHeight);

    // Apply container size
    this.#link.style.transition = 'width 0.3s ease, height 0.3s ease';
    this.#link.style.width = `${containerWidth}px`;
    this.#link.style.height = `${containerHeight}px`;

    // Update pan bounds
    this.#updatePanBounds();

    this.#img.style.transition = 'transform 0.3s ease';

    // Update image transform
    this.#updateImageTransform();
    this.#updateCursor();

    // Reset pan offsets if panning is not possible
    if (this.maxPanX <= 0 && this.maxPanY <= 0) {
      this.panX = 0;
      this.panY = 0;
      this.isPanning = false;
    }

    setTimeout(() => {
      this.#link.style.transition = '';
      this.#img.style.transition = '';
    }, 300);
  }

  #startPan(e) {
    // Update pan bounds
    this.#updatePanBounds();
    const canPan = this.maxPanX > 0 || this.maxPanY > 0;

    if (canPan && e.button === 0) { // Left mouse button
      e.preventDefault();
      this.isPanning = true;
      this.mouseMovedDuringPan = false;      
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.#img.style.cursor = 'grabbing';
    }
  }

  #pan(e) {
    if (this.isPanning) {
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;

      this.mouseMovedDuringPan = true;

      // Constrain panX and panY within bounds
      this.panX = Math.min(Math.max(this.panX, -this.maxPanX), this.maxPanX);
      this.panY = Math.min(Math.max(this.panY, -this.maxPanY), this.maxPanY);
     
      this.#updateImageTransform();
    }
  }

  #updatePanBounds() {
    const containerRect = this.#link.getBoundingClientRect();

    const scaledWidth = this.originalWidth * this.containerScale * this.imageScale;
    const scaledHeight = this.originalHeight * this.containerScale * this.imageScale;

    const maxPanX = Math.max((scaledWidth - containerRect.width) / 2, 0);
    const maxPanY = Math.max((scaledHeight - containerRect.height) / 2, 0);

    this.maxPanX = maxPanX;
    this.maxPanY = maxPanY;
  }

  #endPan(e) {
    if (e.button === 0) { // Left mouse button
      this.isPanning = false;
      this.#updateCursor();
    }
  }

  #resetZoomPan() {
    this.containerScale = 1;
    this.imageScale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;

    // Reset container size
    this.#link.style.width = `${this.originalWidth}px`;
    this.#link.style.height = `${this.originalHeight}px`;

    this.#updateImageTransform();
    this.#updateCursor();
  }

  #updateImageTransform() {
    if (this.imageScale <= 1) {
      // Reset pan and scale
      this.panX = 0;
      this.panY = 0;
      this.#img.style.transform = `scale(1)`;
    } else {
      // Constrain panX and panY within bounds
      this.panX = Math.min(Math.max(this.panX, -this.maxPanX), this.maxPanX);
      this.panY = Math.min(Math.max(this.panY, -this.maxPanY), this.maxPanY);

      // Apply transform
      this.#img.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.imageScale})`;
    }
  }

  #updateCursor() {
    // Check if panning is possible
    const canPan = this.maxPanX > 0 || this.maxPanY > 0;

    if (canPan) {
      this.#img.style.cursor = this.isPanning ? 'grabbing' : 'grab';
    } else {
      this.#img.style.cursor = 'auto';
    }
  }

  #createElements() {
    this.#el = this.#createElement("div", "lightbox");
    this.#closeBtn = this.#createElement("div", "lightbox__close", this.#el);

    // Create arrow containers and add inner arrow elements
    this.#prev = this.#createElement("div", "lightbox__prev", this.#el);
    this.#createElement("div", "arrow-inner", this.#prev);

    const main = this.#createElement("div", "lightbox__main", this.#el);

    this.#next = this.#createElement("div", "lightbox__next", this.#el);
    this.#createElement("div", "arrow-inner", this.#next);

    // Replace anchor with div
    this.#link = this.#createElement("div", "lightbox__link", main);

    this.#spinner = this.#createElement("div", "lightbox__spinner", this.#link);
    this.#img = this.#createElement("img", "lightbox__img", this.#link);
    document.body.appendChild(this.#el);
  }


  #createElement(tag, className, parent, attrs = {}) {
    const el = document.createElement(tag);
    el.className = className;
    if (parent) parent.appendChild(el);
    Object.entries(attrs).forEach(([key, value]) =>
      el.setAttribute(key, value)
    );
    return el;
  }

  #addEventListeners() {
    // Close lightbox when clicking outside the image area
    this.#el.addEventListener("click", (e) => {
      if (e.target === this.#el) this.close();
    });

    // Close button event listener
    this.#closeBtn.addEventListener("click", () => this.close());

    // Arrow navigation with click effect for the previous image
    this.#prev.addEventListener("click", () => {
      this.#triggerArrowClickEffect(this.#prev);
      this.#update(-1);
    });

    // Arrow navigation with click effect for the next image
    this.#next.addEventListener("click", () => {
      this.#triggerArrowClickEffect(this.#next);
      this.#update(1);
    });

    // Add event listenersfor zoom and pan using stored handlers
    // Handle click on the image to open in a new tab
    this.#img.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the lightbox from closing
      //if (!this.isPanning && !this.mouseMovedDuringPan) {
      //  window.open(this.#img.src, "_blank");
      //}
    });

    this.#img.addEventListener('mousedown', this.startPanHandler);
    document.addEventListener('mousemove', this.panHandler);
    document.addEventListener('mouseup', this.endPanHandler);
    document.addEventListener('keydown', this.handleKeyDownHandler);
    this.#img.addEventListener('wheel', this.handleZoomHandler);
    this.#img.addEventListener('dblclick', this.resetZoomPanHandler);

    // Stop propagation when clicking on the image itself (to avoid closing the lightbox)
    this.#img.addEventListener("click", (e) => e.stopPropagation());

    // Prevent context menu when panning
    this.#img.addEventListener('contextmenu', (e) => {
      if (this.isPanning) {
        e.preventDefault();
      }
    });
  }

  forceReflow(element) {
    // Reading a property that requires layout will force a reflow
    return element.offsetHeight;
  }

  #triggerArrowClickEffect(arrowElement) {
    const innerArrow = arrowElement.querySelector(".arrow-inner");

    if (innerArrow) {
      innerArrow.classList.remove("arrow-click-effect");
      // Force a reflow by getting and setting a layout property
      this.forceReflow(innerArrow);
      innerArrow.classList.add("arrow-click-effect");

      innerArrow.addEventListener(
        "animationend",
        () => {
          innerArrow.classList.remove("arrow-click-effect");
        },
        { once: true }
      );
    }
  }

  #handleKeyDown(event) {
    if (this.#el.style.display === "none") return;
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        this.#update(-1);
        break;
      case "ArrowRight":
      case "d":
        this.#update(1);
        break;
      case "Escape":
        this.close();
        break;
    }
  }

  show(images, index = 0) {
    this.#images = images;
    this.#index = index;
    this.#updateArrowStyles();
    this.#update(0);
    this.#el.style.display = "flex";
    setTimeout(() => (this.#el.style.opacity = 1), 0);
  }

  close() {
    this.#el.style.opacity = 0;
    setTimeout(() => {
      this.#el.style.display = "none";
    }, 200);
  }

  initializeImages(images) {
    this.#images = images;
  }

  async #update(shift) {
    let newIndex = this.#index + shift;

    // Implement wrapping behavior
    if (newIndex < 0) {
      newIndex = this.#images.length - 1; // Wrap to the last image
    } else if (newIndex >= this.#images.length) {
      newIndex = 0; // Wrap to the first image
    }

    this.#index = newIndex;

    // Update arrow styles based on the current index
    this.#updateArrowStyles();

    const img = this.#images[this.#index];
    this.#img.style.opacity = 0;
    this.#spinner.style.display = "block";
    try {
      await this.#loadImage(img);
      //this.#link.href = img;
      this.#img.src = img;

      this.originalWidth = this.#img.naturalWidth;
      this.originalHeight = this.#img.naturalHeight;

      this.#img.style.opacity = 1;
    } catch (err) {
      console.error("Failed to load image:", img, err);
      this.#img.alt = "Failed to load image";
    } finally {
      this.#spinner.style.display = "none";
    }

    this.originalWidth = this.#img.naturalWidth;
    this.originalHeight = this.#img.naturalHeight;

      // Set initial container size
      this.containerScale = 1;
      this.imageScale = 1;
      this.panX = 0;
      this.panY = 0;

      this.#link.style.width = `${this.originalWidth}px`;
      this.#link.style.height = `${this.originalHeight}px`;

      this.#updateImageTransform();
      this.#updateCursor();
  }

  #updateArrowStyles() {
    const totalImages = this.#images.length;
    const isAtFirstImage = this.#index === 0;
    const isAtLastImage = this.#index === totalImages - 1;

    // Handle arrow visibility and disabled state
    if (totalImages <= 1) {
      this.#prev.classList.add("disabled");
      this.#next.classList.add("disabled");
      this.#prev.classList.remove("lightbox__prev--wrap");
      this.#next.classList.remove("lightbox__next--wrap");
    } else {
      // Multiple images
      this.#prev.classList.remove("disabled");
      this.#next.classList.remove("disabled");

      // Handle wrap classes
      this.#prev.classList.toggle("lightbox__prev--wrap", isAtFirstImage);
      this.#next.classList.toggle("lightbox__next--wrap", isAtLastImage);
    }
  }

  #loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  }

  registerForUpdates(updateCallback) {
    this.updateCallback = updateCallback;
  }

  isOpen() {
    return this.#el.style.display === "flex";
  }

  getCurrentIndex() {
    return this.#index;
  }

  handleImageListChange(newImages) {
    const currentImage = this.#images[this.#index];
    this.#images = newImages;

    const newIndex = this.#images.indexOf(currentImage);
    if (newIndex === -1) {
      // Current image was removed, show the next available image
      this.#index = Math.min(this.#index, this.#images.length - 1);
    } else {
      this.#index = newIndex;
    }

    this.#updateArrowStyles();
    this.#update(0);
  }

  updateCurrentImage(newIndex) {
    if (newIndex >= 0 && newIndex < this.#images.length) {
      this.#index = newIndex;
      this.#update(0); // Update without moving
    }
  }

  updateImageList(newImages) {
    const currentImage = this.#images[this.#index];
    this.#images = newImages;

    const newIndex = this.#images.indexOf(currentImage);
    if (newIndex !== -1) {
      this.#index = newIndex;
    } else {
      this.#index = Math.min(this.#index, this.#images.length - 1);
    }

    this.#updateArrowStyles();
    this.#update(0); // Update without moving
  }
}

const PREFIX = "simpleTray.imageFeed.";
const ELIGIBLE_NODES = [
  "SaveImage",
  "PreviewImage",
  "KSampler",
  "KSampler (Efficient)",
  "KSampler Adv. (Efficient)",
  "KSampler SDXL (Eff.)",
];

const storage = {
  getVal: (key, defaultValue) => {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? defaultValue : value.replace(/^"(.*)"$/g, "$1");
  },
  setVal: (key, value) => {
    localStorage.setItem(
      PREFIX + key,
      typeof value === "boolean" ? value.toString() : value
    );
  },
  getJSONVal: (key, defaultValue) => {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Error retrieving ${key} from localStorage`, error);
      return defaultValue;
    }
  },
  setJSONVal: (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving to localStorage", error);
    }
  },
};

const createElement = (type, options = {}) => {
  const element = document.createElement(type);
  Object.entries(options).forEach(([key, value]) => {
    if (key === "style") {
      Object.assign(element.style, value);
    } else if (key === "classList") {
      element.classList.add(...value);
    } else {
      element[key] = value;
    }
  });
  return element;
};

class ImageFeed {
  constructor() {
    this.visible = storage.getJSONVal("Visible", true);
    this.imageFeed = null;
    this.imageList = null;
    this.buttonPanel = null;
    this.currentBatchIdentifier = null;
    this.currentBatchContainer = null;
    this.selectedNodeIds = storage.getJSONVal("NodeFilter", []);
    this.imageNodes = [];
    this.sortOrder = storage.getJSONVal("SortOrder", "ID");
    this.lightbox = new Lightbox(this.getAllImages.bind(this));
    this.lightbox.registerForUpdates(this.updateLightboxIfOpen.bind(this));
    this.observer = null;

    setTimeout(() => {
      const initialImages = this.getAllImages();
      this.lightbox.initializeImages(initialImages);
    }, 0);
  }

  async setup() {
    this.createMainElements();
    this.createButtons();
    this.setupEventListeners();
    this.updateControlPositions(storage.getJSONVal("Location", "bottom"));
    this.adjustImageTray();
    this.waitForSideToolbar();
    this.setupSettings();

    // Initialize visibility
    this.changeFeedVisibility(this.visible);
  }

  createMainElements() {
    this.imageFeed = $el("div", {
      className: "tb-image-feed",
      parent: document.body,
    });
    this.imageList = $el("div", { className: "tb-image-feed-list" });
    this.buttonPanel = $el("div", { className: "tb-image-feed-btn-group" });
    this.imageFeed.append(this.imageList, this.buttonPanel);
  }

  createButtons() {
    const clearButton = this.createButton("Clear", () => this.clearImageFeed());
    const nodeFilterButton = this.createButton("Node Filter", () =>
      this.showNodeFilter()
    );
    this.buttonPanel.append(nodeFilterButton, clearButton);
  }

  createButton(text, onClick) {
    return $el("button.tb-image-feed-btn", {
      textContent: text,
      onclick: onClick,
    });
  }

  setupEventListeners() {
    api.addEventListener("execution_start", this.onExecutionStart.bind(this));
    api.addEventListener("executed", (event) => {
      this.onExecuted(event);
    });
    window.addEventListener(
      "resize",
      debounce(() => this.adjustImageTray(), 200)
    );
  }

  updateLightboxIfOpen() {
    // Force a reflow to ensure DOM is up-to-date
    this.forceReflow(this.imageFeed);

    const currentImages = this.getAllImages();
    this.lightbox.updateImageList(currentImages);
    if (this.lightbox.isOpen()) {
      this.lightbox.handleImageListChange(currentImages);
    }
  }

  // Add this method to your class
  forceReflow(element) {
    // Reading a property that requires layout will force a reflow
    return element.offsetHeight;
  }

  getCurrentState() {
    return {
      images: this.getAllImages(),
      currentIndex: this.lightbox ? this.lightbox.getCurrentIndex() : 0,
    };
  }

  onExecutionStart({ detail }) {
    const filterEnabled = storage.getJSONVal("FilterEnabled", false);
    if (
      filterEnabled &&
      (!this.selectedNodeIds || this.selectedNodeIds.length === 0)
    ) {
      storage.setJSONVal("FilterEnabled", false);
    }
  }

  onExecuted({ detail }) {
    if (!this.visible || !detail?.output?.images) {
      return;
    }
    this.handleExecuted(detail);
    // Update lightbox immediately
    this.updateLightboxIfOpen();
  }

  handleExecuted(detail) {
    if (!this.visible || !detail?.output?.images) return;

    const newestToOldest = storage.getVal("NewestFirst", "newest") === "newest";
    const filterEnabled = storage.getJSONVal("FilterEnabled", false);
    const newBatchIdentifier = detail.prompt_id;

    if (detail.node?.includes?.(":")) {
      const n = app.graph.getNodeById(detail.node.split(":")[0]);
      if (n?.getInnerNodes) return;
    }

    const isNewBatch = newBatchIdentifier !== this.currentBatchIdentifier;

    if (isNewBatch) {
      this.createNewBatch(newestToOldest, newBatchIdentifier);
    }

    this.addImagesToBatch(detail, filterEnabled, newestToOldest);

    this.checkAndRemoveExtraImageBatches();

    // Trigger a DOM update
    this.forceReflow(this.imageFeed);

    // Update lightbox immediately after DOM changes
    this.updateLightboxIfOpen();
  }

  createNewBatch(newestToOldest, newBatchIdentifier) {
    this.currentBatchContainer = createElement("div", {
      className: "image-batch-container",
    });

    const startBar = createElement("div", {
      className: "image-feed-vertical-bar",
    });
    this.currentBatchContainer.appendChild(startBar);

    const isFirstBatch = this.imageList.children.length === 0;
    if (isFirstBatch && newestToOldest) {
      const endBar = createElement("div", {
        className: "image-feed-vertical-bar",
      });
      this.currentBatchContainer.appendChild(endBar);
    }

    if (newestToOldest) {
      this.imageList.prepend(this.currentBatchContainer);
    } else {
      this.imageList.appendChild(this.currentBatchContainer);
    }

    this.currentBatchIdentifier = newBatchIdentifier;
  }

  addImagesToBatch(detail, filterEnabled, newestToOldest) {
    detail.output.images.forEach((src) => {
      const node = app.graph.getNodeById(parseInt(detail.node, 10));
      if (
        !filterEnabled ||
        (node?.type &&
          ELIGIBLE_NODES.includes(node.type) &&
          this.selectedNodeIds.includes(parseInt(detail.node, 10))) ||
        (!ELIGIBLE_NODES.includes(node.type) &&
          this.selectedNodeIds.includes(-1))
      ) {
        this.addImageToBatch(src, this.currentBatchContainer, newestToOldest);
      }
    });
  }

  async addImageToBatch(src, batchContainer, newestToOldest) {
    try {
      const baseUrl = `./view?filename=${encodeURIComponent(
        src.filename
      )}&type=${src.type}&subfolder=${encodeURIComponent(src.subfolder)}`;
      const timestampedUrl = `${baseUrl}&t=${+new Date()}`;
      const img = await this.loadImage(timestampedUrl);
      img.dataset.baseUrl = baseUrl; // Store the non-timestamped URL
      const imageElement = this.createImageElement(
        img,
        timestampedUrl,
        baseUrl
      );
      const bars = batchContainer.querySelectorAll(".image-feed-vertical-bar");

      if (bars.length === 2) {
        // This is the first batch with two bars
        bars[1].before(imageElement);
      } else if (newestToOldest) {
        // For subsequent batches, newest first
        batchContainer.firstChild.after(imageElement);
      } else {
        // For subsequent batches, oldest first
        batchContainer.appendChild(imageElement);
      }

      // Force a reflow
      this.forceReflow(batchContainer);

      // Update lightbox immediately after adding new image
      this.updateLightboxIfOpen();
    } catch (error) {
      console.error("Error adding image to batch", error);
      const placeholderImg = createElement("img", {
        src: "path/to/placeholder.png",
        alt: "Image failed to load",
      });
      batchContainer.appendChild(placeholderImg);
    }
  }

  createImageElement(img, timestampedUrl, baseUrl) {
    const imageElement = createElement("div", { className: "image-container" });
    img.onclick = (e) => this.handleImageClick(e, timestampedUrl, baseUrl);
    imageElement.appendChild(img);
    return imageElement;
  }

  handleImageClick(e, timestampedUrl, baseUrl) {
    e.preventDefault();
    const state = this.getCurrentState();
    const absoluteBaseUrl = new URL(baseUrl, window.location.origin).href;
    const imageIndex = state.images.findIndex((img) =>
      img.startsWith(absoluteBaseUrl)
    );
    if (imageIndex > -1) {
      this.lightbox.show(state.images, imageIndex);
    } else {
      console.error(
        "Clicked image not found in the list. Available images:",
        state.images
      );
      console.error("Clicked image URL:", absoluteBaseUrl);
      // Fallback: If the exact URL is not found, open the lightbox with the first image
      if (state.images.length > 0) {
        this.lightbox.show(state.images, 0);
      }
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  getAllImages() {
    const images = document.querySelectorAll(".tb-image-feed img");
    const imageUrls = Array.from(images).map((img) => {
      const url = new URL(img.src, window.location.origin);
      url.searchParams.delete("t"); // Remove the timestamp parameter
      return url.href;
    });
    return imageUrls;
  }

  checkAndRemoveExtraImageBatches() {
    const maxImageBatches = storage.getVal("MaxFeedLength", 25);
    const batches = Array.from(
      this.imageList.querySelectorAll(".image-batch-container")
    );

    if (batches.length <= maxImageBatches) return;

    batches.slice(maxImageBatches).forEach((batch) => {
      batch.remove();
    });
  }

  clearImageFeed() {
    this.currentBatchIdentifier = null;
    this.currentBatchContainer = null;
    this.imageList.replaceChildren();
    window.dispatchEvent(new Event("resize"));
  }

  async showNodeFilter() {
    await this.loadModal();
    this.createImageNodeList();
    this.setNodeSelectorVisibility(true);
  }

  updateControlPositions(feedLocation) {
    if (!this.imageFeed) {
      console.error("Image feed element not found.");
      return;
    }

    this.imageFeed.classList.remove(
      "tb-image-feed--top",
      "tb-image-feed--bottom"
    );
    this.buttonPanel.classList.remove(
      "tb-image-feed-btn-group--top",
      "tb-image-feed-btn-group--bottom"
    );

    if (feedLocation === "top") {
      this.imageFeed.classList.add("tb-image-feed--top");
      this.buttonPanel.classList.add("tb-image-feed-btn-group--top");
      this.buttonPanel.style.top = "10px"; // Set a default top position
      this.buttonPanel.style.bottom = "auto"; // Clear bottom positioning
    } else {
      this.imageFeed.classList.add("tb-image-feed--bottom");
      this.buttonPanel.classList.add("tb-image-feed-btn-group--bottom");
      this.buttonPanel.style.bottom = "10px"; // Set a default bottom position
      this.buttonPanel.style.top = "auto"; // Clear top positioning
    }

    // Adjust the tray and button positions
    this.adjustImageTray();
  }

  adjustImageTray() {
    try {
      this.updateSidebarAdjustments();
      this.updateFeedDimensions();
      this.updateFeedPosition();
      this.setupObserver();
    } catch (error) {
      console.error("Error adjusting image tray:", error);
    }
  }

  updateSidebarAdjustments() {
    const { sideBarWidth, sideBarPosition } = this.getSidebarInfo();
    this.imageFeed.style.setProperty("--tb-left-offset", `${sideBarWidth}px`);
    this.adjustFeedBasedOnSidebar(sideBarPosition, sideBarWidth);
  }

  getSidebarInfo() {
    const leftSideBar = document.querySelector(
      ".comfyui-body-left .side-tool-bar-container"
    );
    const rightSideBar = document.querySelector(
      ".comfyui-body-right .side-tool-bar-container"
    );
    const sideBar = leftSideBar || rightSideBar;
    const sideBarWidth = sideBar?.offsetWidth || 0;

    let sideBarPosition;
    if (leftSideBar) {
      sideBarPosition = "left";
    } else if (rightSideBar) {
      sideBarPosition = "right";
    } else {
      sideBarPosition = "none";
    }

    return { sideBar, sideBarWidth, sideBarPosition };
  }

  adjustFeedBasedOnSidebar(sideBarPosition, sideBarWidth) {
    this.fixedOffset = 70;

    if (sideBarPosition === "left") {
      this.imageFeed.style.left = `${sideBarWidth}px`;
      this.imageFeed.style.right = "0";
    } else if (sideBarPosition === "right") {
      this.imageFeed.style.left = "0";
      this.imageFeed.style.right = `${sideBarWidth}px`;
    } else {
      this.imageFeed.style.left = "0";
      this.imageFeed.style.right = "0";
    }
    
    // Fixed offset - This is a hack until the UI devs stop adding random shit.
    this.imageFeed.style.width = `calc(100% - ${sideBarWidth + this.fixedOffset}px)`;
  }

  updateFeedDimensions() {
    const feedHeight =
      parseInt(
        getComputedStyle(this.imageFeed).getPropertyValue("--tb-feed-height")
      ) || 300;
    this.imageFeed.style.height = `${feedHeight}px`;
  }

  updateFeedPosition() {
    const comfyuiMenu = document.querySelector("nav.comfyui-menu");
    const isMenuVisible = comfyuiMenu && comfyuiMenu.offsetParent !== null;
    const feedLocation = storage.getJSONVal("Location", "bottom");

    this.setFeedPosition(feedLocation, isMenuVisible, comfyuiMenu);
    requestAnimationFrame(() => this.adjustButtonPanelPosition());
  }

  setFeedPosition(feedLocation, isMenuVisible, comfyuiMenu) {
    if (feedLocation === "top") {
      const imageFeedTop = this.calculateTopPosition(
        isMenuVisible,
        comfyuiMenu
      );
      this.imageFeed.style.top = `${imageFeedTop}px`;
      this.imageFeed.style.bottom = "auto";
    } else {
      const imageFeedBottom = this.calculateBottomPosition(
        isMenuVisible,
        comfyuiMenu
      );
      this.imageFeed.style.bottom = `${imageFeedBottom}px`;
      this.imageFeed.style.top = "auto";
    }
  }

  calculateTopPosition(isMenuVisible, comfyuiMenu) {
    if (isMenuVisible) {
      const menuRect = comfyuiMenu.getBoundingClientRect();
      return menuRect.top <= 1 ? menuRect.height : 0;
    }
    return 0;
  }

  calculateBottomPosition(isMenuVisible, comfyuiMenu) {
    if (isMenuVisible) {
      const menuRect = comfyuiMenu.getBoundingClientRect();
      return Math.abs(window.innerHeight - menuRect.bottom) <= 1
        ? menuRect.height
        : 0;
    }
    return 0;
  }

  setupObserver() {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      requestAnimationFrame(() => this.adjustImageTray());
    });

    const { sideBar } = this.getSidebarInfo();
    const comfyuiMenu = document.querySelector("nav.comfyui-menu");

    this.observeElement(comfyuiMenu);
    this.observeElement(sideBar);
    this.observeElement(this.imageFeed);
    this.observeElement(document.body);
  }

  observeElement(element) {
    if (element) {
      this.observer.observe(element, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }
  }

  adjustButtonPanelPosition() {
    const buttonPanel = this.buttonPanel;
    if (!buttonPanel) return;

    const imageFeedRect = this.imageFeed.getBoundingClientRect();

    // Always position at the top-right corner of the image tray
    buttonPanel.style.top = `${imageFeedRect.top + 10}px`;
    buttonPanel.style.right = `${
      window.innerWidth - imageFeedRect.right + 10
    }px`;

    // Clear other positioning
    buttonPanel.style.bottom = "auto";
    buttonPanel.style.left = "auto";
  }

  waitForSideToolbar() {
    const MAX_OBSERVATION_TIME = 5000; //Taking longer than five seconds to render the UI? Believe it or not, jail.
    let timeoutId;
    const observer = new MutationObserver((mutationsList, observer) => {
      const sideToolBar = document.querySelector(
        ".comfyui-body-left .side-tool-bar-container"
      );
      if (sideToolBar) {
        this.adjustImageTray();
        observer.disconnect();
        clearTimeout(timeoutId);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      console.error(
        "Sidebar not found within the maximum observation time",
        new Error("Timeout")
      );
    }, MAX_OBSERVATION_TIME);
  }

  async loadModal() {
    try {
      const overlay = await this.loadOverlay();
      let modal = document.getElementById("nodeSelectorPlaceholder");

      if (!modal) {
        modal = createElement("div", {
          id: "nodeSelectorPlaceholder",
          className: "nodeSelectorPlaceholder",
        });
        overlay.appendChild(modal);
      }

      return modal;
    } catch (error) {
      console.error("Error loading modal:", error);
    }
  }

  loadOverlay() {
    return new Promise((resolve, reject) => {
      let overlay = document.getElementById("modalOverlay");

      if (!overlay) {
        overlay = createElement("div", {
          id: "modalOverlay",
          className: "modalOverlay",
        });
        document.body.appendChild(overlay);

        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) {
            this.setNodeSelectorVisibility(false);
          }
        });
      }

      resolve(overlay);
    });
  }

  async createImageNodeList() {
    const nodeListElement = await this.loadModal();

    if (!nodeListElement) {
      console.error("Modal element not found");
      return;
    }

    const header = createElement("h2", {
      textContent: "Detected Image Nodes",
      style: {
        textAlign: "center",
        color: "#FFF",
        margin: "0 0 20px",
        fontSize: "24px",
      },
    });

    nodeListElement.innerHTML = "";
    nodeListElement.appendChild(header);

    const buttonContainer = createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: "5px",
      },
    });

    const filterEnabled = storage.getJSONVal("FilterEnabled", false);

    const filterToggleButton = createElement("button", {
      className: "tb-image-feed-btn",
      textContent: filterEnabled ? "Disable Filter" : "Enable Filter",
      onclick: () => this.toggleFilter(filterToggleButton, sortToggleButton),
    });

    const sortToggleButton = createElement("button", {
      className: "tb-image-feed-btn",
      textContent:
        storage.getJSONVal("SortOrder", "ID") === "ID"
          ? "Sort by Name"
          : "Sort by ID",
      onclick: () => this.toggleSortOrder(sortToggleButton),
      disabled: !filterEnabled,
    });

    buttonContainer.appendChild(filterToggleButton);
    buttonContainer.appendChild(sortToggleButton);
    nodeListElement.appendChild(buttonContainer);

    await this.redrawImageNodeList();
  }

  updateCheckboxStates(enabled) {
    const checkboxes = document.querySelectorAll(
      '.node-list-item input[type="checkbox"], #custom-node-checkbox'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = !enabled;
    });
  }

  async toggleFilter(filterToggleButton, sortToggleButton) {
    const filterEnabled = storage.getJSONVal("FilterEnabled", false);
    const newFilterState = !filterEnabled;

    storage.setJSONVal("FilterEnabled", newFilterState);

    filterToggleButton.textContent = newFilterState
      ? "Disable Filter"
      : "Enable Filter";
    sortToggleButton.disabled = !newFilterState;

    // Clear selected nodes when disabling filter
    if (!newFilterState) {
      this.selectedNodeIds = [];
      storage.setJSONVal("NodeFilter", this.selectedNodeIds);
    }

    // Update checkbox states
    this.updateCheckboxStates(newFilterState);

    await this.redrawImageNodeList();
  }

  async toggleSortOrder(sortToggleButton) {
    const currentSortOrder = storage.getJSONVal("SortOrder", "ID");
    const newSortOrder = currentSortOrder === "ID" ? "Name" : "ID";

    storage.setJSONVal("SortOrder", newSortOrder);

    sortToggleButton.textContent =
      newSortOrder === "ID" ? "Sort by Name" : "Sort by ID";

    await this.redrawImageNodeList();
  }

  updateImageNodes() {
    const nodes = Object.values(app.graph._nodes);
    this.imageNodes = nodes.filter((node) =>
      ELIGIBLE_NODES.includes(node.type)
    );
  }

  sortImageNodes() {
    const sortOrder = storage.getJSONVal("SortOrder", "ID");
    this.imageNodes.sort((a, b) => {
      if (sortOrder === "Name") {
        return a.title.localeCompare(b.title) || a.id - b.id;
      }
      return a.id - b.id;
    });
  }

  async redrawImageNodeList() {
    const listContainer = await this.loadModal();

    let nodeList = listContainer.querySelector(".node-list");
    if (!nodeList) {
      nodeList = createElement("ul", { className: "node-list" });
      listContainer.appendChild(nodeList);
    }

    const fragment = document.createDocumentFragment();
    const filterEnabled = storage.getJSONVal("FilterEnabled", false);

    this.updateImageNodes();
    this.sortImageNodes();

    this.imageNodes.forEach((node, index) => {
      const listItem = createElement("li", {
        className: `node-list-item ${index % 2 === 0 ? "even" : "odd"}`,
      });

      const checkbox = createElement("input", {
        type: "checkbox",
        id: `node-${node.id}`,
        checked: this.selectedNodeIds.includes(node.id),
        disabled: !filterEnabled,
      });

      checkbox.addEventListener("change", () => {
        this.updateSelectedNodeIds(node.id, checkbox.checked);
      });

      const label = createElement("label", {
        htmlFor: checkbox.id,
        textContent: node.title
          ? `${node.title} (ID: ${node.id})`
          : `Node ID: ${node.id}`,
      });

      listItem.appendChild(checkbox);
      listItem.appendChild(label);

      fragment.appendChild(listItem);
    });

    nodeList.replaceChildren(fragment);

    let customNodeItem = listContainer.querySelector(".custom-node-item");
    if (!customNodeItem) {
      customNodeItem = createElement("li", { className: "custom-node-item" });

      const customCheckbox = createElement("input", {
        type: "checkbox",
        id: "custom-node-checkbox",
        checked: this.selectedNodeIds.includes(-1),
        disabled: !filterEnabled,
      });

      customCheckbox.addEventListener("change", (e) => {
        this.updateSelectedNodeIds(-1, e.target.checked);
      });

      const customLabel = createElement("label", {
        htmlFor: "custom-node-checkbox",
        textContent: "Custom Nodes Not Shown",
        className: "custom-label",
      });

      customNodeItem.appendChild(customCheckbox);
      customNodeItem.appendChild(customLabel);

      nodeList.appendChild(customNodeItem);
    } else {
      const customCheckbox = customNodeItem.querySelector(
        'input[type="checkbox"]'
      );
      if (customCheckbox) {
        customCheckbox.checked = this.selectedNodeIds.includes(-1);
        customCheckbox.disabled = !filterEnabled;
      }
    }

    // Update all checkbox states
    this.updateCheckboxStates(filterEnabled);
  }

  updateSelectedNodeIds(nodeId, isChecked) {
    if (isChecked) {
      if (!this.selectedNodeIds.includes(nodeId)) {
        this.selectedNodeIds.push(nodeId);
      }
    } else {
      this.selectedNodeIds = this.selectedNodeIds.filter((id) => id !== nodeId);
    }

    storage.setJSONVal("NodeFilter", this.selectedNodeIds);
  }

  setNodeSelectorVisibility(isVisible) {
    const overlay = document.getElementById("modalOverlay");
    const modal = document.getElementById("nodeSelectorPlaceholder");

    if (!overlay || !modal) {
      console.error("Overlay or modal not found");
      return;
    }

    overlay.style.display = isVisible ? "flex" : "none";
    modal.style.display = isVisible ? "block" : "none";
  }

  setupSettings() {
    app.ui.settings.addSetting({
      id: "simpleTray.imageFeed.feedHeight",
      name: "📥 Image Tray Height",
      defaultValue: 200,
      type: "combo",
      options: [
        { text: "100px", value: 100 },
        { text: "150px", value: 150 },
        { text: "200px", value: 200 },
        { text: "250px", value: 250 },
        { text: "300px", value: 300 },
        { text: "350px", value: 350 },
        { text: "400px", value: 400 },
      ],
      onChange: (newValue) => {
        const newHeight = `${newValue}px`;
        this.imageFeed.style.setProperty("--tb-feed-height", newHeight);
        window.dispatchEvent(new Event("resize"));
      },
      tooltip: "Select the height of the image feed tray.",
    });

    app.ui.settings.addSetting({
      id: "simpleTray.imageFeed.NewestFirst",
      name: "📥 Image Tray Sort Order",
      defaultValue: "newest",
      type: "combo",
      options: [
        { text: "newest first", value: "newest" },
        { text: "oldest first", value: "oldest" },
      ],
      onChange: (newValue) => {
        storage.setVal("NewestFirst", newValue);
        this.adjustImageTray();
      },
      tooltip: "Choose the sort order of images in the feed.",
    });

    app.ui.settings.addSetting({
      id: "simpleTray.imageFeed.MaxFeedLength",
      name: "📥 Max Batches In Feed",
      defaultValue: 25,
      type: "number",
      onChange: (newValue) => {
        storage.setVal("MaxFeedLength", newValue);
        this.checkAndRemoveExtraImageBatches();
      },
      tooltip:
        "Maximum number of image batches to retain before the oldest start dropping from image feed.",
      attrs: {
        min: "25",
        max: "200",
        step: "25",
      },
    });

    app.ui.settings.addSetting({
      id: "simpleTray.imageFeed.Location",
      name: "📥 Image Tray Location",
      defaultValue: storage.getJSONVal("Location", "bottom"),
      type: "combo",
      options: [
        { text: "top", value: "top" },
        { text: "bottom", value: "bottom" },
      ],
      onChange: (newLocation) => {
        this.updateControlPositions(newLocation);
        storage.setJSONVal("Location", newLocation);
        this.adjustImageTray();
      },
      tooltip: "Choose the location of the image feed.",
    });

    app.ui.settings.addSetting({
      id: "simpleTray.imageFeed.TrayVisible",
      name: "📥 Display Image Tray",
      type: "boolean",
      defaultValue: storage.getJSONVal("Visible", true),
      onChange: (value) => {
        this.visible = value;
        storage.setJSONVal("Visible", value);
        this.changeFeedVisibility(value);
      },
      tooltip: "Change the visibility of the Image Feed.",
    });
  }

  changeFeedVisibility(isVisible) {
    this.imageFeed.style.display = isVisible ? "flex" : "none";
    if (isVisible) this.adjustImageTray();
    window.dispatchEvent(new Event("resize"));
  }
}

app.registerExtension({
  name: "simpleTray.imageFeed",
  async setup() {
    const imageFeed = new ImageFeed();
    await imageFeed.setup();
  },
});

// CSS Styles
const styles = `
  :root {
    --tb-background-color-main: rgb(36, 39, 48);
    --tb-separator-color: yellow;
    --tb-border-color: #ccc;
    --tb-text-color: #333;
    --tb-highlight-filter: brightness(1.2);
    --tb-feed-height: 300px;
    --tb-left-offset: 0px;
  }

  .tb-image-feed {
    position: fixed;
    display: flex;
    background-color: rgba(36, 39, 48, 0.8);
    z-index: 500;
    transition: all 0.3s ease;
    border: 1px solid var(--tb-border-color);
    height: var(--tb-feed-height);
    width: calc(100% - var(--tb-left-offset));
    left: var(--tb-left-offset);
  }

  .tb-image-feed--bottom { bottom: 0; top: auto; }
  .tb-image-feed--top { top: 0; bottom: auto; }

  .tb-image-feed-list {
    display: flex;
    overflow-x: auto;  /* Enable horizontal scrolling */
    overflow-y: hidden;
    height: 100%;
    width: 100%;
    white-space: nowrap; /* Prevent wrapping */
  }

  .image-batch-container {
    display: flex;
    align-items: center;
    height: 100%;
    flex-shrink: 0; /* Prevent shrinking */
  }

  .image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: auto; /* Allow the container to adjust its width */
  }

  .image-container img {
    max-height: 100%;
    max-width: 100%;
    height: auto;
    width: auto;
    object-fit: contain; /* Ensure the entire image is visible */
  }

  .image-feed-vertical-bar {
    height: 99.5%;
    width: 4px;
    background-color: var(--tb-separator-color);
  }

  .tb-image-feed-btn-group {
    position: fixed;
    display: flex;
    gap: 5px;
    z-index: 502;
    right: 10px;
    transition: top 0.3s ease, bottom 0.3s ease;
  }

  .tb-image-feed-btn-group--top {
    top: 10px; /* This will be overridden by JavaScript */
  }

  .tb-image-feed-btn-group--bottom {
    bottom: 10px; /* This will be overridden by JavaScript */
  }

  .tb-image-feed-btn {
    padding: 8px 16px;
    font-size: 15px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    height: auto;
    width: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.8); /* Slightly transparent white background */
    color: #333;
    border: 2px solid rgba(0, 0, 0, 0.1); /* Subtle border for contrast */
    border-radius: 8px;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .tb-image-feed-btn:hover {
    background-color: #f0f0f0;
    transform: translateY(-2px);
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  }

  .tb-image-feed-btn:active {
    transform: translateY(0);
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.15);
  }

  .tb-image-feed-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.5);
  }

  .tb-close-btn {
    position: absolute;
    top: 5px;
    right: 10px;
    padding: 0 10px;
    font-size: 16px;
    height: 30px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--tb-border-color);
    border-radius: 5px;
    color: var(--tb-text-color);
    cursor: pointer;
    z-index: 600;
  }

  .tb-close-btn:hover {
    filter: var(--tb-highlight-filter);
  }

  .tb-close-btn:active {
    transform: translateY(1px);
  }

  .modalOverlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .nodeSelectorPlaceholder {
    background-color: #000;
    color: #FFF;
    padding: 20px;
    border: 2px solid var(--tb-separator-color);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 10000;
  }

  .node-list-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    background-color: #111;
    padding: 10px;
    border-radius: 5px;
  }

  .node-list-item:nth-child(even) {
    background-color: #000;
  }

  .custom-node-item {
    display: flex;
    align-items: center;
    margin: 20px 0 10px;
    padding: 10px;
    border-radius: 5px;
    background-color: #000;
    border: 1px solid var(--tb-separator-color);
  }

  .custom-label {
    color: #FFF;
  }

  .custom-label.disabled {
    color: #555;
  }
`;

const lightboxStyles = `
/* Lightbox container */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: none;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  z-index: 1000;
}

/* Center the main image */
.lightbox__main {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 90%;
  max-height: 90%;
  border: 2px solid yellow;
  box-sizing: border-box;   
}

.lightbox__link {
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Remove max-width and max-height if present */
}

.lightbox__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.2s ease-in-out, transform 0.1s ease-out;
  transform-origin: center center;
}


/* Base styles for arrow buttons */
.lightbox__prev, .lightbox__next {
  position: absolute;
  width: 120px;
  height: 120px;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

/* Hover effect for regular arrows */
.lightbox__prev:hover, .lightbox__next:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Disabled state for arrows */
.lightbox__prev.disabled,
.lightbox__next.disabled {
  background-color: rgba(0, 0, 0, 0.5); /* Dark background for disabled arrows */
  opacity: 0.5;
  pointer-events: none;
}

/* Positioning of previous arrow (on the left) */
.lightbox__prev {
  left: 40px;
}

/* Positioning of next arrow (on the right) */
.lightbox__next {
  right: 40px;
}

.arrow-inner::before {
  content: '';
  width: 30px;
  height: 30px;
  border: solid white;
  border-width: 0 6px 6px 0;
  display: inline-block;
}

/* Inner wrapper for scaling effect on the arrow */
.arrow-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

/* Click effect on the inner arrow */
.arrow-click-effect {
  animation: arrowClickEffect 0.3s ease;
}

/* Rotation for the left arrow (previous button) */
.lightbox__prev .arrow-inner::before {
  transform: rotate(135deg); /* Rotated to point left */
}

/* Rotation for the right arrow (next button) */
.lightbox__next .arrow-inner::before {
  transform: rotate(-45deg); /* Rotated to point right */
}

/* Wrapping state for previous arrow */
.lightbox__prev--wrap {
  background-color: rgba(255, 165, 0, 0.8);
}

/* Wrapping state for next arrow */
.lightbox__next--wrap {
  background-color: rgba(255, 165, 0, 0.8);
}

/* Hover effect for wrapping state */
.lightbox__prev--wrap:hover,
.lightbox__next--wrap:hover {
  background-color: rgba(230, 120, 0, 1); /* Darker orange on hover */
}

/* Optical adjustment for left arrow */
.lightbox__prev .arrow-inner {
  transform: translateX(5px); /* Shift slightly right */
}

/* Optical adjustment for right arrow */
.lightbox__next .arrow-inner {
  transform: translateX(-5px); /* Shift slightly left */
}

/* Spinner for image loading */
.lightbox__spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  display: none;
}

@keyframes arrowClickEffect {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Keyframes for spinner */
@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
`;

const styleElement = document.createElement("style");
styleElement.textContent = lightboxStyles;
document.head.appendChild(styleElement);

// Append the styles to the document
$el("style", {
  textContent: styles,
  parent: document.head,
});
