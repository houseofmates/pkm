# PKM Desktop AppImage - Remote Backend Configuration

## Configuration Summary

The AppImage is now configured to connect to the backend at **192.168.4.233:4100**

### Files Updated

1. **apps/desktop-electron/.env**
   - `VITE_API_URL=http://192.168.4.233:4100/api`
   - `VITE_SHARING_URL=http://192.168.4.233:3010`
   - `VITE_SOCKET_URL=ws://192.168.4.233:4100`

2. **apps/desktop-electron/electron/main.js**
   - Default remote URL: `http://192.168.4.233:3010`

3. **.env** (backend)
   - Added `pkm://app` and `http://192.168.4.233:3010` to `ALLOWED_ORIGINS`

## Running the App

### Option 1: Use the launcher script
```bash
cd /home/house/pkm
./run-pkm.sh
```

### Option 2: Run AppImage directly
```bash
./apps/desktop-electron/release/pkm-0.0.0.AppImage
# or
./releases/pkm-latest-linux.AppImage
```

## Backend Requirements

Make sure the backend at 192.168.4.233 has:
- Port 4100 open for API/WebSocket
- Port 3010 open for the web frontend
- CORS configured to allow `pkm://app` origin

## Brush Cursor

The brush cursor is now included:
- White circle border (2px)
- Dark gray semi-transparent fill
- Shows exact brush size scaled by zoom
- Appears when using pen or eraser tools

## AppImage Location

- Build output: `/home/house/pkm/apps/desktop-electron/release/pkm-0.0.0.AppImage`
- Release copy: `/home/house/pkm/releases/pkm-latest-linux.AppImage`
