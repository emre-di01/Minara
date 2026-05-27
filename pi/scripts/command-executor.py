#!/usr/bin/env python3
"""
command-executor.py — Mosque Signage Pi Remote Command Executor
Pollt Supabase alle 10 Sekunden auf pending device_commands und führt sie aus.
Nutzt nur Python stdlib: urllib.request, json, subprocess, time, os.
"""

import json
import os
import subprocess
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Konfiguration ─────────────────────────────────────────────────────────────
SUPABASE_URL  = "https://mosque-api.401dev.de"
ANON_KEY      = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
DEVICE_CONF   = "/boot/firmware/device.json"
GITHUB_REPO   = "https://raw.githubusercontent.com/emre-di01/mosque-signage/main/pi"
POLL_INTERVAL = 10  # Sekunden

# ── Logging ───────────────────────────────────────────────────────────────────
def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

# ── Device-ID lesen ───────────────────────────────────────────────────────────
def get_hardware_id():
    try:
        with open(DEVICE_CONF) as f:
            d = json.load(f)
        return d.get("id", "")
    except Exception as e:
        log(f"WARN device.json lesen fehlgeschlagen: {e}")
        return ""

# ── Supabase HTTP ─────────────────────────────────────────────────────────────
def _headers(extra=None):
    h = {
        "apikey":        ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    if extra:
        h.update(extra)
    return h

def supabase_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())

def supabase_patch(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body, method="PATCH",
        headers=_headers({"Content-Type": "application/json"}),
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status

# ── Befehl-Ausführung ─────────────────────────────────────────────────────────
def run(cmd, **kwargs):
    """Führt Shell-Kommando aus, gibt (returncode, stdout+stderr) zurück."""
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, **kwargs
    )
    output = (result.stdout + result.stderr).strip()
    return result.returncode, output

def mark_done(cmd_id, status, result_msg):
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        supabase_patch(
            f"device_commands?id=eq.{cmd_id}",
            {"status": status, "result": result_msg, "executed_at": now_iso},
        )
    except Exception as e:
        log(f"WARN mark_done fehlgeschlagen für {cmd_id}: {e}")

# ── Einzelne Befehle ──────────────────────────────────────────────────────────
def cmd_restart_kiosk():
    rc, out = run("systemctl restart mosque-kiosk.service")
    return rc, out or "mosque-kiosk.service restarted"

def cmd_reboot():
    log("Reboot in 2s...")
    time.sleep(2)
    rc, out = run("systemctl reboot")
    return rc, out or "reboot initiated"

def cmd_clear_cache():
    rc1, out1 = run("rm -rf /home/kiosk/.config/chromium-kiosk")
    rc2, out2 = run("systemctl restart mosque-kiosk.service")
    rc = rc1 or rc2
    return rc, f"cache cleared: {out1}; restart: {out2}"

def cmd_update_scripts():
    files = [
        ("scripts/wifi-setup.sh",               "/opt/mosque/scripts/wifi-setup.sh"),
        ("scripts/start-kiosk.sh",              "/opt/mosque/scripts/start-kiosk.sh"),
        ("scripts/wifi-watchdog.sh",            "/opt/mosque/scripts/wifi-watchdog.sh"),
        ("scripts/display-wrapper.sh",          "/opt/mosque/scripts/display-wrapper.sh"),
        ("scripts/command-executor.py",         "/opt/mosque/scripts/command-executor.py"),
        ("wifi-portal/portal.py",               "/opt/mosque/wifi-portal/portal.py"),
    ]
    errors = []
    for rel, dst in files:
        url = f"{GITHUB_REPO}/{rel}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "mosque-pi"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read()
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as f:
                f.write(content)
            log(f"  updated: {dst}")
        except Exception as e:
            errors.append(f"{rel}: {e}")
            log(f"  WARN update fehlgeschlagen {rel}: {e}")

    # Shell-Scripts ausführbar machen
    run("chmod +x /opt/mosque/scripts/*.sh")

    # Kiosk neu starten
    run("systemctl restart mosque-kiosk.service")

    if errors:
        return 1, "Fehler: " + "; ".join(errors)
    return 0, f"updated {len(files)} files + kiosk restarted"

def cmd_set_orientation(payload):
    orientation = payload.get("orientation", "landscape")
    if orientation not in ("landscape", "portrait", "portrait-flipped", "landscape-flipped"):
        return 1, f"Ungültige Orientation: {orientation}"
    try:
        try:
            with open(DEVICE_CONF) as f:
                data = json.load(f)
        except Exception:
            data = {}
        data["orientation"] = orientation
        os.makedirs(os.path.dirname(DEVICE_CONF), exist_ok=True)
        with open(DEVICE_CONF, "w") as f:
            json.dump(data, f)
        log(f"  orientation → {orientation}")
    except Exception as e:
        return 1, f"device.json schreiben fehlgeschlagen: {e}"

    rc, out = run("systemctl restart mosque-kiosk.service")
    return rc, f"orientation={orientation}; restart: {out}"

# ── Poll-Loop ─────────────────────────────────────────────────────────────────
def process_command(cmd):
    cmd_id   = cmd.get("id")
    command  = cmd.get("command", "")
    payload  = cmd.get("payload") or {}

    log(f"Befehl empfangen: {command} (id={cmd_id})")

    try:
        if command == "restart_kiosk":
            rc, result = cmd_restart_kiosk()
        elif command == "reboot":
            rc, result = cmd_reboot()
        elif command == "clear_cache":
            rc, result = cmd_clear_cache()
        elif command == "update_scripts":
            rc, result = cmd_update_scripts()
        elif command == "set_orientation":
            rc, result = cmd_set_orientation(payload)
        else:
            log(f"  Unbekannter Befehl: {command}")
            mark_done(cmd_id, "error", f"unbekannter Befehl: {command}")
            return

        status = "done" if rc == 0 else "error"
        log(f"  → {status}: {result}")
        mark_done(cmd_id, status, result)

    except Exception as e:
        log(f"  FEHLER bei {command}: {e}")
        mark_done(cmd_id, "error", str(e))

def poll(hardware_id):
    path = (
        f"device_commands"
        f"?hardware_id=eq.{hardware_id}"
        f"&status=eq.pending"
        f"&order=created_at.asc"
        f"&limit=5"
    )
    try:
        commands = supabase_get(path)
        for cmd in commands:
            process_command(cmd)
    except urllib.error.URLError as e:
        log(f"WARN Netzwerkfehler beim Poll: {e}")
    except Exception as e:
        log(f"WARN Poll fehlgeschlagen: {e}")

def main():
    log("command-executor gestartet")

    hardware_id = get_hardware_id()
    if not hardware_id:
        log("FEHLER: Keine Hardware-ID in device.json — warte auf erste Boot-Konfiguration")
        # Trotzdem laufen lassen — device.json könnte später erscheinen
    else:
        log(f"Hardware-ID: {hardware_id}")

    while True:
        # hardware_id bei jedem Poll neu lesen (könnte sich beim First-Boot ändern)
        current_id = get_hardware_id()
        if current_id:
            poll(current_id)
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
