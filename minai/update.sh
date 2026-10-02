#!/bin/bash
# Aggiorna minai all'ultima versione pubblicata. Lo lancia il pannello (come root, fuori dal suo servizio).
set -e
REPO="${MINAI_REPO:-ilgio/minai}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
echo "Scarico minai…"
curl -fsSL "https://github.com/$REPO/releases/latest/download/minai.zip" -o "$TMP/minai.zip"
unzip -q "$TMP/minai.zip" -d "$TMP"
OWNER=$(python3 -c "import json; print(json.load(open('/opt/miners/panel.json'))['owner'].split(':')[0])")
MINAI_OWNER="$OWNER" bash "$TMP/minai/install.sh"
echo "Aggiornamento completato."
