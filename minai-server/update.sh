#!/bin/bash
# Aggiorna minai-server all'ultima versione pubblicata. Lo avvia il servizio minai-server-update (root).
set -e
REPO="${MINAI_REPO:-ilgio/minai}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
echo "Scarico minai-server…"
curl -fsSL "https://github.com/$REPO/releases/latest/download/minai-server.zip" -o "$TMP/minai-server.zip"
unzip -q "$TMP/minai-server.zip" -d "$TMP"
bash "$TMP/minai-server/install.sh"
echo "Aggiornamento completato."
