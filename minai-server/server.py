#!/usr/bin/env python3
"""minai-server: il pannello centrale che raccoglie tutti i rig.

Ogni rig ha il suo minai (il client). minai-server li raggiunge attraverso Tailscale,
ne legge lo stato ogni 10 secondi e, quando apri un rig, ti mostra il suo pannello
passando da qui: una sola password, un solo indirizzo, anche per terminale e log.

Solo libreria standard.

Uso:
  server.py                 avvia il server
  server.py --init PORT     crea la configurazione (password da stdin)
  server.py --password      cambia la password
"""
import base64
import difflib
import getpass
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import subprocess
import socket
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

VERSION = "0.9.16"
ROOT = os.environ.get("MINAI_SERVER_ROOT", "/opt/minai-server")
CONF = f"{ROOT}/config.json"
DB = f"{ROOT}/minai.db"
WWW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")
COOKIE = "minai_srv"
SESSION_SECONDS = 30 * 24 * 3600
POLL_EVERY = 10
AGENT_PORT = 8080


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
        pw = "" if sys.stdin.isatty() else sys.stdin.read().rstrip("\n")
        # senza password: la sceglie l'utente al primo accesso dal pannello
        save_conf({"port": int(sys.argv[2]), "secret": secrets.token_hex(32),
                   "password": hash_password(pw) if pw else ""})
        print(f"Configurazione creata in {CONF}")
    elif sys.argv[1] == "--password":
        with open(CONF) as f:
            cfg = json.load(f)
        p1 = getpass.getpass("Nuova password: ")
        if not p1 or p1 != getpass.getpass("Ripetila: "):
            sys.exit("Le password non coincidono.")
        cfg["password"] = hash_password(p1)
        cfg["secret"] = secrets.token_hex(32)
        save_conf(cfg)
        print("Password cambiata. Riavvia: sudo systemctl restart minai-server")
    else:
        sys.exit(__doc__)


if len(sys.argv) > 1:
    cli()
    sys.exit(0)

with open(CONF) as _f:
    CFG = json.load(_f)
SECRET = CFG["secret"].encode()
PORT = int(CFG.get("port", 8090))


SETUP_LOCK = threading.Lock()


def needs_setup():
    return not CFG.get("password")


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


# ---------- database dei rig ----------

DB_LOCK = threading.Lock()


def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


with DB_LOCK, db() as _con:
    _con.execute("""CREATE TABLE IF NOT EXISTS rigs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        token TEXT NOT NULL,
        created INTEGER NOT NULL)""")
    _con.execute("""CREATE TABLE IF NOT EXISTS miners (
        name TEXT PRIMARY KEY,
        url TEXT NOT NULL)""")
    _con.execute("""CREATE TABLE IF NOT EXISTS launches (
        name TEXT PRIMARY KEY,
        miner TEXT NOT NULL,
        content TEXT NOT NULL,
        updated INTEGER NOT NULL)""")
os.chmod(DB, 0o600)


def all_rigs():
    with DB_LOCK, db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM rigs ORDER BY name COLLATE NOCASE")]


def get_rig(rid):
    with DB_LOCK, db() as con:
        r = con.execute("SELECT * FROM rigs WHERE id = ?", (rid,)).fetchone()
    return dict(r) if r else None


class ApiError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


ADDR_RE = re.compile(r"^[A-Za-z0-9.\-]+(:\d{1,5})?$")


def split_addr(address):
    host, _, port = address.partition(":")
    return host, int(port or AGENT_PORT)


def agent_call(rig, method, path, body=None, timeout=15):
    host, port = split_addr(rig["address"])
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Authorization": f"Bearer {rig['token']}"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"http://{host}:{port}/api/{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise
        try:
            msg = json.load(e).get("error")
        except ValueError:
            msg = None
        raise RuntimeError(msg or f"errore {e.code}")


def agent_get(rig, path, timeout=6):
    return agent_call(rig, "GET", path, timeout=timeout)


