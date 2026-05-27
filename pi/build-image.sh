#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Minara — Pi 4 Image Builder
#
# Erzeugt ein fertiges .img das direkt geflasht werden kann.
# Ausführen auf dem Server (x86_64 Linux):
#   sudo bash pi/build-image.sh
#
# Benötigt: qemu-user-static, systemd-nspawn ODER chroot
# Output:   pi/output/minara-pi4.img.xz
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Konfiguration ─────────────────────────────────────────────────────────────
CMS_URL="https://mosque.401dev.de/tv"
PI_OS_URL="https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2024-11-19/2024-11-19-raspios-bookworm-arm64-lite.img.xz"
PI_OS_SHA="http://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2024-11-19/2024-11-19-raspios-bookworm-arm64-lite.img.xz.sha256"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$SCRIPT_DIR/output"
IMG_XZ="$WORK_DIR/raspios-base.img.xz"
IMG_RAW="$WORK_DIR/raspios-base.img"
IMG_OUT="$WORK_DIR/minara-pi4.img"
MOUNT_BOOT="$WORK_DIR/mnt/boot"
MOUNT_ROOT="$WORK_DIR/mnt/root"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${GREEN}[✓]${NC} $*"; }
info()    { echo -e "${BLUE}[→]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
err()     { echo -e "${RED}[✗]${NC} $*"; cleanup; exit 1; }
section() { echo -e "\n${BLUE}═══ $* ═══${NC}"; }

LOOP_DEV=""

cleanup() {
    info "Cleanup..."
    umount "$MOUNT_ROOT/boot/firmware" 2>/dev/null || true
    umount "$MOUNT_ROOT/proc"          2>/dev/null || true
    umount "$MOUNT_ROOT/sys"           2>/dev/null || true
    umount "$MOUNT_ROOT/dev/pts"       2>/dev/null || true
    umount "$MOUNT_ROOT/dev"           2>/dev/null || true
    umount "$MOUNT_ROOT"               2>/dev/null || true
    umount "$MOUNT_BOOT"               2>/dev/null || true
    [ -n "$LOOP_DEV" ] && losetup -d "$LOOP_DEV" 2>/dev/null || true
}
trap cleanup EXIT

[ "$(id -u)" -eq 0 ] || err "Bitte mit sudo ausführen"

# ── Abhängigkeiten prüfen ─────────────────────────────────────────────────────
section "Abhängigkeiten prüfen"
for cmd in wget xz losetup parted mount chroot; do
    command -v "$cmd" &>/dev/null || err "Fehlt: $cmd"
done

# qemu für ARM64 chroot auf x86_64
if ! command -v qemu-aarch64-static &>/dev/null; then
    info "qemu-user-static installieren..."
    apt-get install -y qemu-user-static binfmt-support 2>/dev/null
    update-binfmts --enable qemu-aarch64 2>/dev/null || true
fi

# cairosvg für SVG→PNG Konvertierung (nur nötig wenn logo.svg vorhanden)
if [ -f "$SCRIPT_DIR/brand/logo.svg" ]; then
    if ! python3 -c "import cairosvg" 2>/dev/null; then
        info "cairosvg installieren (für SVG→PNG)..."
        pip3 install --quiet cairosvg 2>/dev/null || err "cairosvg konnte nicht installiert werden (pip3 install cairosvg)"
    fi
fi
log "Alle Abhängigkeiten vorhanden"

# ── Verzeichnisse ─────────────────────────────────────────────────────────────
mkdir -p "$WORK_DIR" "$MOUNT_BOOT" "$MOUNT_ROOT"

# ── Pi OS herunterladen ───────────────────────────────────────────────────────
section "Pi OS Lite herunterladen"
if [ ! -f "$IMG_XZ" ]; then
    info "Download: $(basename $PI_OS_URL)"
    info "Größe: ~500 MB — kann einige Minuten dauern..."
    wget -q --show-progress -O "$IMG_XZ" "$PI_OS_URL" || err "Download fehlgeschlagen"
    log "Download abgeschlossen"
else
    log "Bereits vorhanden: $IMG_XZ"
fi

# ── Entpacken ─────────────────────────────────────────────────────────────────
section "Image entpacken"
if [ ! -f "$IMG_RAW" ]; then
    info "Entpacke (kann 1–2 Minuten dauern)..."
    xz -dk "$IMG_XZ" -T0
    # xz -dk entpackt direkt nach ${IMG_XZ%.xz} = $IMG_RAW — kein mv nötig
    [ -f "$IMG_RAW" ] || err "Entpackt, aber $IMG_RAW nicht gefunden"
    log "Entpackt: $IMG_RAW"
else
    log "Bereits entpackt: $IMG_RAW"
fi

# ── Image vergrößern (Platz für unsere Pakete) ────────────────────────────────
section "Image vergrößern (+1.5 GB)"
cp "$IMG_RAW" "$IMG_OUT"
truncate -s +1536M "$IMG_OUT"

# Partition 2 vergrößern
LOOP_DEV=$(losetup -f --show -P "$IMG_OUT")
log "Loop-Device: $LOOP_DEV"

parted -s "$LOOP_DEV" resizepart 2 100% 2>/dev/null || true
e2fsck -f "${LOOP_DEV}p2" 2>/dev/null || true
resize2fs "${LOOP_DEV}p2" 2>/dev/null
log "Partition vergrößert"

# ── Mounten ───────────────────────────────────────────────────────────────────
section "Image mounten"
mount "${LOOP_DEV}p2" "$MOUNT_ROOT"
mount "${LOOP_DEV}p1" "$MOUNT_ROOT/boot/firmware"

# Proc/sys/dev für chroot
mount -t proc  proc    "$MOUNT_ROOT/proc"
mount -t sysfs sysfs   "$MOUNT_ROOT/sys"
mount --bind   /dev    "$MOUNT_ROOT/dev"
mount --bind   /dev/pts "$MOUNT_ROOT/dev/pts"

# qemu-static für ARM64 emulation
cp /usr/bin/qemu-aarch64-static "$MOUNT_ROOT/usr/bin/" 2>/dev/null || true
log "Gemountet"

# ── Dateien kopieren ──────────────────────────────────────────────────────────
section "Mosque-Signage Dateien kopieren"
mkdir -p "$MOUNT_ROOT/opt/mosque/"{scripts,wifi-portal,brand}

cp "$SCRIPT_DIR/scripts/wifi-setup.sh"         "$MOUNT_ROOT/opt/mosque/scripts/"
cp "$SCRIPT_DIR/scripts/start-kiosk.sh"        "$MOUNT_ROOT/opt/mosque/scripts/"
cp "$SCRIPT_DIR/scripts/wifi-watchdog.sh"       "$MOUNT_ROOT/opt/mosque/scripts/"
cp "$SCRIPT_DIR/scripts/display-wrapper.sh"     "$MOUNT_ROOT/opt/mosque/scripts/"
cp "$SCRIPT_DIR/scripts/command-executor.py"    "$MOUNT_ROOT/opt/mosque/scripts/"
cp "$SCRIPT_DIR/wifi-portal/portal.py"          "$MOUNT_ROOT/opt/mosque/wifi-portal/"
cp "$SCRIPT_DIR/services/"*.service             "$MOUNT_ROOT/etc/systemd/system/"
cp "$SCRIPT_DIR/services/"*.timer               "$MOUNT_ROOT/etc/systemd/system/" 2>/dev/null || true
chmod +x "$MOUNT_ROOT/opt/mosque/scripts/"*.sh

# CMS-URL eintragen
sed -i "s|CMS_URL=.*|CMS_URL=\"$CMS_URL\"|" "$MOUNT_ROOT/opt/mosque/scripts/start-kiosk.sh"

# Plymouth-Theme kopieren
THEME_SRC="$SCRIPT_DIR/plymouth/minara"
THEME_DST="$MOUNT_ROOT/usr/share/plymouth/themes/minara"
mkdir -p "$THEME_DST"
cp "$THEME_SRC/minara.plymouth" "$THEME_DST/"
cp "$THEME_SRC/minara.script"   "$THEME_DST/"
cp "$THEME_SRC/generate-logo.py"        "$THEME_DST/"

# Logo: SVG → PNG konvertieren (falls logo.svg vorhanden), sonst logo.png direkt nutzen
BRAND_PNG="$SCRIPT_DIR/brand/logo.png"
if [ -f "$SCRIPT_DIR/brand/logo.svg" ]; then
    info "Konvertiere logo.svg → logo.png..."
    python3 - "$SCRIPT_DIR/brand/logo.svg" "$BRAND_PNG" << 'PYEOF'
import sys, re
import cairosvg

src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    svg = f.read()

# Background-Rect entfernen
svg = re.sub(r'<path fill="#FCFCFC" d="M0 0L1024 0L1024 1024L0 1024L0 0Z"/>', '', svg)
# Standard-Fill weiß (Pfade ohne explizites fill)
svg = svg.replace('<svg ', '<svg fill="#FFFFFF" ', 1)
# Navy → Weiß
svg = svg.replace('fill="#0D0C4D"', 'fill="#FFFFFF"')
# Weiße Gegen-Formen → dunkler Hintergrund
svg = svg.replace('fill="#FCFCFC"', 'fill="#09090b"')

cairosvg.svg2png(bytestring=svg.encode(), write_to=dst,
                 output_width=512, output_height=512)
PYEOF
    log "logo.svg → logo.png konvertiert"
fi

if [ -f "$BRAND_PNG" ]; then
    cp "$BRAND_PNG" "$THEME_DST/logo.png"
    # auch für WiFi-Portal
    cp "$BRAND_PNG" "$MOUNT_ROOT/opt/mosque/brand/logo.png"
    log "Brand-Logo ins Theme + Portal kopiert"
fi

# brand.json auf FAT32-Partition (editierbar ohne SSH)
if [ -f "$SCRIPT_DIR/brand/brand.json" ]; then
    cp "$SCRIPT_DIR/brand/brand.json" "$MOUNT_ROOT/boot/firmware/brand.json"
    log "brand.json auf /boot/firmware/ kopiert"
fi

log "Dateien kopiert"

# ── Im chroot installieren ────────────────────────────────────────────────────
section "Pakete installieren (ARM64 chroot)"
info "Das dauert 5–10 Minuten..."

chroot "$MOUNT_ROOT" /bin/bash << 'CHROOT_EOF'
set -e

export DEBIAN_FRONTEND=noninteractive
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Service-Start im chroot verhindern (kein Init-System vorhanden)
# policy-rc.d mit Exit 101 = "action not allowed" → apt startet keine Services
echo '#!/bin/sh
exit 101' > /usr/sbin/policy-rc.d
chmod +x /usr/sbin/policy-rc.d

# Pakete
apt-get update -qq
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
    plymouth \
    plymouth-themes \
    wlr-randr \
    2>/dev/null

apt-get clean
rm -rf /var/lib/apt/lists/*

# policy-rc.d wieder entfernen
rm -f /usr/sbin/policy-rc.d

# ── Pi OS Bookworm: First-Boot-Wizard komplett deaktivieren ──────────────────
# userconfig.service fragt interaktiv nach Username/Passwort → fatal für Kiosk
systemctl disable userconfig    2>/dev/null || true
systemctl mask    userconfig    2>/dev/null || true
# piwiz = grafischer Einrichtungsassistent (falls vorhanden)
rm -f /etc/xdg/autostart/piwiz.desktop 2>/dev/null || true
# Wpa-roam fragt ebenfalls nach User-Input unterdrücken
rm -f /etc/profile.d/sshpwd.sh 2>/dev/null || true

# Kiosk-User anlegen
useradd -m -u 1001 -s /bin/bash kiosk 2>/dev/null || true
usermod -aG video,audio,input,render,netdev,tty kiosk
# Passwort setzen — nötig damit userconfig.service den User als "konfiguriert" akzeptiert
echo "kiosk:kiosk" | chpasswd

# XDG_RUNTIME_DIR
mkdir -p /run/user/1001
chown kiosk:kiosk /run/user/1001
chmod 700 /run/user/1001

# Auto-Login
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin kiosk --noclear %I $TERM
EOF

# Services aktivieren
systemctl disable hostapd dnsmasq 2>/dev/null || true
systemctl enable wifi-setup.service
systemctl enable mosque-portal.service
systemctl enable mosque-kiosk.service
systemctl enable mosque-wifi-watchdog.service
systemctl enable mosque-kiosk-restart.timer
systemctl enable mosque-commander.service
systemctl enable avahi-daemon

# Plymouth Boot-Theme aktivieren
THEME_DIR="/usr/share/plymouth/themes/minara"
if [ -d "$THEME_DIR" ]; then
    # Logo generieren falls keins vorhanden
    if [ ! -f "$THEME_DIR/logo.png" ] && [ -f "$THEME_DIR/generate-logo.py" ]; then
        python3 "$THEME_DIR/generate-logo.py" 2>/dev/null || true
    fi
    # Theme als Standard setzen
    plymouth-set-default-theme minara 2>/dev/null || true
    # Initramfs aktualisieren — Hinweis: in QEMU-Chroot kann dies fehlschlagen.
    # Deshalb läuft update-initramfs NOCHMALS im firstrun (echte ARM-Hardware, Boot 2+).
    echo "[chroot] Starte update-initramfs (kann 1–2 Min dauern)..."
    update-initramfs -u -k all && echo "[chroot] initramfs OK" || echo "[chroot] WARNUNG: update-initramfs fehlgeschlagen — firstrun repariert es"
    echo "[chroot] Plymouth-Theme: minara"
fi

# Plymouth-quit Timeout: verhindert ewigen Hang wenn plymouthd nicht startet (z.B. Boot 1 mit QEMU-initramfs)
mkdir -p /etc/systemd/system/plymouth-quit.service.d
cat > /etc/systemd/system/plymouth-quit.service.d/timeout.conf << 'PLEOF'
[Service]
TimeoutSec=10
PLEOF
mkdir -p /etc/systemd/system/plymouth-quit-wait.service.d
cat > /etc/systemd/system/plymouth-quit-wait.service.d/timeout.conf << 'PLEOF'
[Service]
TimeoutSec=10
PLEOF
echo "[chroot] Plymouth-Quit Timeout: 10s"

# Hardware Watchdog
echo 'bcm2835-wdt' >> /etc/modules
apt-get install -y --no-install-recommends watchdog 2>/dev/null || true
cat > /etc/watchdog.conf << 'WDEOF'
watchdog-device     = /dev/watchdog
watchdog-timeout    = 15
retry-timeout       = 60
interval            = 5
realtime            = yes
priority            = 1
WDEOF
systemctl enable watchdog 2>/dev/null || true

# Log-Rotation
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

# Linger aktivieren
loginctl enable-linger kiosk 2>/dev/null || true

# Hostname
echo "mosque-screen" > /etc/hostname
grep -q "mosque-screen" /etc/hosts || echo "127.0.1.1 mosque-screen" >> /etc/hosts

# Geräte-ID wird beim ersten Boot aus der Seriennummer generiert
# (noch nicht hier, da wir die Seriennummer noch nicht kennen)

echo "[chroot] Fertig"
CHROOT_EOF

log "Pakete installiert"

# ── config.txt für Pi 4 ───────────────────────────────────────────────────────
section "Pi 4 config.txt"
CONFIG="$MOUNT_ROOT/boot/firmware/config.txt"

# Vorhandene vc4-Einträge entfernen
sed -i '/dtoverlay=vc4/d' "$CONFIG"
sed -i '/gpu_mem/d' "$CONFIG"

cat >> "$CONFIG" << 'EOF'

[pi4]
dtoverlay=vc4-kms-v3d
hdmi_force_hotplug=1
hdmi_drive=2
gpu_mem=128
arm_boost=1
disable_splash=0
[all]
EOF
log "config.txt aktualisiert"

# ── firstrun.sh: Geräte-ID beim ersten Boot ──────────────────────────────────
# WICHTIG: kein systemd.unit=kernel-command-line.target mehr — Plymouth-quit.service
# gehört zu multi-user.target und wird sonst nie ausgelöst → Plymouth hängt.
# Stattdessen: oneshot-Service der sich nach Ausführung selbst deaktiviert.
section "First-Boot Script"
cat > "$MOUNT_ROOT/boot/firmware/firstrun.sh" << 'EOF'
#!/bin/bash
# Läuft einmalig beim allerersten Boot (via minara-firstrun.service)
# 1. Pi OS First-Boot-Wizard sicher deaktivieren
# 2. Geräte-ID aus Pi-Seriennummer generieren
# 3. Plymouth-initramfs auf echter ARM-Hardware neu bauen (Boot 2 → Plymouth funktioniert sauber)

# Sicherheitsnetz: userconfig nochmal deaktivieren (Bookworm-Quirk)
systemctl disable userconfig 2>/dev/null || true
systemctl mask    userconfig 2>/dev/null || true
rm -f /etc/xdg/autostart/piwiz.desktop 2>/dev/null || true

DEVICE_CONF="/boot/firmware/device.json"

if [ ! -f "$DEVICE_CONF" ]; then
    SERIAL=$(grep Serial /proc/cpuinfo | awk '{print $3}' | tail -c 9 | tr -d '[:space:]')
    [ -z "$SERIAL" ] && SERIAL=$(tr -d '-' < /proc/sys/kernel/random/uuid | head -c 12)
    echo "{\"id\": \"pi-$SERIAL\"}" > "$DEVICE_CONF"
fi

# Plymouth-initramfs auf echter ARM-Hardware regenerieren.
# Das QEMU-generierte initramfs aus dem Image-Build kann broken sein.
# Ab Boot 2 ist das initramfs korrekt → plymouth-quit.service hängt nicht mehr.
if command -v update-initramfs &>/dev/null; then
    update-initramfs -u -k all 2>/dev/null && \
        echo "[firstrun] Plymouth initramfs regeneriert (ARM)" || \
        echo "[firstrun] WARNUNG: update-initramfs fehlgeschlagen"
fi

# Service nach einmaligem Ausführen deaktivieren
systemctl disable minara-firstrun.service 2>/dev/null || true
EOF
chmod +x "$MOUNT_ROOT/boot/firmware/firstrun.sh"

# Systemd-Service für firstrun
# Läuft nach multi-user.target (Plymouth ist dann bereits beendet).
# update-initramfs auf echter ARM-Hardware → ab Boot 2 ist Plymouth korrekt.
cat > "$MOUNT_ROOT/etc/systemd/system/minara-firstrun.service" << 'EOF'
[Unit]
Description=Minara First-Boot Setup (Geräte-ID + Plymouth initramfs)
After=multi-user.target
ConditionPathExists=/boot/firmware/firstrun.sh

[Service]
Type=oneshot
ExecStart=/boot/firmware/firstrun.sh
RemainAfterExit=no
StandardOutput=journal
StandardError=journal
# update-initramfs kann 2–3 Min dauern auf langsamer SD-Karte
TimeoutSec=300

[Install]
WantedBy=multi-user.target
EOF

# Service im chroot aktivieren
chroot "$MOUNT_ROOT" systemctl enable minara-firstrun.service 2>/dev/null || true

# cmdline.txt: consoleblank=0 + quiet splash (Plymouth grafischer Modus)
CMDLINE="$MOUNT_ROOT/boot/firmware/cmdline.txt"
if ! grep -q "consoleblank=0" "$CMDLINE"; then
    sed -i 's/$/ consoleblank=0/' "$CMDLINE"
fi
# quiet splash aktiviert Plymouths grafischen Theme-Modus
# ohne splash läuft Plymouth im Textmodus und kann bei Terminate hängen
if ! grep -q "splash" "$CMDLINE"; then
    sed -i 's/quiet/quiet splash plymouth.ignore-serial-consoles/' "$CMDLINE"
fi
log "First-Boot Service + consoleblank=0 + splash eingerichtet"

# ── SSH aktivieren (für Wartung) ──────────────────────────────────────────────
touch "$MOUNT_ROOT/boot/firmware/ssh"
log "SSH aktiviert"

# ── Aufräumen ─────────────────────────────────────────────────────────────────
section "Aufräumen"
rm -f "$MOUNT_ROOT/usr/bin/qemu-aarch64-static"
log "qemu entfernt"

# cleanup() läuft automatisch via trap

# ── Komprimieren ──────────────────────────────────────────────────────────────
section "Image komprimieren"
info "Komprimiere mit xz (kann 5–10 Minuten dauern)..."
xz -z -T0 -9 --keep "$IMG_OUT"

FINAL="$WORK_DIR/minara-pi4.img.xz"
SIZE=$(du -sh "$FINAL" | cut -f1)

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Image fertig! ✓                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Datei: ${BLUE}$FINAL${NC}"
echo -e "  Größe: ${BLUE}$SIZE${NC}"
echo ""
echo "  Flashen:"
echo "  → Raspberry Pi Imager öffnen"
echo "  → 'Custom Image' wählen → minara-pi4.img.xz"
echo "  → Auf SD-Karte schreiben"
echo "  → Pi einschalten → fertig"
echo ""
