#!/bin/bash
# start-kiosk.sh — startet Chromium im Kiosk-Modus

CMS_URL="https://mosque.401dev.de/tv"
DISPLAY=:0
XAUTHORITY=/home/kiosk/.Xauthority

export DISPLAY XAUTHORITY

# Display-Einstellungen: Screensaver + Energiesparmodus aus
xset s off
xset s noblank
xset -dpms

# Maus verstecken nach 1s Inaktivität
unclutter -idle 1 -root &

# Chromium-Profil-Pfad (Hardware-ID bleibt in localStorage erhalten)
PROFILE="/home/kiosk/.config/chromium-kiosk"

# Chromium starten (bei Absturz automatisch neu starten)
while true; do
    chromium-browser \
        --kiosk \
        --noerrdialogs \
        --disable-infobars \
        --no-first-run \
        --disable-translate \
        --hide-scrollbars \
        --disable-session-crashed-bubble \
        --disable-restore-apps \
        --disable-component-update \
        --check-for-update-interval=604800 \
        --disable-features=TranslateUI,Translate \
        --disable-background-networking \
        --no-default-browser-check \
        --user-data-dir="$PROFILE" \
        --window-position=0,0 \
        --start-fullscreen \
        "$CMS_URL"
    echo "[kiosk] Chromium exited — restarting in 3s..."
    sleep 3
done
