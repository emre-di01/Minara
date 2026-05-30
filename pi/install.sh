#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Minara — Raspberry Pi 4 Setup Script
# Getestet auf: Raspberry Pi OS Lite Bookworm (64-bit)
#
# Ausführen nach SSH-Login:
#   curl -sSL https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi/install.sh | sudo bash
#   oder lokal: sudo bash pi/install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

CMS_URL="https://mosque.401dev.de/tv"
INSTALL_DIR="/opt/mosque"
KIOSK_USER="kiosk"
KIOSK_UID=1001
DEVICE_CONF="/boot/firmware/device.json"
CONFIG_TXT="/boot/firmware/config.txt"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${GREEN}[✓]${NC} $*"; }
info()    { echo -e "${BLUE}[→]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
err()     { echo -e "${RED}[✗]${NC} $*"; exit 1; }
section() { echo -e "\n${BLUE}── $* ──${NC}"; }

[ "$(id -u)" -eq 0 ] || err "Bitte mit sudo ausführen: sudo bash install.sh"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Minara — Pi 4 Setup        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Raspberry Pi 4 prüfen ────────────────────────────────────────────────────
section "Hardware prüfen"
MODEL=$(cat /proc/device-tree/model 2>/dev/null || echo "unknown")
info "Modell: $MODEL"
if ! echo "$MODEL" | grep -qi "Raspberry Pi 4\|Raspberry Pi 5"; then
    warn "Nicht auf Pi 4 getestet — Fortfahren auf eigene Gefahr"
fi

# ── 1. Pakete installieren ────────────────────────────────────────────────────
section "Pakete installieren"
apt-get update -qq

# Wayland + cage (minimaler Kiosk-Compositor für Pi 4)
apt-get install -y --no-install-recommends \
    chromium-browser \
    cage \
    wayland-protocols \
    libwayland-client0 \
    xwayland \
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
    dbus-user-session \
    wlr-randr \
    2>/dev/null

systemctl disable hostapd dnsmasq 2>/dev/null || true
log "Pakete installiert"

# ── 2. Kiosk-User anlegen ─────────────────────────────────────────────────────
section "Kiosk-User"
if ! id "$KIOSK_USER" &>/dev/null; then
    useradd -m -u $KIOSK_UID -s /bin/bash "$KIOSK_USER"
    log "User '$KIOSK_USER' erstellt (UID $KIOSK_UID)"
else
    KIOSK_UID=$(id -u "$KIOSK_USER")
    log "User '$KIOSK_USER' existiert bereits (UID $KIOSK_UID)"
fi
usermod -aG video,audio,input,render,netdev,tty,sudo "$KIOSK_USER"
echo "$KIOSK_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/kiosk
chmod 440 /etc/sudoers.d/kiosk

# XDG_RUNTIME_DIR für kiosk-User anlegen
mkdir -p "/run/user/$KIOSK_UID"
chown "$KIOSK_USER:$KIOSK_USER" "/run/user/$KIOSK_UID"
chmod 700 "/run/user/$KIOSK_UID"

# ── 3. Dateien installieren ───────────────────────────────────────────────────
section "Dateien installieren"
mkdir -p "$INSTALL_DIR"/{scripts,wifi-portal}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-install.sh}")" 2>/dev/null && pwd || echo "/tmp/mosque-pi")"

if [ -f "$SCRIPT_DIR/scripts/wifi-setup.sh" ]; then
    cp "$SCRIPT_DIR/scripts/wifi-setup.sh"          "$INSTALL_DIR/scripts/"
    cp "$SCRIPT_DIR/scripts/start-kiosk.sh"         "$INSTALL_DIR/scripts/"
    cp "$SCRIPT_DIR/scripts/wifi-watchdog.sh"        "$INSTALL_DIR/scripts/"
    cp "$SCRIPT_DIR/scripts/display-wrapper.sh"      "$INSTALL_DIR/scripts/"
    cp "$SCRIPT_DIR/scripts/command-executor.py"     "$INSTALL_DIR/scripts/"
    cp "$SCRIPT_DIR/wifi-portal/portal.py"           "$INSTALL_DIR/wifi-portal/"
    cp "$SCRIPT_DIR/services/"*.service              /etc/systemd/system/
    cp "$SCRIPT_DIR/services/"*.timer                /etc/systemd/system/ 2>/dev/null || true
    log "Dateien aus lokalem Repo kopiert"
