#!/bin/bash
# Installa o aggiorna minai-server. Fa tutto da solo: pacchetti, servizio e Tailscale.
# Uso (come root):  bash install.sh [tskey-auth-...]
# Con una chiave Tailscale il collegamento è automatico; senza, compare un link/QR da aprire una volta.
set -e
cd "$(dirname "$0")"
SUDO=""; [ "$(id -u)" -eq 0 ] || SUDO="sudo"
PORT="${PORT:-8090}"
AUTHKEY="${1:-${MINAI_AUTHKEY:-}}"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "minai-server: installazione"
$SUDO apt-get update -qq
$SUDO apt-get install -y -qq python3 curl unzip ca-certificates >/dev/null

id minai >/dev/null 2>&1 || $SUDO useradd --system --home /opt/minai-server --shell /usr/sbin/nologin minai
$SUDO mkdir -p /opt/minai-server/www
$SUDO install -m 755 server.py /opt/minai-server/server.py
$SUDO install -m 644 www/index.html www/app.js www/app.css www/i18n.js www/logo.svg www/apple-touch-icon.png /opt/minai-server/www/
$SUDO install -m 644 minai-server.service minai-server-update.service minai-server-update.path /etc/systemd/system/
# fuori da /opt/minai-server (che appartiene all'utente minai): lo esegue root
$SUDO install -D -m 755 update.sh /usr/local/lib/minai-server/update.sh
command -v unzip >/dev/null || $SUDO apt-get install -y -qq unzip >/dev/null
# la password si sceglie al primo accesso dal pannello
$SUDO test -f /opt/minai-server/config.json || $SUDO python3 /opt/minai-server/server.py --init "$PORT" </dev/null
$SUDO chown -R minai:minai /opt/minai-server
$SUDO systemctl daemon-reload
$SUDO systemctl enable minai-server.service >/dev/null
$SUDO systemctl enable --now minai-server-update.path >/dev/null
$SUDO systemctl restart minai-server.service

say "Tailscale"
if [ ! -c /dev/net/tun ]; then
  echo "Nel container manca /dev/net/tun, quindi Tailscale non può funzionare."
  echo "In Proxmox: container > Resources > Add > Device Passthrough > /dev/net/tun"
  echo "(oppure aggiungi a /etc/pve/lxc/<ID>.conf:"
  echo "   lxc.cgroup2.devices.allow: c 10:200 rwm"
  echo "   lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file )"
  echo "Riavvia il container e rilancia l'installazione: minai-server è già installato, manca solo Tailscale."
  exit 1
fi
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | $SUDO sh >/dev/null
if ! tailscale status >/dev/null 2>&1; then
  if [ -n "$AUTHKEY" ]; then
    $SUDO tailscale up --authkey="$AUTHKEY" --hostname=minai-server --operator=minai
  else
    echo "Collega minai-server al tuo account Tailscale: apri il link (o inquadra il QR con il telefono)."
    $SUDO tailscale up --qr --hostname=minai-server --operator=minai
  fi
fi
$SUDO tailscale set --operator=minai 2>/dev/null || true

# Indirizzo sicuro (https://minai-server.…ts.net) servito da Tailscale con un certificato vero.
# Se la rete non l'ha ancora autorizzato, Tailscale dà un link: lo mostriamo anche come QR.
HTTPS_URL=""
if tailscale status >/dev/null 2>&1; then
  # solo installando a mano (con un terminale): negli aggiornamenti automatici non c'è nessuno a cliccare
  if [ -t 1 ] && ! tailscale serve status --json 2>/dev/null | grep -q '"Web"'; then
    say "Indirizzo sicuro (HTTPS)"
    command -v qrencode >/dev/null || $SUDO apt-get install -y -qq qrencode >/dev/null 2>&1 || true
    OUT=$(mktemp)
    $SUDO timeout 300 tailscale serve --bg "$PORT" > "$OUT" 2>&1 &
    SERVE_PID=$!
    trap 'kill "$SERVE_PID" 2>/dev/null' INT   # Ctrl+C salta solo questo passaggio
    SHOWN=""
    while kill -0 "$SERVE_PID" 2>/dev/null; do
      LINK=$(grep -o 'https://login\.tailscale\.com/[^[:space:]]*' "$OUT" | head -1)
      if [ -n "$LINK" ] && [ -z "$SHOWN" ]; then
        echo "Tailscale chiede di autorizzare l'indirizzo sicuro, una volta sola."
        echo "Apri questo link (o inquadra il QR) e premi Abilita; l'installazione prosegue da sola:"
        echo "  $LINK"
        command -v qrencode >/dev/null && qrencode -t ansiutf8 "$LINK"
        echo "(Per saltare questo passaggio premi Ctrl+C: potrai attivarlo dopo dalle Impostazioni.)"
        SHOWN=1
      fi
      sleep 1
    done
    wait "$SERVE_PID" 2>/dev/null || true
    trap - INT
    rm -f "$OUT"
  fi
  NAME=$(tailscale status --json 2>/dev/null | python3 -c "import json,sys; print((json.load(sys.stdin).get('Self') or {}).get('DNSName','').rstrip('.'))" 2>/dev/null)
  tailscale serve status --json 2>/dev/null | grep -q '"Web"' && [ -n "$NAME" ] && HTTPS_URL="https://$NAME"
fi

IP=$(tailscale ip -4 2>/dev/null | head -1)
sleep 1
if systemctl is-active --quiet minai-server.service; then
  say "Fatto."
  if [ -n "$HTTPS_URL" ]; then
    echo "Apri  $HTTPS_URL  da un dispositivo collegato a Tailscale."
    echo "(funziona anche  http://${IP:-$(hostname -I | awk '{print $1}')}:$PORT )"
  else
    echo "Apri  http://${IP:-$(hostname -I | awk '{print $1}')}:$PORT  da un dispositivo collegato a Tailscale."
  fi
  $SUDO python3 -c "import json,sys; sys.exit(0 if json.load(open('/opt/minai-server/config.json')).get('password') else 1)" \
    || echo "Al primo accesso scegli la password del pannello."
else
  echo "minai-server non è partito. Controlla con: journalctl -u minai-server -n 30"
  exit 1
fi
