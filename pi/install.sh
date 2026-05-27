#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Mosque Signage — Raspberry Pi Setup Script
# Getestet auf: Raspberry Pi OS Lite (Bookworm, 64-bit)
#
# Ausführen:
#   curl -sSL https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi/install.sh | sudo bash
#   oder: sudo bash install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Konfiguration ─────────────────────────────────────────────────────────────
CMS_URL="https://mosque.401dev.de/tv"
INSTALL_DIR="/opt/mosque"
KIOSK_USER="kiosk"
DEVICE_CONF="/boot/firmware/device.json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Bitte mit sudo ausführen: sudo bash install.sh"

log "=== Mosque Signage Pi Setup ==="

# ── 1. System-Pakete ──────────────────────────────────────────────────────────
log "Pakete installieren..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    chromium-browser \
    xserver-xorg-core \
    xserver-xorg-input-all \
    xserver-xorg-video-all \
    x11-xserver-utils \
    xinit \
    openbox \
    hostapd \
    dnsmasq \
    wpasupplicant \
    dhcpcd5 \
    wireless-tools \
    iw \
    unclutter \
    python3 \
    avahi-daemon \
    avahi-utils \
    libnss-mdns \
    2>/dev/null

systemctl disable hostapd dnsmasq 2>/dev/null || true

# ── 2. Kiosk-User anlegen ─────────────────────────────────────────────────────
log "Kiosk-User anlegen..."
if ! id "$KIOSK_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$KIOSK_USER"
fi
usermod -aG video,audio,input,render,netdev "$KIOSK_USER"

# ── 3. Dateien kopieren ───────────────────────────────────────────────────────
log "Dateien installieren nach $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"/{scripts,wifi-portal,services}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/scripts" ]; then
    cp -r "$SCRIPT_DIR/scripts/"*    "$INSTALL_DIR/scripts/"
    cp -r "$SCRIPT_DIR/wifi-portal/" "$INSTALL_DIR/"
    cp -r "$SCRIPT_DIR/services/"*   /etc/systemd/system/
else
    # Direkt von GitHub laden (wenn via curl ausgeführt)
    REPO="https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi"
    warn "Lade Dateien von GitHub..."
    curl -sSL "$REPO/scripts/wifi-setup.sh"   -o "$INSTALL_DIR/scripts/wifi-setup.sh"
    curl -sSL "$REPO/scripts/start-kiosk.sh"  -o "$INSTALL_DIR/scripts/start-kiosk.sh"
    curl -sSL "$REPO/wifi-portal/portal.py"   -o "$INSTALL_DIR/wifi-portal/portal.py"
    curl -sSL "$REPO/services/wifi-setup.service"   -o /etc/systemd/system/wifi-setup.service
    curl -sSL "$REPO/services/mosque-portal.service" -o /etc/systemd/system/mosque-portal.service
    curl -sSL "$REPO/services/mosque-kiosk.service"  -o /etc/systemd/system/mosque-kiosk.service
fi

chmod +x "$INSTALL_DIR/scripts/"*.sh
chown -R "$KIOSK_USER:$KIOSK_USER" "$INSTALL_DIR"

# CMS-URL in Kiosk-Script eintragen
sed -i "s|CMS_URL=.*|CMS_URL=\"$CMS_URL\"|" "$INSTALL_DIR/scripts/start-kiosk.sh"

# ── 4. Geräte-ID generieren ──────────────────────────────────────────────────
log "Geräte-ID generieren..."
if [ ! -f "$DEVICE_CONF" ]; then
    DEVICE_ID="pi-$(cat /proc/cpuinfo | grep Serial | awk '{print $3}' | tail -c 9)"
    [ "$DEVICE_ID" = "pi-" ] && DEVICE_ID="pi-$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 12)"
    mkdir -p "$(dirname "$DEVICE_CONF")"
    echo "{\"id\": \"$DEVICE_ID\"}" > "$DEVICE_CONF"
    log "Geräte-ID: $DEVICE_ID"
else
    log "Geräte-ID bereits vorhanden: $(python3 -c "import json; print(json.load(open('$DEVICE_CONF'))['id'])")"
fi

# ── 5. X11 Autostart für kiosk-User ─────────────────────────────────────────
log "X11 Kiosk autostart konfigurieren..."

# X11 ohne Display-Manager starten
cat > /etc/systemd/system/mosque-x11.service << 'EOF'
[Unit]
Description=Mosque Signage X11
After=systemd-logind.service

[Service]
User=kiosk
Group=kiosk
PAMName=login
TTYPath=/dev/tty1
StandardInput=tty
Environment=XDG_RUNTIME_DIR=/run/user/1001
ExecStart=/usr/bin/startx /opt/mosque/scripts/start-kiosk.sh -- :0 vt1 -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Openbox Autostart (kein weiteres WM-Overhead)
mkdir -p /home/$KIOSK_USER/.config/openbox
cat > /home/$KIOSK_USER/.config/openbox/autostart << EOF
# Kiosk wird direkt von start-kiosk.sh aufgerufen
EOF
chown -R $KIOSK_USER:$KIOSK_USER /home/$KIOSK_USER/.config

# ── 6. Bildschirm-Einstellungen ───────────────────────────────────────────────
log "Display-Einstellungen (kein Screensaver)..."
cat > /etc/X11/xorg.conf.d/10-blanking.conf << 'EOF'
Section "ServerFlags"
  Option "StandbyTime" "0"
  Option "SuspendTime" "0"
  Option "OffTime"     "0"
  Option "BlankTime"   "0"
EndSection
EOF

# HDMI immer an (auch ohne Monitor beim Start)
if ! grep -q "hdmi_force_hotplug" /boot/firmware/config.txt 2>/dev/null; then
    echo "hdmi_force_hotplug=1" >> /boot/firmware/config.txt
fi

# ── 7. Avahi (mosque-screen.local) ───────────────────────────────────────────
log "mDNS Hostname konfigurieren..."
hostnamectl set-hostname mosque-screen 2>/dev/null || hostname mosque-screen
echo "mosque-screen" > /etc/hostname
sed -i 's/127\.0\.1\.1.*/127.0.1.1\tmosque-screen/' /etc/hosts || \
    echo "127.0.1.1 mosque-screen" >> /etc/hosts

systemctl enable avahi-daemon 2>/dev/null || true

# ── 8. Systemd Services aktivieren ───────────────────────────────────────────
log "Services aktivieren..."
systemctl daemon-reload
systemctl enable wifi-setup.service
systemctl enable mosque-portal.service
systemctl enable mosque-x11.service

# Auto-Login auf tty1 (für startx)
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KIOSK_USER --noclear %I \$TERM
EOF

# ── 9. Zusammenfassung ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} Setup abgeschlossen!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo " CMS-URL:    $CMS_URL"
DEVICE_ID=$(python3 -c "import json; print(json.load(open('$DEVICE_CONF'))['id'])" 2>/dev/null || echo "?")
echo " Geräte-ID:  $DEVICE_ID"
echo ""
echo " Nach dem Neustart:"
echo "  1. Pi erstellt Hotspot: MosqueScreen-XXXXX (offen, kein Passwort)"
echo "  2. Mit Handy verbinden → Browser → 192.168.4.1:8080"
echo "  3. WLAN-Netz eingeben → Pi verbindet sich"
echo "  4. Kiosk startet → Pairing-Code im CMS eingeben"
echo ""
echo " WiFi später ändern: http://mosque-screen.local:8080"
echo ""

read -p "Jetzt neu starten? (j/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Jj]$ ]]; then
    reboot
fi