# ---------- controllo periodico dei rig ----------

SNAP = {}  # id -> {"online", "last_seen", "status", "gpus", "error"}


def poll_one(rig):
    snap = SNAP.get(rig["id"], {})
    try:
        status = agent_get(rig, "status")
        gpus = agent_get(rig, "gpus").get("gpus", [])
        SNAP[rig["id"]] = {"online": True, "last_seen": int(time.time()), "status": status,
                           "gpus": gpus, "error": None}
    except urllib.error.HTTPError as e:
        msg = "token non valido" if e.code == 401 else f"errore {e.code}"
        SNAP[rig["id"]] = {**snap, "online": False, "error": msg}
    except (OSError, ValueError) as e:
        SNAP[rig["id"]] = {**snap, "online": False, "error": f"non raggiungibile: {getattr(e, 'reason', e)}"}


def poll_loop():
    with ThreadPoolExecutor(max_workers=16) as ex:
        while True:
            rigs = all_rigs()
            list(ex.map(poll_one, rigs))
            ids = {r["id"] for r in rigs}
            for k in list(SNAP):
                if k not in ids:
                    SNAP.pop(k, None)
            time.sleep(POLL_EVERY)


# ---------- API ----------

def public_rig(rig):
    snap = SNAP.get(rig["id"], {})
    return {"id": rig["id"], "name": rig["name"], "address": rig["address"], **snap, "deploy": DEPLOY.get(rig["id"])}


def api_rigs(_):
    server_exp, peers = ts_expiries() if shutil.which("tailscale") else (None, [])
    out = []
    for r in all_rigs():
        pr = public_rig(r)
        pr["ts_expiry"] = rig_expiry(r, peers)
        out.append(pr)
    srv_latest, rig_latest = latest_with("minai-server.zip"), latest_with("minai.zip")
    return {"rigs": out, "version": VERSION, "host": socket.gethostname(), "server_expiry": server_exp,
            "update": srv_latest if newer(srv_latest, VERSION) else None,
            "updating": os.path.exists(UPDATE_REQUEST) or unit_active("minai-server-update.service"),
            "rig_latest": rig_latest}


def api_rig_add(body):
    name = str(body.get("name", "")).strip()[:40]
    address = str(body.get("address", "")).strip()
    token = str(body.get("token", "")).strip()
    if not ADDR_RE.match(address):
        raise ApiError(400, "Indirizzo non valido: usa l'IP Tailscale (100.x.x.x) o il nome del rig")
    if len(token) < 20:
        raise ApiError(400, "Token mancante: lo trovi sul rig con  sudo python3 /opt/miners/panel/server.py --token")
    rig = {"address": address, "token": token}
    try:
        status = agent_get(rig, "status")
    except urllib.error.HTTPError as e:
        raise ApiError(400, "Il rig risponde, ma il token non è corretto" if e.code == 401 else f"Il rig risponde con errore {e.code}")
    except (OSError, ValueError):
        raise ApiError(400, f"Non riesco a raggiungere {address}: il rig è acceso, con minai e Tailscale attivi?")
    name = name or str(status.get("host") or "")[:40] or address  # di default il nome scelto sul rig
    with DB_LOCK, db() as con:
        cur = con.execute("INSERT INTO rigs (name, address, token, created) VALUES (?, ?, ?, ?)",
                          (name, address, token, int(time.time())))
        rid = cur.lastrowid
    rig = get_rig(rid)
    threading.Thread(target=poll_one, args=(rig,), daemon=True).start()
    return {"id": rid, "host": status.get("host")}


def api_rig_update(rid, body):
    rig = get_rig(int(rid))
    if not rig:
        raise ApiError(404, "Rig non trovato")
    name = str(body.get("name", rig["name"])).strip()[:40] or rig["name"]
    address = str(body.get("address", rig["address"])).strip()
    if not ADDR_RE.match(address):
        raise ApiError(400, "Indirizzo non valido")
    token = str(body.get("token", "")).strip() or rig["token"]
    with DB_LOCK, db() as con:
        con.execute("UPDATE rigs SET name = ?, address = ?, token = ? WHERE id = ?", (name, address, token, rig["id"]))
    threading.Thread(target=poll_one, args=(get_rig(rig["id"]),), daemon=True).start()
    return {"ok": True}