else
    warn "Lade Dateien von GitHub..."
    REPO="https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi"
    curl -sSL "$REPO/scripts/wifi-setup.sh"                    -o "$INSTALL_DIR/scripts/wifi-setup.sh"
    curl -sSL "$REPO/scripts/start-kiosk.sh"                   -o "$INSTALL_DIR/scripts/start-kiosk.sh"
    curl -sSL "$REPO/scripts/wifi-watchdog.sh"                 -o "$INSTALL_DIR/scripts/wifi-watchdog.sh"
    curl -sSL "$REPO/scripts/display-wrapper.sh"               -o "$INSTALL_DIR/scripts/display-wrapper.sh"
    curl -sSL "$REPO/scripts/command-executor.py"              -o "$INSTALL_DIR/scripts/command-executor.py"
    curl -sSL "$REPO/wifi-portal/portal.py"                    -o "$INSTALL_DIR/wifi-portal/portal.py"
    curl -sSL "$REPO/services/wifi-setup.service"              -o /etc/systemd/system/wifi-setup.service
    curl -sSL "$REPO/services/mosque-portal.service"           -o /etc/systemd/system/mosque-portal.service
    curl -sSL "$REPO/services/mosque-kiosk.service"            -o /etc/systemd/system/mosque-kiosk.service
    curl -sSL "$REPO/services/mosque-wifi-watchdog.service"    -o /etc/systemd/system/mosque-wifi-watchdog.service
    curl -sSL "$REPO/services/mosque-kiosk-restart.service"    -o /etc/systemd/system/mosque-kiosk-restart.service
    curl -sSL "$REPO/services/mosque-kiosk-restart.timer"      -o /etc/systemd/system/mosque-kiosk-restart.timer
    curl -sSL "$REPO/services/mosque-commander.service"        -o /etc/systemd/system/mosque-commander.service
    log "Dateien von GitHub geladen"
fi

chmod +x "$INSTALL_DIR/scripts/"*.sh
sed -i "s|CMS_URL=.*|CMS_URL=\"$CMS_URL\"|" "$INSTALL_DIR/scripts/start-kiosk.sh"

# Brand-Ordner (Logo für WiFi-Portal)
mkdir -p "$INSTALL_DIR/brand"
chown -R "$KIOSK_USER:$KIOSK_USER" "$INSTALL_DIR"

# ── 3b. Brand-Logo: SVG → PNG konvertieren ───────────────────────────────────
section "Brand-Logo"
BRAND_SVG="$INSTALL_DIR/brand/logo.svg"
BRAND_PNG="$INSTALL_DIR/brand/logo.png"
if [ -f "$BRAND_SVG" ]; then
    if ! python3 -c "import cairosvg" 2>/dev/null; then
        info "cairosvg installieren (für SVG→PNG)..."
        pip3 install --quiet cairosvg 2>/dev/null || warn "cairosvg konnte nicht installiert werden"
    fi
    if python3 -c "import cairosvg" 2>/dev/null; then
        python3 - "$BRAND_SVG" "$BRAND_PNG" << 'PYEOF'
import sys, re
import cairosvg

src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    svg = f.read()

# Background-Rect entfernen
svg = re.sub(r'<path fill="#FCFCFC" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/>', '', svg)
# Standard-Fill weiß
svg = svg.replace('<svg ', '<svg fill="#FFFFFF" ', 1)
# Navy → Weiß
svg = svg.replace('fill="#0D0C4D"', 'fill="#FFFFFF"')
# Weiße Gegen-Formen → dunkler Hintergrund
svg = svg.replace('fill="#FCFCFC"', 'fill="#09090b"')

