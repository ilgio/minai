#!/bin/bash
# Installa o aggiorna minai, il pannello del rig: server web, servizio del miner e overclock.
# Lancialo come utente normale (non con sudo): chiede la password quando serve.
# Gli aggiornamenti dal pannello lo lanciano come root con MINAI_OWNER=<utente>.
set -e
cd "$(dirname "$0")"
if [ "$(id -u)" -eq 0 ]; then
  if [ -z "$MINAI_OWNER" ]; then
    echo "Lancia lo script come utente normale, senza sudo: bash install.sh"
    exit 1
  fi
  sudo() { "$@"; }                      # siamo già root
  U="$MINAI_OWNER"
  HOME_DIR="$(getent passwd "$U" | cut -d: -f6)"
  as_user() { runuser -u "$U" -- "$@"; }
else
  U="$(id -un)"
  HOME_DIR="$HOME"
  as_user() { "$@"; }
fi
OWNER="$U:$(id -gn "$U")"
BIN="$HOME_DIR/miners"
PORT="${PORT:-8080}"

echo "== Pacchetti di sistema"
sudo apt-get install -y curl unzip python3 python3-venv libgomp1 libgmp10 ttyd tmux avahi-daemon avahi-utils

echo "== Tailscale"
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sudo sh

echo "== Cartelle"
sudo mkdir -p /opt/miners/scripts /opt/miners/panel/www
as_user mkdir -p "$BIN" "$HOME_DIR/models"

echo "== Libreria NVIDIA per l'overclock"
[ -x /opt/miners/venv/bin/python3 ] || sudo python3 -m venv /opt/miners/venv
sudo /opt/miners/venv/bin/pip install -q --upgrade nvidia-ml-py

echo "== File del pannello e servizi"
sudo install -m 755 server.py /opt/miners/panel/server.py
sudo install -m 644 www/index.html www/miners.css www/miners.js www/i18n.js www/logo.svg www/apple-touch-icon.png /opt/miners/panel/www/
sudo install -m 755 oc.py /opt/miners/oc.py
sudo install -m 755 autofan.py /opt/miners/autofan.py
sudo install -m 755 update.sh /opt/miners/update.sh
sudo install -m 755 run-launch.sh /opt/miners/run-launch.sh
sudo install -m 644 oc.service miner-panel.service miner-autofan.service /etc/systemd/system/
# il miner gira come utente normale (con la sua cartella personale come HOME)
sed -e "s|OWNER_USER|$U|" -e "s|OWNER_GROUP|$(id -gn "$U")|" -e "s|OWNER_HOME|$HOME_DIR|" miner.service \
  | sudo tee /etc/systemd/system/miner.service >/dev/null
# migrazione: file e modelli creati quando il miner girava come root diventano dell'utente
sudo chown -R "$OWNER" "$BIN" "$HOME_DIR/models" 2>/dev/null || true
sed -e "s|TTYD_BIN|$(command -v ttyd)|" -e "s|OWNER_USER|$U|" miner-terminal.service \
  | sudo tee /etc/systemd/system/miner-terminal.service >/dev/null
# seconda copia del terminale con caratteri piccoli per il telefono (stessa sessione tmux)
sed -e "s|TTYD_BIN|$(command -v ttyd)|" -e "s|OWNER_USER|$U|" -e "s|miner-terminal.sock|miner-terminal-mobile.sock|g" \
    -e "s|-b /term |-b /termm |" -e "s|fontSize=14|fontSize=10|" -e "s|^Description=.*|Description=Terminale web del pannello Miner, versione telefono|" \
    miner-terminal.service | sudo tee /etc/systemd/system/miner-terminal-mobile.service >/dev/null
# tmux: scorrimento con dita/rotella e cronologia lunga (solo se non hai già una tua configurazione)
[ -f "$HOME_DIR/.tmux.conf" ] || printf 'set -g mouse on\nset -g history-limit 10000\n' | as_user tee "$HOME_DIR/.tmux.conf" >/dev/null

if ! sudo test -f /opt/miners/panel.json && [ "$(id -u)" -eq 0 ]; then
  # installazione automatica: la password del pannello si sceglie al primo accesso dal browser
  python3 /opt/miners/panel/server.py --init "$BIN" "$OWNER" "$PORT" </dev/null
elif ! sudo test -f /opt/miners/panel.json; then
  echo
  read -rsp "Scegli la password del pannello: " P1; echo
  read -rsp "Ripetila: " P2; echo
  if [ -z "$P1" ] || [ "$P1" != "$P2" ]; then echo "Le password non coincidono."; exit 1; fi
  printf '%s' "$P1" | sudo python3 /opt/miners/panel/server.py --init "$BIN" "$OWNER" "$PORT"
  unset P1 P2
fi

sudo systemctl daemon-reload
sudo systemctl enable miner.service oc.service >/dev/null
sudo systemctl enable miner-panel.service miner-terminal.service miner-terminal-mobile.service miner-autofan.service >/dev/null
sudo systemctl restart miner-terminal.service miner-terminal-mobile.service miner-autofan.service miner-panel.service
# se il miner sta girando, riparte subito come utente normale
sudo systemctl try-restart miner.service 2>/dev/null || true

# Il vecchio pannello di Cockpit non serve più
[ -d /usr/share/cockpit/miners ] && sudo rm -rf /usr/share/cockpit/miners && echo "Rimosso il vecchio pannello da Cockpit."

sleep 1
if systemctl is-active --quiet miner-panel.service; then
  PORT_REAL=$(sudo python3 -c "import json;print(json.load(open('/opt/miners/panel.json')).get('port',8080))")
  echo
  echo "minai pronto: http://$(hostname -I | awk '{print $1}'):$PORT_REAL"
  echo "Collega Tailscale e prendi indirizzo e token per minai-server da: menu > Impostazioni."
else
  echo "Il pannello non è partito. Controlla con: journalctl -u miner-panel -n 30"
  exit 1
fi