def api_rig_delete(rid):
    with DB_LOCK, db() as con:
        con.execute("DELETE FROM rigs WHERE id = ?", (int(rid),))
    SNAP.pop(int(rid), None)
    return {"ok": True}


# ---------- catalogo condiviso: miner e lanci uguali per tutti i rig ----------

NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
DEPLOY = {}  # id rig -> {"launch", "state": running|ok|error, "step", "time"}


def check_name(name, what):
    if not NAME_RE.match(name or ""):
        raise ApiError(400, f"Nome {what} non valido: lettere, numeri, . _ -")
    return name


def catalog_miners():
    with DB_LOCK, db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM miners ORDER BY name COLLATE NOCASE")]


def catalog_launches():
    with DB_LOCK, db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM launches ORDER BY name COLLATE NOCASE")]


def get_launch(name):
    with DB_LOCK, db() as con:
        r = con.execute("SELECT * FROM launches WHERE name = ?", (name,)).fetchone()
    return dict(r) if r else None


def get_miner(name):
    with DB_LOCK, db() as con:
        r = con.execute("SELECT * FROM miners WHERE name = ?", (name,)).fetchone()
    return dict(r) if r else None


def render(content, rig, bin_dir, miner):
    """Sostituisce %WORKER_NAME% con il nome del rig: i percorsi sono uguali su tutti i rig."""
    content = content.replace("%WORKER_NAME%", rig["name"])
    # compatibilità con i lanci importati dalla v0.7
    return content.replace("%MINER_DIR%", f"{bin_dir}/{miner}").replace("%HOME%", os.path.dirname(bin_dir))


def deploy(rid, launch_name):
    def step(text, state="running"):
        DEPLOY[rid] = {"launch": launch_name, "state": state, "step": text, "time": int(time.time())}

    try:
        step("Preparo")
        rig, launch = get_rig(rid), get_launch(launch_name)
        if not rig or not launch:
            raise RuntimeError("rig o lancio non trovato")
        miner = get_miner(launch["miner"])
        if not miner:
            raise RuntimeError(f"il miner {launch['miner']} non è nel catalogo")
        bin_dir = agent_call(rig, "GET", "status")["bin"]
        have = {m["name"]: m["source"] for m in agent_call(rig, "GET", "miners")["miners"]}
        if have.get(miner["name"]) != miner["url"]:
            step(f"Installo {miner['name']}")
            agent_call(rig, "POST", "miners", {"name": miner["name"], "url": miner["url"]})
            deadline = time.time() + 1800
            while True:
                time.sleep(3)
                job = agent_call(rig, "GET", "miners").get("job") or {}
                if job.get("name") == miner["name"] and job.get("state") != "running":
                    if job.get("state") == "error":
                        raise RuntimeError(f"installazione di {miner['name']} non riuscita: {job.get('output', '')[-200:]}")
                    break
                if time.time() > deadline:
                    raise RuntimeError("installazione troppo lunga, controlla il rig")
        step("Scrivo il lancio")
        file = f"{launch_name}.sh"
        agent_call(rig, "PUT", f"launches/{file}", {"content": render(launch["content"], rig, bin_dir, miner["name"])})
        step("Avvio")
        agent_call(rig, "POST", f"launches/{file}/start", {})
        step(f"{launch_name} avviato", "ok")
        threading.Thread(target=poll_one, args=(rig,), daemon=True).start()
    except urllib.error.HTTPError:
        step("token del rig non valido", "error")
    except (OSError, ValueError, RuntimeError, KeyError) as e:
        step(str(e) or type(e).__name__, "error")


