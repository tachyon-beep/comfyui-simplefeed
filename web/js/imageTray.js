import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { lightbox } from "./common/lightbox.js";

$el("style", {
	textContent: `
		:root {
			--tb-background-color-main: rgb(36, 39, 48);
			--tb-separator-color: yellow;
			--tb-separator-width: 2px;
			--tb-border-color: #ccc; 
			--tb-input-bg-color: #eee; 
			--tb-text-color: #333; 
			--tb-highlight-filter: brightness(1.2);
			--tb-feed-height: 300px; 
			--tb-feed-width: 100%; 
			--tb-left-offset: 0px;
		}

		.tb-image-feed {
			position: fixed;
			display: flex;
			background-color: var(--tb-background-color-main);
			padding: 5px;
			z-index: 500;
			transition: all 0.3s ease;
			border: 1px solid var(--tb-border-color);
			height: var(--tb-feed-height);
			width: calc(100% - var(--tb-left-offset));
			left: var(--tb-left-offset);
		}

		.tb-image-feed.tb-image-feed--bottom {
			left: var(--tb-left-offset);
			right: 0;
			flex-direction: row;
			bottom: 0;
		}

		.tb-image-feed.tb-image-feed--top {
			left: var(--tb-left-offset);
			right: 0;
			flex-direction: row;
			top: 0;
		}

		.tb-image-feed .tb-image-feed-list {
			display: flex;
			flex-direction: row; 
			gap: 4px;
			align-items: flex-start; 
			white-space: nowrap; 
			overflow-x: scroll; 
			overflow-y: hidden; 
			scrollbar-gutter: stable;
			scrollbar-width: auto;
			max-height: inherit;
			max-width: inherit;
			height: inherit;
			width: inherit;
			z-index: 501;
		}

		.tb-image-feed .tb-image-feed-list > * {
			flex-shrink: 0;
		}	

		.tb-image-feed .image-batch-container {
			display: flex;
			flex-direction: row;
			gap: 2px;
			align-items: center;
			max-height: inherit;
			height: inherit;
			overflow: hidden; 
			white-space: nowrap; 
			flex-wrap: nowrap; 
		}

		.tb-image-feed .image-container {
			display: flex;
			justify-content: center;
			align-items: center;
			overflow: hidden;
			max-height: inherit;
			height: inherit;
			z-index: 501;
		}

		.tb-image-feed .image-container a {
			display: flex; 
			max-height: inherit; 
			height: inherit;
		}		

		.tb-image-feed .image-container img {
			max-height: inherit; 
			height: inherit;
			width: auto;
			object-fit: contain; 
		}

		.tb-image-feed .image-feed-vertical-bar {
			height: 100%;
			width: 4px;
			background-color: yellow;
			display: inline-block;
			z-index: 502;
		}

		.tb-image-feed .tb-image-feed-btn-group {
			position: fixed;
			bottom: 10px;
			right: 10px;
			display: flex;
			flex-direction: row; 
			align-items: center; 
			justify-content: space-between; 
			gap: 5px; 
			height: auto;
			width: auto;
			z-index: 502;
		}

		.tb-image-feed .tb-image-feed-btn-group.tb-image-feed-btn-group--top {
			bottom: unset;
			top: 5px;
			right: 40px;
		}

		.tb-image-feed .tb-image-feed-btn-group.tb-image-feed-btn-group--bottom {
			bottom: 30px;
			right: 10px;
			top: unset;
		}

		.tb-image-feed .tb-image-feed-btn {
			padding: 0 10px;
			font-size: 16px;
			height: 40px;
			width: 70px; 
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid var(--tb-border-color);
			border-radius: 5px;
			background-color: white; 
			color: var(--tb-text-color);
			cursor: pointer;
		}

		.tb-image-feed .tb-image-feed-btn:hover {
			filter: var(--tb-highlight-filter);
		}

		.tb-image-feed .tb-image-feed-btn:active {
			position: relative;
			top: 1px;
		}

		.tb-image-feed .tb-close-btn {
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

		.tb-image-feed .tb-close-btn:hover {
			filter: var(--tb-highlight-filter);
		}

		.tb-image-feed .tb-close-btn:active {
			position: relative;
			top: 1px;
		}

		.modalOverlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
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

		.node-list-item:nth-child(odd) {
			background-color: #000;
		}

		.custom-node-item {
			display: flex;
			align-items: center;
			margin-bottom: 10px;
			margin-top: 20px;
			padding: 10px;
			border-radius: 5px;
			background-color: #000;
			border: 1px solid yellow;  
		}

		.custom-label {
			color: #FFF;
		}

		.custom-label.disabled {
			color: #555;
		}`,
	parent: document.body,
});

