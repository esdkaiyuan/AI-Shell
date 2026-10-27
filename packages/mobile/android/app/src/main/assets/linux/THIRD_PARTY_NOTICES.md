# AI Shell Mobile — Third-Party Notices

This APK bundles a Linux userland so the terminal works offline without a desktop relay.

## Alpine Linux 3.20.3

- Project: https://alpinelinux.org/
- Source: https://gitlab.alpinelinux.org/alpine
- Packages: Alpine minirootfs plus a curated CLI set installed at build time:
  `bash`, `coreutils`, `findutils`, `grep`, `sed`, `gawk`, `curl`, `wget`,
  `ca-certificates`, `git`, `openssh-client`, `nano`, `less`, `htop`, `tzdata`,
  `util-linux`, `tar`, `gzip`, `xz`, `unzip`, `zip`, `ncurses-terminfo-base`, `procps`.
- Package licenses are recorded by Alpine in `/lib/apk/db/installed` inside the
  bundled rootfs. Upstream source for each package is available from the Alpine
  package repositories (main/community) and their referenced project URLs.
- Alpine components are distributed under their respective upstream licenses,
  including GPL-2.0, LGPL, MIT, BSD and Apache-2.0.

## PRoot 5.1.107.101 (Termux build)

- Project / source: https://github.com/termux/proot
- License: GPL-2.0 (full text in `licenses/GPL-2.0.txt`)
- This APK ships the unmodified Termux `proot` binary and its loader for
  `arm64-v8a` and `x86_64`. Corresponding source is available at the upstream
  repository above. If you redistribute this APK, keep this notice and make the
  corresponding source available as required by GPL-2.0.

## libtalloc 2.5.0

- Project / source: https://www.samba.org/ftp/talloc/
- License: LGPL-3.0-or-later (full text in `licenses/LGPL-3.0.txt`)

## libandroid-shmem 0.7

- Project / source: https://github.com/termux/libandroid-shmem
- License: MIT

## Integrity

Rootfs SHA-256 values are recorded in `runtime.json` for build traceability.
The runtime ships inside the signed APK and is extracted into the app's private
storage on first launch; no executable content is downloaded at runtime.