cairosvg.svg2png(bytestring=svg.encode(), write_to=dst,
                 output_width=512, output_height=512)
PYEOF
        log "logo.svg → logo.png konvertiert"
    else
        warn "cairosvg nicht verfügbar — SVG-Konvertierung übersprungen"
    fi
fi

# ── 4. Pi 4 config.txt ───────────────────────────────────────────────────────
section "Pi 4 Display-Konfiguration"

# Backup
cp "$CONFIG_TXT" "${CONFIG_TXT}.bak" 2>/dev/null || true

# Pi 4 Wayland/KMS Setup
python3 - << 'PYEOF'
import re, os

conf = "/boot/firmware/config.txt"
with open(conf) as f:
    content = f.read()

settings = {
    # KMS-Treiber (Pflicht für Wayland auf Pi 4)
    "dtoverlay=vc4-kms-v3d":    True,
    # HDMI immer aktiv (auch ohne Monitor beim Start)
    "hdmi_force_hotplug=1":     True,
    # HDMI0 maximale Auflösung erzwingen
    "hdmi_drive=2":             True,
    # GPU-Speicher für Hardware-Dekodierung (Pi 4)
    "gpu_mem=128":              True,
    # Maximale Prozessor-Performance
    "arm_boost=1":              True,
    # Kein Regenbogen-Splash
    "disable_splash=1":         True,
    # fkms entfernen (veraltet, führt zu Konflikten)
    "dtoverlay=vc4-fkms-v3d":   False,
}

lines = content.split('\n')
result = []
skip_keys = {k.split('=')[0] for k, v in settings.items() if not v}

for line in lines:
    stripped = line.strip()
    # Zeilen entfernen die wir überschreiben
    should_skip = any(
        stripped == k or stripped.startswith(k.split('=')[0] + '=')
        for k in list(settings.keys()) + list(skip_keys)
    )
    if not should_skip:
        result.append(line)

# Pi 4 Block hinzufügen
result.append('')
result.append('[pi4]')
for k, v in settings.items():
    if v:
        result.append(k)
result.append('[all]')

with open(conf, 'w') as f:
    f.write('\n'.join(result))

print(f"  config.txt aktualisiert")
PYEOF

log "Pi 4 config.txt konfiguriert"

# ── 5. Kernel-Parameter (schneller Boot, kein Splash) ─────────────────────────
section "Boot-Parameter"
CMDLINE="/boot/firmware/cmdline.txt"
if [ -f "$CMDLINE" ]; then
    # quiet sicherstellen
    if ! grep -q "quiet" "$CMDLINE"; then
        sed -i 's/$/ quiet/' "$CMDLINE"
    fi
    # splash entfernen falls vorhanden (Plymouth deaktiviert)
    sed -i 's/ splash//g; s/ plymouth\.ignore-serial-consoles//g' "$CMDLINE"
    # DPMS/Screen-Blanking im Kernel deaktivieren
    if ! grep -q "consoleblank=0" "$CMDLINE"; then
        sed -i 's/$/ consoleblank=0/' "$CMDLINE"
    fi
    log "cmdline.txt aktualisiert"
fi

# Plymouth komplett deaktivieren (falls bereits installiert)
systemctl mask plymouth.service plymouth-start.service plymouth-quit.service plymouth-quit-wait.service 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true

# ── 6. Geräte-ID ─────────────────────────────────────────────────────────────
section "Geräte-ID"
if [ ! -f "$DEVICE_CONF" ]; then
    SERIAL=$(cat /proc/cpuinfo | grep Serial | awk '{print $3}' | tail -c 9 | tr -d '[:space:]')
    if [ -z "$SERIAL" ] || [ "$SERIAL" = "0000000000000000" ]; then
        SERIAL=$(cat /proc/sys/kernel/random/uuid | tr -d '-' | head -c 12)
    fi
    DEVICE_ID="pi-$SERIAL"
    mkdir -p "$(dirname "$DEVICE_CONF")"
    echo "{\"id\": \"$DEVICE_ID\"}" > "$DEVICE_CONF"
    log "Geräte-ID generiert: $DEVICE_ID"
