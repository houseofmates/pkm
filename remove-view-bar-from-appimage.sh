#!/bin/bash
set -e

# script to remove a header bar with a "view" button from an appimage and rebuild a new appimage.
# usage: ./remove-view-bar-from-appimage.sh <path-to-appimage>
# the new appimage will be named <original-name>-no-view-bar.appimage in the same directory.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-AppImage>"
  exit 1
fi

ORIGINAL_APPIMAGE="$1"
if [ ! -f "$ORIGINAL_APPIMAGE" ]; then
  echo "Error: File not found: $ORIGINAL_APPIMAGE"
  exit 1
fi

# extract the appimage
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

# detect the ui framework
echo "Detecting UI framework..."
FRAMEWORK="unknown"
# check for electron: look for the electron binary (often named after the app) or resources/app.asar
if [ -f "pkm-desktop-electron" ] || [ -f "electron" ] || [ -f "electron.exe" ]; then
  FRAMEWORK="electron"
  # determine the electron binary name
  if [ -f "pkm-desktop-electron" ]; then
    ELECTRON_BINARY="./pkm-desktop-electron"
  elif [ -f "electron" ]; then
    ELECTRON_BINARY="./electron"
  else
    ELECTRON_BINARY="./electron.exe"
  fi
  # determine the app resources directory
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
  # check for package.json with electron dependency
  FOUND_PACKAGE_JSON=$(find . -name "package.json" -type f | head -1)
  if [ -n "$FOUND_PACKAGE_JSON" ]; then
    if grep -q "\"electron\"" "$FOUND_PACKAGE_JSON" || grep -q "electron" "$FOUND_PACKAGE_JSON"; then
      FRAMEWORK="electron"
      # try to locate the electron binary relative to the package.json
      # we'll assume it's in the parent directory of the appdir (but we are inside the appdir)
      # for simplicity, we'll look for an electron binary in the current directory or parent.
      if [ -f "../electron" ]; then
        ELECTRON_BINARY="../electron"
      elif [ -f "./electron" ]; then
        ELECTRON_BINARY="./electron"
      else
        # default to electron (will be resolved from path)
        ELECTRON_BINARY="electron"
      fi
      APP_DIR_RESOURCE=$(dirname "$FOUND_PACKAGE_JSON")
      # adjust path to be relative to current directory
      APP_DIR_RESOURCE="./$(realpath --relative-to="$PWD" "$APP_DIR_RESOURCE")"
    fi
  fi
fi

if [ "$FRAMEWORK" = "unknown" ]; then
  echo "Warning: Could not detect Electron framework. Attempting to modify common UI resources."
  # we'll try to modify common ui files as a fallback
  # but for now, we'll exit and let the user know we only handle electron in this script.
  echo "Error: This script currently only supports Electron AppImages."
  echo "Please modify the script to add support for your framework (Qt, GTK, WebUI)."
  exit 1
fi

echo "Detected framework: $FRAMEWORK"

