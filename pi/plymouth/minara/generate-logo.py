#!/usr/bin/env python3
"""
Erzeugt ein einfaches Text-Logo als PNG (kein Pillow nötig — reines Python).
Wird nur ausgeführt wenn kein eigenes logo.png vorhanden ist.
Output: logo.png im selben Verzeichnis.
"""
import struct, zlib, math, sys, os

OUT = os.path.join(os.path.dirname(__file__), "logo.png")

# ── Minimaler PNG-Writer ──────────────────────────────────────────────────────

def png_chunk(tag: bytes, data: bytes) -> bytes:
    c = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", c)


def write_png(path: str, w: int, h: int, rgba_rows: list[bytes]) -> None:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = png_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    raw = b"".join(b"\x00" + row for row in rgba_rows)
    idat = png_chunk(b"IDAT", zlib.compress(raw, 9))
    iend = png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(sig + ihdr + idat + iend)


def rgba(r, g, b, a=255) -> bytes:
    return bytes([r, g, b, a])


# ── Logo zeichnen ─────────────────────────────────────────────────────────────
# 320 × 80 px  — weißer Text "MINARA" auf transparentem Grund
W, H = 320, 80

# Pixel-Schriftdaten für "MINARA" — 5×7 Bitmap-Font, nur A-Z + Leerzeichen
FONT = {
    'A': ["01110","10001","10001","11111","10001","10001","10001"],
    'B': ["11110","10001","10001","11110","10001","10001","11110"],
    'C': ["01111","10000","10000","10000","10000","10000","01111"],
    'D': ["11110","10001","10001","10001","10001","10001","11110"],
    'E': ["11111","10000","10000","11110","10000","10000","11111"],
    'F': ["11111","10000","10000","11110","10000","10000","10000"],
    'G': ["01111","10000","10000","10011","10001","10001","01111"],
    'H': ["10001","10001","10001","11111","10001","10001","10001"],
    'I': ["11111","00100","00100","00100","00100","00100","11111"],
    'L': ["10000","10000","10000","10000","10000","10000","11111"],
    'M': ["10001","11011","10101","10101","10001","10001","10001"],
    'N': ["10001","11001","10101","10011","10001","10001","10001"],
    'O': ["01110","10001","10001","10001","10001","10001","01110"],
    'P': ["11110","10001","10001","11110","10000","10000","10000"],
    'Q': ["01110","10001","10001","10001","10101","10010","01101"],
    'R': ["11110","10001","10001","11110","10100","10010","10001"],
    'S': ["01111","10000","10000","01110","00001","00001","11110"],
    'T': ["11111","00100","00100","00100","00100","00100","00100"],
    'U': ["10001","10001","10001","10001","10001","10001","01110"],
    'E': ["11111","10000","10000","11110","10000","10000","11111"],
    ' ': ["00000","00000","00000","00000","00000","00000","00000"],
}

TEXT = "MINARA"
SCALE = 2
CHAR_W = 5 * SCALE
CHAR_H = 7 * SCALE
GAP = SCALE  # Abstand zwischen Zeichen

total_w = len(TEXT) * (CHAR_W + GAP) - GAP
offset_x = (W - total_w) // 2
offset_y = (H - CHAR_H) // 2

pixels = [bytearray(W * 4) for _ in range(H)]  # RGBA, transparent

for ci, ch in enumerate(TEXT):
    glyph = FONT.get(ch, FONT[' '])
    cx = offset_x + ci * (CHAR_W + GAP)
    for row_i, bits in enumerate(glyph):
        for col_i, bit in enumerate(bits):
            if bit == '1':
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        px = cx + col_i * SCALE + sx
                        py = offset_y + row_i * SCALE + sy
                        if 0 <= px < W and 0 <= py < H:
                            idx = px * 4
                            pixels[py][idx:idx+4] = [255, 255, 255, 255]

rows = [bytes(row) for row in pixels]
write_png(OUT, W, H, rows)
print(f"Logo erstellt: {OUT}")
