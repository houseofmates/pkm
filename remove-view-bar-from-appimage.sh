#!/bin/bash
set -e

# Script to remove a header bar with a "View" button from an AppImage and rebuild a new AppImage.
# Usage: ./remove-view-bar-from-appimage.sh <path-to-AppImage>
# The new AppImage will be named <original-name>-no-view-bar.AppImage in the same directory.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-AppImage>"
  exit 1
fi

ORIGINAL_APPIMAGE="$1"
if [ ! -f "$ORIGINAL_APPIMAGE" ]; then
  echo "Error: File not found: $ORIGINAL_APPIMAGE"
  exit 1
fi

# Extract the AppImage
APP_DIR="squashfs-root"
if [ -d "$APP_DIR" ]; then
  echo "Warning: $APP_DIR already exists, removing it"
  rm -rf "$APP_DIR"
fi

echo "Extracting $ORIGINAL_APPIMAGE..."
"$ORIGINAL_APPIMAGE" --appimage-extract
if [ ! -d "$APP_DIR" ]; then
  echo "Error: Failed to extract $ORIGINAL_APPIMAGE"
  exit 1
fi

cd "$APP_DIR"

# Detect the UI framework
echo "Detecting UI framework..."
FRAMEWORK="unknown"
# Check for Electron: look for the electron binary (often named after the app) or resources/app.asar
if [ -f "pkm-desktop-electron" ] || [ -f "electron" ] || [ -f "electron.exe" ]; then
  FRAMEWORK="electron"
  # Determine the electron binary name
  if [ -f "pkm-desktop-electron" ]; then
    ELECTRON_BINARY="./pkm-desktop-electron"
  elif [ -f "electron" ]; then
    ELECTRON_BINARY="./electron"
  else
    ELECTRON_BINARY="./electron.exe"
  fi
  # Determine the app resources directory
  if [ -d "resources" ]; then
    APP_DIR_RESOURCE="resources"
  elif [ -d "app" ]; then
    APP_DIR_RESOURCE="app"
  else
    APP_DIR_RESOURCE="."
  fi
elif [ -d "resources" ] && [ -f "resources/app/package.json" ]; then
  FRAMEWORK="electron"
  ELECTRON_BINARY="../electron" # relative to resources/app
  APP_DIR_RESOURCE="resources/app"
elif [ -d "app" ] && [ -f "app/package.json" ]; then
  FRAMEWORK="electron"
  ELECTRON_BINARY="../electron"
  APP_DIR_RESOURCE="app"
else
  # Check for package.json with electron dependency
  FOUND_PACKAGE_JSON=$(find . -name "package.json" -type f | head -1)
  if [ -n "$FOUND_PACKAGE_JSON" ]; then
    if grep -q "\"electron\"" "$FOUND_PACKAGE_JSON" || grep -q "electron" "$FOUND_PACKAGE_JSON"; then
      FRAMEWORK="electron"
      # Try to locate the electron binary relative to the package.json
      # We'll assume it's in the parent directory of the AppDir (but we are inside the AppDir)
      # For simplicity, we'll look for an electron binary in the current directory or parent.
      if [ -f "../electron" ]; then
        ELECTRON_BINARY="../electron"
      elif [ -f "./electron" ]; then
        ELECTRON_BINARY="./electron"
      else
        # Default to electron (will be resolved from PATH)
        ELECTRON_BINARY="electron"
      fi
      APP_DIR_RESOURCE=$(dirname "$FOUND_PACKAGE_JSON")
      # Adjust path to be relative to current directory
      APP_DIR_RESOURCE="./$(realpath --relative-to="$PWD" "$APP_DIR_RESOURCE")"
    fi
  fi
fi

if [ "$FRAMEWORK" = "unknown" ]; then
  echo "Warning: Could not detect Electron framework. Attempting to modify common UI resources."
  # We'll try to modify common UI files as a fallback
  # But for now, we'll exit and let the user know we only handle Electron in this script.
  echo "Error: This script currently only supports Electron AppImages."
  echo "Please modify the script to add support for your framework (Qt, GTK, WebUI)."
  exit 1
fi

echo "Detected framework: $FRAMEWORK"

