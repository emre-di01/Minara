#!/usr/bin/env python3
"""
Minara – WiFi Setup Portal
Läuft immer auf Port 8080.
Beim Booten ohne WiFi: Pi ist Hotspot → User verbindet sich → öffnet 192.168.4.1:8080
Wenn schon verbunden: erreichbar via http://mosque-screen.local:8080
"""

import base64
import json
import os
import re
import subprocess
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

WIFI_CONF    = "/boot/firmware/wifi.conf"
DEVICE_CONF  = "/boot/firmware/device.json"
BRAND_CONF   = "/boot/firmware/brand.json"
LOGO_PATH    = "/opt/mosque/brand/logo.png"
AP_FLAG      = "/tmp/hotspot_active"


# ── Brand ─────────────────────────────────────────────────────────────────────

def get_brand() -> dict:
    """Liest Branding-Konfig. Fallback auf Defaults."""
    defaults = {
        "name":  "Minara",
        "color": "#10b981",          # Akzentfarbe (hex)
        "color_dark": "#064e3b",     # Dunkle Variante für Status-Boxen
    }
    if os.path.exists(BRAND_CONF):
        try:
            data = json.load(open(BRAND_CONF))
            defaults.update(data)
        except Exception:
            pass
    return defaults


def get_logo_data_uri() -> str | None:
    """Lädt logo.png und gibt Data-URI zurück, oder None."""
    if os.path.exists(LOGO_PATH):
        try:
            with open(LOGO_PATH, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            return f"data:image/png;base64,{b64}"
        except Exception:
            pass
    return None


# ── Device ────────────────────────────────────────────────────────────────────

def get_device_id() -> str:
    if os.path.exists(DEVICE_CONF):
        try:
            return json.load(open(DEVICE_CONF)).get("id", "unknown")
        except Exception:
            pass
    return "unknown"


def get_current_ssid() -> str:
    try:
        return subprocess.check_output(
            ["iwgetid", "-r"], stderr=subprocess.DEVNULL, text=True
        ).strip()
    except Exception:
        return ""


def get_saved_ssid() -> str:
    if os.path.exists(WIFI_CONF):
        try:
            return json.load(open(WIFI_CONF)).get("ssid", "")
        except Exception:
            pass
    return ""


def scan_networks() -> list[str]:
    try:
        out = subprocess.check_output(
            ["sudo", "iwlist", "wlan0", "scan"],
            stderr=subprocess.DEVNULL, text=True
        )
        ssids = re.findall(r'ESSID:"(.+?)"', out)
        seen, result = set(), []
        for s in ssids:
            if s and s not in seen:
                seen.add(s)
                result.append(s)
        return sorted(result)
    except Exception:
        return []


def save_wifi(ssid: str, password: str) -> None:
    os.makedirs(os.path.dirname(WIFI_CONF), exist_ok=True)
    with open(WIFI_CONF, "w") as f:
        json.dump({"ssid": ssid, "password": password}, f)


def forget_wifi() -> None:
    if os.path.exists(WIFI_CONF):
        os.remove(WIFI_CONF)


def trigger_wifi_restart() -> None:
    subprocess.Popen(
        ["sudo", "systemctl", "restart", "wifi-setup.service"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def is_hotspot_active() -> bool:
    return os.path.exists(AP_FLAG)


# ── HTML ──────────────────────────────────────────────────────────────────────

def render_page(body: str, title: str | None = None) -> bytes:
    brand     = get_brand()
    brand_name = brand["name"]
    accent    = brand["color"]
    accent_dk = brand["color_dark"]
    logo_uri  = get_logo_data_uri()
    device_id = get_device_id()
    page_title = title or brand_name

    # Logo: Bild wenn vorhanden, sonst nur Textname
    if logo_uri:
        logo_html = f'<img src="{logo_uri}" class="logo-img" alt="{brand_name}">'
    else:
        logo_html = f'<div class="logo-text">{brand_name}</div>'

    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{page_title}</title>
  <style>
    :root {{
      --accent:    {accent};
      --accent-dk: {accent_dk};
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0 }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #09090b;
      color: #e4e4e7;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }}
    .card {{
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }}
    .header {{
      text-align: center;
      margin-bottom: 1.75rem;
    }}
    .logo-img {{
      height: 48px;
      width: auto;
      object-fit: contain;
      margin-bottom: 0.75rem;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }}
    .logo-text {{
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }}
    .header-title {{
      font-size: 0.85rem;
      font-weight: 500;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    label {{
      display: block;
      font-size: 0.75rem;
      color: #a1a1aa;
      margin-bottom: 0.35rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    input, select {{
      width: 100%;
      background: #09090b;
      border: 1px solid #3f3f46;
      color: #e4e4e7;
      border-radius: 0.6rem;
      padding: 0.65rem 0.9rem;
      font-size: 0.9rem;
      outline: none;
      margin-bottom: 1.1rem;
      transition: border-color 0.15s;
    }}
    input:focus, select:focus {{ border-color: var(--accent); }}
    select option {{ background: #18181b; }}
    .btn {{
      width: 100%;
      padding: 0.72rem;
      border: none;
      border-radius: 0.6rem;
      font-size: 0.93rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      letter-spacing: 0.01em;
    }}
    .btn:active {{ transform: scale(0.98); }}
    .btn-primary  {{ background: var(--accent);    color: #fff; }}
    .btn-ghost    {{ background: #27272a; color: #a1a1aa; margin-top: 0.65rem; }}
    .btn-danger   {{ background: #3f0f0f; color: #f87171; margin-top: 0.65rem; }}
    .btn:hover    {{ opacity: 0.88; }}
    .status {{
      padding: 0.65rem 0.9rem;
      border-radius: 0.6rem;
      font-size: 0.83rem;
      margin-bottom: 1.1rem;
      text-align: center;
      line-height: 1.4;
    }}
    .status.ok   {{ background: var(--accent-dk); color: #6ee7b7; border: 1px solid #065f46; }}
    .status.err  {{ background: #3f0f0f;          color: #fca5a5; border: 1px solid #7f1d1d; }}
    .status.info {{ background: #172554;           color: #93c5fd; border: 1px solid #1e3a8a; }}
    .divider {{ border: none; border-top: 1px solid #27272a; margin: 1.25rem 0; }}
    .device-id {{
      text-align: center;
      color: #3f3f46;
      font-size: 0.68rem;
      margin-top: 1.75rem;
      font-family: 'SF Mono', 'Fira Mono', monospace;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      {logo_html}
      <div class="header-title">WiFi Einrichtung</div>
    </div>
    {body}
    <p class="device-id">{device_id}</p>
  </div>
</body>
</html>"""
    return html.encode()


def page_setup(networks: list[str], error: str = "", ssid_prefill: str = "") -> bytes:
    error_html = f'<div class="status err">{error}</div>' if error else ""
    options = "".join(
        f'<option value="{s}" {"selected" if s == ssid_prefill else ""}>{s}</option>'
        for s in networks
    )
    if not options:
        options = '<option value="">— Keine Netzwerke gefunden —</option>'

    body = f"""{error_html}
    <form method="POST" action="/connect">
      <label>WLAN-Netzwerk</label>
      <select name="ssid" id="ssid_select"
              onchange="document.getElementById('ssid_custom').value=this.value">
        <option value="">Netzwerk wählen…</option>
        {options}
      </select>
      <label>Oder manuell eingeben</label>
      <input type="text" name="ssid_manual" id="ssid_custom"
             placeholder="Netzwerkname (SSID)" value="{ssid_prefill}" autocomplete="off">
      <label>Passwort <span style="color:#52525b;text-transform:none;font-weight:400">(leer lassen wenn kein Passwort)</span></label>
      <input type="password" name="password" placeholder="••••••••" autocomplete="new-password">
      <button class="btn btn-primary" type="submit">Verbinden</button>
    </form>"""
    return render_page(body)


def page_connected(ssid: str) -> bytes:
    body = f"""
    <div class="status ok">Verbunden mit <strong>{ssid}</strong></div>
    <p style="font-size:0.84rem;color:#71717a;text-align:center;margin-bottom:1.5rem;line-height:1.6">
      Der Screen startet in Kürze.<br>
      Pairing-Code im CMS eingeben.
    </p>
    <hr class="divider">
    <form method="POST" action="/forget">
      <button class="btn btn-ghost" type="submit">Anderes WLAN wählen</button>
    </form>"""
    return render_page(body)


def page_connecting(ssid: str) -> bytes:
    body = f"""
    <div class="status info">Verbinde mit <strong>{ssid}</strong>…</div>
    <p style="font-size:0.84rem;color:#71717a;text-align:center;line-height:1.6">
      Bitte warten. Die Seite aktualisiert sich automatisch.
    </p>
    <script>setTimeout(() => location.href = '/', 7000)</script>"""
    return render_page(body)


def page_forgotten() -> bytes:
    body = """
    <div class="status info">WLAN gelöscht. Neustart…</div>
    <script>setTimeout(() => location.href = '/', 8000)</script>"""
    return render_page(body)


# ── HTTP Handler ───────────────────────────────────────────────────────────────

class PortalHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # suppress default logging

    def send(self, code: int, body: bytes, ctype: str = "text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def redirect(self, location: str):
        self.send_response(303)
        self.send_header("Location", location)
        self.end_headers()

    CAPTIVE_PATHS = {
        "/hotspot-detect.html", "/generate_204", "/connecttest.txt",
        "/ncsi.txt", "/success.txt", "/canonical.html",
    }

    def do_GET(self):
        path = urlparse(self.path).path
        if path in self.CAPTIVE_PATHS:
            self.redirect("http://192.168.4.1:8080/")
            return
        if path == "/":
            current = get_current_ssid()
            if current:
                self.send(200, page_connected(current))
            else:
                networks = scan_networks()
                self.send(200, page_setup(networks, ssid_prefill=get_saved_ssid()))
        else:
            self.send(404, b"Not found")

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode()
        params = parse_qs(raw)

        def p(key): return params.get(key, [""])[0].strip()

        if path == "/connect":
            ssid = p("ssid_manual") or p("ssid")
            if not ssid:
                self.send(200, page_setup(scan_networks(), error="Bitte ein Netzwerk wählen."))
                return
            save_wifi(ssid, p("password"))
            self.send(200, page_connecting(ssid))
            time.sleep(1)
            trigger_wifi_restart()

        elif path == "/forget":
            forget_wifi()
            self.send(200, page_forgotten())
            time.sleep(1)
            trigger_wifi_restart()

        else:
            self.redirect("/")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = 8080
    server = HTTPServer(("0.0.0.0", port), PortalHandler)
    print(f"[portal] Listening on :{port}")
    server.serve_forever()
