#!/bin/bash
# minai: avanzamento durante l'installazione di Ubuntu (gira nell'ambiente della chiavetta).
. /cdrom/minai/screen.sh
START=$(minai_now)
LOG=/var/log/installer/curtin-install.log
# dimensione stimata del sistema installato: circa 2,5 volte i file compressi (senza quelli dell'installer)
SQ=$(ls /cdrom/casper/*.squashfs 2>/dev/null | grep -v installer | xargs -r du -cb | tail -1 | cut -f1)
TOTAL=$(( ${SQ:-1500000000} * 5 / 2 ))
minai_show
while true; do
  # installazione fallita: si mostra l'errore e si lascia libera la console per la shell dell'installatore
  if ls /var/crash/*install_fail* >/dev/null 2>&1; then
    MINAI_TITLE_EN="Installation failed" \
    minai_screen "Installazione non riuscita" 0 \
      "$(grep -oE "E: .*" "$LOG" 2>/dev/null | grep -v "dev/pts" | tail -1 | cut -c1-90)" "$START" \
      "Riavvia con la chiavetta per riprovare. Shell: Ctrl+Alt+F1, Invio  /  Restart from the stick to retry."
    exit 0
  fi
  if [ -f /run/minai-late ]; then
    P=96; D="Ultimi ritocchi  /  Finishing"
  elif mountpoint -q /target 2>/dev/null; then
    USED=$(df -B1 --output=used /target 2>/dev/null | tail -1)
    P=$(( 8 + ${USED:-0} * 85 / TOTAL )); [ "$P" -gt 93 ] && P=93
    D="Installazione di Ubuntu sul disco  /  Installing Ubuntu on the disk"
    # dopo la copia dei file: si mostra la fase in corso (kernel, pacchetti, aggiornamenti…)
    if grep -q "stage-curthooks" "$LOG" 2>/dev/null; then
      P=93
      PH=$(grep -oE "start: .*stage-curthooks[^:]*: [a-zA-Z].*" "$LOG" 2>/dev/null | tail -1 | sed 's/.*: //' | cut -c1-40)
      D="Configurazione del sistema  /  Configuring the system: ${PH:-…}"
    fi
  else
    P=3; D="Preparazione del disco  /  Preparing the disk"
  fi
  MINAI_TITLE_EN="Installing the rig  -  step 1 of 2" \
  minai_screen "Installazione del rig  -  passo 1 di 2" "$P" "$D" "$START" \
    "Poi si riavvia da solo / Then it restarts by itself."
  minai_show
  sleep 3
done