# For Electron, we need to handle the application menu
if [ "$FRAMEWORK" = "electron" ]; then
  echo "Processing Electron AppImage..."
  
  # Determine the app directory
  if [ -z "$APP_DIR_RESOURCE" ]; then
    # If we found the electron binary directly, look for resources/app or app
    if [ -d "resources/app" ] && [ -f "resources/app/package.json" ]; then
      APP_DIR_RESOURCE="resources/app"
    elif [ -d "app" ] && [ -f "app/package.json" ]; then
      APP_DIR_RESOURCE="app"
    else
      # Fallback: look for any package.json
      APP_DIR_RESOURCE=$(find . -name "package.json" -type f | head -1 | xargs dirname)
      APP_DIR_RESOURCE="./$(realpath --relative-to="$PWD" "$APP_DIR_RESOURCE")"
    fi
  fi
  
  echo "App directory: $APP_DIR_RESOURCE"
  
  # Check if the app is packaged in an ASAR archive
  if [ -f "$APP_DIR_RESOURCE/app.asar" ]; then
    echo "Found ASAR archive: $APP_DIR_RESOURCE/app.asar"
    # Extract the ASAR archive
    ASAR_EXTRACT_DIR="$APP_DIR_RESOURCE/app.asar.unpacked"
    if [ -d "$ASAR_EXTRACT_DIR" ]; then
      # We'll try to use the existing unpacked directory if it seems valid
      if [ -f "$ASAR_EXTRACT_DIR/package.json" ] && ( [ -f "$ASAR_EXTRACT_DIR/main.js" ] || [ -f "$ASAR_EXTRACT_DIR/index.js" ] ); then
        echo "Using existing ASAR unpacked directory (seems valid)."
      else
        echo "Existing unpacked directory seems invalid. Removing and trying to extract again."
        rm -rf "$ASAR_EXTRACT_DIR"
      fi
    fi
    
    if [ ! -d "$ASAR_EXTRACT_DIR" ]; then
      echo "Extracting ASAR archive..."
      # Try to extract, but don't exit on failure; we'll check the result
      if npx asar extract "$APP_DIR_RESOURCE/app.asar" "$ASAR_EXTRACT_DIR" 2>/dev/null; then
        echo "ASAR extracted successfully."
      else
        echo "Warning: ASAR extraction had errors. Checking if unpacked directory is usable anyway."
        # If the extraction failed, we might still have a partially extracted directory that is usable.
        # We'll check for the presence of main.js or index.js.
        if [ ! -f "$ASAR_EXTRACT_DIR/main.js" ] && [ ! -f "$ASAR_EXTRACT_DIR/index.js" ]; then
          echo "Error: ASAR extraction failed and unpacked directory does not contain main.js or index.js."
          echo "Cannot proceed without the main script."
          exit 1
        fi
      fi
    fi
    
    # Now we modify the source in the extracted directory
    APP_SOURCE_DIR="$ASAR_EXTRACT_DIR"
    NEED_TO_REPACK_ASAR=true
  elif [ -f "$APP_DIR_RESOURCE/main.js" ] || [ -f "$APP_DIR_RESOURCE/index.js" ]; then
    # Loose source
    APP_SOURCE_DIR="$APP_DIR_RESOURCE"
    NEED_TO_REPACK_ASAR=false
  else
    # Look for main.js in common locations
    MAIN_JS=$(find "$APP_DIR_RESOURCE" -name "main.js" -type f | head -1)
    if [ -n "$MAIN_JS" ]; then
      APP_SOURCE_DIR=$(dirname "$MAIN_JS")
      NEED_TO_REPACK_ASAR=false
    else
      echo "Error: Could not locate main.js in the Electron app."
      exit 1
    fi
  fi
  
  echo "Source directory: $APP_SOURCE_DIR"
  
  # Now we look for the menu setting code in the source
  # We'll search for files containing Menu.setApplicationMenu or Menu.buildFromTemplate
  echo "Searching for menu code..."
  MENU_FILES=$(grep -r "Menu\.setApplicationMenu\|Menu\.buildFromTemplate" "$APP_SOURCE_DIR" --include="*.js" 2>/dev/null | cut -d: -f1 | sort -u)
  
  if [ -z "$MENU_FILES" ]; then
    echo "Warning: No menu code found. Trying to find any reference to 'View' in menus."
    MENU_FILES=$(grep -r "label.*View\|View.*label" "$APP_SOURCE_DIR" --include="*.js" 2>/dev/null | cut -d: -f1 | sort -u)
  fi
  
  if [ -z "$MENU_FILES" ]; then
    echo "Error: Could not locate menu code to modify."
    exit 1
  fi
  
  echo "Found menu code in: $MENU_FILES"
  
  # For each file, we'll attempt to replace the menu setting with Menu.setApplicationMenu(null)
  # We'll do a simple replacement: look for a line that sets the menu and replace it.
  # We'll also look for the construction of the menu template and replace that block if possible.
  # But for simplicity, we'll just replace any Menu.setApplicationMenu(call) with Menu.setApplicationMenu(null)
  # unless the argument is already null.
  
  for file in $MENU_FILES; do
    echo "Processing $file"
    # Backup the file
    cp "$file" "$file.bak"
    
    # Replace any Menu.setApplicationMenu(something) that is not already null
    # We use sed to replace the line, but we want to be careful not to break multi-line statements.
    # We'll look for the pattern: Menu.setApplicationMenu( ... );
    # and replace the argument with null, but keep the rest.
    
    # First, try to replace the argument if it's a simple variable or function call.
    # This is a best-effort approach.
    sed -i 's/Menu\.setApplicationMenu\s*([^)]*)/Menu.setApplicationMenu(null)/g' "$file"
    
    # Also, if we find a Menu.buildFromTemplate that is assigned to a variable and then used,
    # we might want to remove the template construction. But we leave it for now.
    # Setting the menu to null should override any previous menu.
    
    # Verify the change
    if ! grep -q "Menu\.setApplicationMenu\s*(null)" "$file"; then
      echo "Warning: Failed to replace menu setting in $file. Checking if it was already null."
      if ! grep -q "Menu\.setApplicationMenu\s*(null)" "$file.bak"; then
        echo "Error: Could not modify $file to set menu to null."
        # Restore backup
        mv "$file.bak" "$file"
        exit 1
      fi
    else
      echo "Successfully updated $file to set menu to null."
      rm -f "$file.bak"
    fi
  done
  
  # If we extracted an ASAR, we need to repack it
  if [ "$NEED_TO_REPACK_ASAR" = true ]; then
    echo "Repacking ASAR archive..."
    npx asar pack "$APP_SOURCE_DIR" "$APP_DIR_RESOURCE/app.asar"
    # Clean up the extracted directory
    rm -rf "$ASAR_EXTRACT_DIR"
  fi
  
  # Now we have modified the AppDir. We'll try to run the app to verify (optional)
  echo "Verifying the modified AppImage runs (this may take a moment)..."
  # We run the electron binary with the app directory, but we need to set the app directory correctly.
  # For electron-builder packaged apps, the app is in the resources directory.
  # We'll try to run the app in the background and kill it after a few seconds.
  TIMEOUT=10
  if [ -x "$ELECTRON_BINARY" ]; then
    # Set the app directory based on how we found it
    if [ -d "resources/app" ]; then
      APP_PATH="resources/app"
    elif [ -d "app" ]; then
      APP_PATH="app"
    else
      APP_PATH="."
    fi
    echo "Running: $ELECTRON_BINARY $APP_PATH"
    "$ELECTRON_BINARY" "$APP_PATH" &
    ELECTRON_PID=$!
    sleep $TIMEOUT
    kill $ELECTRON_PID 2>/dev/null || true
    wait $ELECTRON_PID 2>/dev/null || true
    echo "Verification complete (if the app started and showed no menu, it worked)."
  else
    echo "Warning: Could not find electron binary to verify. Skipping runtime check."
  fi
