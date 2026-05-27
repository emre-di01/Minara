# Brand Assets

Dateien in diesem Ordner werden ins Image gebrannt und auf dem Pi unter
`/opt/mosque/brand/` abgelegt.

## logo.png

**Pflichtformat:** PNG, RGBA (Transparenz erlaubt), empfohlen: 320 × 80 px oder quadratisch.

- **Plymouth Boot-Splash:** Zentriert auf schwarzem Hintergrund (max. 320 px breit)
- **WiFi-Portal:** Im Kopfbereich der Setup-Seite (max. 48 px hoch)

Wenn keine `logo.png` vorhanden ist, wird automatisch ein Text-Logo mit dem
Schriftzug „MINARA" generiert.

## brand.json (optional)

Für das WiFi-Portal kann eine JSON-Datei mit Branding-Einstellungen abgelegt werden:

```json
{
  "name":       "Dein Firmenname",
  "color":      "#10b981",
  "color_dark": "#064e3b"
}
```

Diese Datei wird beim Image-Build nach `/boot/firmware/brand.json` kopiert
(FAT32 — editierbar von Windows/Mac ohne SSH).
