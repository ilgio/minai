#!/opt/miners/venv/bin/python3
"""Autofan per GPU NVIDIA, come quello di HiveOS.

Ogni 5 secondi rilegge /opt/miners/autofan.json e:
- se l'autofan è attivo, regola le ventole per tenere la GPU alla temperatura obiettivo,
  entro la velocità minima e massima;
- se una GPU supera la temperatura critica, esegue l'azione scelta (ferma il miner,
  reboot o shutdown). Se ha fermato il miner, lo fa ripartire quando la GPU scende
  di 10 gradi sotto la soglia critica.
Lo stato viene scritto in /run/miner-autofan.json per il pannello.
"""
import json
import os
import subprocess
import time

import pynvml as N

CONF = "/opt/miners/autofan.json"
OC = "/opt/miners/oc.json"
STATUS = "/run/miner-autofan.json"
DEFAULTS = {"enabled": False, "target": 70, "min": 30, "max": 100, "critical": 90, "action": "stop"}
INTERVAL = 5


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_status(data):
    tmp = STATUS + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, STATUS)


def fans(h):
    try:
        return range(N.nvmlDeviceGetNumFans(h))
    except N.NVMLError:
        return range(0)


def set_fans(h, pct):
    for f in fans(h):
        N.nvmlDeviceSetFanSpeed_v2(h, f, pct)


def default_fans(h):
    for f in fans(h):
        N.nvmlDeviceSetDefaultFanSpeed_v2(h, f)


def uptime():
    try:
        with open("/proc/uptime") as f:
            return float(f.read().split()[0])
    except OSError:
        return 0


def now():
    return time.strftime("%d/%m %H:%M")


def main():
    N.nvmlInit()
    was_enabled = False
    stopped_by_us = False
    event = load(STATUS, {}).get("event")
    while True:
        c = {**DEFAULTS, **load(CONF, {})}
        count = N.nvmlDeviceGetCount()
        gpus, hottest = [], 0
        for i in range(count):
            h = N.nvmlDeviceGetHandleByIndex(i)
            t = N.nvmlDeviceGetTemperature(h, N.NVML_TEMPERATURE_GPU)
            hottest = max(hottest, t)
            try:
                cur = N.nvmlDeviceGetFanSpeed(h)
            except N.NVMLError:
                cur = None
            if c["enabled"]:
                base = cur if cur is not None else c["min"]
                err = t - c["target"]
                # sale in fretta quando scalda, scende piano quando si raffredda
                step = 0 if abs(err) <= 1 else max(-4, min(10, err * 2))
                new = int(round(max(c["min"], min(c["max"], base + step))))
                if t >= c["critical"] - 3:
                    new = c["max"]
                if new != cur:
                    try:
                        set_fans(h, new)
                        cur = new
                    except N.NVMLError as e:
                        print(f"GPU {i}: impossibile impostare la ventola: {e}", flush=True)
            gpus.append({"index": i, "temp": t, "fan": cur})

        if was_enabled and not c["enabled"]:
            # autofan spento: torna alla ventola impostata nell'overclock, oppure automatica
            oc = load(OC, {})
            for i in range(count):
                h = N.nvmlDeviceGetHandleByIndex(i)
                fan = int(oc.get(str(i), {}).get("fan") or 0)
                try:
                    set_fans(h, fan) if fan else default_fans(h)
                except N.NVMLError:
                    pass
        was_enabled = c["enabled"]

        action = c["action"]
        if hottest >= c["critical"] and action != "none":
            if action == "stop" and not stopped_by_us:
                subprocess.run(["systemctl", "stop", "miner.service"])
                stopped_by_us = True
                event = f"{now()}: GPU a {hottest}°C, miner fermato"
                print(event, flush=True)
            elif action in ("reboot", "poweroff") and uptime() > 300:  # evita riavvii a catena
                event = f"{now()}: GPU a {hottest}°C, {'reboot' if action == 'reboot' else 'shutdown'}"
                print(event, flush=True)
                write_status({"gpus": gpus, "event": event, "stopped": stopped_by_us, "time": int(time.time())})
                subprocess.run(["systemctl", "--no-block", action])
        elif stopped_by_us and hottest < c["critical"] - 10:
            subprocess.run(["systemctl", "start", "miner.service"])
            stopped_by_us = False
            event = f"{now()}: GPU scesa a {hottest}°C, miner ripartito"
            print(event, flush=True)

        write_status({"gpus": gpus, "event": event, "stopped": stopped_by_us, "time": int(time.time())})
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