fi

# Go back to the original directory
cd ..

# Now repackage the AppDir into a new AppImage using appimagetool
echo "Repacking AppImage..."
# We use appimagetool from the system or path
if ! command -v appimagetool &> /dev/null; then
  echo "Error: appimagetool not found. Please install it (e.g., download from https://github.com/AppImage/AppImageKit/releases)"
  exit 1
fi

# Determine the output name
ORIGINAL_NAME=$(basename "$ORIGINAL_APPIMAGE" .AppImage)
OUTPUT_APPIMAGE="${ORIGINAL_NAME}-no-view-bar.AppImage"
# If the original didn't end with .AppImage, we still use the base name
if [ "$OUTPUT_APPIMAGE" = "$ORIGINAL_APPIMAGE" ]; then
  OUTPUT_APPIMAGE="${ORIGINAL_NAME}-no-view-bar.AppImage"
fi

# Remove any existing output
if [ -f "$OUTPUT_APPIMAGE" ]; then
  rm "$OUTPUT_APPIMAGE"
fi

appimagetool "$APP_DIR" "$OUTPUT_APPIMAGE"
if [ ! -f "$OUTPUT_APPIMAGE" ]; then
  echo "Error: Failed to create new AppImage"
  exit 1
fi

# Make the new AppImage executable
chmod +x "$OUTPUT_APPIMAGE"

echo "New AppImage created: $OUTPUT_APPIMAGE"

# Clean up the extracted AppDir
echo "Cleaning up..."
rm -rf "$APP_DIR"

# Create a changelog file
CHANGELOG="${OUTPUT_APPIMAGE}.changelog"
echo "AppImage modification changelog" > "$CHANGELOG"
echo "===============================" >> "$CHANGELOG"
echo "Date: $(date)" >> "$CHANGELOG"
echo "Original AppImage: $ORIGINAL_APPIMAGE" >> "$CHANGELOG"
echo "Modified AppImage: $OUTPUT_APPIMAGE" >> "$CHANGELOG"
echo "Modification: Removed the application menu bar (which contained the 'View' button) by setting the Electron application menu to null." >> "$CHANGELOG"
echo "Framework: Electron" >> "$CHANGELOG"
echo "Notes: This removes the entire menu bar. If you want to keep other menu items, you would need to edit the menu template instead." >> "$CHANGELOG"

echo "Changelog saved to: $CHANGELOG"

echo "Done."