app.registerExtension({
	name: "simpleTray.imageFeed",
	async setup() {
		let visible = true;

		const prefix = "simpleTray.imageFeed.";

		const getVal = (n, d) => {
			const v = localStorage.getItem(prefix + n);

			if (v === null) {
				return d;
			}
			return v.replace(/^"|"$/g, '');
		};

		const saveVal = (n, v) => {
			const valueToSave = (typeof v === "boolean") ? v.toString() : v;
			localStorage.setItem(prefix + n, valueToSave);
		};

		const getJSONVal = (key, defaultValue) => {
			try {
				const value = localStorage.getItem(prefix + key);
				return value ? JSON.parse(value) : defaultValue;
			} catch (error) {
				logError(`Error retrieving ${key} from localStorage`, error);
				return defaultValue;
			}
		};

		const saveJSONVal = (n, v) => {
			try {
				localStorage.setItem(prefix + n, JSON.stringify(v));
			} catch (error) {
				logError("Error saving to localStorage", error);
			}
		};

		visible = getJSONVal("Visible", true);

		const imageFeed = $el("div", { className: "tb-image-feed", parent: document.body });
		const imageList = $el("div", { className: "tb-image-feed-list" });
		const buttonPanel = $el("div", { className: "tb-image-feed-btn-group" });

		const eligibleNodes = ['SaveImage', 'PreviewImage', 'KSampler', 'KSampler (Efficient)', 'KSampler Adv. (Efficient)', 'KSampler SDXL (Eff.)'];

		let sortOrder = getJSONVal("SortOrder", "ID");
		let selectedNodeIds = getJSONVal("NodeFilter", []);
		let imageNodes;

		let filterToggleButton;
		let sortToggleButton;

		let currentBatchIdentifier;
		let currentBatchContainer;

		let resizeListener;
		let domReadyListener;
		let executionStartListener;
		let executedListener;

		const clearButton = $el("button.tb-image-feed-btn.clear-btn", {
			textContent: "Clear",
			onclick: () => {
				currentBatchIdentifier = null;
				currentBatchContainer.replaceChildren();
				imageList.replaceChildren();
				window.dispatchEvent(new Event("resize"));
			},
		});

		const nodeFilterButton = $el("button.tb-image-feed-btn.node-filter-btn", {
			textContent: "Node Filter",
			onclick: async () => {
				const overlay = await loadModal();
				createImageNodeList();
				setNodeSelectorVisibility(true);
			},
		});

		function updateControlPositions(feedLocation) {
			if (!imageFeed) {
				logError('Image feed element not found', new Error('Element not found'));
				return;
			}

			imageFeed.classList.remove('tb-image-feed--top', 'tb-image-feed--bottom');
			buttonPanel.classList.remove('tb-image-feed-btn-group--top', 'tb-image-feed-btn-group--bottom');

			if (feedLocation === 'top') {
				imageFeed.classList.add('tb-image-feed--top');
				buttonPanel.classList.add('tb-image-feed-btn-group--top');
			} else {
				imageFeed.classList.add('tb-image-feed--bottom');
				buttonPanel.classList.add('tb-image-feed-btn-group--bottom');
			}

			// Save the new location to localStorage
			//saveJSONVal("Location", feedLocation);

			// Call adjustImageTray to set correct positioning and height
			adjustImageTray();
		}

		function createElement(type, options = {}) {
			const element = document.createElement(type);
			for (const [key, value] of Object.entries(options)) {
				if (key === 'style') {
					Object.assign(element.style, value);
				} else if (key === 'classList') {
					value.forEach(className => element.classList.add(className));
				} else {
					element[key] = value;
				}
			}
			return element;
		}

		function updateImageNodes() {
			const nodes = Object.values(app.graph._nodes);
			imageNodes = nodes.filter(node => eligibleNodes.includes(node.type));
		}

		function updateSelectedNodeIds(nodeId, isChecked) {
			if (isChecked) {
				if (!selectedNodeIds.includes(nodeId)) {
					selectedNodeIds.push(nodeId);
				}
			} else {
				selectedNodeIds = selectedNodeIds.filter(id => id !== nodeId);
			}

			saveJSONVal("NodeFilter", selectedNodeIds);
		}

		async function loadModal() {
			try {
				const overlay = await loadOverlay();
				let modal = document.getElementById('nodeSelectorPlaceholder');
				if (!modal) {
					modal = createElement('div', {
						id: 'nodeSelectorPlaceholder',
						className: 'nodeSelectorPlaceholder'
					});
					overlay.appendChild(modal);
				}
				return modal;
			} catch (error) {
				logError('Error loading modal', error);
			}
		}

		function loadOverlay() {
			return new Promise((resolve, reject) => {
				let overlay = document.getElementById('modalOverlay');

				if (!overlay) {
					overlay = createElement('div', { id: 'modalOverlay', classList: ['modalOverlay'] });
					document.body.appendChild(overlay);
					overlay.addEventListener('click', event => {
						if (event.target === overlay) {
							setNodeSelectorVisibility(false);
						}
					});
				}

				resolve(overlay);
			});
		}

		function toggleFilter() {
			const filterEnabled = !getJSONVal("FilterEnabled", false);
			saveJSONVal("FilterEnabled", filterEnabled);
			filterToggleButton.textContent = filterEnabled ? 'Disable Filter' : 'Enable Filter';
			sortToggleButton.disabled = !filterEnabled;
			redrawImageNodeList();
		}

		function toggleSortOrder() {
			sortOrder = getJSONVal("SortOrder", "ID");
			sortOrder = sortOrder === "ID" ? "Name" : "ID";
			saveJSONVal("SortOrder", sortOrder);
			sortToggleButton.textContent = sortOrder === "ID" ? 'Sort by Name' : 'Sort by ID';
			redrawImageNodeList(imageNodes, loadModal());
		}

		function sortImageNodes() {
			const sortOrder = getJSONVal("SortOrder", "ID");
			imageNodes.sort((a, b) => {
				if (sortOrder === "Name") {
					return a.title.localeCompare(b.title) || a.id - b.id;
				}
				return a.id - b.id;
			});
		}

		function redrawImageNodeList() {
			const listContainer = loadModal();
			const fragment = document.createDocumentFragment();
			const filterEnabled = getJSONVal("FilterEnabled", false);

			updateImageNodes();
			sortImageNodes();

			imageNodes.forEach((node, index) => {
				const listItem = createElement('li', {
					className: `node-list-item ${index % 2 === 0 ? 'even' : 'odd'}`
				});

				const checkbox = createElement('input', {
					type: 'checkbox',
					id: `node-${node.id}`,
					checked: selectedNodeIds.includes(node.id),
					disabled: !filterEnabled
				});

				checkbox.addEventListener('change', () => {
					updateSelectedNodeIds(node.id, checkbox.checked);
				});

				const label = createElement('label', {
					htmlFor: checkbox.id,
					textContent: node.title ? `${node.title} (ID: ${node.id})` : `Node ID: ${node.id}`
				});

				listItem.appendChild(checkbox);
				listItem.appendChild(label);
				fragment.appendChild(listItem);
			});

			listContainer.querySelector('.node-list')?.replaceChildren(fragment);

			let customNodeItem = listContainer.querySelector('.custom-node-item');
			if (!customNodeItem) {
				customNodeItem = document.createElement('li');
				customNodeItem.classList.add("custom-node-item");

				const customCheckbox = document.createElement('input');
				customCheckbox.type = 'checkbox';
				customCheckbox.id = 'custom-node-checkbox';
				customCheckbox.addEventListener('change', function () {
					updateSelectedNodeIds(-1, this.checked);
				});

				const customLabel = document.createElement('label');
				customLabel.setAttribute('for', customCheckbox.id);
				customLabel.textContent = "Custom Nodes Not Shown";
				customLabel.classList.add("custom-label");

				customNodeItem.appendChild(customCheckbox);
				customNodeItem.appendChild(customLabel);
				listContainer.appendChild(customNodeItem);
			} else {
				const customCheckbox = customNodeItem.querySelector('input[type="checkbox"]');
				if (customCheckbox) {
					customCheckbox.disabled = !filterEnabled;
				}
			}
		}

		function createImageNodeList() {
			const nodeListElement = loadModal();
			const buttonWidth = '100px';
			const header = document.createElement('h2');

			header.textContent = 'Detected Image Nodes';
			header.style.textAlign = 'center';
			header.style.color = '#FFF';
			header.style.margin = '0 0 20px';
			header.style.fontSize = '24px';

			nodeListElement.innerHTML = '';
			nodeListElement.appendChild(header);

			const line1Container = document.createElement('div');
			line1Container.style.display = 'flex';
			line1Container.style.justifyContent = 'space-between';
			line1Container.style.width = '100%';
			line1Container.style.marginBottom = '5px';

			const line2Container = document.createElement('div');
			line2Container.style.display = 'flex';
			line2Container.style.justifyContent = 'flex-end';
			line2Container.style.width = '100%';

			const filterEnabled = getJSONVal("FilterEnabled", false);

			if (!filterToggleButton) {
				filterToggleButton = document.createElement('button');
				filterToggleButton.textContent = filterEnabled ? 'Disable Filter' : 'Enable Filter';
				filterToggleButton.style.width = buttonWidth;
				filterToggleButton.addEventListener('click', toggleFilter);
			}

			if (!sortToggleButton) {
				sortToggleButton = document.createElement('button');
				sortToggleButton.style.width = buttonWidth;
				sortToggleButton.disabled = !filterEnabled;
				sortToggleButton.addEventListener('click', toggleSortOrder);
			}

			if (sortOrder === "ID") {
				sortToggleButton.textContent = 'Sort by Name';
			} else {
				sortToggleButton.textContent = 'Sort by ID';
			}

			line1Container.appendChild(filterToggleButton);
			line1Container.appendChild(sortToggleButton);
			nodeListElement.appendChild(line1Container);

			redrawImageNodeList(imageNodes, nodeListElement);
		}

		function setNodeSelectorVisibility(isVisible) {
			const modal = loadModal();
			const overlay = loadOverlay();

			if (!isVisible) {
				saveJSONVal("NodeFilter", selectedNodeIds);
				redrawImageNodeList(imageNodes, loadModal());
			}

			overlay.style.display = isVisible ? 'flex' : 'none';
		}

		function onDomReady() {
			const feedHeightSetting = app.ui.settings.addSetting({
				id: "simpleTray.imageFeed.feedHeight",
				name: "📥 Image Tray Height",
				defaultValue: 300,
				type: "slider",
				onChange: (newValue) => {
					const newHeight = `${newValue}px`;
					imageFeed.style.setProperty('--tb-feed-height', newHeight);
					window.dispatchEvent(new Event("resize"));
				},
				attrs: {
					min: '100',
					max: '300',
					className: 'feed-height-slider',
				},
				tooltip: "Adjust the height of the feed display area.",
			});

			// Ensure all settings objects are correctly terminated
			const feedDirectionSetting = app.ui.settings.addSetting({
				id: "simpleTray.imageFeed.NewestFirst",
				name: "📥 Image Tray Sort Order",
				defaultValue: "newest",
				type: "combo",
				options: [
					{ text: "newest first", value: "newest" },
					{ text: "oldest first", value: "oldest" }
				],
				onChange: (newLocation) => {
					updateControlPositions(newLocation);
					window.dispatchEvent(new Event("resize"));
				},
				tooltip: "Choose the location of the image feed.",
			});

			const feedLengthSetting = app.ui.settings.addSetting({
				id: "simpleTray.imageFeed.MaxFeedLength",
				name: "📥 Max Batches In Feed",
				defaultValue: 25,
				type: "number",
				onChange: (newValue) => {
					// Handled during execution
				},
				tooltip: "Maximum number of image batches to retain before the oldest start dropping from image feed.",
				attrs: {
					min: '25',
					max: '200',
					step: '25',
				},
			});

			const feedLocationSetting = app.ui.settings.addSetting({
				id: "simpleTray.imageFeed.Location",
				name: "📥 Image Tray Location",
				defaultValue: getJSONVal("Location", "bottom"), // Load the saved location or use "bottom" as default
				type: "combo",
				options: [
					{ text: "top", value: "top" },
					{ text: "bottom", value: "bottom" }
				],
				onChange: (newLocation) => {
					updateControlPositions(newLocation);
					saveJSONVal("Location", newLocation); // Save the new location
				},
				tooltip: "Choose the location of the image feed.",
			});

			const feedVisible = app.ui.settings.addSetting({
				id: "simpleTray.imageFeed.TrayVisible",
				name: "📥 Display Image Tray",
				type: "boolean",
				checked: getJSONVal("Visible", true),
				onChange(value) {
					visible = value;
					saveJSONVal("Visible", value);
					changeFeedVisibilility(value);
				},
				tooltip: "Change the visibility of the Image Feed.",
			});

			setupEventListeners();

			// Create the image feed
			imageFeed.append(imageList);

			// Create the UI
			buttonPanel.append(nodeFilterButton);
			buttonPanel.append(clearButton);
			imageFeed.append(buttonPanel);

			const initialFeedLocation = getJSONVal("Location", "bottom")
			console.log("Initial feed location:", initialFeedLocation);

			updateControlPositions(initialFeedLocation);

			// Log the position immediately after updating
			console.log("Position after updateControlPositions:",
				imageFeed.classList.contains('tb-image-feed--top') ? 'top' : 'bottom');

			// Add a small delay and check again
			setTimeout(() => {
				console.log("Position after delay:",
					imageFeed.classList.contains('tb-image-feed--top') ? 'top' : 'bottom');
			}, 100);

			// Call adjustImageTray directly after DOM is ready
			adjustImageTray();
		}

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", onDomReady);
		} else {
			onDomReady();
		}

		function changeFeedVisibilility(vis) {
			if (vis) {
				imageFeed.style.display = "flex";
				adjustImageTray(); // Ensure correct positioning and size
			} else {
				imageFeed.style.display = "none";
			}
			window.dispatchEvent(new Event("resize"));
		}

		window.dispatchEvent(new Event("resize"));

		async function adjustImageTray() {
			try {
				const imageFeed = document.querySelector('.tb-image-feed');
				const buttonPanel = imageFeed.querySelector('.tb-image-feed-btn-group');
				if (!imageFeed || !buttonPanel) {
					console.log('Image feed or button panel not found, skipping adjustment');
					return;
				}

				const sideToolBar = document.querySelector('.comfyui-body-left .side-tool-bar-container');
				const comfyuiMenu = document.querySelector('nav.comfyui-menu');

				const toolbarWidth = sideToolBar?.offsetWidth || 0;
				imageFeed.style.setProperty('--tb-left-offset', `${toolbarWidth}px`);
				imageFeed.style.width = `calc(100% - ${toolbarWidth}px)`;

				const feedHeight = parseInt(getComputedStyle(imageFeed).getPropertyValue('--tb-feed-height')) || 300;
				imageFeed.style.height = `${feedHeight}px`;

				const feedLocation = getJSONVal("Location", "bottom");
				const isFeedAtTop = feedLocation === "top";

				if (comfyuiMenu) {
					const menuHeight = comfyuiMenu.offsetHeight;
					const menuRect = comfyuiMenu.getBoundingClientRect();
					const isMenuAtTop = menuRect.top <= 1;
					const isMenuAtBottom = Math.abs(window.innerHeight - menuRect.bottom) <= 1;

					if (isFeedAtTop) {
						imageFeed.style.top = isMenuAtTop ? `${menuHeight}px` : '0';
						imageFeed.style.bottom = 'auto';
					} else {
						imageFeed.style.top = 'auto';
						imageFeed.style.bottom = isMenuAtBottom ? `${menuHeight}px` : '0';
					}
				} else {
					if (isFeedAtTop) {
						imageFeed.style.top = '0';
						imageFeed.style.bottom = 'auto';
					} else {
						imageFeed.style.top = 'auto';
						imageFeed.style.bottom = '0';
					}
				}

				// Adjust for side toolbar if it exists
				if (sideToolBar && isFeedAtTop) {
					const sideToolBarRect = sideToolBar.getBoundingClientRect();
					if (sideToolBarRect.top <= 1) {
						const maxTop = Math.max(parseInt(imageFeed.style.top) || 0, sideToolBarRect.height);
						imageFeed.style.top = `${maxTop}px`;
					}
				}

				// Adjust button panel position
				if (isFeedAtTop) {
					const imageFeedTop = parseInt(imageFeed.style.top) || 0;
					buttonPanel.style.top = `${imageFeedTop + 15}px`;
					buttonPanel.style.bottom = 'auto';
				} else {
					const imageFeedBottom = parseInt(imageFeed.style.bottom) || 0;
					buttonPanel.style.bottom = `${imageFeedBottom + 30}px`;
					buttonPanel.style.top = 'auto';
				}

			} catch (error) {
				console.error('Error adjusting image tray:', error);
			}
		}

		function waitForSideToolbar() {
			const MAX_OBSERVATION_TIME = 10000; // 10 seconds
			let timeoutId;
			const observer = new MutationObserver((mutationsList, observer) => {
				const sideToolBar = document.querySelector('.comfyui-body-left .side-tool-bar-container');
				if (sideToolBar) {
					adjustImageTray();
					observer.disconnect();
					clearTimeout(timeoutId);
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });

			timeoutId = setTimeout(() => {
				observer.disconnect();
				logError('Sidebar not found within the maximum observation time', new Error('Timeout'));
			}, MAX_OBSERVATION_TIME);
		}

		waitForSideToolbar();

		function setupEventListeners() {
			// Save listener references to variables so they can be cleaned up later
			resizeListener = debounce(adjustImageTray, 250);
			domReadyListener = onDomReady;
			executionStartListener = ({ detail }) => {
				const filterEnabled = getJSONVal("FilterEnabled", false);
				if (filterEnabled && (!selectedNodeIds || selectedNodeIds.length === 0)) {
					saveJSONVal('FilterEnabled', false);
					return;
				}
			}
		};

		function cleanupEventListeners() {
			if (resizeListener) {
				window.removeEventListener('resize', resizeListener);
			}

			if (domReadyListener) {
				document.removeEventListener('DOMContentLoaded', domReadyListener);
			}

			if (executionStartListener) {
				api.removeEventListener('execution_start', executionStartListener);
			}

			if (executedListener) {
				api.removeEventListener('executed', executedListener);
			}
		}

		function handleExecuted(detail) {
			if (!visible || !detail?.output?.images) {
				return;
			}

			const newestToOldest = getVal("NewestFirst", "newest") == "newest";
			const filterEnabled = getJSONVal("FilterEnabled", true) === true;
			const newBatchIdentifier = detail.prompt_id;

			if (detail.node?.includes?.(":")) {
				const n = app.graph.getNodeById(detail.node.split(":")[0]);
				if (n?.getInnerNodes) return;
			}

			if (!imageFeed && !imageList) {
				logError('Image feed or imageList container not found!', new Error('Elements not found'));
				return;
			} else {
				if (!currentBatchContainer) {
					currentBatchContainer = document.createElement('div');
					currentBatchContainer.className = 'image-batch-container';
				}

				if (newestToOldest) {
					imageList.prepend(currentBatchContainer);
				} else {
					imageList.appendChild(currentBatchContainer);
				}
			}

			if (newBatchIdentifier !== currentBatchIdentifier) {
				if (currentBatchIdentifier) {
					const yellowBar = document.createElement('div');
					yellowBar.className = "image-feed-vertical-bar";
					if (newestToOldest) {
						imageList.prepend(yellowBar);
					} else {
						imageList.appendChild(yellowBar);
					}
				}
				currentBatchContainer = document.createElement('div');
				currentBatchContainer.className = 'image-batch-container';

				if (newestToOldest) {
					imageList.prepend(currentBatchContainer);
				} else {
					imageList.appendChild(currentBatchContainer);
				}
				currentBatchIdentifier = newBatchIdentifier;
			}

			detail.output.images.forEach((src) => {
				const node = app.graph.getNodeById(parseInt(detail.node, 10));
				if (!filterEnabled || (node?.type && (eligibleNodes.includes(node.type) && selectedNodeIds.includes(parseInt(detail.node, 10))) ||
					(!eligibleNodes.includes(node.type) && selectedNodeIds.includes(-1)))) {
					addImageToBatch(src, currentBatchContainer);
				}
			});

			checkAndRemoveExtraImageBatches();
			setTimeout(() => window.dispatchEvent(new Event("resize")), 1);
		}

		executedListener = ({ detail }) => {
			if (!visible || !detail?.output?.images) return;
			handleExecuted(detail);
		};

		// Add event listeners
		window.addEventListener('resize', resizeListener);
		document.addEventListener('DOMContentLoaded', domReadyListener);
		api.addEventListener('execution_start', executionStartListener);
		api.addEventListener('executed', executedListener);

		function getAllImages() {
			const images = document.querySelectorAll('.tb-image-feed img');
			const imageSources = Array.from(images).map(img => new URL(img.src, window.location.origin).href);
			return imageSources;
		}

		function loadImage(src) {
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = src;
			});
		}

		function logError(message, error) {
			console.error(`${message}:`, error);
		}

		function debounce(func, wait) {
			let timeout;
			return function executedFunction(...args) {

				const later = () => {
					clearTimeout(timeout);
					func(...args);
				};

				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		}

		async function addImageToBatch(src, batchContainer) {
			try {
				const baseUrl = `./view?filename=${encodeURIComponent(src.filename)}&type=${src.type}&subfolder=${encodeURIComponent(src.subfolder)}`;
				const timestampedUrl = `${baseUrl}&t=${+new Date()}`;
				const newestToOldest = getVal("NewestFirst", "newest") === "newest";

				const img = await loadImage(timestampedUrl);

				const imageElement = document.createElement('div');
				imageElement.className = 'image-container';
				const anchor = document.createElement('a');
				anchor.setAttribute('target', '_blank');
				anchor.setAttribute('href', timestampedUrl);
				anchor.onclick = (e) => {
					e.preventDefault();
					const absoluteUrl = new URL(timestampedUrl, window.location.origin).href;
					const imgs = getAllImages();
					const normalizedUrls = imgs.map(url => url.split('&t=')[0]);
					const baseUrlAbsolute = new URL(baseUrl, window.location.origin).href;
					const imageIndex = normalizedUrls.indexOf(baseUrlAbsolute);

					if (imageIndex > -1) {
						lightbox.show(imgs, imageIndex);
					} else {
						logError("Clicked image not found in the list:", new Error("Image not found"));
					}
				};

				anchor.appendChild(img);
				imageElement.appendChild(anchor);

				if (newestToOldest) {
					batchContainer.prepend(imageElement);
				} else {
					batchContainer.appendChild(imageElement);
				}
			} catch (error) {
				logError("Error adding image to batch", error);
				const placeholderImg = createElement('img', {
					src: 'path/to/placeholder.png',
					alt: 'Image failed to load'
				});
				batchContainer.appendChild(placeholderImg);
			}
		}

		function checkAndRemoveExtraImageBatches() {
			const maxImageBatches = getVal("MaxFeedLength", 25);
			const batches = Array.from(imageList.querySelectorAll('.image-batch-container'));

			if (batches.length <= maxImageBatches) return;

			const batchesToRemove = batches.slice(maxImageBatches);
			batchesToRemove.forEach(batch => {
				const yellowBar = batch.previousElementSibling;
				if (yellowBar && yellowBar.className === "image-feed-vertical-bar") {
					yellowBar.remove();
				}
				batch.remove();
			});
		}

	},
});