else
    DEVICE_ID=$(python3 -c "import json; print(json.load(open('$DEVICE_CONF'))['id'])" 2>/dev/null || echo "?")
    log "Geräte-ID bereits vorhanden: $DEVICE_ID"
fi

# ── 7. mDNS / Hostname ───────────────────────────────────────────────────────
section "Hostname & mDNS"
hostnamectl set-hostname mosque-screen 2>/dev/null || hostname mosque-screen
echo "mosque-screen" > /etc/hostname
grep -q "mosque-screen" /etc/hosts || echo "127.0.1.1 mosque-screen" >> /etc/hosts
systemctl enable avahi-daemon 2>/dev/null || true
log "Hostname: mosque-screen (mosque-screen.local)"

# ── 8. Auto-Login auf tty1 ───────────────────────────────────────────────────
section "Auto-Login"
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KIOSK_USER --noclear %I \$TERM
EOF
log "Auto-Login für '$KIOSK_USER' auf tty1"

# ── 9. Systemd-Lingering (XDG_RUNTIME_DIR beim Boot) ─────────────────────────
loginctl enable-linger "$KIOSK_USER" 2>/dev/null || true

# ── 10. Hardware Watchdog ─────────────────────────────────────────────────────
section "Hardware Watchdog"
# bcm2835_wdt: Pi-eigener Watchdog — startet Pi neu wenn OS einfriert
echo 'bcm2835-wdt' >> /etc/modules 2>/dev/null || true
if command -v apt-get &>/dev/null; then
    apt-get install -y --no-install-recommends watchdog 2>/dev/null || true
fi
if [ -f /etc/watchdog.conf ]; then
    cat > /etc/watchdog.conf << 'WDEOF'
watchdog-device     = /dev/watchdog
watchdog-timeout    = 15
retry-timeout       = 60
interval            = 5
realtime            = yes
priority            = 1
WDEOF
    systemctl enable watchdog 2>/dev/null || true
    log "Hardware-Watchdog aktiviert"
fi

# ── 11. Log-Rotation ─────────────────────────────────────────────────────────
section "Log-Rotation"
cat > /etc/logrotate.d/mosque << 'LREOF'
/var/log/mosque-wifi.log
/var/log/mosque-kiosk.log
{
    daily
    rotate 7
    compress
    missingok
    notifempty
}
LREOF
log "Log-Rotation konfiguriert"

# ── 12. Services aktivieren ───────────────────────────────────────────────────
section "Services aktivieren"
systemctl daemon-reload
systemctl enable wifi-setup.service
systemctl enable mosque-portal.service
systemctl enable mosque-kiosk.service
systemctl enable mosque-wifi-watchdog.service
systemctl enable mosque-kiosk-restart.timer
systemctl enable mosque-commander.service
log "wifi-setup, mosque-portal, mosque-kiosk, wifi-watchdog, nightly-restart, mosque-commander aktiviert"

# ── Zusammenfassung ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup abgeschlossen! ✓                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  CMS-URL:    ${BLUE}$CMS_URL${NC}"
echo -e "  Geräte-ID:  ${BLUE}$DEVICE_ID${NC}"
echo -e "  Hostname:   ${BLUE}mosque-screen.local${NC}"
echo ""
echo "  Nach dem Neustart:"
echo "  1. Pi erstellt Hotspot: Minara-XXXXX (offen, kein Passwort)"
echo "  2. Mit Handy verbinden → Browser → http://192.168.4.1:8080"
echo "  3. Heimnetz auswählen + ggf. Passwort → Verbinden"
echo "  4. Kiosk startet → Pairing-Code im CMS eingeben"
echo ""
echo -e "  WiFi später ändern: ${BLUE}http://mosque-screen.local:8080${NC}"
echo ""

read -rp "  Jetzt neu starten? (j/N) " REPLY
if [[ "$REPLY" =~ ^[Jj]$ ]]; then
    reboot
fi
