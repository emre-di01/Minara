#!/bin/bash
# wifi-watchdog.sh — Periodisch prüfen ob WLAN noch funktioniert
# Läuft als Hintergrund-Service, prüft alle 60s die Verbindung
# Bei Ausfall: wifi-setup.service neu starten

LOG="/var/log/mosque-wifi.log"
FAIL_COUNT=0
FAIL_LIMIT=3            # Nach 3 aufeinanderfolgenden Fehlern → Reconnect
CHECK_INTERVAL=60       # Sekunden zwischen Checks

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [watchdog] $*" >> "$LOG"; }

log "WiFi-Watchdog gestartet"

while true; do
    sleep $CHECK_INTERVAL

    # Hotspot aktiv? Dann kein Reconnect — fehlender Ping ist kein Fehler
    if [ -f /tmp/hotspot_active ]; then
        FAIL_COUNT=0
        continue
    fi

    # Prüfen ob überhaupt eine WLAN-Verbindung besteht
    if ! ip link show wlan0 &>/dev/null; then
        log "wlan0 nicht gefunden — überspringe"
        FAIL_COUNT=0
        continue
    fi

    # Prüfen ob wir eine IP haben
    if ! ip addr show wlan0 | grep -q "inet "; then
        log "Keine IP auf wlan0"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        # Ping zum Gateway
        GW=$(ip route | grep "default.*wlan0" | awk '{print $3}' | head -1)
        if [ -z "$GW" ]; then
            # Fallback: öffentlicher DNS
            GW="1.1.1.1"
        fi

        if ping -c 2 -W 3 "$GW" &>/dev/null; then
            FAIL_COUNT=0
        else
            log "Ping zu $GW fehlgeschlagen"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    fi

    if [ $FAIL_COUNT -ge $FAIL_LIMIT ]; then
        log "Netzwerk $FAIL_COUNT× fehlgeschlagen — wifi-setup neu starten"
        FAIL_COUNT=0
        systemctl restart wifi-setup.service
        # Warte kurz bis Verbindung aufgebaut ist
        sleep 30
        # Kiosk neu starten damit er sich reconnectet
        systemctl restart mosque-kiosk.service
    fi
done
