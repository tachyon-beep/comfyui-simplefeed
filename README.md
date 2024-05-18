# comfyui-simplefeed
A simple image feed for comfyUI which is easily configurable and easily extensible. I originally wrote this as a pull to [custom-scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts ) but it was [quite reasonably] pushed back due to the scale/complexityo of changes. They will run together, just hide one image feed or the other. (Although if you're disabling this feed, you might reconsider your need for this in your install at all as it offers no other functions.)

Use the filter button to select which nodes write to the feed. 
Under settings, there are options that allow you:
 * Position the feed.
 * Set a max iamge count for the feed.
 * Set oldest to newest or newest to oldest.

Bug reports and feature suggestions welcome, but I would like to keep this lightweight.

Examples:
![demo1](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/406832d5-ef51-4a4a-8467-fca93623dbbe)
![demo2](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/de0a797b-2072-40ac-9fce-378fb4286ae1)
![demo3](https://github.com/tachyon-beep/comfyui-simplefeed/assets/544926/def2656f-e37b-41b7-857a-aebfef037a8d)

INSTALL:
1a. Git pull the contents of the repo into a subfolder in the custom_nodes folder or install.
OR
1b. Create a subfolder and extract the contents of the repository into it.
OR
1.c Use the install vai Git URL button created by ComfyUI Manager.

2. Restart your install.

UNINSTALL:
1. Delete the custom_nodes/comfyui-simplefeed folder from your comfyui install.
