#!/bin/bash
# minai: avvia il lancio attivo tenendo conto delle GPU disattivate nel pannello.
# - se il lancio contiene %GPU_ENABLED%, lo sostituisce con l'elenco delle GPU attive (es. 0,1);
# - altrimenti nasconde al miner le GPU disattivate con CUDA_VISIBLE_DEVICES.
# Il miner gira come utente normale: la riga "export HOME=/root" dei vecchi lanci viene ignorata.
LAUNCH=/opt/miners/active.sh
CONF=/opt/miners/gpus.json
TMPL="${RUNTIME_DIRECTORY:-/tmp}/launch.sh"
export CUDA_DEVICE_ORDER=PCI_BUS_ID   # stessa numerazione di nvidia-smi e del pannello

ALL=$(nvidia-smi --query-gpu=index --format=csv,noheader 2>/dev/null | tr -d ' ' | paste -sd, -)
DISABLED=$(python3 -c "import json; print(','.join(str(i) for i in json.load(open('$CONF')).get('disabled', [])))" 2>/dev/null)
ENABLED="$ALL"
if [ -n "$ALL" ] && [ -n "$DISABLED" ]; then
  IFS=, read -ra gpus <<< "$ALL"
  keep=()
  for g in "${gpus[@]}"; do [[ ",$DISABLED," == *",$g,"* ]] || keep+=("$g"); done
  ENABLED=$(IFS=,; echo "${keep[*]}")
fi

if ! grep -q '%GPU_ENABLED%' "$LAUNCH"; then
  [ -n "$ALL" ] && [ "$ENABLED" != "$ALL" ] && export CUDA_VISIBLE_DEVICES="$ENABLED"
fi
sed -e "s/%GPU_ENABLED%/$ENABLED/g" -e '/^[[:space:]]*export[[:space:]]\+HOME=\/root[[:space:]]*$/d' "$LAUNCH" > "$TMPL"
exec /bin/bash "$TMPL"
