# minai: schermata fissa sulla console (tty2) con logo, passo, barra e tempo.
# Si usa con:  . screen.sh ; minai_screen "Titolo" PERCENTUALE "Dettaglio" INIZIO_EPOCH "Nota"
MINAI_TTY="${MINAI_TTY:-/dev/tty2}"

_minai_row() {  # disegna una riga del logo: lettere fatte di "pixel" colorati (spazi con sfondo)
  local line="$1" color="$2" out="" i c
  for ((i = 0; i < ${#line}; i++)); do
    c="${line:i:1}"
    if [ "$c" = "X" ]; then out+="\033[${color}m  \033[0m"; else out+="  "; fi
  done
  printf '%b' "$out"
}

minai_logo() {
  local M=("X...X" "XX.XX" "X.X.X" "X...X" "X...X")
  local I=("XXX" ".X." ".X." ".X." "XXX")
  local N=("X...X" "XX..X" "X.X.X" "X..XX" "X...X")
  local A=(".XXX." "X...X" "XXXXX" "X...X" "X...X")
  local r
  for r in 0 1 2 3 4; do
    printf '    '
    _minai_row "${M[r]}." 44; _minai_row "${I[r]}." 44; _minai_row "${N[r]}." 44
    _minai_row "${A[r]}." 44; _minai_row "${I[r]}" 43
    printf '\n'
  done
}

minai_bar() {  # barra di 40 caselle
  local p="$1" n i out=""
  n=$((p * 40 / 100))
  for ((i = 0; i < 40; i++)); do
    if [ "$i" -lt "$n" ]; then out+="\033[42m \033[0m"; else out+="\033[100m \033[0m"; fi
  done
  printf '%b' "$out"
}

minai_screen() {
  local title="$1" p="$2" detail="$3" start="$4" note="$5" mins
  [ "$p" -gt 100 ] 2>/dev/null && p=100
  mins=$(( ($(date +%s) - start) / 60 ))
  {
    printf '\033[2J\033[H\033[?25l\n\n'
    minai_logo
    printf '\n\n    \033[1m%s\033[0m\n' "$title"
    [ -n "$MINAI_TITLE_EN" ] && printf '    \033[90m%s\033[0m\n' "$MINAI_TITLE_EN"
    printf '\n'
    printf '    %s\n\n    ' "$detail"
    minai_bar "$p"
    printf '  %3d%%\n\n' "$p"
    printf '    Tempo / Time: %d min      Non spegnere il rig / Do not power off.\n' "$mins"
    [ -n "$note" ] && printf '    %s\n' "$note"
  } > "$MINAI_TTY" 2>/dev/null
}

minai_show() {  # porta la schermata in primo piano e zittisce i messaggi del kernel
  dmesg -n 1 2>/dev/null || true
  chvt "${MINAI_TTY#/dev/tty}" 2>/dev/null || true
}
