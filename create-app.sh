#!/bin/bash
# create-app.sh — Creates a clickable Mac app that launches your dashboard
# Run this once. After that, you'll have "Options Dashboard.app" on your Desktop.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="Options Dashboard"
APP_PATH="$HOME/Desktop/$APP_NAME.app"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}Creating $APP_NAME.app on your Desktop...${NC}"

# Remove old version if it exists
rm -rf "$APP_PATH"

# Create the app bundle structure
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Create the Info.plist
cat > "$APP_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.suave.optionsdashboard</string>
    <key>CFBundleName</key>
    <string>Options Dashboard</string>
    <key>CFBundleDisplayName</key>
    <string>Options Dashboard</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Create the launcher script (this is what runs when you double-click the app)
cat > "$APP_PATH/Contents/MacOS/launcher" << EOF
#!/bin/bash
# Auto-generated launcher — points to your project folder
PROJECT_DIR="$SCRIPT_DIR"

# Open Terminal and run start.sh
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    do script "cd '\$PROJECT_DIR' && ./start.sh"
end tell
APPLESCRIPT
EOF

# Make the launcher executable
chmod +x "$APP_PATH/Contents/MacOS/launcher"

# Create a simple icon using sips/iconutil (built into macOS)
# We'll create a colored square icon programmatically
ICON_DIR="$APP_PATH/Contents/Resources/icon.iconset"
mkdir -p "$ICON_DIR"

# Create a PNG icon using Python (built into macOS)
python3 - << 'PYEOF'
import os
import struct
import zlib

def make_png(size, color1, color2, text):
    """Create a simple gradient PNG with text-ish symbol"""
    # Create raw pixel data with a radial gradient
    pixels = []
    cx, cy = size / 2, size / 2
    max_r = size / 2

    for y in range(size):
        row = []
        for x in range(size):
            dx = x - cx
            dy = y - cy
            r = (dx*dx + dy*dy) ** 0.5
            t = min(r / max_r, 1.0)
            # Blend between center and edge color
            r1, g1, b1 = color1
            r2, g2, b2 = color2
            red = int(r1 * (1-t) + r2 * t)
            grn = int(g1 * (1-t) + g2 * t)
            blu = int(b1 * (1-t) + b2 * t)
            # Add chart-like bars in foreground
            bar_x = int(x / size * 5)
            bar_h = [0.7, 0.5, 0.8, 0.4, 0.9][bar_x] if bar_x < 5 else 0.5
            in_bar = (x % (size//5)) < (size//7) and y > size * (1 - bar_h * 0.6) and y < size * 0.85 and x > size * 0.15 and x < size * 0.85
            if in_bar:
                red, grn, blu = 0, 229, 160  # green bars
            row.extend([red, grn, blu, 255])
        pixels.append(bytes(row))

    raw = b''.join(b'\x00' + row for row in pixels)
    compressed = zlib.compress(raw)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    return png

icon_dir = os.environ.get('ICON_DIR', '.')
sizes = [(16, '16x16'), (32, '16x16@2x'), (32, '32x32'), (64, '32x32@2x'),
         (128, '128x128'), (256, '128x128@2x'), (256, '256x256'),
         (512, '256x256@2x'), (512, '512x512'), (1024, '512x512@2x')]

color_center = (0, 212, 255)  # cyan
color_edge = (8, 10, 20)       # dark navy

for size, name in sizes:
    png = make_png(size, color_center, color_edge, '$')
    with open(f'{icon_dir}/icon_{name}.png', 'wb') as f:
        f.write(png)

print("Icon files created")
PYEOF

export ICON_DIR
python3 -c "
import os
size_map = [(16, '16x16'), (32, '16x16@2x'), (32, '32x32'), (64, '32x32@2x'),
            (128, '128x128'), (256, '128x128@2x'), (256, '256x256'),
            (512, '256x256@2x'), (512, '512x512'), (1024, '512x512@2x')]
# Already created above
"

# Convert iconset to .icns
if [ -d "$ICON_DIR" ] && [ "$(ls -A $ICON_DIR 2>/dev/null)" ]; then
    iconutil -c icns "$ICON_DIR" -o "$APP_PATH/Contents/Resources/icon.icns" 2>/dev/null || true
    rm -rf "$ICON_DIR"
fi

# Touch the app to refresh icon cache
touch "$APP_PATH"

echo -e "${GREEN}✓ Created: $APP_PATH${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Look on your Desktop for ${CYAN}$APP_NAME${NC}"
echo -e "  2. Double-click to launch the dashboard"
echo -e "  3. (Optional) Drag it to your Dock or Applications folder"
echo ""
echo -e "${YELLOW}First-time security note:${NC}"
echo -e "  macOS may say 'cannot be opened because Apple cannot check it for malware'."
echo -e "  If so: right-click the app → ${CYAN}Open${NC} → ${CYAN}Open${NC} (just once, then it works forever)"
echo ""
