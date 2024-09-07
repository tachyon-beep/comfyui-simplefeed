# comfyui-simplefeed
A simple image feed for ComfyUI which is easily configurable and easily extensible. 

I originally wrote this as a pull request to [custom-scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) but it was [quite reasonably] pushed back due to the scale and complexity of the changes. Both image feeds can run side by side, but you will probably want to hide one or the other (although this package provides no additional functionality—if you prefer the original, you might as well uninstall this).

You can use the filter button to select which nodes write images to the feed. This is helpful if multiple nodes (like kSampler previews) are providing copies of the same image.

Under settings, there are also options that allow you to:
 * Position the feed.
 * Set a maximum image count for the feed.
 * Sort the items in the feed from oldest to newest or newest to oldest.

Bug reports and feature suggestions are welcome, but I would like to keep this package lightweight.

Examples:
![demo1](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/406832d5-ef51-4a4a-8467-fca93623dbbe)
![demo2](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/de0a797b-2072-40ac-9fce-378fb4286ae1)
![demo3](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/def2656f-e37b-41b7-857a-aebfef037a8d)

INSTALL:
1. Do one of the following:
   - Use git to pull or clone the contents of this repo into the custom_nodes folder OR
   - Create a subfolder in your custom_nodes folder and extract the contents of the repository into it OR
   - Use the Install via Git URL button in ComfyUI Manager.

2. Restart ComfyUI.

3. If you are using the new UI, go to the settings and under simpleTray toggle the Display Image Tray button. I'll fix this in the near future.

UNINSTALL:
1. Delete the custom_nodes/comfyui-simplefeed folder from your ComfyUI install and restart ComfyUI.
