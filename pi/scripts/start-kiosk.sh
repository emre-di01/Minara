#!/bin/bash
# start-kiosk.sh — Pi 4 Kiosk via Wayland + cage
# cage = minimaler Wayland-Compositor, perfekt für Single-App-Kiosk

CMS_URL="https://mosque.401dev.de/tv"

# Wayland env
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY=wayland-1

# Maus verstecken
unclutter -idle 1 -root &>/dev/null &

# Chromium mit Pi 4 Hardware-Beschleunigung
CHROMIUM_FLAGS=(
    --kiosk
    --noerrdialogs
    --disable-infobars
    --no-first-run
    --disable-translate
    --hide-scrollbars
    --disable-session-crashed-bubble
    --disable-restore-apps
    --disable-component-update
    --check-for-update-interval=604800
    --disable-features=TranslateUI,Translate
    --disable-background-networking
    --no-default-browser-check
    --enable-features=UseOzonePlatform,VaapiVideoDecoder
    --ozone-platform=wayland
    --enable-gpu-rasterization
    --enable-zero-copy
    --ignore-gpu-blocklist
    --disable-gpu-driver-bug-workarounds
    --user-data-dir=/home/kiosk/.config/chromium-kiosk
    --window-position=0,0
    --start-fullscreen
)

echo "[kiosk] Starte Chromium auf $CMS_URL"

# cage startet Wayland + Chromium, bei Absturz automatisch neu
while true; do
    cage -- chromium-browser "${CHROMIUM_FLAGS[@]}" "$CMS_URL"
    echo "[kiosk] Chromium/cage beendet — Neustart in 3s..."
    sleep 3
done
