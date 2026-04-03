#!/bin/bash
set -e

# Script to rebuild the PKM AppImage with the View menu bar removed.
# Usage: ./rebuild-appimage-no-view-bar.sh <path-to-original-AppImage>
# The original AppImage is used only for naming/versioning reference.
# The new AppImage will be placed in the releases directory as pkm-no-view-bar.AppImage

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

# We are assuming we are in the pkm source directory.
# Check that we are in the right place by looking for package.json
if [ ! -f "package.json" ]; then
  echo "Error: Please run this script from the root of the pkm repository."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Back up the original AppImage (optional, but good practice)
BACKUP_DIR="${HOME}/pkm-appimage-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$ORIGINAL_APPIMAGE" "$BACKUP_DIR/"
echo "Backed up original AppImage to: $BACKUP_DIR"

# Back up the source file we are going to modify
SOURCE_FILE="apps/desktop-electron/electron/main.js"
if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Source file not found: $SOURCE_FILE"
  exit 1
fi
cp "$SOURCE_FILE" "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "Backed up source file to: ${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# Modify the source file to remove the menu bar
# We replace the menu building code with Menu.setApplicationMenu(null)
# We'll look for the lines that create the menu and replace them.
# We know from inspection that the menu is created in the createWindow function.
# We'll replace from the line containing "const template = [" up to the line containing "Menu.setApplicationMenu(menu);"
# But to be safe, we'll just replace the Menu.setApplicationMenu(menu) line with Menu.setApplicationMenu(null)
# and also we can remove the template construction if we want, but leaving it is harmless.

# Let's first check the exact lines around the menu.
echo "Modifying $SOURCE_FILE to remove the menu bar..."

# We'll use sed to replace the Menu.setApplicationMenu call.
# We want to replace the argument with null.
# We'll look for the pattern: Menu.setApplicationMenu(menu);
# and change it to: Menu.setApplicationMenu(null);
sed -i 's/Menu\.setApplicationMenu\s*(.*);/Menu.setApplicationMenu(null);/' "$SOURCE_FILE"

# Verify the change
if grep -q "Menu\.setApplicationMenu\s*(null)" "$SOURCE_FILE"; then
  echo "Successfully modified $SOURCE_FILE to set menu to null."
else
  echo "Error: Failed to modify $SOURCE_FILE."
  # Restore backup
  mv "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)" "$SOURCE_FILE"
  exit 1
fi

# Now rebuild the AppImage
echo "Rebuilding the AppImage..."
# We'll use the existing build script for the electron app
npm run build --workspace=apps/desktop-electron

# The build output should be in apps/desktop-electron/release/
NEW_APPIMAGE=$(ls -t apps/desktop-electron/release/*.AppImage | head -1)
if [ -z "$NEW_APPIMAGE" ]; then
  echo "Error: No AppImage found in apps/desktop-electron/release/ after build."
  # Restore source file
  mv "${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)" "$SOURCE_FILE"
  exit 1
fi

echo "New AppImage built: $NEW_APPIMAGE"

# We want to put the new AppImage in the releases directory with a clear name
# The original AppImage name is something like pkm-0.0.0.AppImage
# We'll create a name like pkm-no-view-bar.AppImage
OUTPUT_DIR="/home/house/pkm/releases"
mkdir -p "$OUTPUT_DIR"
OUTPUT_APPIMAGE="${OUTPUT_DIR}/pkm-no-view-bar.AppImage"

# Remove any existing output
if [ -f "$OUTPUT_APPIMAGE" ]; then
  rm "$OUTPUT_APPIMAGE"
fi

cp "$NEW_APPIMAGE" "$OUTPUT_APPIMAGE"
echo "Copied new AppImage to: $OUTPUT_APPIMAGE"

# Optionally, we can restore the source file to its original state (if we want to keep the source clean)
# But the user might want to keep the change. We'll leave it modified and inform the user.
echo "Note: The source file $SOURCE_FILE has been modified to remove the menu bar."
echo "If you want to revert this change, restore from the backup we made."
echo "Backup of source file: ${SOURCE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# Create a changelog
CHANGELOG="${OUTPUT_APPIMAGE}.changelog"
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