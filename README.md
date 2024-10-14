# ComfyUI SimpleFeed 
A simple, configurable, and extensible image feed module for ComfyUI. Originally proposed as a pull request to [ComfyUI Custom Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts), it was set aside due to the scale of the changes. This module only offers Image Tray functionality; if you prefer an alternative image tray, this one can be safely uninstalled without impacting your workflows.

## Configuration Options

### Settings
- **Visibility and Position:** Control the image feed's visibility and location.
- **Image Count Limit:** Limit the number of images displayed. If this is more than will fit on the screen, the image tray will scroll.
- **Sort Order:** Sort images by generation time, from oldest to newest or vice versa.

### Menu Options
- **Node Filter Button:** Filter which nodes contribute images to the feed, managing duplicates. When the filter is disabled, all image sources are included.
- **Clear Button:** This clears all images from the image tray. It does not remove them from your output folder.

### Lightbox Guide
- **Dynamic Updating:** Adds new images to the image feed as they're generated, dynamically updating the lightbox and its controls.
- **Navigation Arrows:** Color-coded arrows for functionality:
  - **Black:** Inactive when only a single image is present.
  - **Grey:** Navigate between images.
  - **Orange:** Indicates the end of the feed; wraps to the start.
- **Zoom and Pan:** Use the middle mouse wheel to zoom in and out. Hold Shift while scrolling to adjust zoom speed.
  - **Panning:** Enabled once an image exceeds the lightbox size. Click and drag to pan the image, with Shift + Click for faster panning.

## Installation

### Using ComfyUI Manager
1. Follow the [ComfyUI Manager Instructions](https://github.com/ltdrdata/ComfyUI-Manager).
2. Search for 'ComfyUI Simple Feed' in the Custom Node Manager.
3. Install and restart ComfyUI.

### Manual Installation (Not Recommended)
1. Clone or download the repository into the `custom_nodes` folder.
2. Check that ComfyUI’s security settings allow manual installations.
3. Restart ComfyUI after installation.

## Uninstallation

### Using ComfyUI Manager
1. Locate 'ComfyUI Simple Feed' in the Custom Node Manager.
2. Uninstall and restart ComfyUI.

### Manual Uninstallation
1. Delete the `comfyui-simplefeed` directory from your ComfyUI 'custom_nodes' folder.
2. Restart ComfyUI.

## Examples
![Sample Image 1](https://github.com/user-attachments/assets/0b5a60db-d324-4250-ae33-007d09db2555)
![Sample Image 2](https://github.com/user-attachments/assets/90944413-e9df-4dbe-a360-eb4bc4c7fd73)
![Sample Image 3](https://github.com/user-attachments/assets/3ee423fd-6992-45ea-a93e-96cf6bad0c34)

## Version History

- **1.0.0 (15 May 2024):** Initial release.
- **1.0.1 (8 Sep 2024):** Added to ComfyUI Manager Registry.
- **1.1.0 (11 Sept 2024):** Substantial updates to fix bugs, implement user requests and integrate with the new ComfyUI.
- **1.2.0 (15 October 2024):** Introduced zoom and pan functionality, improved support for non-standard resolutions, and general code refactoring.

## Quality Gate Status
[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=tachyon-beep_comfyui-simplefeed)](https://sonarcloud.io/summary/new_code?id=tachyon-beep_comfyui-simplefeed)
