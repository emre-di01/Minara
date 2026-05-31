#!/bin/bash
# wifi-setup.sh — läuft bei jedem Boot als systemd service
# Liest /boot/firmware/wifi.conf → verbindet oder startet Hotspot

WIFI_CONF="/boot/firmware/wifi.conf"
AP_FLAG="/tmp/hotspot_active"
AP_SSID="Minara-$(cat /sys/class/net/wlan0/address | tr -d ':' | tail -c 5 | tr '[:lower:]' '[:upper:]')"
IFACE="wlan0"
MAX_WAIT=30   # Sekunden auf Verbindung warten

log() { echo "[wifi-setup] $*" | tee -a /var/log/mosque-wifi.log; }

stop_hotspot() {
    log "Stopping hotspot..."
    systemctl stop hostapd dnsmasq 2>/dev/null || true
    ip addr flush dev "$IFACE" 2>/dev/null || true
    iptables -t nat -D PREROUTING -i "$IFACE" -p tcp --dport 80  -j REDIRECT --to-port 8080 2>/dev/null || true
    iptables -t nat -D PREROUTING -i "$IFACE" -p tcp --dport 443 -j REDIRECT --to-port 8080 2>/dev/null || true
    rm -f "$AP_FLAG"
}

start_hotspot() {
    log "Starting hotspot: $AP_SSID (open, no password)"

    # hostapd config
    cat > /tmp/hostapd.conf << EOF
interface=$IFACE
driver=nl80211
ssid=$AP_SSID
hw_mode=g
channel=6
auth_algs=1
ignore_broadcast_ssid=0
EOF

    # dnsmasq config (DHCP + DNS → captive portal redirect)
    cat > /tmp/dnsmasq-ap.conf << EOF
interface=$IFACE
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
dhcp-option=3,192.168.4.1
dhcp-option=6,192.168.4.1
address=/#/192.168.4.1
EOF

    # IP setzen
    ip addr flush dev "$IFACE"
    ip addr add 192.168.4.1/24 dev "$IFACE"
    ip link set "$IFACE" up

    systemctl stop dnsmasq 2>/dev/null || true
    hostapd /tmp/hostapd.conf -B -P /tmp/hostapd.pid 2>/dev/null
    dnsmasq --conf-file=/tmp/dnsmasq-ap.conf --pid-file=/tmp/dnsmasq-ap.pid 2>/dev/null

    # Captive-Portal: HTTP + HTTPS → Port 8080 umleiten
    # Android/iOS/Windows prüfen bestimmte URLs → Redirect löst Auto-Popup aus
    iptables -t nat -D PREROUTING -i "$IFACE" -p tcp --dport 80  -j REDIRECT --to-port 8080 2>/dev/null || true
    iptables -t nat -D PREROUTING -i "$IFACE" -p tcp --dport 443 -j REDIRECT --to-port 8080 2>/dev/null || true
    iptables -t nat -A PREROUTING -i "$IFACE" -p tcp --dport 80  -j REDIRECT --to-port 8080
    iptables -t nat -A PREROUTING -i "$IFACE" -p tcp --dport 443 -j REDIRECT --to-port 8080

    touch "$AP_FLAG"
    log "Hotspot active: $AP_SSID — Portal: http://192.168.4.1:8080"
}

connect_wifi() {
    local SSID="$1"
    local PASS="$2"

    stop_hotspot

    log "Connecting to: $SSID"

    # wpa_supplicant config
    if [ -z "$PASS" ]; then
        # Offenes Netz
        wpa_passphrase_block="network={\n  ssid=\"$SSID\"\n  key_mgmt=NONE\n}"
    else
        HASH=$(wpa_passphrase "$SSID" "$PASS" | grep -v '#' | grep psk | cut -d= -f2)
        wpa_passphrase_block="network={\n  ssid=\"$SSID\"\n  psk=$HASH\n}"
    fi

    cat > /etc/wpa_supplicant/wpa_supplicant.conf << EOF
country=DE
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
$(echo -e "$wpa_passphrase_block")
EOF

    chmod 600 /etc/wpa_supplicant/wpa_supplicant.conf

    # wpa_supplicant neu starten
    systemctl stop wpa_supplicant 2>/dev/null || true
    wpa_supplicant -B -i "$IFACE" -c /etc/wpa_supplicant/wpa_supplicant.conf \
        -P /tmp/wpa.pid 2>/dev/null

    # DHCP
    dhclient -v "$IFACE" 2>/dev/null &

    # Warten auf IP
    for i in $(seq 1 $MAX_WAIT); do
        sleep 1
        IP=$(ip -4 addr show "$IFACE" | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
        if [ -n "$IP" ]; then
            log "Connected: $SSID — IP: $IP"
            return 0
        fi
    done

    log "Connection failed: $SSID"
    return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────

log "=== wifi-setup start ==="

if [ -f "$WIFI_CONF" ]; then
    SSID=$(python3 -c "import json,sys; d=json.load(open('$WIFI_CONF')); print(d.get('ssid',''))")
    PASS=$(python3 -c "import json,sys; d=json.load(open('$WIFI_CONF')); print(d.get('password',''))")

    if [ -n "$SSID" ]; then
        connect_wifi "$SSID" "$PASS"
        if [ $? -eq 0 ]; then
            log "WiFi OK — starting kiosk"
            systemctl start mosque-kiosk.service
            exit 0
        else
            log "WiFi failed — falling back to hotspot"
        fi
    fi
fi

# Kein Config oder Verbindung fehlgeschlagen → Hotspot
start_hotspot
