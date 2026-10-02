#!/opt/miners/venv/bin/python3
"""Applica overclock, power limit e ventole alle GPU NVIDIA leggendo /opt/miners/oc.json.
I campi sono gli stessi di HiveOS. Uso: oc.py [--now]  (--now ignora il ritardo)."""
import json
import sys
import time

import pynvml as N

CONF = "/opt/miners/oc.json"
try:
    with open("/opt/miners/autofan.json") as _f:
        AUTOFAN = bool(json.load(_f).get("enabled"))
except (OSError, ValueError):
    AUTOFAN = False


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def step(label, fn, *args):
    try:
        fn(*args)
        print(f"  {label}: ok")
    except N.NVMLError as e:
        print(f"  {label}: ERRORE {e}")


def apply(idx, c):
    h = N.nvmlDeviceGetHandleByIndex(idx)
    print(f"GPU {idx} {N.nvmlDeviceGetName(h)}")
    # senza persistence mode il driver può azzerare le impostazioni quando nessun processo usa la GPU
    step("persistence mode", N.nvmlDeviceSetPersistenceMode, h, 1)

    core = num(c.get("core_offset")) or 0
    step(f"core offset {core:+d} MHz", N.nvmlDeviceSetGpcClkVfOffset, h, core)

    # HiveOS usa la scala di nvidia-settings (transfer rate, il doppio): NVML vuole la metà
    mem = num(c.get("mem_offset")) or 0
    step(f"mem offset {mem:+d} MHz", N.nvmlDeviceSetMemClkVfOffset, h, mem // 2)

    lc = num(c.get("lock_core"))
    if lc:
        step(f"lock core {lc} MHz", N.nvmlDeviceSetGpuLockedClocks, h, lc, lc)
    else:
        step("lock core disattivato", N.nvmlDeviceResetGpuLockedClocks, h)

    lm = num(c.get("lock_mem"))
    if lm:
        step(f"lock mem {lm} MHz", N.nvmlDeviceSetMemoryLockedClocks, h, lm, lm)
    else:
        step("lock mem disattivato", N.nvmlDeviceResetMemoryLockedClocks, h)

    lo, hi = N.nvmlDeviceGetPowerManagementLimitConstraints(h)
    pl = num(c.get("power"))
    mw = pl * 1000 if pl else N.nvmlDeviceGetPowerManagementDefaultLimit(h)
    mw = max(lo, min(hi, mw))
    step(f"power limit {mw // 1000} W", N.nvmlDeviceSetPowerManagementLimit, h, mw)

    if AUTOFAN:
        print("  ventole: gestite dall'autofan")
        return
    fan = num(c.get("fan")) or 0
    for f in range(N.nvmlDeviceGetNumFans(h)):
        if fan:
            step(f"ventola {f} al {min(100, fan)}%", N.nvmlDeviceSetFanSpeed_v2, h, f, min(100, max(0, fan)))
        else:
            step(f"ventola {f} automatica", N.nvmlDeviceSetDefaultFanSpeed_v2, h, f)


def main():
    try:
        with open(CONF) as fh:
            conf = json.load(fh)
    except FileNotFoundError:
        print("Nessuna configurazione di overclock.")
        return
    N.nvmlInit()
    count = N.nvmlDeviceGetCount()
    if "--now" not in sys.argv:
        delay = max([num(c.get("delay")) or 0 for c in conf.values()] or [0])
        if delay:
            print(f"Attendo {delay} s prima di applicare")
            time.sleep(delay)
    for key, c in conf.items():
        idx = num(key)
        if idx is not None and 0 <= idx < count:
            apply(idx, c)
    N.nvmlShutdown()


if __name__ == "__main__":
    main()
