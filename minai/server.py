#!/usr/bin/env python3
"""minai (client del rig): server web per gestire miner, lanci, log e overclock del rig.

Solo libreria standard. Gira come root (servizio miner-panel) e offre un'API
con azioni precise: non esegue comandi arbitrari.

Uso:
  server.py                                 avvia il server
  server.py --init BIN OWNER PORT           crea /opt/miners/panel.json (password da stdin)
  server.py --password                      cambia la password
  server.py --token                         mostra il token per collegare il rig a minai-server
"""
import base64
import difflib
import getpass
import glob
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "0.9.16"
ROOT = os.environ.get("MINERS_ROOT", "/opt/miners")
CONF = f"{ROOT}/panel.json"
WWW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")
DIR = f"{ROOT}/scripts"
ACTIVE = f"{ROOT}/active.sh"
OC_FILE = f"{ROOT}/oc.json"
AUTOFAN_FILE = f"{ROOT}/autofan.json"
AUTOFAN_STATUS = os.environ.get("MINERS_AUTOFAN_STATUS", "/run/miner-autofan.json")
AUTOFAN_DEFAULTS = {"enabled": False, "target": 70, "min": 30, "max": 100, "critical": 90, "action": "stop"}
OC_CMD = [f"{ROOT}/venv/bin/python3", f"{ROOT}/oc.py", "--now"]
SVC = "miner.service"
MINER_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
LAUNCH_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*\.sh$")
SESSION_SECONDS = 30 * 24 * 3600
COOKIE = "mp_session"

INSTALL = r'''set -e
name="$1"; url="$2"; bin="$3"; owner="$4"; dest="$bin/$name"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
curl -fsSL --retry 3 -o pkg "$url"
mkdir x
case "${url%%\?*}" in
  *.zip) unzip -q pkg -d x ;;
  *.tar.gz|*.tgz) tar xzf pkg -C x ;;
  *.tar.xz) tar xJf pkg -C x ;;
  *.tar.bz2) tar xjf pkg -C x ;;
  *) chmod +x pkg; mv pkg "x/$name" ;;
esac
src=x
if [ "$(ls -A x | wc -l)" -eq 1 ] && [ -d "x/$(ls -A x)" ]; then src="x/$(ls -A x)"; fi
rm -rf "$dest"; mkdir -p "$dest"
cp -a "$src"/. "$dest"/
echo "$url" > "$dest/.source"
find "$dest" -maxdepth 1 -type f ! -name '*.*' -exec chmod +x {} +
chmod +x "$dest"/*.sh 2>/dev/null || true
chown -R "$owner" "$dest"'''


# ---------- configurazione e password ----------

def hash_password(pw):
    salt = secrets.token_bytes(16)
    it = 200_000
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, it)
    return f"pbkdf2${it}${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}"


