# Building the minai USB installer

Users don't need this: they download the ready-made `minai-installer.iso`.
This is for maintainers, when something in this folder changes.

The ISO doesn't contain minai itself: on first boot the rig downloads the latest
`minai.zip` from the GitHub releases. So the ISO only needs rebuilding when the
files in this folder change, not at every release.

## Build

On Ubuntu/Debian (or macOS with `brew install xorriso`):

```bash
sudo apt install -y xorriso curl
bash build-iso.sh
```

The script downloads the latest Ubuntu Server 24.04 ISO, checks its SHA-256, adds
the autoinstall configuration and the minai first-boot files, and writes
`minai-installer.iso` (about 3.4 GB).

## Publish

The ISO is larger than GitHub's 2 GB per-file limit, so it's hosted elsewhere
(for example a Cloudflare R2 bucket or SourceForge). Publish its checksum too:

```bash
sha256sum minai-installer.iso > minai-installer.iso.sha256
```

Then put both links in the release notes.

## What's inside

| File | Purpose |
|---|---|
| `autoinstall.yaml` | Unattended Ubuntu install: largest disk, user `user`, NVIDIA-ready HWE kernel. |
| `firstboot.sh`, `minai-firstboot.service` | First boot: rig name, NVIDIA driver, minai, Tailscale, reboot. |
| `screen.sh`, `install-progress.sh` | Full-screen progress with the minai logo on the rig's monitor. |
| `make-issue.sh` | Console welcome screen with the logo and the setup address. |
| `build-iso.sh` | Builds the ISO from the official Ubuntu image. |