def rigs_using(launch_name):
    return [rid for rid, snap in SNAP.items()
            if snap.get("online") and (snap.get("status") or {}).get("active") == f"{launch_name}.sh"
            and (snap.get("status") or {}).get("running")]


def api_catalog(_):
    miners = catalog_miners()
    with UPD_LOCK:
        for m in miners:
            m["update"] = CAT_UPD.get(m["name"])
        checking, checked = UPD["checking"], UPD["checked"]
    launches = catalog_launches()
    for l in launches:
        l["rigs"] = rigs_using(l["name"])
    return {"miners": miners, "launches": launches, "deploy": DEPLOY, "checking": checking, "checked": checked}


def api_miner_put(name, body):
    check_name(name, "miner")
    url = str(body.get("url", "")).strip()
    if not re.match(r"^https?://", url):
        raise ApiError(400, "Il link deve iniziare con http:// o https://")
    with DB_LOCK, db() as con:
        con.execute("INSERT INTO miners (name, url) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET url = excluded.url", (name, url))
    with UPD_LOCK:
        CAT_UPD.pop(name, None)
    return {"ok": True}


def api_miner_delete(name):
    with DB_LOCK, db() as con:
        used = con.execute("SELECT name FROM launches WHERE miner = ?", (name,)).fetchall()
        if used:
            raise ApiError(409, f"Il miner è usato dai lanci: {', '.join(r[0] for r in used)}")
        con.execute("DELETE FROM miners WHERE name = ?", (name,))
    return {"ok": True}


def api_launch_put(name, body):
    check_name(name, "lancio")
    miner = str(body.get("miner", ""))
    if not get_miner(miner):
        raise ApiError(400, "Scegli un miner del catalogo")
    content = str(body.get("content", ""))
    with DB_LOCK, db() as con:
        con.execute("""INSERT INTO launches (name, miner, content, updated) VALUES (?, ?, ?, ?)
                       ON CONFLICT(name) DO UPDATE SET miner = excluded.miner, content = excluded.content,
                       updated = excluded.updated""", (name, miner, content, int(time.time())))
    targets = rigs_using(name) if body.get("redeploy") else []
    for rid in targets:
        threading.Thread(target=deploy, args=(rid, name), daemon=True).start()
    return {"ok": True, "redeployed": len(targets)}


def api_launch_delete(name):
    with DB_LOCK, db() as con:
        con.execute("DELETE FROM launches WHERE name = ?", (name,))
    return {"ok": True}


def api_deploy(body):
    name = str(body.get("launch", ""))
    if not get_launch(name):
        raise ApiError(404, "Lancio non trovato")
    ids = [int(x) for x in body.get("rigs", []) if str(x).isdigit()]
    if not ids:
        raise ApiError(400, "Scegli almeno un rig")
    for rid in ids:
        if DEPLOY.get(rid, {}).get("state") == "running":
            continue
        threading.Thread(target=deploy, args=(rid, name), daemon=True).start()
    return {"started": len(ids)}


def api_import(rid):
    """Copia nel catalogo miner e lanci di un rig, sostituendo il nome del rig con %WORKER_NAME%."""
    rig = get_rig(int(rid))
    if not rig:
        raise ApiError(404, "Rig non trovato")
    try:
        status = agent_call(rig, "GET", "status")
        miners = agent_call(rig, "GET", "miners")["miners"]
        launches = agent_call(rig, "GET", "launches")["launches"]
    except (OSError, ValueError, RuntimeError) as e:
        raise ApiError(502, f"Non riesco a leggere il rig: {e}")
    bin_dir, host = status["bin"], status.get("host", "")
    known = {m["name"] for m in catalog_miners()}
    added_m = added_l = 0
    with DB_LOCK, db() as con:
        for m in miners:
            if m.get("source") and m["name"] not in known:
                con.execute("INSERT INTO miners (name, url) VALUES (?, ?)", (m["name"], m["source"]))
                added_m += 1
    have_l = {l["name"] for l in catalog_launches()}
    for l in launches:
        name = l["file"][:-3]
        if name in have_l or not l.get("miner") or not NAME_RE.match(name):
            continue
        content = agent_call(rig, "GET", f"launches/{l['file']}")["content"]
        for word in {rig["name"], host}:
            if len(word) >= 3:
                content = re.sub(rf"(?<![A-Za-z0-9_-]){re.escape(word)}(?![A-Za-z0-9_-])", "%WORKER_NAME%", content)
        with DB_LOCK, db() as con:
            con.execute("INSERT INTO launches (name, miner, content, updated) VALUES (?, ?, ?, ?)",
                        (name, l["miner"], content, int(time.time())))
        added_l += 1
    return {"miners": added_m, "launches": added_l}


