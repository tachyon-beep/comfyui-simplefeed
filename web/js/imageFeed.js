/**
 * imageFeed.js - Core functionality for the simple image feed in ComfyUI.
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

import { api } from '../../../scripts/api.js';
import { app } from '../../../scripts/app.js';
import { $el } from '../../../scripts/ui.js';
import { Lightbox } from './lightbox.js';
import { debounce } from './utils.js';

const PREFIX = 'simpleTray.imageFeed.';
const ELIGIBLE_NODES = [
  'SaveImage',
  'PreviewImage',
  'KSampler',
  'KSampler (Efficient)',
  'KSampler Adv. (Efficient)',
  'KSampler SDXL (Eff.)',
];

const BASE_PAN_SPEED_MULTIPLIER = 1; // Normal speed
const SHIFT_PAN_SPEED_MULTIPLIER = 3; // Double speed when Shift is held
const BASE_ZOOM_MULTIPLIER = 1.2;
const SHIFT_ZOOM_MULTIPLIER = 3.6;

const storage = {
  getVal: (key, defaultValue) => {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? defaultValue : value.replace(/^"(.*)"$/g, '$1');
  },
  setVal: (key, value) => {
    localStorage.setItem(
      PREFIX + key,
      typeof value === 'boolean' ? value.toString() : value
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
      console.error('Error saving to localStorage', error);
    }
  },
};

const createElement = (type, options = {}) => {
  const element = document.createElement(type);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'style') {
      Object.assign(element.style, value);
    } else if (key === 'classList') {
      element.classList.add(...value);
    } else {
      element[key] = value;
    }
  });
  return element;
};

class ImageFeed {
  constructor() {
    this.visible = storage.getJSONVal('Visible', true);
    this.imageFeed = null;
    this.imageList = null;
    this.buttonPanel = null;
    this.currentBatchIdentifier = null;
    this.currentBatchContainer = null;
    this.selectedNodeIds = storage.getJSONVal('NodeFilter', []);
    this.imageNodes = [];
    this.sortOrder = storage.getJSONVal('SortOrder', 'ID');
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
    this.updateControlPositions(storage.getJSONVal('Location', 'bottom'));
    this.adjustImageTray();
    this.waitForSideToolbar();
    this.setupSettings();

    this.changeFeedVisibility(this.visible);
  }

  destroy() {
    api.removeEventListener('execution_start', this.onExecutionStart);
    api.removeEventListener('executed', this.onExecuted);
    window.removeEventListener('resize', this.adjustImageTrayDebounced);

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.lightbox) {
      this.lightbox.destroy();
    }
  }

  createMainElements() {
    this.imageFeed = $el('div', {
      className: 'simplefeed-image-feed',
      parent: document.body,
    });
    this.imageList = $el('div', { className: 'simplefeed-image-feed-list' });
    this.buttonPanel = $el('div', { className: 'simplefeed-image-feed-btn-group' });
    this.imageFeed.append(this.imageList, this.buttonPanel);
  }

  createButtons() {
    const clearButton = this.createButton('Clear', () => this.clearImageFeed());
    const nodeFilterButton = this.createButton('Node Filter', () =>
      this.showNodeFilter()
    );
    this.buttonPanel.append(nodeFilterButton, clearButton);
  }

  createButton(text, onClick) {
    return $el('button.simplefeed-image-feed-btn', {
      textContent: text,
      onclick: onClick,
    });
  }

  setupEventListeners() {
    api.addEventListener('execution_start', this.onExecutionStart.bind(this));
    api.addEventListener('executed', this.onExecuted.bind(this));
    this.adjustImageTrayDebounced = debounce(() => this.adjustImageTray(), 200);
    window.addEventListener('resize', this.adjustImageTrayDebounced);
  }

  forceReflow(element) {
    return element.offsetHeight;
  }

  getCurrentState() {
    return {
      images: this.getAllImages(),
      currentIndex: this.lightbox ? this.lightbox.getCurrentIndex() : 0,
    };
  }

  onExecutionStart({ detail }) {
    const filterEnabled = storage.getJSONVal('FilterEnabled', false);
    if (filterEnabled && (!this.selectedNodeIds || this.selectedNodeIds.length === 0)) {
      storage.setJSONVal('FilterEnabled', false);
    }
  }

  onExecuted({ detail }) {
    if (!this.visible || !detail?.output?.images) {
      return;
    }
    this.handleExecuted(detail);
  }

  updateLightboxIfOpen() {
    this.forceReflow(this.imageFeed);
    const currentImages = this.getAllImages();
    this.lightbox.updateImageList(currentImages);
    if (this.lightbox.isOpen()) {
      this.lightbox.handleImageListChange(currentImages);
    }
  }

  handleExecuted(detail) {
    if (!this.visible || !detail?.output?.images) {
      return;
    }

    const newestToOldest = storage.getVal('NewestFirst', 'newest') === 'newest';
    const filterEnabled = storage.getJSONVal('FilterEnabled', false);
    const newBatchIdentifier = detail.prompt_id;

    if (detail.node?.includes(':')) {
      const n = app.graph.getNodeById(detail.node.split(':')[0]);
      if (n?.getInnerNodes) {
        return;
      }
    }

    const isNewBatch = newBatchIdentifier !== this.currentBatchIdentifier;

    if (isNewBatch) {
      this.createNewBatch(newestToOldest, newBatchIdentifier);
    }

    this.addImagesToBatch(detail, filterEnabled, newestToOldest);
    this.checkAndRemoveExtraImageBatches();
    this.forceReflow(this.imageFeed);
  }

  createNewBatch(newestToOldest, newBatchIdentifier) {
    this.currentBatchContainer = createElement('div', {
      className: 'image-batch-container',
    });

    const startBar = createElement('div', {
      className: 'image-feed-vertical-bar',
    });
    this.currentBatchContainer.appendChild(startBar);

    const isFirstBatch = this.imageList.children.length === 0;
    if (isFirstBatch && newestToOldest) {
      const endBar = createElement('div', {
        className: 'image-feed-vertical-bar',
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
      const baseUrl = `./view?filename=${encodeURIComponent(src.filename)}&type=${src.type}&subfolder=${encodeURIComponent(src.subfolder)}`;
      const timestampedUrl = `${baseUrl}&t=${+new Date()}`;
      const img = await this.loadImage(timestampedUrl);
      img.dataset.baseUrl = baseUrl;
      const imageElement = this.createImageElement(img, timestampedUrl, baseUrl);
      const bars = batchContainer.querySelectorAll('.image-feed-vertical-bar');

      if (bars.length === 2) {
        bars[1].before(imageElement);
      } else if (newestToOldest) {
        batchContainer.firstChild.after(imageElement);
      } else {
        batchContainer.appendChild(imageElement);
      }

      this.forceReflow(batchContainer);
      this.updateLightboxIfOpen();
    } catch (error) {
      console.error('Error adding image to batch', error);
      const placeholderImg = createElement('img', {
        src: 'https://placehold.co/512',
        alt: 'Image failed to load',
      });
      batchContainer.appendChild(placeholderImg);
    }
  }

  createImageElement(img, timestampedUrl, baseUrl) {
    const imageElement = createElement('div', { className: 'image-container' });
    img.onclick = (e) => this.handleImageClick(e, timestampedUrl, baseUrl);
    imageElement.appendChild(img);
    return imageElement;
  }

  handleImageClick(e, timestampedUrl, baseUrl) {
    e.preventDefault();
    const state = this.getCurrentState();
    const absoluteBaseUrl = new URL(baseUrl, window.location.origin).href;
    const imageIndex = state.images.findIndex((img) => img.startsWith(absoluteBaseUrl));
    if (imageIndex > -1) {
      this.lightbox.show(state.images, imageIndex);
    } else {
      console.error('Clicked image not found in the list. Available images:', state.images);
      console.error('Clicked image URL:', absoluteBaseUrl);
      if (state.images.length > 0) {
        this.lightbox.show(state.images, 0);
      }
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
      img.src = src;
    });
  }

  getAllImages() {
    const images = document.querySelectorAll('.simplefeed-image-feed img');
    return Array.from(images).map((img) => {
      const url = new URL(img.src, window.location.origin);
      url.searchParams.delete('t');
      return url.href;
    });
  }

  checkAndRemoveExtraImageBatches() {
    const maxImageBatches = storage.getVal('MaxFeedLength', 25);
    const batches = Array.from(this.imageList.querySelectorAll('.image-batch-container'));

    if (batches.length <= maxImageBatches) {
      return;
    }

    batches.slice(maxImageBatches).forEach((batch) => batch.remove());
  }

  clearImageFeed() {
    this.currentBatchIdentifier = null;
    this.currentBatchContainer = null;
    this.imageList.replaceChildren();
    window.dispatchEvent(new Event('resize'));
  }

  async showNodeFilter() {
    await this.loadModal();
    this.createImageNodeList();
    this.setNodeSelectorVisibility(true);
  }

  updateControlPositions(feedLocation) {
    if (!this.imageFeed) {
      console.error('Image feed element not found.');
      return;
    }

    this.imageFeed.classList.remove('simplefeed-image-feed--top', 'simplefeed-image-feed--bottom');
    this.buttonPanel.classList.remove('simplefeed-image-feed-btn-group--top', 'simplefeed-image-feed-btn-group--bottom');

    if (feedLocation === 'top') {
      this.imageFeed.classList.add('simplefeed-image-feed--top');
      this.buttonPanel.classList.add('simplefeed-image-feed-btn-group--top');
      this.buttonPanel.style.top = '10px';
      this.buttonPanel.style.bottom = 'auto';
    } else {
      this.imageFeed.classList.add('simplefeed-image-feed--bottom');
      this.buttonPanel.classList.add('simplefeed-image-feed-btn-group--bottom');
      this.buttonPanel.style.bottom = '10px';
      this.buttonPanel.style.top = 'auto';
    }

    this.adjustImageTray();
  }

  adjustImageTray() {
    try {
      this.updateSidebarAdjustments();
      this.updateFeedDimensions();
      this.updateFeedPosition();
      this.setupObserver();
    } catch (error) {
      console.error('Error adjusting image tray:', error);
    }
  }

  updateSidebarAdjustments() {
    const { sideBarWidth, sideBarPosition } = this.getSidebarInfo();
    this.imageFeed.style.setProperty('--simplefeed-left-offset', `${sideBarWidth}px`);
    this.adjustFeedBasedOnSidebar(sideBarPosition, sideBarWidth);
  }

  getSidebarInfo() {
    const leftSideBar = document.querySelector('.comfyui-body-left .side-tool-bar-container');
    const rightSideBar = document.querySelector('.comfyui-body-right .side-tool-bar-container');
    const sideBar = leftSideBar || rightSideBar;
    const sideBarWidth = sideBar?.offsetWidth || 0;

    let sideBarPosition;
    if (leftSideBar) {
      sideBarPosition = 'left';
    } else if (rightSideBar) {
      sideBarPosition = 'right';
    } else {
      sideBarPosition = 'none';
    }

    return { sideBar, sideBarWidth, sideBarPosition };
  }

  adjustFeedBasedOnSidebar(sideBarPosition, sideBarWidth) {
    this.fixedOffset = 70;

    if (sideBarPosition === 'left') {
      this.imageFeed.style.left = `${sideBarWidth}px`;
      this.imageFeed.style.right = '0';
    } else if (sideBarPosition === 'right') {
      this.imageFeed.style.left = '0';
      this.imageFeed.style.right = `${sideBarWidth}px`;
    } else {
      this.imageFeed.style.left = '0';
      this.imageFeed.style.right = '0';
    }

    this.imageFeed.style.width = `calc(100% - ${sideBarWidth + this.fixedOffset}px)`;
  }

  updateFeedDimensions() {
    const feedHeight = parseInt(getComputedStyle(this.imageFeed).getPropertyValue('--simplefeed-feed-height')) || 300;
    this.imageFeed.style.height = `${feedHeight}px`;
  }

  updateFeedPosition() {
    const comfyuiMenu = document.querySelector('nav.comfyui-menu');
    const isMenuVisible = comfyuiMenu && comfyuiMenu.offsetParent !== null;
    const feedLocation = storage.getJSONVal('Location', 'bottom');

    this.setFeedPosition(feedLocation, isMenuVisible, comfyuiMenu);
    requestAnimationFrame(() => this.adjustButtonPanelPosition());
  }

  setFeedPosition(feedLocation, isMenuVisible, comfyuiMenu) {
    if (feedLocation === 'top') {
      const imageFeedTop = this.calculateTopPosition(isMenuVisible, comfyuiMenu);
      this.imageFeed.style.top = `${imageFeedTop}px`;
      this.imageFeed.style.bottom = 'auto';
    } else {
      const imageFeedBottom = this.calculateBottomPosition(isMenuVisible, comfyuiMenu);
      this.imageFeed.style.bottom = `${imageFeedBottom}px`;
      this.imageFeed.style.top = 'auto';
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
      return Math.abs(window.innerHeight - menuRect.bottom) <= 1 ? menuRect.height : 0;
    }
    return 0;
  }

  setupObserver() {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver(() => {
      requestAnimationFrame(() => this.adjustImageTray());
    });

    const { sideBar } = this.getSidebarInfo();
    const comfyuiMenu = document.querySelector('nav.comfyui-menu');

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
    if (!buttonPanel) {
      return;
    }

    const imageFeedRect = this.imageFeed.getBoundingClientRect();

    buttonPanel.style.top = `${imageFeedRect.top + 10}px`;
    buttonPanel.style.right = `${window.innerWidth - imageFeedRect.right + 10}px`;

    buttonPanel.style.bottom = 'auto';
    buttonPanel.style.left = 'auto';
  }

  waitForSideToolbar() {
    const MAX_OBSERVATION_TIME = 5000;
    let timeoutId;
    const observer = new MutationObserver((mutationsList, observer) => {
      const sideToolBar = document.querySelector('.comfyui-body-left .side-tool-bar-container');
      if (sideToolBar) {
        this.adjustImageTray();
        observer.disconnect();
        clearTimeout(timeoutId);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      console.error('Sidebar not found within the maximum observation time', new Error('Timeout'));
    }, MAX_OBSERVATION_TIME);
  }

  async loadModal() {
    try {
      const overlay = await this.loadOverlay();
      let modal = document.getElementById('nodeSelectorPlaceholder');

      if (!modal) {
        modal = createElement('div', {
          id: 'nodeSelectorPlaceholder',
          className: 'nodeSelectorPlaceholder',
        });
        overlay.appendChild(modal);
      }

      return modal;
    } catch (error) {
      console.error('Error loading modal:', error);
    }
  }

  loadOverlay() {
    return new Promise((resolve) => {
      let overlay = document.getElementById('modalOverlay');

      if (!overlay) {
        overlay = createElement('div', {
          id: 'modalOverlay',
          className: 'modalOverlay',
        });
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (event) => {
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
      console.error('Modal element not found');
      return;
    }

    const header = createElement('h2', {
      textContent: 'Detected Image Nodes',
      style: {
        textAlign: 'center',
        color: '#FFF',
        margin: '0 0 20px',
        fontSize: '24px',
      },
    });

    nodeListElement.innerHTML = '';
    nodeListElement.appendChild(header);

    const buttonContainer = createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '5px',
      },
    });

    const filterEnabled = storage.getJSONVal('FilterEnabled', false);

    const filterToggleButton = createElement('button', {
      className: 'simplefeed-image-feed-btn',
      textContent: filterEnabled ? 'Disable Filter' : 'Enable Filter',
      onclick: () => this.toggleFilter(filterToggleButton, sortToggleButton),
    });

    const sortToggleButton = createElement('button', {
      className: 'simplefeed-image-feed-btn',
      textContent: storage.getJSONVal('SortOrder', 'ID') === 'ID' ? 'Sort by Name' : 'Sort by ID',
      onclick: () => this.toggleSortOrder(sortToggleButton),
      disabled: !filterEnabled,
    });

    buttonContainer.appendChild(filterToggleButton);
    buttonContainer.appendChild(sortToggleButton);
    nodeListElement.appendChild(buttonContainer);

    await this.redrawImageNodeList();
  }

  updateCheckboxStates(enabled) {
    const checkboxes = document.querySelectorAll('.node-list-item input[type="checkbox"], #custom-node-checkbox');
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = !enabled;
    });
  }

  async toggleFilter(filterToggleButton, sortToggleButton) {
    const filterEnabled = storage.getJSONVal('FilterEnabled', false);
    const newFilterState = !filterEnabled;

    storage.setJSONVal('FilterEnabled', newFilterState);

    filterToggleButton.textContent = newFilterState ? 'Disable Filter' : 'Enable Filter';
    sortToggleButton.disabled = !newFilterState;

    if (!newFilterState) {
      this.selectedNodeIds = [];
      storage.setJSONVal('NodeFilter', this.selectedNodeIds);
    }

    this.updateCheckboxStates(newFilterState);
    await this.redrawImageNodeList();
  }

  async toggleSortOrder(sortToggleButton) {
    const currentSortOrder = storage.getJSONVal('SortOrder', 'ID');
    const newSortOrder = currentSortOrder === 'ID' ? 'Name' : 'ID';

    storage.setJSONVal('SortOrder', newSortOrder);
    sortToggleButton.textContent = newSortOrder === 'ID' ? 'Sort by Name' : 'Sort by ID';
    await this.redrawImageNodeList();
  }

  updateImageNodes() {
    const nodes = Object.values(app.graph._nodes);
    this.imageNodes = nodes.filter((node) => ELIGIBLE_NODES.includes(node.type));
  }

  sortImageNodes() {
    const sortOrder = storage.getJSONVal('SortOrder', 'ID');
    this.imageNodes.sort((a, b) => {
      if (sortOrder === 'Name') {
        return a.title.localeCompare(b.title) || a.id - b.id;
      }
      return a.id - b.id;
    });
  }

  async redrawImageNodeList() {
    const listContainer = await this.loadModal();

    let nodeList = listContainer.querySelector('.node-list');
    if (!nodeList) {
      nodeList = createElement('ul', { className: 'node-list' });
      listContainer.appendChild(nodeList);
    }

    const fragment = document.createDocumentFragment();
    const filterEnabled = storage.getJSONVal('FilterEnabled', false);

    this.updateImageNodes();
    this.sortImageNodes();

    this.imageNodes.forEach((node, index) => {
      const listItem = createElement('li', {
        className: `node-list-item ${index % 2 === 0 ? 'even' : 'odd'}`,
      });

      const checkbox = createElement('input', {
        type: 'checkbox',
        id: `node-${node.id}`,
        checked: this.selectedNodeIds.includes(node.id),
        disabled: !filterEnabled,
      });

      checkbox.addEventListener('change', () => {
        this.updateSelectedNodeIds(node.id, checkbox.checked);
      });

      const label = createElement('label', {
        htmlFor: checkbox.id,
        textContent: node.title ? `${node.title} (ID: ${node.id})` : `Node ID: ${node.id}`,
      });

      listItem.appendChild(checkbox);
      listItem.appendChild(label);

      fragment.appendChild(listItem);
    });

    nodeList.replaceChildren(fragment);

    let customNodeItem = listContainer.querySelector('.custom-node-item');
    if (!customNodeItem) {
      customNodeItem = createElement('li', { className: 'custom-node-item' });

      const customCheckbox = createElement('input', {
        type: 'checkbox',
        id: 'custom-node-checkbox',
        checked: this.selectedNodeIds.includes(-1),
        disabled: !filterEnabled,
      });

      customCheckbox.addEventListener('change', (e) => {
        this.updateSelectedNodeIds(-1, e.target.checked);
      });

      const customLabel = createElement('label', {
        htmlFor: 'custom-node-checkbox',
        textContent: 'Custom Nodes Not Shown',
        className: 'custom-label',
      });

      customNodeItem.appendChild(customCheckbox);
      customNodeItem.appendChild(customLabel);

      nodeList.appendChild(customNodeItem);
    } else {
      const customCheckbox = customNodeItem.querySelector('input[type="checkbox"]');
      if (customCheckbox) {
        customCheckbox.checked = this.selectedNodeIds.includes(-1);
        customCheckbox.disabled = !filterEnabled;
      }
    }

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

    storage.setJSONVal('NodeFilter', this.selectedNodeIds);
  }

  setNodeSelectorVisibility(isVisible) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('nodeSelectorPlaceholder');

    if (!overlay || !modal) {
      console.error('Overlay or modal not found');
      return;
    }

    overlay.style.display = isVisible ? 'flex' : 'none';
    modal.style.display = isVisible ? 'block' : 'none';
  }

  setupSettings() {
    app.ui.settings.addSetting({
      id: 'simpleTray.imageFeed.feedHeight',
      name: '📥 Image Tray Height',
      defaultValue: 200,
      type: 'combo',
      options: [
        { text: '100px', value: 100 },
        { text: '150px', value: 150 },
        { text: '200px', value: 200 },
        { text: '250px', value: 250 },
        { text: '300px', value: 300 },
        { text: '350px', value: 350 },
        { text: '400px', value: 400 },
      ],
      onChange: (newValue) => {
        const newHeight = `${newValue}px`;
        this.imageFeed.style.setProperty('--simplefeed-feed-height', newHeight);
        window.dispatchEvent(new Event('resize'));
      },
      tooltip: 'Select the height of the image feed tray.',
    });

    app.ui.settings.addSetting({
      id: 'simpleTray.imageFeed.NewestFirst',
      name: '📥 Image Tray Sort Order',
      defaultValue: 'newest',
      type: 'combo',
      options: [
        { text: 'newest first', value: 'newest' },
        { text: 'oldest first', value: 'oldest' },
      ],
      onChange: (newValue) => {
        storage.setVal('NewestFirst', newValue);
        this.adjustImageTray();
      },
      tooltip: 'Choose the sort order of images in the feed.',
    });

    app.ui.settings.addSetting({
      id: 'simpleTray.imageFeed.MaxFeedLength',
      name: '📥 Max Batches In Feed',
      defaultValue: 25,
      type: 'number',
      onChange: (newValue) => {
        storage.setVal('MaxFeedLength', newValue);
        this.checkAndRemoveExtraImageBatches();
      },
      tooltip: 'Maximum number of image batches to retain before the oldest start dropping from image feed.',
      attrs: {
        min: '25',
        max: '200',
        step: '25',
      },
    });

    app.ui.settings.addSetting({
      id: 'simpleTray.imageFeed.Location',
      name: '📥 Image Tray Location',
      defaultValue: storage.getJSONVal('Location', 'bottom'),
      type: 'combo',
      options: [
        { text: 'top', value: 'top' },
        { text: 'bottom', value: 'bottom' },
      ],
      onChange: (newLocation) => {
        this.updateControlPositions(newLocation);
        storage.setJSONVal('Location', newLocation);
        this.adjustImageTray();
      },
      tooltip: 'Choose the location of the image feed.',
    });

    app.ui.settings.addSetting({
      id: 'simpleTray.imageFeed.TrayVisible',
      name: '📥 Display Image Tray',
      type: 'boolean',
      defaultValue: storage.getJSONVal('Visible', true),
      onChange: (value) => {
        this.visible = value;
        storage.setJSONVal('Visible', value);
        this.changeFeedVisibility(value);
      },
      tooltip: 'Change the visibility of the Image Feed.',
    });
  }

  changeFeedVisibility(isVisible) {
    this.imageFeed.style.display = isVisible ? 'flex' : 'none';
    if (isVisible) {
      this.adjustImageTray();
    }
    window.dispatchEvent(new Event('resize'));
  }
}

export { ImageFeed };