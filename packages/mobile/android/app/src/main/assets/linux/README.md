# Bundled Linux runtime

This directory ships the offline Linux userland used by AI Shell Mobile.

## Sources

- Alpine Linux 3.20.3 minirootfs
  - https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/aarch64/alpine-minirootfs-3.20.3-aarch64.tar.gz
    SHA-256 `041fa34a81788242df9e78fa69b97ab45b8ec47ddbf88864755610414a7bf3de`
  - https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-minirootfs-3.20.3-x86_64.tar.gz
    SHA-256 `d4e6fd67dcf75e40c451560ac7265166c2b72a0f38ddc9aae756a7de3d1efa0c`
- Termux PRoot 5.1.107.101 (aarch64 / x86_64) plus `libtalloc` 2.5.0 and
  `libandroid-shmem` 0.7, fetched from https://packages.termux.dev/apt/termux-main/
- Package set: `bash coreutils findutils grep sed gawk curl wget ca-certificates
  git openssh-client nano less htop tzdata util-linux tar gzip xz unzip zip
  ncurses-terminfo-base procps`

## Rebuild rootfs (WSL / Linux)

```bash
# x86_64 (native chroot)
tar xzf alpine-minirootfs-3.20.3-x86_64.tar.gz -C rootfs-x86_64
cp /etc/resolv.conf rootfs-x86_64/etc/resolv.conf
chroot rootfs-x86_64 /bin/sh -c \
  'apk add --no-cache bash coreutils findutils grep sed gawk curl wget \
   ca-certificates git openssh-client nano less htop tzdata util-linux tar \
   gzip xz unzip zip ncurses-terminfo-base procps'
tar -C rootfs-x86_64 --numeric-owner -czf rootfs-x86_64.tar.gz .

# aarch64 (foreign-arch install from the x86_64 chroot)
tar xzf alpine-minirootfs-3.20.3-aarch64.tar.gz -C rootfs-x86_64/target
chroot rootfs-x86_64 /sbin/apk --root /target --arch aarch64 --no-scripts \
  --no-cache add bash coreutils findutils grep sed gawk curl wget \
  ca-certificates git openssh-client nano less htop tzdata util-linux tar \
  gzip xz unzip zip ncurses-terminfo-base procps
mv rootfs-x86_64/target rootfs-aarch64
tar -C rootfs-aarch64 --numeric-owner -czf rootfs-aarch64.tar.gz .
```

Then configure `hostname`, `hosts`, `resolv.conf`, `motd`, `/etc/profile.d/ai-shell.sh`,
`/root/.bash_profile`, `/root/.ssh`, and the root shell in `/etc/passwd`.

## JNI libraries

The Termux PRoot package is dynamically linked. Copy the binaries into
`android/app/src/main/jniLibs/<abi>/` using names Android can extract:

| Source | APK name |
| --- | --- |
| `proot` | `libproot.so` |
| `libexec/proot/loader` | `libproot_loader.so` |
| `libtalloc.so.2.5.0` | `libtalloc.so` |
| `libandroid-shmem.so` | `libandroid-shmem.so` |

At runtime the native module creates `libtalloc.so.2` and other links inside the
app files directory and sets `PROOT_LOADER`, `LD_LIBRARY_PATH`, and
`PROOT_TMP_DIR`.

`useLegacyPackaging = true` (see `app/build.gradle`) keeps the native libraries
extracted to `nativeLibraryDir`, which is required for PTY execution and survives
the Android W^X restrictions on app data.

## Packaging note

AAPT may store `rootfs-*.tar.gz` assets as uncompressed `rootfs-*.tar` and strip
the `.gz` suffix. `RootfsInstaller.openRootfsAsset()` accepts both names and
detects the gzip magic bytes, so no asset rename is required.

See `THIRD_PARTY_NOTICES.md` for licensing (PRoot is GPL-2.0).