# ---------- aggiornamenti dei miner del catalogo (release GitHub) ----------

GH_RE = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/releases/download/([^/]+)/([^/?#]+)$")
CAT_UPD = {}
UPD = {"checking": False, "checked": 0}
UPD_LOCK = threading.Lock()


def vtuple(tag):
    return tuple(int(x) for x in re.findall(r"\d+", tag))


def shape(name):
    return re.sub(r"\d+", "#", name)


def gh_latest(owner, repo):
    req = urllib.request.Request(f"https://github.com/{owner}/{repo}/releases/latest", method="HEAD",
                                 headers={"User-Agent": "minai-server"})
    with urllib.request.urlopen(req, timeout=20) as r:
        final = r.geturl()
    if "/releases/tag/" not in final:
        raise RuntimeError("nessuna release")
    tag = final.rsplit("/releases/tag/", 1)[1]
    req = urllib.request.Request(f"https://github.com/{owner}/{repo}/releases/expanded_assets/{tag}",
                                 headers={"User-Agent": "minai-server"})
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8", "replace")
    prefix = f"/{owner}/{repo}/releases/download/{tag}/"
    names = sorted(set(re.findall(re.escape(prefix) + r'([^"?#]+)"', html)))
    return unquote(tag), [(unquote(n), f"https://github.com{prefix}{n}") for n in names], final


def check_updates():
    with UPD_LOCK:
        if UPD["checking"]:
            return
        UPD["checking"] = True
    result = {}
    try:
        for m in catalog_miners():
            mm = GH_RE.match(m["url"])
            if not mm:
                continue
            owner, repo, tag, asset = mm.groups()
            tag, asset = unquote(tag), unquote(asset)
            try:
                latest, assets, page = gh_latest(owner, repo)
                a, b = vtuple(latest), vtuple(tag)
                if latest != tag and (a > b if a and b else True):
                    pick = next((u for n, u in assets if shape(n) == shape(asset)), None)
                    if not pick and assets:
                        best = max(assets, key=lambda x: difflib.SequenceMatcher(None, shape(x[0]), shape(asset)).ratio())
                        if difflib.SequenceMatcher(None, shape(best[0]), shape(asset)).ratio() > 0.8:
                            pick = best[1]
                    result[m["name"]] = {"current": tag, "latest": latest, "url": pick, "page": page}
            except Exception:
                pass
        with UPD_LOCK:
            CAT_UPD.clear()
            CAT_UPD.update(result)
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
    lt = latest_with("minai-server.zip")
    return {"version": VERSION, "latest": lt, "update": lt if newer(lt, VERSION) else None}


UPDATE_REQUEST = f"{ROOT}/update-request"


def api_selfupdate(_body=None):
    lt = latest_with("minai-server.zip")
    if not newer(lt, VERSION):
        self_check()
        lt = latest_with("minai-server.zip")
    if not newer(lt, VERSION):
        raise ApiError(409, "Nessuna nuova versione da installare")
    # il servizio di aggiornamento (root) parte quando compare questo file
    with open(UPDATE_REQUEST, "w") as f:
        f.write(lt)
    return {"started": True}


def api_rig_selfupdate(rid, _body=None):
    rig = get_rig(int(rid))
    if not rig:
        raise ApiError(404, "Rig non trovato")
    try:
        # il rig potrebbe non sapere ancora della nuova versione: gli facciamo ricontrollare GitHub prima
        agent_call(rig, "POST", "selfcheck", {}, timeout=40)
        for attempt in range(10):  # le versioni fino alla 0.9.2 ricontrollano in background: diamogli tempo
            try:
                return agent_call(rig, "POST", "selfupdate", {}, timeout=40)
            except RuntimeError as e:
                if "Nessuna nuova versione" not in str(e) or attempt == 9:
                    raise
                time.sleep(2)
    except urllib.error.HTTPError:
        raise ApiError(400, "Token del rig non valido")
    except (OSError, ValueError, RuntimeError) as e:
        raise ApiError(502, f"{rig['name']}: {e}")


def update_loop():
    time.sleep(30)
    while True:
        self_check()
        check_updates()
        time.sleep(6 * 3600)


def api_check(_body):
    threading.Thread(target=self_check, daemon=True).start()
    threading.Thread(target=check_updates, daemon=True).start()
    return {"started": True}


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
            "key_expiry": me.get("KeyExpiry") or None,
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


def ts_expiries():
    """Scadenza della chiave Tailscale di questo server e dei rig: None se la scadenza è disattivata."""
    try:
        d = json.loads(subprocess.run(["tailscale", "status", "--json"], capture_output=True,
                                      text=True, timeout=10).stdout or "{}")
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None, []
    me = d.get("Self") or {}
    peers = []
    for p in (d.get("Peer") or {}).values():
        peers.append({"host": (p.get("HostName") or "").lower(), "dns": (p.get("DNSName") or "").lower().rstrip("."),
                      "ips": p.get("TailscaleIPs") or [], "expiry": p.get("KeyExpiry") or None})
    return me.get("KeyExpiry") or None, peers


def rig_expiry(rig, peers):
    host = split_addr(rig["address"])[0].lower()
    for p in peers:
        if host in p["ips"] or host == p["host"] or host == p["dns"] or p["dns"].startswith(host + "."):
            return p["expiry"]
    return None


def ts_logout():
    subprocess.run(["tailscale", "logout"], capture_output=True, timeout=30)
    return {"ok": True}


def api_settings(_):
    return {"tailscale": ts_status(), "host": socket.gethostname(), "version": VERSION}


def api_ts_up(body):
    return ts_up(str(body.get("authkey", "")).strip())


def api_ts_logout(_body=None):
    return ts_logout()


ROUTES = [
    ("GET", r"rigs", api_rigs),
    ("POST", r"rigs", api_rig_add),
    ("PUT", r"rigs/(\d+)", api_rig_update),
    ("DELETE", r"rigs/(\d+)", api_rig_delete),
    ("GET", r"catalog", api_catalog),
    ("PUT", r"catalog/miners/([^/]+)", api_miner_put),
    ("DELETE", r"catalog/miners/([^/]+)", api_miner_delete),
    ("PUT", r"catalog/launches/([^/]+)", api_launch_put),
    ("DELETE", r"catalog/launches/([^/]+)", api_launch_delete),
    ("POST", r"catalog/check", api_check),
    ("POST", r"catalog/import/(\d+)", api_import),
    ("POST", r"deploy", api_deploy),
    ("POST", r"selfupdate", api_selfupdate),
    ("POST", r"selfcheck", api_selfcheck),
    ("POST", r"rigs/(\d+)/selfupdate", api_rig_selfupdate),
    ("GET", r"settings", api_settings),
    ("POST", r"tailscale/up", api_ts_up),
    ("POST", r"tailscale/logout", api_ts_logout),
]
STATIC = {"": "index.html", "index.html": "index.html", "app.css": "app.css", "app.js": "app.js", "i18n.js": "i18n.js",
          "logo.svg": "logo.svg", "apple-touch-icon.png": "apple-touch-icon.png", "favicon.ico": "logo.svg"}
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"}


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


class Handler(BaseHTTPRequestHandler):
    server_version = "minai-server"

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

    def redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def cookie(self, value, max_age):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto", "") == "https" else ""
        return ("Set-Cookie", f"{COOKIE}={value}; Max-Age={max_age}; Path=/; HttpOnly; SameSite=Lax{secure}")

    def authed(self):
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == COOKIE and valid_token(v):
                return True
        return False

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except ValueError:
            raise ApiError(400, "JSON non valido")

    def proxy_rig(self, rig, rest):
        """Inoltra la richiesta (anche websocket: terminale) al minai del rig, aggiungendo il suo token."""
        host, port = split_addr(rig["address"])
        try:
            up = socket.create_connection((host, port), timeout=8)
            up.settimeout(None)
        except OSError:
            return self.send(502, f"<p style='font-family:sans-serif'>{rig['name']} non è raggiungibile.</p>".encode(),
                             "text/html; charset=utf-8")
        is_ws = self.headers.get("Upgrade", "").lower() == "websocket"
        head = f"{self.command} /{rest} HTTP/1.1\r\n"
        for k, v in self.headers.items():
            if k.lower() in ("host", "connection", "keep-alive", "cookie", "authorization", "x-minai-proxy"):
                continue
            head += f"{k}: {v}\r\n"
        head += f"Host: {host}:{port}\r\nAuthorization: Bearer {rig['token']}\r\nX-Minai-Proxy: 1\r\n"
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

    def handle_any(self, method):
        url = urlparse(self.path)
        path = unquote(url.path).lstrip("/")
        try:
            m = re.match(r"^rig/(\d+)(/.*)?$", path)
            if m:
                if not self.authed():
                    return self.redirect("/") if method == "GET" else self.send(401, {"error": "Accesso richiesto"})
                rig = get_rig(int(m.group(1)))
                if not rig:
                    return self.send(404, {"error": "Rig non trovato"})
                if m.group(2) is None:
                    return self.redirect(f"/rig/{rig['id']}/")
                # percorso originale (non decodificato) dopo /rig/<id>/, con eventuale query
                raw = url.path.split("/", 3)[3] if url.path.count("/") >= 3 else ""
                return self.proxy_rig(rig, raw + (f"?{url.query}" if url.query else ""))
            if not path.startswith("api/"):
                name = STATIC.get(path)
                if method != "GET" or not name:
                    return self.send(404, {"error": "Non trovato"})
                with open(os.path.join(WWW, name), "rb") as f:
                    return self.send(200, f.read(), TYPES[os.path.splitext(name)[1]])
            path = path[4:]
            if path == "auth" and method == "GET":
                return self.send(200, {"setup": needs_setup(), "authed": self.authed()})
            if path == "setup" and method == "POST":
                pw = str(self.body().get("password", ""))
                if len(pw) < 8:
                    return self.send(400, {"error": "Usa almeno 8 caratteri"})
                with SETUP_LOCK:
                    if not needs_setup():
                        return self.send(409, {"error": "La password è già stata scelta"})
                    CFG["password"] = hash_password(pw)
                    save_conf(CFG)
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
            for mth, pattern, fn in ROUTES:
                match = re.fullmatch(pattern, path)
                if mth == method and match:
                    args = list(match.groups())
                    if method in ("POST", "PUT") and fn is not api_import:
                        args.append(self.body())
                    elif not args:
                        args.append(None)
                    return self.send(200, fn(*args))
            return self.send(404, {"error": "Non trovato"})
        except ApiError as e:
            return self.send(e.code, {"error": str(e)})
        except Exception as e:
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
    threading.Thread(target=poll_loop, daemon=True).start()
    threading.Thread(target=update_loop, daemon=True).start()
    print(f"minai-server {VERSION} in ascolto sulla porta {PORT}", flush=True)
    srv.serve_forever()
