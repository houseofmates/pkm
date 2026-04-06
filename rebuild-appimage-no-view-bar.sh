#!/bin/bash
set -e

# script to rebuild the pkm appimage with the view menu bar removed.# usage: ./rebuild-appimage-no-view-bar.sh <path-to-original-appimage># the original appimage is used only for naming/versioning reference.# the new appimage will be placed in the releases directory as pkm-no-view-bar.appimage
if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-original-AppImage>"
  exit 1
fi

ORIGINAL_APPIMAGE="$1"
if [ ! -f "$ORIGINAL_APPIMAGE" ]; then
  echo "Error: File not found: $ORIGINAL_APPIMAGE"
  exit 1
fi

echo "Original AppImage: $ORIGINAL_APPIMAGE"

# we are assuming we are in the pkm source directory.# check that we are in the right place by looking for package.jsonif [ ! -f "package.json" ]; then
  echo "Error: Please run this script from the root of the pkm repository."
  echo "Current directory: $(pwd)"
  exit 1
fi

# back up the original appimage (optional, but good practice)BACKUP_DIR="${HOME}/pkm-appimage-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$ORIGINAL_APPIMAGE" "$BACKUP_DIR/"
echo "Backed up original AppImage to: $BACKUP_DIR"

# back up the source file we are going to modifySOURCE_FILE="apps/desktop-electron/electron/main.js"
if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Source file not found: $SOURCE_FILE"
  exit 1
fi
cp "$SOURCE_FILE" "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "Backed up source file to: ${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# modify the source file to remove the menu bar# we replace the menu building code with menu.setapplicationmenu(null)# we'll look for the lines that create the menu and replace them.# we know from inspection that the menu is created in the createwindow function.# we'll replace from the line containing "const template = [" up to the line containing "menu.setapplicationmenu(menu);"# but to be safe, we'll just replace the menu.setapplicationmenu(menu) line with menu.setapplicationmenu(null)# and also we can remove the template construction if we want, but leaving it is harmless.
# let's first check the exact lines around the menu.echo "Modifying $SOURCE_FILE to remove the menu bar..."

# we'll use sed to replace the menu.setapplicationmenu call.# we want to replace the argument with null.# we'll look for the pattern: menu.setapplicationmenu(menu);# and change it to: menu.setapplicationmenu(null);sed -i 's/Menu\.setApplicationMenu\s*(.*);/Menu.setApplicationMenu(null);/' "$SOURCE_FILE"

# verify the changeif grep -q "Menu\.setApplicationMenu\s*(null)" "$SOURCE_FILE"; then
  echo "Successfully modified $SOURCE_FILE to set menu to null."
else
  echo "Error: Failed to modify $SOURCE_FILE."
  # restore backup  mv "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)" "$SOURCE_FILE"
  exit 1
fi

# now rebuild the appimageecho "Rebuilding the AppImage..."
# we'll use the existing build script for the electron appnpm run build --workspace=apps/desktop-electron

# the build output should be in apps/desktop-electron/release/NEW_APPIMAGE=$(ls -t apps/desktop-electron/release/*.AppImage | head -1)
if [ -z "$NEW_APPIMAGE" ]; then
  echo "Error: No AppImage found in apps/desktop-electron/release/ after build."
  # restore source file  mv "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)" "$SOURCE_FILE"
  exit 1
fi

echo "New AppImage built: $NEW_APPIMAGE"

# we want to put the new appimage in the releases directory with a clear name# the original appimage name is something like pkm-0.0.0.appimage# we'll create a name like pkm-no-view-bar.appimageOUTPUT_DIR="/home/house/pkm/releases"
mkdir -p "$OUTPUT_DIR"
OUTPUT_APPIMAGE="${OUTPUT_DIR}/pkm-no-view-bar.AppImage"

# remove any existing outputif [ -f "$OUTPUT_APPIMAGE" ]; then
  rm "$OUTPUT_APPIMAGE"
fi

cp "$NEW_APPIMAGE" "$OUTPUT_APPIMAGE"
echo "Copied new AppImage to: $OUTPUT_APPIMAGE"

# optionally, we can restore the source file to its original state (if we want to keep the source clean)# but the user might want to keep the change. we'll leave it modified and inform the user.echo "Note: The source file $SOURCE_FILE has been modified to remove the menu bar."
echo "If you want to revert this change, restore from the backup we made."
echo "Backup of source file: ${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# create a changelogCHANGELOG="${OUTPUT_APPIMAGE}.changelog"
echo "AppImage modification changelog" > "$CHANGELOG"
echo "===============================" >> "$CHANGELOG"
echo "Date: $(date)" >> "$CHANGELOG"
echo "Original AppImage: $ORIGINAL_APPIMAGE" >> "$CHANGELOG"
echo "Modified AppImage: $OUTPUT_APPIMAGE" >> "$CHANGELOG"
echo "Modification: Removed the application menu bar (which contained the 'View' button) by setting the Electron application menu to null in apps/desktop-electron/electron/main.js." >> "$CHANGELOG"
echo "Framework: Electron" >> "$CHANGELOG"
echo "Build command: npm run build --workspace=apps/desktop-electron" >> "$CHANGELOG"
echo "Notes: This removes the entire menu bar. If you want to keep other menu items, you would need to edit the menu template instead." >> "$CHANGELOG"

echo "Changelog saved to: $CHANGELOG"

echo "Done."