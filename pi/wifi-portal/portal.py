#!/usr/bin/env python3
"""
Mosque Signage – WiFi Setup Portal
Läuft immer auf Port 8080.
Beim Booten ohne WiFi: Pi ist Hotspot → User verbindet sich → öffnet 192.168.4.1:8080
Wenn schon verbunden: erreichbar via http://mosque-screen.local:8080
"""

import json
import os
import re
import subprocess
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

WIFI_CONF   = "/boot/firmware/wifi.conf"
DEVICE_CONF = "/boot/firmware/device.json"
AP_FLAG     = "/tmp/hotspot_active"


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_device_id() -> str:
    if os.path.exists(DEVICE_CONF):
        try:
            return json.load(open(DEVICE_CONF)).get("id", "unknown")
        except Exception:
            pass
    return "unknown"


def get_current_ssid() -> str:
    try:
        out = subprocess.check_output(
            ["iwgetid", "-r"], stderr=subprocess.DEVNULL, text=True
        ).strip()
        return out or ""
    except Exception:
        return ""


def get_saved_ssid() -> str:
    if os.path.exists(WIFI_CONF):
        try:
            cfg = json.load(open(WIFI_CONF))
            return cfg.get("ssid", "")
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
        # deduplicate, sort, remove empty
        seen = set()
        result = []
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
    """Signalisiert wifi-setup.service neu zu starten."""
    subprocess.Popen(
        ["sudo", "systemctl", "restart", "wifi-setup.service"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def is_hotspot_active() -> bool:
    return os.path.exists(AP_FLAG)


# ── HTML ─────────────────────────────────────────────────────────────────────

def render_page(body: str, title: str = "MosqueScreen Setup") -> bytes:
    device_id = get_device_id()
    html = f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0 }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f0f; color: #e5e5e5; min-height: 100vh;
            display: flex; align-items: center; justify-content: center; padding: 1rem }}
    .card {{ background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 1rem;
             padding: 2rem; width: 100%; max-width: 420px }}
    .logo {{ text-align: center; font-size: 2.5rem; margin-bottom: 0.5rem }}
    h1 {{ text-align: center; font-size: 1.2rem; font-weight: 600; margin-bottom: 0.25rem }}
    .sub {{ text-align: center; color: #666; font-size: 0.8rem; margin-bottom: 1.5rem }}
    label {{ display: block; font-size: 0.75rem; color: #999; margin-bottom: 0.4rem;
             text-transform: uppercase; letter-spacing: 0.05em }}
    input, select {{ width: 100%; background: #111; border: 1px solid #333; color: #fff;
                     border-radius: 0.5rem; padding: 0.65rem 0.85rem; font-size: 0.9rem;
                     outline: none; margin-bottom: 1rem }}
    input:focus, select:focus {{ border-color: #10b981 }}
    select option {{ background: #1a1a1a }}
    .btn {{ width: 100%; padding: 0.75rem; border: none; border-radius: 0.5rem;
            font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s }}
    .btn-green  {{ background: #10b981; color: #fff }}
    .btn-gray   {{ background: #2a2a2a; color: #aaa; margin-top: 0.75rem }}
    .btn-red    {{ background: #7f1d1d; color: #fca5a5; margin-top: 0.75rem }}
    .btn:hover  {{ opacity: 0.85 }}
    .status {{ padding: 0.6rem 0.85rem; border-radius: 0.5rem; font-size: 0.82rem;
               margin-bottom: 1rem; text-align: center }}
    .status.ok  {{ background: #064e3b; color: #6ee7b7 }}
    .status.err {{ background: #450a0a; color: #fca5a5 }}
    .status.info {{ background: #1e3a5f; color: #93c5fd }}
    .divider {{ border: none; border-top: 1px solid #2a2a2a; margin: 1.25rem 0 }}
    .device-id {{ text-align: center; color: #444; font-size: 0.7rem; margin-top: 1.5rem;
                  font-family: monospace }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🕌</div>
    <h1>MosqueScreen</h1>
    <p class="sub">WiFi Einrichtung</p>
    {body}
    <p class="device-id">ID: {device_id}</p>
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
      <select name="ssid" id="ssid_select" onchange="document.getElementById('ssid_custom').value=this.value">
        <option value="">Netzwerk wählen…</option>
        {options}
      </select>
      <label>Oder manuell eingeben</label>
      <input type="text" name="ssid_manual" id="ssid_custom" placeholder="Netzwerkname (SSID)" value="{ssid_prefill}">
      <label>Passwort (leer lassen wenn kein Passwort)</label>
      <input type="password" name="password" placeholder="Passwort">
      <button class="btn btn-green" type="submit">Verbinden</button>
    </form>"""
    return render_page(body)


def page_connected(ssid: str) -> bytes:
    body = f"""
    <div class="status ok">✓ Verbunden mit <strong>{ssid}</strong></div>
    <p style="font-size:0.85rem;color:#999;text-align:center;margin-bottom:1.5rem">
      Der Screen startet in Kürze automatisch.<br>
      Öffne das CMS und trage den Pairing-Code ein.
    </p>
    <hr class="divider">
    <form method="POST" action="/forget">
      <button class="btn btn-gray" type="submit">Anderes WLAN wählen</button>
    </form>"""
    return render_page(body)


def page_connecting(ssid: str) -> bytes:
    body = f"""
    <div class="status info">⏳ Verbinde mit <strong>{ssid}</strong>…</div>
    <p style="font-size:0.85rem;color:#999;text-align:center">
      Bitte warten. Die Seite aktualisiert sich automatisch.
    </p>
    <script>setTimeout(() => location.href = '/', 6000)</script>"""
    return render_page(body)


def page_forgotten() -> bytes:
    body = """
    <div class="status info">🔄 WLAN wurde gelöscht. Der Screen startet neu…</div>
    <script>setTimeout(() => location.href = '/', 8000)</script>"""
    return render_page(body)


# ── HTTP Handler ─────────────────────────────────────────────────────────────

class PortalHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # suppress default logging

    def send(self, code: int, body: bytes, content_type: str = "text/html; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def redirect(self, location: str):
        self.send_response(303)
        self.send_header("Location", location)
        self.end_headers()

    # Captive portal detection endpoints (iOS, Android, Windows)
    CAPTIVE_PATHS = {
        "/hotspot-detect.html", "/generate_204", "/connecttest.txt",
        "/ncsi.txt", "/success.txt", "/canonical.html",
    }

    def do_GET(self):
        path = urlparse(self.path).path

        # Redirect captive portal probes
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
            password = p("password")

            if not ssid:
                networks = scan_networks()
                self.send(200, page_setup(networks, error="Bitte ein Netzwerk wählen."))
                return

            save_wifi(ssid, password)
            self.send(200, page_connecting(ssid))
            # Restart wifi-setup in background
            time.sleep(1)
            trigger_wifi_restart()

        elif path == "/forget":
            forget_wifi()
            self.send(200, page_forgotten())
            time.sleep(1)
            trigger_wifi_restart()

        else:
            self.redirect("/")


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = 8080
    server = HTTPServer(("0.0.0.0", port), PortalHandler)
    print(f"[portal] Listening on :{port}")
    server.serve_forever()
