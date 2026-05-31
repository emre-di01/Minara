#!/bin/bash
# patch-sd.sh — Patcht eine gemountete SD-Karte mit den aktuellen Service-Files
# Ausführen: sudo bash pi/patch-sd.sh [/dev/sdX]
# Ohne Argument: versucht SD-Karte automatisch zu finden

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${BLUE}[→]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Bitte mit sudo ausführen: sudo bash pi/patch-sd.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOUNT="/mnt/minara-patch"

# ── SD-Karte finden ──────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
    DEV="${1%p2}${1##*[^p2]}"  # normalize
    PART="${1}"
    # Wenn nur /dev/sdX angegeben, nutze Partition 2
    if [[ "$1" =~ ^/dev/sd[a-z]$ ]] || [[ "$1" =~ ^/dev/mmcblk[0-9]$ ]]; then
        if [[ "$1" =~ mmcblk ]]; then
            PART="${1}p2"
        else
            PART="${1}2"
        fi
    fi
else
    info "Suche SD-Karte automatisch..."
    # Suche nach ext4-Partition die wie ein Pi-Root aussieht
    PART=$(blkid | grep ext4 | grep -v "loop\|sda\|nvme" | head -1 | cut -d: -f1 || true)
    if [ -z "$PART" ]; then
        err "Keine SD-Karte gefunden. Gerät manuell angeben: sudo bash pi/patch-sd.sh /dev/sdb"
    fi
    info "Gefunden: $PART"
fi

[ -b "$PART" ] || err "Gerät nicht gefunden: $PART"

# ── Mounten ──────────────────────────────────────────────────────────────────
mkdir -p "$MOUNT"
mount "$PART" "$MOUNT" || err "Mount fehlgeschlagen: $PART → $MOUNT"
trap "umount '$MOUNT' 2>/dev/null; rmdir '$MOUNT' 2>/dev/null" EXIT

# Sanity-Check: ist das wirklich ein Pi-Root?
[ -d "$MOUNT/etc/systemd/system" ] || err "Kein systemd-System unter $MOUNT — falsche Partition?"
[ -d "$MOUNT/opt/mosque" ]         || err "/opt/mosque nicht gefunden — kein Minara-Image?"

echo ""
echo -e "${BLUE}═══ Minara SD-Patch ═══${NC}"
info "Partition: $PART → $MOUNT"
echo ""

# ── Service-Files patchen ────────────────────────────────────────────────────
info "Service-Files aktualisieren..."
cp "$SCRIPT_DIR/services/mosque-kiosk.service"         "$MOUNT/etc/systemd/system/"
cp "$SCRIPT_DIR/services/mosque-commander.service"     "$MOUNT/etc/systemd/system/"
cp "$SCRIPT_DIR/services/mosque-wifi-watchdog.service" "$MOUNT/etc/systemd/system/"
log "mosque-kiosk.service, mosque-commander.service, mosque-wifi-watchdog.service"

# ── Scripts patchen ──────────────────────────────────────────────────────────
info "Scripts aktualisieren..."
cp "$SCRIPT_DIR/scripts/wifi-watchdog.sh" "$MOUNT/opt/mosque/scripts/"
chmod +x "$MOUNT/opt/mosque/scripts/wifi-watchdog.sh"
log "wifi-watchdog.sh"

# ── Getty-Autologin entfernen (kollidiert mit PAMName=login) ─────────────────
info "Getty@tty1 maskieren..."
rm -f "$MOUNT/etc/systemd/system/getty@tty1.service.d/autologin.conf"
ln -sf /dev/null "$MOUNT/etc/systemd/system/getty@tty1.service"
log "getty@tty1 maskiert"

# ── Fertig ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   SD-Karte gepatcht! ✓                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  SD-Karte kann jetzt rausgezogen werden."
echo "  Pi einschalten → bootet durch → Hotspot Minara-XXXXX erscheint."
echo ""
