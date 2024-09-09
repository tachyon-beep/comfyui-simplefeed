import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { lightbox } from "./common/lightbox.js";

// Embed updated CSS
$el("style", {
  textContent: `
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
      background-color: rgba(36, 39, 48, 0.8); /* Tray with 80% opacity */
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
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: auto;
      height: 100%;
      width: 100%;
    }

    .image-batch-container {
      display: flex;
      align-items: center;
      height: 100%;
      overflow: hidden;
      white-space: nowrap;
    }

    .image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      height: 100%;
      width: auto;
    }

    .image-container a {
      display: flex;
      height: 100%;
    }

    .image-container img {
      height: 100%;
      width: auto;
      object-fit: contain;
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
	}

	.tb-image-feed-btn-group--top {
		top: calc(var(--tb-feed-height) + 20px); /* 10px below the tray when it's at the top */
		right: 10px;
	}

	.tb-image-feed-btn-group--bottom {
		top: calc(100vh - var(--tb-feed-height) - 40px); /* Adjusted for tray at the bottom */
		right: 10px;
	}

	.tb-image-feed-btn {
		padding: 8px 16px; /* Increase padding for better spacing */
		font-size: 15px; /* Adjust font size for readability */
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		height: auto;
		width: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #ffffff; /* White background */
		color: #333; /* Darker text color */
		border: none; /* Remove borders for a cleaner look */
		border-radius: 8px; /* Rounded corners */
		box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.15); /* Subtle shadow for depth */
		cursor: pointer;
		transition: all 0.3s ease; /* Smooth transition for hover effects */
	}

	.tb-image-feed-btn:hover {
		background-color: #f0f0f0; /* Light grey background on hover */
		transform: translateY(-2px); /* Slight lift on hover */
		box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2); /* Slightly stronger shadow */
	}

	.tb-image-feed-btn:active {
		transform: translateY(0); /* No lift when active */
		box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.15); /* Reset shadow when pressed */
	}

	.tb-image-feed-btn:focus {
		outline: none; /* Remove default outline */
		box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.5); /* Add focus ring */
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
    }`,
  parent: document.body,
});

