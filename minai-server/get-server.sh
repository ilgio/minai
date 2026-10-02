#!/bin/bash
# Installa o aggiorna minai-server con un solo comando (come root):
#   curl -fsSL https://github.com/ilgio/minai/releases/latest/download/get-server.sh | bash
# Con una chiave Tailscale, senza nessun login:
#   curl -fsSL .../get-server.sh | bash -s -- tskey-auth-XXXX
set -e
REPO="${MINAI_REPO:-ilgio/minai}"
URL="https://github.com/$REPO/releases/latest/download/minai-server.zip"
[ "$(id -u)" -eq 0 ] || { echo "Lancia il comando come root (o con sudo bash)."; exit 1; }
apt-get update -qq && apt-get install -y -qq curl unzip ca-certificates >/dev/null
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
echo "Scarico minai-server…"
curl -fsSL "$URL" -o "$TMP/minai-server.zip"
unzip -q "$TMP/minai-server.zip" -d "$TMP"
bash "$TMP/minai-server/install.sh" "${1:-}"
