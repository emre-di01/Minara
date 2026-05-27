#!/bin/bash
# start-kiosk.sh — Pi 4 Kiosk via Wayland + cage
# cage = minimaler Wayland-Compositor, perfekt für Single-App-Kiosk

CMS_URL="https://mosque.401dev.de/tv"
LOG="/var/log/mosque-kiosk.log"
DEVICE_CONF="/boot/firmware/device.json"
CRASH_COUNT=0
CRASH_LIMIT=10          # nach 10 Abstürzen innerhalb kurzer Zeit: Reboot
CRASH_WINDOW=300        # Zeitfenster in Sekunden
LAST_CRASH_RESET=$(date +%s)

# Orientation aus device.json lesen
ORIENTATION=$(python3 -c "
import json, sys
try:
    d = json.load(open('$DEVICE_CONF'))
    print(d.get('orientation', 'landscape'))
except Exception:
    print('landscape')
" 2>/dev/null || echo "landscape")
export ORIENTATION

# Wayland env
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY=wayland-1

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

# Maus verstecken
unclutter -idle 1 -root &>/dev/null &

# Chromium mit Pi 4 Hardware-Beschleunigung + Stabilitäts-Flags
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
    # Speicher-Management: verhindert Abstürze durch Memory Leak
    --max-old-space-size=256
    --renderer-process-limit=2
    --disable-dev-shm-usage
    --memory-pressure-off
    # Tab-/Render-Abstürze isolieren: nicht der ganze Browser stirbt
    --process-per-site
    # Autoplay für Ezan-Audio immer erlauben
    --autoplay-policy=no-user-gesture-required
)

log "Kiosk gestartet — $CMS_URL (orientation: $ORIENTATION)"

# CHROMIUM_FLAGS als Env-Variable für display-wrapper.sh
export CHROMIUM_FLAGS="${CHROMIUM_FLAGS[*]}"
export CMS_URL

# cage startet Wayland + Chromium via display-wrapper, bei Absturz automatisch neu
while true; do
    START=$(date +%s)

    cage -- bash /opt/mosque/scripts/display-wrapper.sh
    EXIT_CODE=$?

    NOW=$(date +%s)
    UPTIME=$((NOW - START))
    log "Chromium/cage beendet (exit $EXIT_CODE, lief ${UPTIME}s)"

    # Absturz-Zähler: wenn zu viele Abstürze in kurzer Zeit → Reboot
    SINCE_RESET=$((NOW - LAST_CRASH_RESET))
    if [ $SINCE_RESET -gt $CRASH_WINDOW ]; then
        CRASH_COUNT=0
        LAST_CRASH_RESET=$NOW
    fi

    # Nur bei schnellen Abstürzen (<30s) zählen (normaler Stopp ignorieren)
    if [ $UPTIME -lt 30 ]; then
        CRASH_COUNT=$((CRASH_COUNT + 1))
        log "Schnellabsturz #$CRASH_COUNT / $CRASH_LIMIT"
        if [ $CRASH_COUNT -ge $CRASH_LIMIT ]; then
            log "Zu viele Abstürze — Reboot"
            systemctl reboot
        fi
    else
        CRASH_COUNT=0
    fi

    log "Neustart in 5s..."
    sleep 5
done