# for electron, we need to handle the application menu
if [ "$FRAMEWORK" = "electron" ]; then
  echo "Processing Electron AppImage..."
  
  # determine the app directory
  if [ -z "$APP_DIR_RESOURCE" ]; then
    # if we found the electron binary directly, look for resources/app or app
    if [ -d "resources/app" ] && [ -f "resources/app/package.json" ]; then
      APP_DIR_RESOURCE="resources/app"
    elif [ -d "app" ] && [ -f "app/package.json" ]; then
      APP_DIR_RESOURCE="app"
    else
      # fallback: look for any package.json
      APP_DIR_RESOURCE=$(find . -name "package.json" -type f | head -1 | xargs dirname)
      APP_DIR_RESOURCE="./$(realpath --relative-to="$PWD" "$APP_DIR_RESOURCE")"
    fi
  fi
  
  echo "App directory: $APP_DIR_RESOURCE"
  
  # check if the app is packaged in an asar archive
  if [ -f "$APP_DIR_RESOURCE/app.asar" ]; then
    echo "Found ASAR archive: $APP_DIR_RESOURCE/app.asar"
    # extract the asar archive
    ASAR_EXTRACT_DIR="$APP_DIR_RESOURCE/app.asar.unpacked"
    if [ -d "$ASAR_EXTRACT_DIR" ]; then
      # we'll try to use the existing unpacked directory if it seems valid
      if [ -f "$ASAR_EXTRACT_DIR/package.json" ] && ( [ -f "$ASAR_EXTRACT_DIR/main.js" ] || [ -f "$ASAR_EXTRACT_DIR/index.js" ] ); then
        echo "Using existing ASAR unpacked directory (seems valid)."
      else
        echo "Existing unpacked directory seems invalid. Removing and trying to extract again."
        rm -rf "$ASAR_EXTRACT_DIR"
      fi
    fi
    
    if [ ! -d "$ASAR_EXTRACT_DIR" ]; then
      echo "Extracting ASAR archive..."
      # try to extract, but don't exit on failure; we'll check the result
      if npx asar extract "$APP_DIR_RESOURCE/app.asar" "$ASAR_EXTRACT_DIR" 2>/dev/null; then
        echo "ASAR extracted successfully."
      else
        echo "Warning: ASAR extraction had errors. Checking if unpacked directory is usable anyway."
        # if the extraction failed, we might still have a partially extracted directory that is usable.
        # we'll check for the presence of main.js or index.js.
        if [ ! -f "$ASAR_EXTRACT_DIR/main.js" ] && [ ! -f "$ASAR_EXTRACT_DIR/index.js" ]; then
          echo "Error: ASAR extraction failed and unpacked directory does not contain main.js or index.js."
          echo "Cannot proceed without the main script."
          exit 1
        fi
      fi
    fi
    
    # now we modify the source in the extracted directory
    APP_SOURCE_DIR="$ASAR_EXTRACT_DIR"
    NEED_TO_REPACK_ASAR=true
  elif [ -f "$APP_DIR_RESOURCE/main.js" ] || [ -f "$APP_DIR_RESOURCE/index.js" ]; then
    # loose source
    APP_SOURCE_DIR="$APP_DIR_RESOURCE"
    NEED_TO_REPACK_ASAR=false
  else
    # look for main.js in common locations
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
  
  # now we look for the menu setting code in the source
  # we'll search for files containing menu.setapplicationmenu or menu.buildfromtemplate
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
  
  # for each file, we'll attempt to replace the menu setting with menu.setapplicationmenu(null)
  # we'll do a simple replacement: look for a line that sets the menu and replace it.
  # we'll also look for the construction of the menu template and replace that block if possible.
  # but for simplicity, we'll just replace any menu.setapplicationmenu(call) with menu.setapplicationmenu(null)
  # unless the argument is already null.
  
  for file in $MENU_FILES; do
    echo "Processing $file"
    # backup the file
    cp "$file" "$file.bak"
    
    # replace any menu.setapplicationmenu(something) that is not already null
    # we use sed to replace the line, but we want to be careful not to break multi-line statements.
    # we'll look for the pattern: menu.setapplicationmenu( ... );
    # and replace the argument with null, but keep the rest.
    
    # first, try to replace the argument if it's a simple variable or function call.
    # this is a best-effort approach.
    sed -i 's/Menu\.setApplicationMenu\s*([^)]*)/Menu.setApplicationMenu(null)/g' "$file"
    
    # also, if we find a menu.buildfromtemplate that is assigned to a variable and then used,
    # we might want to remove the template construction. but we leave it for now.
    # setting the menu to null should override any previous menu.
    
    # verify the change
    if ! grep -q "Menu\.setApplicationMenu\s*(null)" "$file"; then
      echo "Warning: Failed to replace menu setting in $file. Checking if it was already null."
      if ! grep -q "Menu\.setApplicationMenu\s*(null)" "$file.bak"; then
        echo "Error: Could not modify $file to set menu to null."
        # restore backup
        mv "$file.bak" "$file"
        exit 1
      fi
    else
      echo "Successfully updated $file to set menu to null."
      rm -f "$file.bak"
    fi
  done
  
  # if we extracted an asar, we need to repack it
  if [ "$NEED_TO_REPACK_ASAR" = true ]; then
    echo "Repacking ASAR archive..."
    npx asar pack "$APP_SOURCE_DIR" "$APP_DIR_RESOURCE/app.asar"
    # clean up the extracted directory
    rm -rf "$ASAR_EXTRACT_DIR"
  fi
  
  # now we have modified the appdir. we'll try to run the app to verify (optional)
  echo "Verifying the modified AppImage runs (this may take a moment)..."
  # we run the electron binary with the app directory, but we need to set the app directory correctly.
  # for electron-builder packaged apps, the app is in the resources directory.
  # we'll try to run the app in the background and kill it after a few seconds.
  TIMEOUT=10
  if [ -x "$ELECTRON_BINARY" ]; then
    # set the app directory based on how we found it
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

# go back to the original directory
cd ..

# now repackage the appdir into a new appimage using appimagetool
echo "Repacking AppImage..."
# we use appimagetool from the system or path
if ! command -v appimagetool &> /dev/null; then
  echo "Error: appimagetool not found. Please install it (e.g., download from https://github.com/AppImage/AppImageKit/releases)"
  exit 1
fi

# determine the output name
ORIGINAL_NAME=$(basename "$ORIGINAL_APPIMAGE" .AppImage)
OUTPUT_APPIMAGE="${ORIGINAL_NAME}-no-view-bar.AppImage"
# if the original didn't end with .appimage, we still use the base name
if [ "$OUTPUT_APPIMAGE" = "$ORIGINAL_APPIMAGE" ]; then
  OUTPUT_APPIMAGE="${ORIGINAL_NAME}-no-view-bar.AppImage"
fi

# remove any existing output
if [ -f "$OUTPUT_APPIMAGE" ]; then
  rm "$OUTPUT_APPIMAGE"
fi

appimagetool "$APP_DIR" "$OUTPUT_APPIMAGE"
if [ ! -f "$OUTPUT_APPIMAGE" ]; then
  echo "Error: Failed to create new AppImage"
  exit 1
fi

# make the new appimage executable
chmod +x "$OUTPUT_APPIMAGE"

echo "New AppImage created: $OUTPUT_APPIMAGE"

# clean up the extracted appdir
echo "Cleaning up..."
rm -rf "$APP_DIR"

# create a changelog file
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