app.registerExtension({
  name: "simpleTray.imageFeed",
  async setup() {
    let visible = true;
    const prefix = "simpleTray.imageFeed.";

    // Helper functions for localStorage
    const getVal = (n, d) => {
      const v = localStorage.getItem(prefix + n);
      return v === null ? d : v.replace(/^"|"$/g, "");
    };

    const saveVal = (n, v) => {
      const valueToSave = typeof v === "boolean" ? v.toString() : v;
      localStorage.setItem(prefix + n, valueToSave);
    };

    const getJSONVal = (key, defaultValue) => {
      try {
        const value = localStorage.getItem(prefix + key);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.error(`Error retrieving ${key} from localStorage`, error);
        return defaultValue;
      }
    };

    const saveJSONVal = (n, v) => {
      try {
        localStorage.setItem(prefix + n, JSON.stringify(v));
      } catch (error) {
        console.error("Error saving to localStorage", error);
      }
    };

    visible = getJSONVal("Visible", true);

    // Create main elements
    const imageFeed = $el("div", {
      className: "tb-image-feed",
      parent: document.body,
    });
    const imageList = $el("div", { className: "tb-image-feed-list" });
    const buttonPanel = $el("div", { className: "tb-image-feed-btn-group" });

    const eligibleNodes = [
      "SaveImage",
      "PreviewImage",
      "KSampler",
      "KSampler (Efficient)",
      "KSampler Adv. (Efficient)",
      "KSampler SDXL (Eff.)",
    ];

    let sortOrder = getJSONVal("SortOrder", "ID");
    let selectedNodeIds = getJSONVal("NodeFilter", []);
    let imageNodes;

    let currentBatchIdentifier;
    let currentBatchContainer;

    let domReadyListener;
    let executionStartListener;
    let executedListener;

    // Create buttons
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
        console.error(
          "Image feed element not found",
          new Error("Element not found")
        );
        return;
      }

      imageFeed.classList.remove("tb-image-feed--top", "tb-image-feed--bottom");
      buttonPanel.classList.remove(
        "tb-image-feed-btn-group--top",
        "tb-image-feed-btn-group--bottom"
      );

      if (feedLocation === "top") {
        imageFeed.classList.add("tb-image-feed--top");
        buttonPanel.classList.add("tb-image-feed-btn-group--top");
        console.log("Moved image feed to top"); // Add this log
      } else {
        imageFeed.classList.add("tb-image-feed--bottom");
        buttonPanel.classList.add("tb-image-feed-btn-group--bottom");
        console.log("Moved image feed to bottom"); // Add this log
      }

      // Call adjustImageTray to set correct positioning and height
      //adjustImageTray(); -- Not needed because we call it earlier.
    }

    // Helper function to create DOM elements
    function createElement(type, options = {}) {
      const element = document.createElement(type);
      for (const [key, value] of Object.entries(options)) {
        if (key === "style") {
          Object.assign(element.style, value);
        } else if (key === "classList") {
          value.forEach((className) => element.classList.add(className));
        } else {
          element[key] = value;
        }
      }
      return element;
    }

    // Function to update image nodes
    function updateImageNodes() {
      const nodes = Object.values(app.graph._nodes);
      imageNodes = nodes.filter((node) => eligibleNodes.includes(node.type));
    }

    // Function to update selected node IDs
    function updateSelectedNodeIds(nodeId, isChecked) {
      if (isChecked) {
        if (!selectedNodeIds.includes(nodeId)) {
          selectedNodeIds.push(nodeId);
        }
      } else {
        selectedNodeIds = selectedNodeIds.filter((id) => id !== nodeId);
      }

      saveJSONVal("NodeFilter", selectedNodeIds);
    }

    // Function to load modal
    async function loadModal() {
      try {
        const overlay = await loadOverlay();
        let modal = document.getElementById("nodeSelectorPlaceholder");

        if (!modal) {
          modal = document.createElement("div");
          modal.id = "nodeSelectorPlaceholder";
          modal.className = "nodeSelectorPlaceholder";
          overlay.appendChild(modal);
        }

        return modal;
      } catch (error) {
        console.error("Error loading modal:", error);
      }
    }

    // Function to load overlay
    function loadOverlay() {
      return new Promise((resolve, reject) => {
        let overlay = document.getElementById("modalOverlay");

        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "modalOverlay";
          overlay.className = "modalOverlay";
          document.body.appendChild(overlay);

          overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
              setNodeSelectorVisibility(false);
            }
          });
        }

        resolve(overlay);
      });
    }

    // Function to toggle filter
    async function toggleFilter(filterToggleButton, sortToggleButton) {
      const filterEnabled = getJSONVal("FilterEnabled", false);
      const newFilterState = !filterEnabled;

      saveJSONVal("FilterEnabled", newFilterState);

      filterToggleButton.textContent = newFilterState
        ? "Disable Filter"
        : "Enable Filter";
      sortToggleButton.disabled = !newFilterState;

      await redrawImageNodeList();
    }

    // Function to toggle sort order
    async function toggleSortOrder(sortToggleButton) {
      const currentSortOrder = getJSONVal("SortOrder", "ID");
      const newSortOrder = currentSortOrder === "ID" ? "Name" : "ID";

      saveJSONVal("SortOrder", newSortOrder);

      sortToggleButton.textContent =
        newSortOrder === "ID" ? "Sort by Name" : "Sort by ID";

      await redrawImageNodeList();
    }

    // Function to sort image nodes
    function sortImageNodes() {
      const sortOrder = getJSONVal("SortOrder", "ID");
      imageNodes.sort((a, b) => {
        if (sortOrder === "Name") {
          return a.title.localeCompare(b.title) || a.id - b.id;
        }
        return a.id - b.id;
      });
    }

    // Function to redraw image node list
    async function redrawImageNodeList() {
      const listContainer = await loadModal();

      let nodeList = listContainer.querySelector(".node-list");
      if (!nodeList) {
        nodeList = document.createElement("ul");
        nodeList.className = "node-list";
        listContainer.appendChild(nodeList);
      }

      const fragment = document.createDocumentFragment();
      const filterEnabled = getJSONVal("FilterEnabled", false);

      updateImageNodes();
      sortImageNodes();

      imageNodes.forEach((node, index) => {
        const listItem = createElement("li", {
          className: `node-list-item ${index % 2 === 0 ? "even" : "odd"}`,
        });

        const checkbox = createElement("input", {
          type: "checkbox",
          id: `node-${node.id}`,
          checked: selectedNodeIds.includes(node.id),
        });

        checkbox.addEventListener("change", () => {
          updateSelectedNodeIds(node.id, checkbox.checked);
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
        customNodeItem = document.createElement("li");
        customNodeItem.classList.add("custom-node-item");

        const customCheckbox = document.createElement("input");
        customCheckbox.type = "checkbox";
        customCheckbox.id = "custom-node-checkbox";
        customCheckbox.checked = selectedNodeIds.includes(-1);

        customCheckbox.addEventListener("change", function () {
          updateSelectedNodeIds(-1, this.checked);
        });

        const customLabel = document.createElement("label");
        customLabel.setAttribute("for", customCheckbox.id);
        customLabel.textContent = "Custom Nodes Not Shown";
        customLabel.classList.add("custom-label");

        customNodeItem.appendChild(customCheckbox);
        customNodeItem.appendChild(customLabel);

        nodeList.appendChild(customNodeItem);
      } else {
        const customCheckbox = customNodeItem.querySelector(
          'input[type="checkbox"]'
        );
        if (customCheckbox) {
          customCheckbox.checked = selectedNodeIds.includes(-1);
          customCheckbox.disabled = !filterEnabled;
        }
      }
    }

    // Function to create image node list
    async function createImageNodeList() {
      const nodeListElement = await loadModal();

      if (!nodeListElement) {
        console.error("Modal element not found");
        return;
      }

      const buttonWidth = "100px";
      const header = document.createElement("h2");
      header.textContent = "Detected Image Nodes";
      header.style.textAlign = "center";
      header.style.color = "#FFF";
      header.style.margin = "0 0 20px";
      header.style.fontSize = "24px";

      nodeListElement.innerHTML = "";
      nodeListElement.appendChild(header);

      const line1Container = document.createElement("div");
      line1Container.style.display = "flex";
      line1Container.style.justifyContent = "space-between";
      line1Container.style.width = "100%";
      line1Container.style.marginBottom = "5px";

      const filterEnabled = getJSONVal("FilterEnabled", false);

      const filterToggleButton = document.createElement("button");
      filterToggleButton.textContent = filterEnabled
        ? "Disable Filter"
        : "Enable Filter";
      filterToggleButton.style.width = buttonWidth;

      filterToggleButton.addEventListener("click", async function () {
        await toggleFilter(filterToggleButton, sortToggleButton);
      });

      const sortToggleButton = document.createElement("button");
      sortToggleButton.style.width = buttonWidth;
      sortToggleButton.disabled = !filterEnabled;
      sortToggleButton.textContent =
        getJSONVal("SortOrder", "ID") === "ID" ? "Sort by Name" : "Sort by ID";

      sortToggleButton.addEventListener("click", async function () {
        await toggleSortOrder(sortToggleButton);
      });

      line1Container.appendChild(filterToggleButton);
      line1Container.appendChild(sortToggleButton);
      nodeListElement.appendChild(line1Container);

      await redrawImageNodeList();
    }

    // Function to set node selector visibility
    function setNodeSelectorVisibility(isVisible) {
      const overlay = document.getElementById("modalOverlay");
      const modal = document.getElementById("nodeSelectorPlaceholder");

      if (!overlay || !modal) {
        console.error("Overlay or modal not found");
        return;
      }

      overlay.style.display = isVisible ? "flex" : "none";
      modal.style.display = isVisible ? "block" : "none";
    }

    // Function to handle DOM ready event
    function onDomReady() {
      // Add settings
      app.ui.settings.addSetting({
        id: "simpleTray.imageFeed.feedHeight",
        name: "📥 Image Tray Height",
        defaultValue: 200, // Default to 200px
        type: "combo", // Changing this to a combo dropdown
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
          imageFeed.style.setProperty("--tb-feed-height", newHeight);
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
        onChange: (newLocation) => {
          updateControlPositions(newLocation);
          window.dispatchEvent(new Event("resize"));
        },
        tooltip: "Choose the location of the image feed.",
      });

      app.ui.settings.addSetting({
        id: "simpleTray.imageFeed.MaxFeedLength",
        name: "📥 Max Batches In Feed",
        defaultValue: 25,
        type: "number",
        onChange: (newValue) => {
          // Handled during execution
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
        defaultValue: getJSONVal("Location", "bottom"),
        type: "combo",
        options: [
          { text: "top", value: "top" },
          { text: "bottom", value: "bottom" },
        ],
        onChange: (newLocation) => {
          updateControlPositions(newLocation);
          saveJSONVal("Location", newLocation);
          adjustImageTray();
        },
        tooltip: "Choose the location of the image feed.",
      });

      app.ui.settings.addSetting({
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

      const initialFeedLocation = getJSONVal("Location", "bottom");
      console.log("Initial feed location:", initialFeedLocation);

      updateControlPositions(initialFeedLocation);

      // Log the position immediately after updating
      console.log(
        "Position after updateControlPositions:",
        imageFeed.classList.contains("tb-image-feed--top") ? "top" : "bottom"
      );

      // Add a small delay and check again
      setTimeout(() => {
        console.log(
          "Position after delay:",
          imageFeed.classList.contains("tb-image-feed--top") ? "top" : "bottom"
        );
      }, 100);

      // Call adjustImageTray directly after DOM is ready
      adjustImageTray();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onDomReady);
    } else {
      onDomReady();
    }

    // Function to change feed visibility
    function changeFeedVisibilility(vis) {
      imageFeed.style.display = vis ? "flex" : "none";
      if (vis) adjustImageTray();
      window.dispatchEvent(new Event("resize"));
    }

    async function adjustImageTray() {
      try {
        const imageFeed = document.querySelector(".tb-image-feed");
        const buttonPanel = imageFeed.querySelector(".tb-image-feed-btn-group");
        if (!imageFeed || !buttonPanel) {
          console.log(
            "Image feed or button panel not found, skipping adjustment"
          );
          return;
        }

        const sideToolBar = document.querySelector(
          ".comfyui-body-left .side-tool-bar-container"
        );
        const comfyuiMenu = document.querySelector("nav.comfyui-menu");

        const toolbarWidth = sideToolBar?.offsetWidth || 0;
        imageFeed.style.setProperty("--tb-left-offset", `${toolbarWidth}px`);
        imageFeed.style.width = `calc(100% - ${toolbarWidth}px)`;

        const feedHeight =
          parseInt(
            getComputedStyle(imageFeed).getPropertyValue("--tb-feed-height")
          ) || 300;
        imageFeed.style.height = `${feedHeight}px`;

        const feedLocation = getJSONVal("Location", "bottom");
        const isFeedAtTop = feedLocation === "top";

        // Check for comfy UI menu and adjust the top or bottom accordingly
        if (comfyuiMenu) {
          const menuHeight = comfyuiMenu.offsetHeight;
          const menuRect = comfyuiMenu.getBoundingClientRect();
          const isMenuAtTop = menuRect.top <= 1;
          const isMenuAtBottom =
            Math.abs(window.innerHeight - menuRect.bottom) <= 1;

          if (isFeedAtTop) {
            imageFeed.style.top = isMenuAtTop ? `${menuHeight}px` : "0";
            imageFeed.style.bottom = "auto"; // Ensure the bottom is reset
          } else {
            imageFeed.style.bottom = isMenuAtBottom ? `${menuHeight}px` : "0";
            imageFeed.style.top = "auto"; // Ensure the top is reset
          }
        } else {
          imageFeed.style.top = isFeedAtTop ? "0" : "auto";
          imageFeed.style.bottom = isFeedAtTop ? "auto" : "0";
        }

        // Adjust for side toolbar if it exists
        if (sideToolBar && isFeedAtTop) {
          const sideToolBarRect = sideToolBar.getBoundingClientRect();
          if (sideToolBarRect.top <= 1) {
            const maxTop = Math.max(
              parseInt(imageFeed.style.top) || 0,
              sideToolBarRect.height
            );
            imageFeed.style.top = `${maxTop}px`;
          }
        }

        // Adjust button panel position
        if (isFeedAtTop) {
          const imageFeedTop = parseInt(imageFeed.style.top) || 0;
          buttonPanel.style.top = `${imageFeedTop + 10}px`; // 10px below the top-right corner of the image feed when at the top
          buttonPanel.style.bottom = "auto"; // Ensure bottom is cleared
        } else {
          const imageFeedHeight =
            parseInt(
              getComputedStyle(imageFeed).getPropertyValue("--tb-feed-height")
            ) || 300;
          const imageFeedTop = window.innerHeight - imageFeedHeight; // Calculate top position of the tray when it's at the bottom

          buttonPanel.style.top = `${imageFeedTop + 10}px`; // Same 10px from the top-right corner of the tray when it's at the bottom
          buttonPanel.style.bottom = "auto"; // Ensure bottom is cleared
        }
      } catch (error) {
        console.error("Error adjusting image tray:", error);
      }
    }

    // Function to wait for side toolbar
    function waitForSideToolbar() {
      const MAX_OBSERVATION_TIME = 10000; // 10 seconds
      let timeoutId;
      const observer = new MutationObserver((mutationsList, observer) => {
        const sideToolBar = document.querySelector(
          ".comfyui-body-left .side-tool-bar-container"
        );
        if (sideToolBar) {
          adjustImageTray();
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

    waitForSideToolbar();

    // Function to setup event listeners
    function setupEventListeners() {
      domReadyListener = onDomReady;
      executionStartListener = ({ detail }) => {
        const filterEnabled = getJSONVal("FilterEnabled", false);
        if (
          filterEnabled &&
          (!selectedNodeIds || selectedNodeIds.length === 0)
        ) {
          saveJSONVal("FilterEnabled", false);
          return;
        }
      };
    }

    // Function to cleanup event listeners
    function cleanupEventListeners() {
      if (domReadyListener) {
        document.removeEventListener("DOMContentLoaded", domReadyListener);
      }

      if (executionStartListener) {
        api.removeEventListener("execution_start", executionStartListener);
      }

      if (executedListener) {
        api.removeEventListener("executed", executedListener);
      }
    }

    // Function to handle executed event
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
        console.error(
          "Image feed or imageList container not found!",
          new Error("Elements not found")
        );
        return;
      } else {
        if (!currentBatchContainer) {
          currentBatchContainer = document.createElement("div");
          currentBatchContainer.className = "image-batch-container";
        }

        if (newestToOldest) {
          imageList.prepend(currentBatchContainer);
        } else {
          imageList.appendChild(currentBatchContainer);
        }
      }

      if (newBatchIdentifier !== currentBatchIdentifier) {
        if (currentBatchIdentifier) {
          const yellowBar = document.createElement("div");
          yellowBar.className = "image-feed-vertical-bar";
          if (newestToOldest) {
            imageList.prepend(yellowBar);
          } else {
            imageList.appendChild(yellowBar);
          }
        }
        currentBatchContainer = document.createElement("div");
        currentBatchContainer.className = "image-batch-container";

        if (newestToOldest) {
          imageList.prepend(currentBatchContainer);
        } else {
          imageList.appendChild(currentBatchContainer);
        }
        currentBatchIdentifier = newBatchIdentifier;
      }

      detail.output.images.forEach((src) => {
        const node = app.graph.getNodeById(parseInt(detail.node, 10));
        if (
          !filterEnabled ||
          (node?.type &&
            eligibleNodes.includes(node.type) &&
            selectedNodeIds.includes(parseInt(detail.node, 10))) ||
          (!eligibleNodes.includes(node.type) && selectedNodeIds.includes(-1))
        ) {
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
    document.addEventListener("DOMContentLoaded", domReadyListener);
    api.addEventListener("execution_start", executionStartListener);
    api.addEventListener("executed", executedListener);

    // Function to get all images
    function getAllImages() {
      const images = document.querySelectorAll(".tb-image-feed img");
      const imageSources = Array.from(images).map(
        (img) => new URL(img.src, window.location.origin).href
      );
      return imageSources;
    }

    // Function to load image
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    // Function to log error
    function logError(message, error) {
      console.error(`${message}:`, error);
    }

    // Function to debounce

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

    // Function to add image to batch

    async function addImageToBatch(src, batchContainer) {
      try {
        const baseUrl = `./view?filename=${encodeURIComponent(
          src.filename
        )}&type=${src.type}&subfolder=${encodeURIComponent(src.subfolder)}`;

        const timestampedUrl = `${baseUrl}&t=${+new Date()}`;

        const newestToOldest = getVal("NewestFirst", "newest") === "newest";

        const img = await loadImage(timestampedUrl);

        const imageElement = document.createElement("div");

        imageElement.className = "image-container";

        const anchor = document.createElement("a");

        anchor.setAttribute("target", "_blank");

        anchor.setAttribute("href", timestampedUrl);

        anchor.onclick = (e) => {
          e.preventDefault();

          const absoluteUrl = new URL(timestampedUrl, window.location.origin)
            .href;

          const imgs = getAllImages();

          const normalizedUrls = imgs.map((url) => url.split("&t=")[0]);

          const baseUrlAbsolute = new URL(baseUrl, window.location.origin).href;

          const imageIndex = normalizedUrls.indexOf(baseUrlAbsolute);

          if (imageIndex > -1) {
            lightbox.show(imgs, imageIndex);
          } else {
            logError(
              "Clicked image not found in the list:",
              new Error("Image not found")
            );
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

        const placeholderImg = createElement("img", {
          src: "path/to/placeholder.png",

          alt: "Image failed to load",
        });

        batchContainer.appendChild(placeholderImg);
      }
    }

    // Function to check and remove extra image batches

    function checkAndRemoveExtraImageBatches() {
      const maxImageBatches = getVal("MaxFeedLength", 25);

      const batches = Array.from(
        imageList.querySelectorAll(".image-batch-container")
      );

      if (batches.length <= maxImageBatches) return;

      const batchesToRemove = batches.slice(maxImageBatches);

      batchesToRemove.forEach((batch) => {
        const yellowBar = batch.previousElementSibling;

        if (yellowBar && yellowBar.className === "image-feed-vertical-bar") {
          yellowBar.remove();
        }

        batch.remove();
      });
    }
  },
});
