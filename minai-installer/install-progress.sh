#!/bin/bash
# minai: avanzamento durante l'installazione di Ubuntu (gira nell'ambiente della chiavetta).
. /cdrom/minai/screen.sh
START=$(date +%s)
# dimensione stimata del sistema installato: circa 2,5 volte i file compressi (senza quelli dell'installer)
SQ=$(ls /cdrom/casper/*.squashfs 2>/dev/null | grep -v installer | xargs -r du -cb | tail -1 | cut -f1)
TOTAL=$(( ${SQ:-1500000000} * 5 / 2 ))
minai_show
while true; do
  if [ -f /run/minai-late ]; then
    P=96; D="Ultimi ritocchi  /  Finishing"
  elif mountpoint -q /target 2>/dev/null; then
    USED=$(df -B1 --output=used /target 2>/dev/null | tail -1)
    P=$(( 8 + ${USED:-0} * 85 / TOTAL )); [ "$P" -gt 93 ] && P=93
    D="Installazione di Ubuntu sul disco  /  Installing Ubuntu on the disk"
  else
    P=3; D="Preparazione del disco  /  Preparing the disk"
  fi
  MINAI_TITLE_EN="Installing the rig  -  step 1 of 2" \
  minai_screen "Installazione del rig  -  passo 1 di 2" "$P" "$D" "$START" \
    "Poi si riavvia da solo / Then it restarts by itself."
  minai_show
  sleep 3
done
