# ComfyUI SimpleFeed

A simple, configurable, and extensible image feed module for ComfyUI. Originally proposed as a pull request to [ComfyUI Custom Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts), it was set aside due to the scale of the changes. This module can operate alongside the original, offering no additional functionality; uninstall it if you prefer the original.

## Configuration Options

### Settings
- **Visibility and Position:** Control the image feed's visibility and location.
- **Image Count Limit:** Limit the number of images displayed.
- **Sort Order:** Sort images by generation time, from oldest to newest or vice versa.

### Menu Options
- **Node Filter Button:** Filter which nodes contribute images to the feed, managing duplicates. All images are included when the filter is off.
- **Clear Button:** Remove all images from the tray without deleting them from your filesystem.

### Lightbox Guide
- **Dynamic Updating:** Integrates new images as they're generated.
- **Navigation Arrows:** Color-coded for functionality:
  - **Black:** Inactive when only a single image is present.
  - **Grey:** Navigate between images.
  - **Orange:** Indicates the end of the feed; wraps to the start.

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

## Version History
- **1.0.0 (15 May 2024):** Initial release.
- **1.0.1 (8 Sep 2024):** Added to ComfyUI Manager Registry.
- **1.1.0 (11 Sept 2024):** Substantial updates to fix bugs, implement user requests and integrate with the new ComfyUI.

## Examples

![Sample Image 1](https://github.com/user-attachments/assets/0b5a60db-d324-4250-ae33-007d09db2555)
![Sample Image 2](https://github.com/user-attachments/assets/9ce4e33f-1b24-48a2-97c2-9903e764ee80)
![Sample Image 3](https://github.com/user-attachments/assets/3ee423fd-6992-45ea-a93e-96cf6bad0c34)