def save_conf(cfg):
    os.makedirs(ROOT, exist_ok=True)
    fd = os.open(CONF, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(cfg, f, indent=2)


def cli():
    if sys.argv[1] == "--init":
        bin_dir, owner, port = sys.argv[2], sys.argv[3], int(sys.argv[4])
        pw = "" if sys.stdin.isatty() else sys.stdin.read().rstrip("\n")
        # senza password (installazione automatica): la sceglie l'utente al primo accesso dal pannello
        save_conf({"bin": bin_dir, "owner": owner, "port": port,
                   "secret": secrets.token_hex(32), "password": hash_password(pw) if pw else ""})
        print(f"Configurazione creata in {CONF}")
    elif sys.argv[1] == "--token":
        with open(CONF) as f:
            cfg = json.load(f)
        if not cfg.get("api_token"):
            cfg["api_token"] = secrets.token_urlsafe(32)
            save_conf(cfg)
        print(cfg["api_token"])
    elif sys.argv[1] == "--password":
        with open(CONF) as f:
            cfg = json.load(f)
        p1 = getpass.getpass("Nuova password: ")
        if not p1 or p1 != getpass.getpass("Ripetila: "):
            sys.exit("Le password non coincidono.")
        cfg["password"] = hash_password(p1)
        cfg["secret"] = secrets.token_hex(32)  # chiude tutte le sessioni aperte
        save_conf(cfg)
        print("Password cambiata. Riavvia il servizio: sudo systemctl restart miner-panel")
    else:
        sys.exit(__doc__)


if len(sys.argv) > 1:
    cli()
    sys.exit(0)

with open(CONF) as _f:
    CFG = json.load(_f)
BIN = CFG["bin"]
OWNER = CFG["owner"]
SECRET = CFG["secret"].encode()
PORT = int(CFG.get("port", 8080))
if not CFG.get("api_token"):  # token con cui minai-server si collega a questo rig
    CFG["api_token"] = secrets.token_urlsafe(32)
    save_conf(CFG)
API_TOKEN = CFG["api_token"]


SETUP_LOCK = threading.Lock()


def needs_setup():
    return not CFG.get("password")


def local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sk:
            sk.connect(("1.1.1.1", 80))
            return sk.getsockname()[0]
    except OSError:
        return None


def setup_beacon():
    """Finché non è stata scelta la password, il rig si fa trovare in rete locale come minai-setup.local."""
    if not shutil.which("avahi-publish"):
        return
    while needs_setup():
        ip = local_ip()
        if ip:
            p = subprocess.Popen(["avahi-publish", "-a", "-R", "minai-setup.local", ip],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            while needs_setup() and p.poll() is None and local_ip() == ip:
                time.sleep(3)
            if p.poll() is None:
                p.terminate()
        time.sleep(5)


RIG_NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$")
def logo_ansi():
    """Il logo MINAI a "pixel" colorati, come nella schermata della chiavetta."""
    font = {"M": ["X...X", "XX.XX", "X.X.X", "X...X", "X...X"], "I": ["XXX", ".X.", ".X.", ".X.", "XXX"],
            "N": ["X...X", "XX..X", "X.X.X", "X..XX", "X...X"], "A": [".XXX.", "X...X", "XXXXX", "X...X", "X...X"]}
    rows = []
    for r in range(5):
        line = "    "
        for i, (ch, color) in enumerate([("M", 44), ("I", 44), ("N", 44), ("A", 44), ("I", 43)]):
            pattern = font[ch][r] + ("" if i == 4 else ".")
            line += "".join(f"\x1b[{color}m  \x1b[0m" if c == "X" else "  " for c in pattern)
        rows.append(line)
    return "\n".join(rows)


# schermata sul monitor del rig dopo il primo accesso (\\n = nome del rig, \\4 = indirizzo IP)
_LINE = "\x1b[34m    " + "-" * 66 + "\x1b[0m\n"
ISSUE = ("\x1b[2J\x1b[H\n\n" + logo_ansi() + "\n\n" + _LINE +
         "      \x1b[33mRig\x1b[0m          \x1b[1m\\n\x1b[0m\n"
         "      \x1b[33mIndirizzo\x1b[0m    \\4\n"
         "      \x1b[33mPannello\x1b[0m     \x1b[1mhttp://\\n.local\x1b[0m   oppure   http://\\4\n\n"
         "      Il rig si gestisce dal browser: da qui non serve fare niente.\n" + _LINE + "\n")


def set_rig_name(name):
    """Cambia il nome del rig: rete locale (nome.local), Tailscale e schermata della console."""
    name = name.strip().lower()
    if not RIG_NAME_RE.match(name):
        raise ApiError(400, "Nome non valido: lettere minuscole, numeri e trattini, senza spazi")
    if name == socket.gethostname():
        return name
    if not shutil.which("hostnamectl"):
        raise ApiError(500, "Impossibile cambiare il nome su questo sistema")
    r = subprocess.run(["hostnamectl", "set-hostname", name], capture_output=True, text=True, timeout=20)
    if r.returncode:
        raise ApiError(500, f"Cambio del nome non riuscito: {(r.stderr or r.stdout).strip()}")
    try:
        with open("/etc/hosts") as f:
            lines = f.read().splitlines()
        lines = [l for l in lines if not l.startswith("127.0.1.1")]
        lines.insert(1, f"127.0.1.1\t{name}")
        with open("/etc/hosts", "w") as f:
            f.write("\n".join(lines) + "\n")
    except OSError:
        pass
    for cmd in (["avahi-set-host-name", name], ["tailscale", "set", f"--hostname={name}"]):
        if shutil.which(cmd[0]):
            subprocess.run(cmd, capture_output=True, timeout=20)
    return name


def finish_console():
    """Dopo il primo accesso la schermata della console mostra il nome definitivo del rig."""
    try:
        with open("/etc/issue", "w") as f:
            f.write(ISSUE)
        subprocess.run(["agetty", "--reload"], capture_output=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        pass


def check_password(pw):
    try:
        _, it, salt, h = CFG["password"].split("$")
        calc = hashlib.pbkdf2_hmac("sha256", pw.encode(), base64.b64decode(salt), int(it))
        return hmac.compare_digest(calc, base64.b64decode(h))
    except (ValueError, KeyError):
        return False


def make_token():
    exp = str(int(time.time()) + SESSION_SECONDS)
    return f"{exp}.{hmac.new(SECRET, exp.encode(), 'sha256').hexdigest()}"


def valid_token(tok):
    try:
        exp, sig = tok.split(".", 1)
        good = hmac.new(SECRET, exp.encode(), "sha256").hexdigest()
        return hmac.compare_digest(sig, good) and int(exp) > time.time()
    except ValueError:
        return False


# ---------- azioni sul sistema ----------

class ApiError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def run(args, timeout=30):
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        raise ApiError(500, f"Comando non trovato: {args[0]}")
    except subprocess.TimeoutExpired:
        raise ApiError(504, f"Tempo scaduto: {' '.join(args[:2])}")
    if r.returncode:
        raise ApiError(500, (r.stderr or r.stdout).strip() or f"{args[0]} ha restituito {r.returncode}")
    return r.stdout


def is_running():
    try:
        r = subprocess.run(["systemctl", "is-active", SVC], capture_output=True, text=True, timeout=10)
        return r.stdout.strip() == "active"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def active_launch():
    try:
        return os.path.basename(os.readlink(ACTIVE))
    except OSError:
        return None


def check_miner(name):
    if not MINER_RE.match(name):
        raise ApiError(400, "Nome miner non valido: lettere, numeri, . _ -")
    return os.path.join(BIN, name)


def check_launch(name):
    if not LAUNCH_RE.match(name):
        raise ApiError(400, "Nome lancio non valido: lettere, numeri, . _ -")
    return os.path.join(DIR, name)


JOB = None
JOB_LOCK = threading.Lock()


def install_job(name, url):
    global JOB
    r = subprocess.run(["bash", "-c", INSTALL, "--", name, url, BIN, OWNER],
                       capture_output=True, text=True)
    out = (r.stderr or r.stdout).strip()[-2000:]
    with JOB_LOCK:
        JOB = {"name": name, "state": "ok" if r.returncode == 0 else "error", "output": out}
    if r.returncode == 0:
        threading.Thread(target=check_updates, daemon=True).start()  # aggiorna l'avviso dopo l'installazione


# ---------- controllo aggiornamenti dei miner (release GitHub) ----------

GH_RE = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/releases/download/([^/]+)/([^/?#]+)$")
UPDATES = {}
UPD = {"checking": False, "checked": 0}
UPD_LOCK = threading.Lock()
CHECK_EVERY = 6 * 3600


def vtuple(tag):
    return tuple(int(x) for x in re.findall(r"\d+", tag))


def shape(name):
    return re.sub(r"\d+", "#", name)


def http_get(url, head=False):
    req = urllib.request.Request(url, method="HEAD" if head else "GET", headers={"User-Agent": "miner-panel"})
    return urllib.request.urlopen(req, timeout=20)


def gh_latest(owner, repo):
    """Ultima release senza usare l'API (niente limiti di richieste): tag dal redirect, file dalla pagina."""
    with http_get(f"https://github.com/{owner}/{repo}/releases/latest", head=True) as r:
        final = r.geturl()
    if "/releases/tag/" not in final:
        raise RuntimeError("nessuna release pubblicata")
    tag = final.rsplit("/releases/tag/", 1)[1]
    with http_get(f"https://github.com/{owner}/{repo}/releases/expanded_assets/{tag}") as r:
        html = r.read().decode("utf-8", "replace")
    prefix = f"/{owner}/{repo}/releases/download/{tag}/"
    names = sorted(set(re.findall(re.escape(prefix) + r'([^"?#]+)"', html)))
    base = f"https://github.com{prefix}"
    return unquote(tag), [(unquote(n), base + n) for n in names], final


def check_updates():
    with UPD_LOCK:
        if UPD["checking"]:
            return
        UPD["checking"] = True
    result = {}
    try:
        for m in api_miners(None)["miners"]:
            mm = GH_RE.match(m["source"])
            if not mm:
                continue
            owner, repo, tag, asset = mm.groups()
            tag, asset = unquote(tag), unquote(asset)
            info = {"current": tag}
            try:
                latest, assets, page = gh_latest(owner, repo)
                info.update(latest=latest, page=page)
                a, b = vtuple(latest), vtuple(tag)
                if latest != tag and (a > b if a and b else True):
                    # stesso file della versione installata, con i numeri di versione cambiati
                    pick = next((u for n, u in assets if shape(n) == shape(asset)), None)
                    if not pick and assets:
                        best = max(assets, key=lambda x: difflib.SequenceMatcher(None, shape(x[0]), shape(asset)).ratio())
                        if difflib.SequenceMatcher(None, shape(best[0]), shape(asset)).ratio() > 0.8:
                            pick = best[1]
                    info["update"] = True
                    info["url"] = pick
            except Exception as e:
                info["error"] = f"controllo non riuscito: {e}"
            result[m["name"]] = info
        with UPD_LOCK:
            UPDATES.clear()
            UPDATES.update(result)
    finally:
        with UPD_LOCK:
            UPD.update(checking=False, checked=int(time.time()))


# ---------- aggiornamento di minai dal pannello (release GitHub) ----------

REPO = os.environ.get("MINAI_REPO", "ilgio/minai")
SELF = {"latest": None, "assets": [], "page": None}


def self_check():
    try:
        tag, assets, page = gh_latest(*REPO.split("/", 1))
        SELF.update(latest=tag.lstrip("vV"), assets=[n for n, _ in assets], page=page)
    except Exception as e:
        print(f"Controllo nuova versione: {e}", flush=True)


def latest_with(asset):
    """Ultima versione pubblicata che contiene il file indicato, se è più recente di quella data."""
    lt = SELF["latest"]
    return lt if lt and asset in SELF["assets"] else None


def newer(a, b):
    return bool(a and b and vtuple(a) > vtuple(b))


def unit_active(name):
    try:
        r = subprocess.run(["systemctl", "is-active", name], capture_output=True, text=True, timeout=10)
        return r.stdout.strip() in ("active", "activating")
    except (OSError, subprocess.TimeoutExpired):
        return False


def api_selfcheck(*_):
    self_check()
    lt = latest_with("minai.zip")
    return {"version": VERSION, "latest": lt, "update": lt if newer(lt, VERSION) else None}


def api_selfupdate():
    lt = latest_with("minai.zip")
    if not newer(lt, VERSION):
        self_check()  # l'ultimo controllo potrebbe essere vecchio: ricontrolla subito su GitHub
        lt = latest_with("minai.zip")
    if not newer(lt, VERSION):
        raise ApiError(409, "Nessuna nuova versione da installare")
    if not unit_active("minai-selfupdate"):
        # fuori dal servizio del pannello, così sopravvive al suo riavvio
        run(["systemd-run", "--unit=minai-selfupdate", "--collect", "--quiet", "/bin/bash", "-c",
             f"/opt/miners/update.sh > {ROOT}/update.log 2>&1"])
    return {"started": True}


def update_loop():
    time.sleep(30)
    while True:
        try:
            self_check()
            check_updates()
        except Exception as e:
            print(f"Controllo aggiornamenti: {e}", flush=True)
        time.sleep(CHECK_EVERY)


def api_check_updates():
    threading.Thread(target=self_check, daemon=True).start()
    threading.Thread(target=check_updates, daemon=True).start()
    return {"started": True}


# ---------- dati di sistema: temperatura, carico e consumo della CPU, consumo GPU ----------

SYS = {}


def read_text(path):
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return ""


def cpu_temp():
    for hw in sorted(glob.glob("/sys/class/hwmon/hwmon*")):
        name = read_text(f"{hw}/name")
        if name not in ("k10temp", "zenpower", "coretemp"):
            continue
        for inp in sorted(glob.glob(f"{hw}/temp*_input")):
            label = read_text(inp.replace("_input", "_label"))
            if name == "coretemp" and not label.startswith("Package"):
                continue
            if name != "coretemp" and label not in ("Tctl", "Tdie", ""):
                continue
            v = read_text(inp)
            if v.isdigit():
                return round(int(v) / 1000)
    for zone in glob.glob("/sys/class/thermal/thermal_zone*"):
        if read_text(f"{zone}/type") in ("x86_pkg_temp", "acpitz"):
            v = read_text(f"{zone}/temp")
            if v.lstrip("-").isdigit():
                return round(int(v) / 1000)
    return None


def cpu_times():
    parts = read_text("/proc/stat").splitlines()[0].split()[1:]
    vals = [int(x) for x in parts]
    idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
    return sum(vals), idle


def rapl_energy():
    v = read_text("/sys/class/powercap/intel-rapl:0/energy_uj")  # presente anche sui Ryzen recenti
    return int(v) if v.isdigit() else None


def sys_sampler():
    prev_cpu, prev_e, prev_t = cpu_times(), rapl_energy(), time.time()
    rng = read_text("/sys/class/powercap/intel-rapl:0/max_energy_range_uj")
    rng = int(rng) if rng.isdigit() else 0
    while True:
        time.sleep(3)
        now = time.time()
        cur = cpu_times()
        dt_all, dt_idle = cur[0] - prev_cpu[0], cur[1] - prev_cpu[1]
        load = round(100 * (dt_all - dt_idle) / dt_all) if dt_all > 0 else None
        e = rapl_energy()
        cpu_w = None
        if e is not None and prev_e is not None:
            de = e - prev_e if e >= prev_e else e + rng - prev_e
            cpu_w = round(de / 1e6 / (now - prev_t))
        gpu_w = None
        try:
            out = subprocess.run(["nvidia-smi", "--query-gpu=power.draw", "--format=csv,noheader,nounits"],
                                 capture_output=True, text=True, timeout=10).stdout
            vals = []
            for line in out.splitlines():  # una riga per GPU; "[N/A]" se la scheda non lo fornisce
                try:
                    vals.append(float(line.split(",")[0]))
                except ValueError:
                    pass
            gpu_w = round(sum(vals)) if vals else None
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        total = (gpu_w or 0) + (cpu_w or 0) if (gpu_w is not None or cpu_w is not None) else None
        SYS.update(cpu_temp=cpu_temp(), cpu_load=load, cpu_power=cpu_w, gpu_power=gpu_w, total_power=total)
        prev_cpu, prev_e, prev_t = cur, e, now


DRIVER = {"version": ""}


def nvidia_driver():
    """Versione del driver NVIDIA, letta una volta sola (riprova finché non la trova)."""
    if not DRIVER["version"]:
        try:
            out = subprocess.run(["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"],
                                 capture_output=True, text=True, timeout=10).stdout
            DRIVER["version"] = out.strip().splitlines()[0].strip() if out.strip() else ""
        except (FileNotFoundError, subprocess.TimeoutExpired, IndexError):
            pass
    return DRIVER["version"]


SPEED_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*([kKMGTPE]?(?:H|Sol|N)/s)\b")
SPEED_KEY = re.compile(r"total|hashrate|speed", re.I)
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
SPEED = {"value": None, "unit": None, "key": False}


def parse_speed(line):
    line = ANSI_RE.sub("", line)
    found = SPEED_RE.findall(line)
    if not found:
        return
    is_key = bool(SPEED_KEY.search(line))
    if not is_key and SPEED["key"]:
        return
    SPEED.update(value=found[-1][0], unit=found[-1][1], key=SPEED["key"] or is_key)


def speed_follower():
    while True:
        try:
            p = subprocess.Popen(["journalctl", "-u", SVC, "-f", "-n", "100", "-o", "cat", "--no-pager"],
                                 stdout=subprocess.PIPE, text=True, errors="replace")
            for line in p.stdout:
                parse_speed(line)
        except FileNotFoundError:
            return
        time.sleep(5)


def api_status(_):
    fan = {**AUTOFAN_DEFAULTS, **read_json(AUTOFAN_FILE, {})}
    return {"running": is_running(), "active": active_launch(), "bin": BIN,
            "host": socket.gethostname(), "sys": dict(SYS),
            "version": VERSION, "driver": nvidia_driver(),
            "speed": {"value": SPEED["value"], "unit": SPEED["unit"]} if SPEED["value"] else None,
            "update": latest_with("minai.zip") if newer(latest_with("minai.zip"), VERSION) else None,
            "updating": unit_active("minai-selfupdate"),
            "managed": managed(),
            "autofan": {"enabled": fan["enabled"], "target": fan["target"],
                        "event": read_json(AUTOFAN_STATUS, {}).get("event")}}


def api_miners(_):
    items = []
    if os.path.isdir(BIN):
        for n in sorted(os.listdir(BIN)):
            p = os.path.join(BIN, n)
            if os.path.isdir(p) and MINER_RE.match(n):
                try:
                    with open(os.path.join(p, ".source")) as f:
                        src = f.read().strip()
                except OSError:
                    src = ""
                items.append({"name": n, "source": src})
    with UPD_LOCK:
        updates = dict(UPDATES)
        state = dict(UPD)
    return {"miners": items, "job": JOB, "updates": updates, "checking": state["checking"], "checked": state["checked"]}


def api_install(body):
    global JOB
    name, url = str(body.get("name", "")).strip(), str(body.get("url", "")).strip()
    check_miner(name)
    if not re.match(r"^https?://", url):
        raise ApiError(400, "Il link deve iniziare con http:// o https://")
    with JOB_LOCK:
        if JOB and JOB["state"] == "running":
            raise ApiError(409, f"Installazione di {JOB['name']} già in corso")
        JOB = {"name": name, "state": "running", "output": ""}
    threading.Thread(target=install_job, args=(name, url), daemon=True).start()
    return {"started": True}


def api_miner_delete(name):
    path = check_miner(name)
    if os.path.isdir(path):
        run(["rm", "-rf", "--", path])
    return {"ok": True}


def api_miner_exe(name):
    path = check_miner(name)
    try:
        for f in sorted(os.listdir(path)):
            p = os.path.join(path, f)
            if "." not in f and os.path.isfile(p) and os.access(p, os.X_OK):
                return {"exe": f}
    except OSError:
        pass
    return {"exe": ""}


def api_launches(_):
    items = []
    if os.path.isdir(DIR):
        for f in sorted(os.listdir(DIR)):
            if not LAUNCH_RE.match(f):
                continue
            try:
                with open(os.path.join(DIR, f)) as fh:
                    m = re.search(re.escape(BIN) + r"/([A-Za-z0-9._-]+)", fh.read())
            except OSError:
                m = None
            items.append({"file": f, "miner": m.group(1) if m else ""})
    return {"launches": items}


def api_launch_get(name):
    try:
        with open(check_launch(name)) as f:
            return {"content": f.read()}
    except FileNotFoundError:
        raise ApiError(404, "Lancio non trovato")


def api_launch_put(name, body):
    path = check_launch(name)
    os.makedirs(DIR, exist_ok=True)
    with open(path, "w") as f:
        f.write(str(body.get("content", "")))
    os.chmod(path, 0o755)
    if name == active_launch() and is_running():
        run(["systemctl", "restart", SVC])
    return {"ok": True}


def api_launch_delete(name):
    path = check_launch(name)
    if name == active_launch():
        if is_running():
            raise ApiError(409, "Ferma il miner prima di eliminare il lancio in uso.")
        try:
            os.remove(ACTIVE)
        except OSError:
            pass
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    return {"ok": True}


STOPPED = f"{ROOT}/stopped"  # segno "fermato a mano": il miner non riparte al riavvio del rig


def api_launch_start(name):
    path = check_launch(name)
    if not os.path.isfile(path):
        raise ApiError(404, "Lancio non trovato")
    tmp = f"{ACTIVE}.tmp"
    try:
        os.remove(tmp)
    except OSError:
        pass
    os.symlink(path, tmp)
    os.replace(tmp, ACTIVE)
    SPEED.update(value=None, unit=None, key=False)
    try:
        os.remove(STOPPED)
    except FileNotFoundError:
        pass
    run(["systemctl", "restart", SVC])
    return {"ok": True}


def api_stop():
    open(STOPPED, "w").close()
    run(["systemctl", "stop", SVC])
    return {"ok": True}


def api_log(query):
    cursor = query.get("cursor", [""])[0]
    args = ["journalctl", "-u", SVC, "-o", "json", "--no-pager"]
    args += ["--after-cursor", cursor] if cursor else ["-n", "200"]
    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=15).stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return {"lines": [], "cursor": cursor}
    lines = []
    for raw in out.splitlines():
        try:
            e = json.loads(raw)
        except ValueError:
            continue
        m = e.get("MESSAGE") or ""
        if isinstance(m, list):  # journald codifica così i messaggi con caratteri di controllo
            m = bytes(m).decode("utf-8", "replace")
        lines.append(m)
        cursor = e.get("__CURSOR", cursor)
    return {"lines": lines[-500:], "cursor": cursor}


def api_gpus(_):
    try:
        out = run(["nvidia-smi",
                   "--query-gpu=index,name,temperature.gpu,power.draw,utilization.gpu,clocks.sm,clocks.mem,fan.speed",
                   "--format=csv,noheader,nounits"], timeout=15)
    except ApiError:
        return {"gpus": []}
    off = gpus_disabled()
    rows = [[c.strip() for c in l.split(",")] for l in out.strip().splitlines() if l.strip()]
    for r in rows:  # ultimo campo: "1" GPU attiva, "0" disattivata dal pannello
        r.append("0" if r and r[0].isdigit() and int(r[0]) in off else "1")
    return {"gpus": rows}


GPUS_FILE = f"{ROOT}/gpus.json"


def gpus_disabled():
    try:
        with open(GPUS_FILE) as f:
            return {int(i) for i in json.load(f).get("disabled", [])}
    except (OSError, ValueError, TypeError):
        return set()


def api_gpu_enable(idx, body):
    idx = int(idx)
    present = [int(r[0]) for r in api_gpus(None)["gpus"] if r and r[0].isdigit()]
    if idx not in present:
        raise ApiError(404, "GPU non trovata")
    off = gpus_disabled()
    if body.get("enabled"):
        off.discard(idx)
    else:
        off.add(idx)
    if present and not set(present) - off:
        raise ApiError(409, "Almeno una GPU deve restare attiva: per fermare il miner usa Ferma.")
    with open(GPUS_FILE, "w") as f:
        json.dump({"disabled": sorted(off)}, f)
    if is_running():
        run(["systemctl", "restart", SVC])  # il miner riparte con le GPU giuste
    return {"disabled": sorted(off)}


def read_oc():
    try:
        with open(OC_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def api_oc_get(_):
    return {"oc": read_oc()}


def api_oc_put(body):
    gpu = str(body.get("gpu", ""))
    if not gpu.isdigit():
        raise ApiError(400, "GPU non valida")
    values = {}
    for k, v in (body.get("values") or {}).items():
        if k in ("core_offset", "lock_core", "mem_offset", "lock_mem", "power", "delay", "fan"):
            try:
                values[k] = int(float(v))
            except (TypeError, ValueError):
                raise ApiError(400, f"Valore non numerico per {k}")
    oc = read_oc()
    oc[gpu] = values
    with open(OC_FILE, "w") as f:
        json.dump(oc, f, indent=2)
    try:
        r = subprocess.run(OC_CMD, capture_output=True, text=True, timeout=90)
        output = (r.stdout + r.stderr).strip()
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        output = f"Impossibile applicare l'overclock: {e}"
    return {"oc": oc, "output": output}


# ---------- alimentazione ----------

def api_power(body):
    action = body.get("action")
    if action not in ("reboot", "poweroff"):
        raise ApiError(400, "Azione non valida")
    # --no-block mette in coda il riavvio/spegnimento e torna subito: così la pagina riceve
    # la risposta, e se systemd rifiuta l'operazione l'errore arriva al pannello
    print(f"Richiesta dal pannello: {action}", flush=True)
    r = subprocess.run(["systemctl", "--no-block", action], capture_output=True, text=True, timeout=20)
    if r.returncode:
        raise ApiError(500, f"systemctl {action} non riuscito: {(r.stderr or r.stdout).strip()}")
    return {"ok": True}


def read_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def api_autofan_get(_):
    return {"config": {**AUTOFAN_DEFAULTS, **read_json(AUTOFAN_FILE, {})},
            "status": read_json(AUTOFAN_STATUS, {})}


def api_autofan_put(body):
    c = {**AUTOFAN_DEFAULTS, **read_json(AUTOFAN_FILE, {})}
    try:
        c["enabled"] = bool(body.get("enabled", c["enabled"]))
        for k, lo, hi in (("target", 40, 95), ("min", 0, 100), ("max", 0, 100), ("critical", 50, 110)):
            if k in body:
                c[k] = max(lo, min(hi, int(float(body[k]))))
    except (TypeError, ValueError):
        raise ApiError(400, "Valori non numerici")
    if body.get("action") in ("stop", "reboot", "poweroff", "none"):
        c["action"] = body["action"]
    if c["min"] > c["max"]:
        raise ApiError(400, "La ventola minima non può superare la massima")
    if c["target"] >= c["critical"]:
        raise ApiError(400, "La temperatura obiettivo deve essere sotto quella critica")
    with open(AUTOFAN_FILE, "w") as f:
        json.dump(c, f, indent=2)
    return {"config": c}


# ---------- Tailscale (impostazioni dal pannello) ----------

TS_LOGIN = {"url": None, "proc": None}


def ts_status():
    if not shutil.which("tailscale"):
        return {"installed": False}
    try:
        out = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True, timeout=10).stdout
        d = json.loads(out or "{}")
    except (subprocess.TimeoutExpired, ValueError, OSError):
        return {"installed": True, "state": "Sconosciuto"}
    me = d.get("Self") or {}
    ips = me.get("TailscaleIPs") or []
    running = d.get("BackendState") == "Running"
    return {"installed": True, "state": d.get("BackendState", ""), "ip": next((i for i in ips if "." in i), ""),
            "name": (me.get("DNSName") or "").rstrip("."), "hostname": me.get("HostName", ""),
            "tailnet": (d.get("CurrentTailnet") or {}).get("Name", ""),
            "login_url": None if running else TS_LOGIN["url"]}


def ts_up(authkey):
    if not shutil.which("tailscale"):
        raise ApiError(400, "Tailscale non è installato: rilancia l'installer")
    host = socket.gethostname()
    if authkey:
        r = subprocess.run(["tailscale", "up", "--reset", f"--authkey={authkey}", f"--hostname={host}"],
                           capture_output=True, text=True, timeout=90)
        if r.returncode:
            raise ApiError(400, (r.stderr or r.stdout).strip()[-300:] or "Collegamento non riuscito")
        return {"ok": True}
    # senza chiave: tailscale stampa un link da aprire per accedere con il proprio account
    p = TS_LOGIN["proc"]
    if p and p.poll() is None and TS_LOGIN["url"]:
        return {"url": TS_LOGIN["url"]}
    p = subprocess.Popen(["tailscale", "up", "--reset", f"--hostname={host}"], stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    TS_LOGIN.update(proc=p, url=None)

    def reader():
        for line in p.stdout:
            m = re.search(r"https://login\.tailscale\.com/\S+", line)
            if m and not TS_LOGIN["url"]:
                TS_LOGIN["url"] = m.group(0)
        p.wait()
        TS_LOGIN["url"] = None

    threading.Thread(target=reader, daemon=True).start()
    t0 = time.time()
    while time.time() - t0 < 20:
        if TS_LOGIN["url"]:
            return {"url": TS_LOGIN["url"]}
        if p.poll() is not None:
            if p.returncode:
                raise ApiError(400, "Tailscale ha rifiutato il collegamento")
            return {"ok": True}
        time.sleep(0.3)
    raise ApiError(504, "Tailscale non ha risposto")


def ts_logout():
    subprocess.run(["tailscale", "logout"], capture_output=True, timeout=30)
    return {"ok": True}


def api_rename(body):
    return {"host": set_rig_name(str(body.get("name", "")))}


def api_settings(_):
    return {"tailscale": ts_status(), "token": API_TOKEN, "host": socket.gethostname(), "port": PORT, "version": VERSION}


def api_ts_up(body):
    return ts_up(str(body.get("authkey", "")).strip())


def api_ts_logout():
    return ts_logout()


ROUTES = [
    ("GET", r"status", api_status),
    ("GET", r"miners", api_miners),
    ("POST", r"miners", api_install),
    ("POST", r"miners/check", api_check_updates),
    ("DELETE", r"miners/([^/]+)", api_miner_delete),
    ("GET", r"miners/([^/]+)/exe", api_miner_exe),
    ("GET", r"launches", api_launches),
    ("GET", r"launches/([^/]+)", api_launch_get),
    ("PUT", r"launches/([^/]+)", api_launch_put),
    ("DELETE", r"launches/([^/]+)", api_launch_delete),
    ("POST", r"launches/([^/]+)/start", api_launch_start),
    ("POST", r"stop", api_stop),
    ("GET", r"log", api_log),
    ("GET", r"gpus", api_gpus),
    ("PUT", r"gpus/(\d+)", api_gpu_enable),
    ("GET", r"oc", api_oc_get),
    ("PUT", r"oc", api_oc_put),
    ("POST", r"power", api_power),
    ("GET", r"settings", api_settings),
    ("POST", r"rename", api_rename),
    ("POST", r"selfupdate", api_selfupdate),
    ("POST", r"selfcheck", api_selfcheck),
    ("POST", r"tailscale/up", api_ts_up),
    ("POST", r"tailscale/logout", api_ts_logout),
    ("GET", r"autofan", api_autofan_get),
    ("PUT", r"autofan", api_autofan_put),
]
STATIC = {"": "index.html", "index.html": "index.html", "miners.css": "miners.css", "miners.js": "miners.js", "i18n.js": "i18n.js",
          "logo.svg": "logo.svg", "apple-touch-icon.png": "apple-touch-icon.png", "favicon.ico": "logo.svg"}
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"}


TERM_SOCK = os.environ.get("MINERS_TERM_SOCK", "/run/miner-terminal.sock")
TERM_SOCKS = {"term": TERM_SOCK, "termm": TERM_SOCK.replace(".sock", "-mobile.sock")}  # termm: caratteri piccoli per telefono


def pump(read, sock_out, sock_close):
    try:
        while True:
            data = read(65536)
            if not data:
                break
            sock_out.sendall(data)
    except (OSError, ValueError):
        pass
    finally:
        for sk in sock_close:
            try:
                sk.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


SERVER_SEEN = {"time": 0}


def managed():
    """Il rig è gestito da minai-server se il server si è fatto vivo nell'ultimo minuto."""
    return time.time() - SERVER_SEEN["time"] < 60


class Handler(BaseHTTPRequestHandler):
    server_version = "MinerPanel"

    def log_message(self, fmt, *args):
        pass

    def send(self, code, body, ctype="application/json", headers=()):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def cookie(self, value, max_age):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto", "") == "https" else ""
        return ("Set-Cookie", f"{COOKIE}={value}; Max-Age={max_age}; Path=/; HttpOnly; SameSite=Lax{secure}")

    def authed(self):
        self.from_server = False
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer ") and hmac.compare_digest(auth[7:].strip(), API_TOKEN):
            SERVER_SEEN["time"] = time.time()
            # minai-server in persona (non una pagina aperta da te attraverso il server)
            self.from_server = not self.headers.get("X-Minai-Proxy")
            return True
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == COOKIE and valid_token(v):
                return True
        return False

    def proxy_term(self, sock_path):
        """Inoltra /term/ al terminale ttyd (anche il websocket) dopo aver controllato il login."""
        try:
            up = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            up.connect(sock_path)
        except OSError:
            return self.send(502, {"error": "Terminale non disponibile: controlla il servizio miner-terminal"})
        is_ws = self.headers.get("Upgrade", "").lower() == "websocket"
        head = f"{self.command} {self.path} HTTP/1.1\r\n"
        for k, v in self.headers.items():
            if k.lower() in ("host", "connection", "keep-alive"):
                continue
            head += f"{k}: {v}\r\n"
        head += "Host: localhost\r\n"
        head += "Connection: Upgrade\r\n" if is_ws else "Connection: close\r\n"
        up.sendall((head + "\r\n").encode("latin-1"))
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            up.sendall(self.rfile.read(n))
        client = self.connection
        back = threading.Thread(target=pump, args=(up.recv, client, (up, client)), daemon=True)
        back.start()
        if is_ws:
            pump(self.rfile.read1, up, (up,))
        back.join()
        up.close()
        self.close_connection = True

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except ValueError:
            raise ApiError(400, "JSON non valido")

    def handle_any(self, method):
        url = urlparse(self.path)
        path = unquote(url.path).lstrip("/")
        try:
            top = path.split("/", 1)[0]
            if top in TERM_SOCKS:
                if not self.authed():
                    return self.send(401, b"<p style='font-family:sans-serif'>Accesso richiesto: ricarica la pagina.</p>",
                                     "text/html; charset=utf-8")
                return self.proxy_term(TERM_SOCKS[top])
            if not path.startswith("api/"):
                name = STATIC.get(path)
                if method != "GET" or not name:
                    return self.send(404, {"error": "Non trovato"})
                with open(os.path.join(WWW, name), "rb") as f:
                    return self.send(200, f.read(), TYPES[os.path.splitext(name)[1]])
            path = path[4:]
            if path == "auth" and method == "GET":
                return self.send(200, {"setup": needs_setup(), "host": socket.gethostname()})
            if path == "setup" and method == "POST":
                body = self.body()
                pw = str(body.get("password", ""))
                if len(pw) < 8:
                    return self.send(400, {"error": "Usa almeno 8 caratteri"})
                name = str(body.get("name", "")).strip().lower()
                if name and not RIG_NAME_RE.match(name):
                    return self.send(400, {"error": "Nome non valido: lettere minuscole, numeri e trattini, senza spazi"})
                with SETUP_LOCK:
                    if not needs_setup():
                        return self.send(409, {"error": "La password è già stata scelta"})
                    CFG["password"] = hash_password(pw)
                    save_conf(CFG)
                if name:
                    try:
                        set_rig_name(name)
                    except ApiError:
                        pass  # il nome si può cambiare dopo dalle Impostazioni
                finish_console()
                return self.send(200, {"ok": True}, headers=[self.cookie(make_token(), SESSION_SECONDS)])
            if path == "login" and method == "POST":
                if check_password(str(self.body().get("password", ""))):
                    return self.send(200, {"ok": True}, headers=[self.cookie(make_token(), SESSION_SECONDS)])
                time.sleep(1.5)
                return self.send(401, {"error": "Password errata"})
            if path == "logout" and method == "POST":
                return self.send(200, {"ok": True}, headers=[self.cookie("", 0)])
            if not self.authed():
                return self.send(401, {"error": "Accesso richiesto"})
            for m, pattern, fn in ROUTES:
                match = re.fullmatch(pattern, path)
                if m == method and match:
                    if fn in (api_install, api_miner_delete, api_launch_put, api_launch_delete) \
                            and managed() and not self.from_server:
                        raise ApiError(409, "Miner e lanci sono gestiti da minai-server: modificali da lì")
                    args = list(match.groups())
                    if fn in (api_install, api_launch_put, api_oc_put, api_power, api_autofan_put, api_ts_up, api_rename, api_gpu_enable):
                        args.append(self.body())
                    elif method == "GET" and not args:
                        args.append(parse_qs(url.query))
                    return self.send(200, fn(*args))
            return self.send(404, {"error": "Non trovato"})
        except ApiError as e:
            return self.send(e.code, {"error": str(e)})
        except Exception as e:  # errore imprevisto: lo riportiamo invece di chiudere la connessione
            return self.send(500, {"error": f"{type(e).__name__}: {e}"})

    def do_GET(self):
        self.handle_any("GET")

    def do_POST(self):
        self.handle_any("POST")

    def do_PUT(self):
        self.handle_any("PUT")

    def do_DELETE(self):
        self.handle_any("DELETE")


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    threading.Thread(target=update_loop, daemon=True).start()
    threading.Thread(target=sys_sampler, daemon=True).start()
    threading.Thread(target=speed_follower, daemon=True).start()
    threading.Thread(target=setup_beacon, daemon=True).start()
    if not needs_setup():
        finish_console()  # schermata con il logo anche sui rig già configurati
    if PORT != 80:
        # anche sulla porta 80, così nel browser basta http://nome-del-rig.local senza :8080
        try:
            srv80 = ThreadingHTTPServer(("0.0.0.0", 80), Handler)
            srv80.daemon_threads = True
            threading.Thread(target=srv80.serve_forever, daemon=True).start()
        except OSError:
            pass
    print(f"minai {VERSION} in ascolto sulla porta {PORT}", flush=True)
    srv.serve_forever()
