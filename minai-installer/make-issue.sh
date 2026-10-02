#!/bin/bash
# minai: crea /etc/issue, la schermata che compare sul monitor del rig all'avvio, con il logo.
# Le sequenze \4 (indirizzo IP) e \n (nome del rig) le sostituisce il sistema quando la mostra.
. "$(dirname "$0")/screen.sh"
LINE='\033[34m    ------------------------------------------------------------------\033[0m\n'
printf '\033[2J\033[H\n\n'
minai_logo
printf '\n\n'
printf "$LINE"
printf '      \033[1;32mPronto!\033[0m  Manca solo l'"'"'ultimo passo, dal telefono o dal PC:\n\n'
printf '      \033[33mApri\033[0m        \033[1mhttp://minai-setup.local\033[0m\n'
printf '      \033[33moppure\033[0m      \033[1mhttp://\\4\033[0m\n\n'
printf '      Lì scegli il nome del rig e la sua password, poi colleghi Tailscale.\n'
printf "$LINE"
printf '\n'
