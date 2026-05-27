#!/bin/bash
# display-wrapper.sh — Läuft als cage-Child
# 1. Setzt Display-Rotation (landscape/portrait) via wlr-randr
# 2. Startet Chromium

DEVICE_CONF="/boot/firmware/device.json"
OUTPUT="HDMI-A-1"

# Orientation aus device.json lesen (Env-Variable hat Vorrang)
if [ -z "${ORIENTATION:-}" ]; then
    ORIENTATION=$(python3 -c "
import json, sys
try:
    d = json.load(open('$DEVICE_CONF'))
    print(d.get('orientation', 'landscape'))
except Exception:
    print('landscape')
" 2>/dev/null || echo "landscape")
fi

# wlr-randr: Display-Rotation setzen
if command -v wlr-randr &>/dev/null; then
    case "$ORIENTATION" in
        portrait)
            wlr-randr --output "$OUTPUT" --transform 90 2>/dev/null || true
            ;;
        portrait-flipped)
            wlr-randr --output "$OUTPUT" --transform 270 2>/dev/null || true
            ;;
        landscape-flipped)
            wlr-randr --output "$OUTPUT" --transform 180 2>/dev/null || true
            ;;
        *)
            wlr-randr --output "$OUTPUT" --transform normal 2>/dev/null || true
            ;;
    esac
fi

# CHROMIUM_FLAGS und CMS_URL kommen als Env-Variablen rein
# CHROMIUM_FLAGS ist ein einzelner String mit space-separierten Flags
exec chromium-browser $CHROMIUM_FLAGS "$CMS_URL"
