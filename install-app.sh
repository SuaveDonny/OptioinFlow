#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Options Dashboard"
APP_PATH="$HOME/Desktop/$APP_NAME.app"
ICON_PNG="$SCRIPT_DIR/icon.png"

if [ ! -f "$ICON_PNG" ]; then
  echo "Missing icon.png in $SCRIPT_DIR"
  exit 1
fi

rm -rf "$APP_PATH"
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

cat > "$APP_PATH/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>launcher</string>
    <key>CFBundleIconFile</key><string>icon.icns</string>
    <key>CFBundleIdentifier</key><string>com.suave.optionsdashboard</string>
    <key>CFBundleName</key><string>Options Dashboard</string>
    <key>CFBundlePackageType</key><string>APPL</string>
</dict>
</plist>
PLIST

cat > "$APP_PATH/Contents/MacOS/launcher" << LAUNCHER
#!/bin/bash
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    do script "cd '$SCRIPT_DIR' && ./start.sh"
end tell
APPLESCRIPT
LAUNCHER
chmod +x "$APP_PATH/Contents/MacOS/launcher"

ICONSET="$SCRIPT_DIR/icon.iconset"
rm -rf "$ICONSET"
mkdir "$ICONSET"
sips -z 16 16     "$ICON_PNG" --out "$ICONSET/icon_16x16.png" > /dev/null
sips -z 32 32     "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" > /dev/null
sips -z 32 32     "$ICON_PNG" --out "$ICONSET/icon_32x32.png" > /dev/null
sips -z 64 64     "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" > /dev/null
sips -z 128 128   "$ICON_PNG" --out "$ICONSET/icon_128x128.png" > /dev/null
sips -z 256 256   "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" > /dev/null
sips -z 256 256   "$ICON_PNG" --out "$ICONSET/icon_256x256.png" > /dev/null
sips -z 512 512   "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" > /dev/null
sips -z 512 512   "$ICON_PNG" --out "$ICONSET/icon_512x512.png" > /dev/null
cp "$ICON_PNG" "$ICONSET/icon_512x512@2x.png"
iconutil -c icns "$ICONSET" -o "$APP_PATH/Contents/Resources/icon.icns"
rm -rf "$ICONSET"
touch "$APP_PATH"

echo ""
echo "✓ Created: $APP_PATH"
echo "Double-click the icon on your Desktop to launch your dashboard."
