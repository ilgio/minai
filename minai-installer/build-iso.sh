#!/bin/bash
# Crea minai-installer.iso: Ubuntu Server 24.04 che si installa da solo sul disco del rig con minai.
# Serve: curl e xorriso   (Mac: brew install xorriso   |   Ubuntu/Debian: sudo apt install xorriso)
# Uso: bash build-iso.sh            -> scarica l'ultima Ubuntu 24.04 e crea minai-installer.iso
set -e
cd "$(dirname "$0")"
command -v xorriso >/dev/null || { echo "Manca xorriso (Mac: brew install xorriso, Linux: sudo apt install xorriso)"; exit 1; }
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

BASE="https://releases.ubuntu.com/noble"
echo "Cerco l'ultima Ubuntu Server 24.04…"
SUMS=$(curl -fsSL "$BASE/SHA256SUMS")
LINE=$(echo "$SUMS" | grep 'live-server-amd64.iso' | sort -V | tail -1)
ISO=$(echo "$LINE" | awk '{print $2}' | tr -d '*')
SUM=$(echo "$LINE" | awk '{print $1}')
[ -n "$ISO" ] || { echo "Non trovo l'immagine di Ubuntu"; exit 1; }

if [ ! -f "$ISO" ] || [ "$(sha "$ISO")" != "$SUM" ]; then
  echo "Scarico $ISO (circa 3 GB)…"
  curl -fL --progress-bar "$BASE/$ISO" -o "$ISO"
fi
echo "Controllo l'integrità…"
[ "$(sha "$ISO")" = "$SUM" ] || { echo "Il file scaricato è danneggiato: cancellalo e riprova"; exit 1; }

# kernel HWE se c'è (supporta l'hardware più recente)
FILES=$(xorriso -indev "$ISO" -find /casper -name '*vmlinuz*' 2>/dev/null)
if echo "$FILES" | grep -q hwe-vmlinuz; then K=hwe-vmlinuz; I=hwe-initrd; else K=vmlinuz; I=initrd; fi

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
cat > "$WORK/grub.cfg" <<GRUB
loadfont unicode
insmod part_gpt
insmod part_msdos
insmod ext2
set menu_color_normal=white/black
set menu_color_highlight=black/light-gray
# Se trova un minai già installato non reinstalla: dopo 5 secondi passa al disco del rig.
# Altrimenti, dopo 10 secondi installa da solo (senza monitor né tastiera).
if search --no-floppy --file --set=installed /etc/minai-installed; then
	set default=1
	set timeout=5
else
	set default=0
	set timeout=10
fi
menuentry "minai: installa sul disco del rig (CANCELLA TUTTO il disco piu' grande)" {
	set gfxpayload=keep
	linux	/casper/$K autoinstall quiet loglevel=3 ---
	initrd	/casper/$I
}
menuentry "Avvia il sistema gia' installato" {
	exit
}
menuentry "Annulla e spegni" {
	halt
}
GRUB

OUT="minai-installer.iso"
rm -f "$OUT"
echo "Creo $OUT…"
xorriso -indev "$ISO" -outdev "$OUT" \
  -map autoinstall.yaml /autoinstall.yaml \
  -map firstboot.sh /minai/firstboot.sh \
  -map screen.sh /minai/screen.sh \
  -map install-progress.sh /minai/install-progress.sh \
  -map minai-firstboot.service /minai/minai-firstboot.service \
  -map make-issue.sh /minai/make-issue.sh \
  -map "$WORK/grub.cfg" /boot/grub/grub.cfg \
  -boot_image any replay 2>&1 | grep -v '^xorriso : UPDATE' || true
[ -s "$OUT" ] || { echo "Creazione non riuscita"; exit 1; }
echo
echo "Fatto: $OUT"
echo "Scrivila su una chiavetta con balenaEtcher, avvia il rig dalla chiavetta e scegli la prima voce."
