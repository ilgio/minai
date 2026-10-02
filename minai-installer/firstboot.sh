#!/bin/bash
# minai: prima configurazione del rig, al primo avvio dopo l'installazione.
# Nome univoco, driver NVIDIA, minai e Tailscale; poi riavvia. Registro: /var/log/minai-firstboot.log
set -e
exec >>/var/log/minai-firstboot.log 2>&1
echo "=== $(date) prima configurazione"

# schermata fissa per chi ha un monitor: logo, passo, barra e tempo (console 2)
. /usr/local/lib/minai/screen.sh
START=$(date +%s)
step() { echo "$1|$2|$3|$(date +%s)" > /run/minai-step; }   # da% | fino a% | testo
screen_loop() {
  local B C T S P title MINAI_TITLE_EN
  while true; do
    IFS='|' read -r B C T S < /run/minai-step 2>/dev/null || { sleep 2; continue; }
    title="Configurazione del rig  -  passo 2 di 2"; MINAI_TITLE_EN="Setting up the rig  -  step 2 of 2"
    if [ "$B" = "E" ]; then P=0; title="Si e' verificato un problema"; MINAI_TITLE_EN="Something went wrong"
    else P=$(( B + ($(date +%s) - S) / 6 )); [ "$P" -gt "$C" ] && P=$C; fi
    minai_screen "$title" "$P" "$T" "$START" "Poi si riavvia da solo / Then it restarts by itself."
    minai_show
    sleep 3
  done
}
step 2 10 "Collegamento alla rete  /  Connecting to the network"
screen_loop &
trap 'step E E "Dettagli / Details: /var/log/minai-firstboot.log"' ERR
REPO="${MINAI_REPO:-ilgio/minai}"

# nome univoco: minai- + ultime 4 cifre del MAC della scheda di rete
IFACE=$(ip route show default | awk '{print $5; exit}')
SUFFIX=$(tr -d ':' < "/sys/class/net/${IFACE:-eth0}/address" 2>/dev/null | tail -c 5 || echo 0000)
NAME="minai-$SUFFIX"
hostnamectl set-hostname "$NAME"
sed -i "s/\bminai-rig\b/$NAME/g" /etc/hosts
echo "nome: $NAME"

echo "attendo la rete"
until curl -fsS -o /dev/null https://github.com; do sleep 5; done

export DEBIAN_FRONTEND=noninteractive
apt-get update -q

step 10 70 "Driver NVIDIA (la parte piu' lunga)  /  NVIDIA driver (the longest part)"
if lspci | grep -qi nvidia && ! command -v nvidia-smi >/dev/null; then
  echo "driver NVIDIA"
  ubuntu-drivers install --gpgpu nvidia:610-open || ubuntu-drivers install --gpgpu
  BR=$(dpkg-query -W -f='${Package}\n' 'nvidia-*' 2>/dev/null | grep -oP '^nvidia-(headless|driver|compute-utils)(-no-dkms)?-\K[0-9]+' | head -1)
  [ -n "$BR" ] && apt-get install -y -q "nvidia-utils-$BR" || true
fi

step 70 95 "minai e Tailscale  /  minai and Tailscale"
echo "minai"
TMP=$(mktemp -d)
curl -fsSL "https://github.com/$REPO/releases/latest/download/minai.zip" -o "$TMP/minai.zip"
unzip -q "$TMP/minai.zip" -d "$TMP"
MINAI_OWNER=user bash "$TMP/minai/install.sh"
rm -rf "$TMP"

step 100 100 "Fatto: riavvio in corso  /  Done: restarting"
sleep 4
touch /var/lib/minai-firstboot.done
systemctl disable minai-firstboot.service
echo "=== fatto, riavvio"
systemctl --no-block reboot
