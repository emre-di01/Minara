# Mosque Signage — Raspberry Pi Setup

## Hardware

| | |
|---|---|
| **Getestet** | Raspberry Pi 4 (2 GB / 4 GB / 8 GB) |
| **Display** | HDMI0 (erster HDMI-Port, näher am USB-C) |
| **Strom** | USB-C 5V/3A Netzteil (original Pi 4 Netzteil empfohlen) |
| **Speicher** | microSD 16 GB+ (Class 10 / A1) |
| **OS** | Raspberry Pi OS Lite **Bookworm 64-bit** (kein Desktop nötig) |

> ⚠️ HDMI **vor** dem Einschalten anschließen — Pi 4 erkennt den Monitor sonst nicht.

---

## Ersteinrichtung (5 Minuten)

### Schritt 1 — Image flashen

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) herunterladen
2. **OS wählen:** Raspberry Pi OS Lite (64-bit) — *kein Desktop nötig*
3. ⚙️ **Einstellungen** vor dem Flashen:
   - Hostname: `mosque-screen`
   - SSH aktivieren (für spätere Wartung)
   - Benutzer: `pi` / Passwort nach Wahl
4. Karte flashen → in Pi einlegen

### Schritt 2 — Setup-Script ausführen

Per SSH verbinden und ausführen:

```bash
curl -sSL https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi/install.sh | sudo bash
```

Oder wenn das Repo geklont ist:
```bash
cd mosque-signage/pi && sudo bash install.sh
```

### Schritt 3 — Neu starten

```bash
sudo reboot
```

---

## Erster Start (Plug & Play Flow)

```
┌─────────────────────────────────────────────────────┐
│  1. Pi bootet                                        │
│     ↓                                               │
│  2. Kein WLAN konfiguriert                          │
│     → Pi erstellt Hotspot: "MosqueScreen-XXXXX"    │
│     → Offen, kein Passwort                         │
│     ↓                                               │
│  3. Mit Handy/Laptop verbinden                      │
│     → Browser öffnet automatisch (Captive Portal)  │
│     → Sonst: http://192.168.4.1:8080               │
│     ↓                                               │
│  4. WLAN-Netz + Passwort eingeben → Verbinden       │
│     ↓                                               │
│  5. Pi verbindet sich → Kiosk startet               │
│     → mosque.401dev.de/tv                           │
│     → 6-stelliger Pairing-Code erscheint            │
│     ↓                                               │
│  6. CMS öffnen → Screens → "Screen koppeln"         │
│     → Code eingeben → fertig ✓                      │
└─────────────────────────────────────────────────────┘
```

---

## WLAN wechseln oder vergessen

Jederzeit erreichbar (auch wenn verbunden):

```
http://mosque-screen.local:8080
```

Oder wenn die IP bekannt ist: `http://[PI-IP]:8080`

Optionen auf der Portal-Seite:
- **Verbunden:** Zeigt aktuelles Netz + "Anderes WLAN wählen"
- **Nicht verbunden:** WiFi-Scanner + Verbinden-Formular

---

## Wartung per SSH

```bash
ssh pi@mosque-screen.local

# Logs
journalctl -u wifi-setup.service -f
journalctl -u mosque-kiosk.service -f
journalctl -u mosque-portal.service -f
cat /var/log/mosque-wifi.log

# Services
sudo systemctl status mosque-kiosk
sudo systemctl restart mosque-kiosk
sudo systemctl restart wifi-setup

# WLAN manuell zurücksetzen
sudo rm /boot/firmware/wifi.conf
sudo systemctl restart wifi-setup

# Geräte-ID anzeigen
cat /boot/firmware/device.json
```

---

## Datei-Struktur auf dem Pi

```
/opt/mosque/
├── scripts/
│   ├── wifi-setup.sh      – WiFi-Verbindung / Hotspot
│   └── start-kiosk.sh     – Chromium Kiosk
└── wifi-portal/
    └── portal.py          – Web-Portal (Port 8080)

/boot/firmware/
├── wifi.conf              – Gespeicherte WiFi-Daten (JSON)
└── device.json            – Geräte-ID (stabil, bleibt beim Update)

/etc/systemd/system/
├── wifi-setup.service     – Startet beim Boot
├── mosque-portal.service  – Portal läuft immer
└── mosque-kiosk.service   – Chromium nach WiFi-Verbindung
```

---

## Geräte-ID

Die Geräte-ID wird beim ersten Setup aus der Pi-Seriennummer generiert und in `/boot/firmware/device.json` gespeichert. Sie bleibt auch nach einem Image-Update erhalten (solange `/boot/firmware/` nicht gelöscht wird).

```json
{ "id": "pi-a1b2c3d4e" }
```

Diese ID entspricht der `hardware_id` im CMS. Nach einem Pairing muss das Gerät nicht neu gekoppelt werden, solange die `device.json` erhalten bleibt.

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Hotspot erscheint nicht | `sudo systemctl status wifi-setup` — meist fehlt `hostapd` |
| Kiosk startet nicht | `journalctl -u mosque-kiosk -n 50` |
| Schwarzer Bildschirm | HDMI vor dem Einschalten anschließen oder `hdmi_force_hotplug=1` in `/boot/firmware/config.txt` |
| Portal nicht erreichbar | `sudo systemctl status mosque-portal` |
| `mosque-screen.local` nicht gefunden | `sudo systemctl status avahi-daemon` |
| Falsches WLAN gespeichert | `sudo rm /boot/firmware/wifi.conf && sudo reboot` |
