package com.aishell.mobile.nativebridge

import android.content.Context
import android.os.Build
import android.system.Os
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.FilterInputStream
import java.io.InputStream
import java.io.PushbackInputStream

/**
 * Installs the bundled Alpine rootfs and prepares the Termux proot runtime.
 * Everything is extracted into the app's private storage; nothing is downloaded.
 */
class RootfsInstaller(private val context: Context) {

    companion object {
        private const val ASSET_DIR = "linux"
        private const val MARKER_FILE = ".aishell-runtime"
        private const val MIN_FREE_BYTES = 240L * 1024L * 1024L
    }

    val linuxDir = File(context.filesDir, "linux")
    val rootfsDir = File(linuxDir, "rootfs")
    val binDir = File(linuxDir, "bin")
    val tmpDir = File(linuxDir, "tmp")
    val sharedDir = File(linuxDir, "shared")
    private val markerFile = File(linuxDir, MARKER_FILE)
    private val installLock = Any()

    private val runtimeManifest: JSONObject by lazy {
        context.assets.open("$ASSET_DIR/runtime.json").bufferedReader().use { JSONObject(it.readText()) }
    }

    val runtimeVersion: String
        get() = runtimeManifest.optString("runtimeVersion", "unknown")

    val distro: String
        get() = runtimeManifest.optString("distro", "Alpine Linux")

    val abi: String
        get() {
            // Use the process's primary ABI. Emulators may also list arm64-v8a in
            // SUPPORTED_ABIS even though the running process is x86_64.
            return when (Build.SUPPORTED_ABIS.firstOrNull()) {
                "arm64-v8a" -> "arm64-v8a"
                "x86_64" -> "x86_64"
                else -> throw IllegalStateException(
                    "当前设备为 32 位 ABI（${Build.SUPPORTED_ABIS.joinToString()}），内置 Linux 仅支持 arm64-v8a / x86_64。"
                )
            }
        }

    fun isInstalled(): Boolean {
        if (!markerFile.isFile) return false
        val expected = "$runtimeVersion:$abi"
        val actual = runCatching { markerFile.readText().trim() }.getOrNull()
        // Do not follow bin/proot here: it points into nativeLibraryDir, whose
        // absolute path changes after every APK update.
        return actual == expected && File(rootfsDir, "bin/bash").isFile
    }

    fun ensureInstalled(progress: (phase: String, percent: Int) -> Unit): JSONObject =
        synchronized(installLock) {
            if (!isInstalled()) {
                install(progress)
            } else {
                // Refresh symlinks to the current nativeLibraryDir after an APK update.
                setupProotLinks()
            }
            status()
        }

    fun reset() {
        synchronized(installLock) {
            File(rootfsDir, "root").listFiles()?.forEach { it.deleteRecursively() }
            rootfsDir.deleteRecursively()
            binDir.deleteRecursively()
            tmpDir.deleteRecursively()
            markerFile.delete()
        }
    }

    private fun install(progress: (String, Int) -> Unit) {
        progress("检查存储空间", 0)
        linuxDir.mkdirs()
        rootfsDir.mkdirs()
        binDir.mkdirs()
        tmpDir.mkdirs()
        sharedDir.mkdirs()

        if (linuxDir.usableSpace < MIN_FREE_BYTES) {
            throw IllegalStateException("存储空间不足：安装内置 Linux 至少需要 240 MB 可用空间。")
        }

        rootfsDir.deleteRecursively()
        binDir.deleteRecursively()
        rootfsDir.mkdirs()
        binDir.mkdirs()

        try {
            progress("释放 Alpine 根文件系统", 5)
            extractRootfs(progress)

            progress("配置 Linux 环境", 72)
            writeRuntimeConfig()

            progress("准备 proot 运行时", 84)
            setupProotLinks()

            if (!File(rootfsDir, "bin/bash").isFile) {
                throw IllegalStateException("Alpine 根文件系统解压不完整。")
            }

            markerFile.writeText("$runtimeVersion:$abi")
            progress("完成", 100)
        } catch (error: Throwable) {
            markerFile.delete()
            binDir.deleteRecursively()
            rootfsDir.deleteRecursively()
            throw error
        }
    }

    private fun extractRootfs(progress: (String, Int) -> Unit) {
        val expectedSize = runtimeManifest
            .optJSONObject("abis")
            ?.optJSONObject(abi)
            ?.optLong("sizeBytes", 0L)
            ?: 0L

        var lastPercent = 5
        val raw = CountingInputStream(BufferedInputStream(openRootfsAsset(abi), 64 * 1024))
        val pushback = PushbackInputStream(raw, 2)
        val first = pushback.read()
        val second = pushback.read()
        if (first >= 0) pushback.unread(first)
        if (second >= 0) pushback.unread(second)
        val tarStream: InputStream =
            if (first == 0x1f && second == 0x8b) GzipCompressorInputStream(pushback) else pushback

        TarArchiveInputStream(tarStream).use { tar ->
            var entry: TarArchiveEntry? = tar.nextEntry
            while (entry != null) {
                val current = entry
                if (expectedSize > 0 && current.isFile) {
                    val percent = (5 + (raw.count * 65 / expectedSize).toInt()).coerceIn(5, 70)
                    if (percent > lastPercent) {
                        lastPercent = percent
                        progress("释放 Alpine 根文件系统", percent)
                    }
                }
                extractEntry(current, tar)
                entry = tar.nextEntry
            }
        }
    }

    /** AAPT may strip the .gz suffix and store the decompressed tar. Support both. */
    private fun openRootfsAsset(abi: String): InputStream {
        val candidates = listOf(
            "$ASSET_DIR/rootfs-$abi.tar.gz",
            "$ASSET_DIR/rootfs-$abi.tar"
        )
        candidates.forEach { name ->
            try {
                return context.assets.open(name)
            } catch (_: FileNotFoundException) {
                // try the next asset name
            }
        }
        throw FileNotFoundException("APK 中缺少 Alpine 根文件系统资产：$ASSET_DIR/rootfs-$abi.tar(.gz)")
    }

    private fun extractEntry(entry: TarArchiveEntry, tar: TarArchiveInputStream) {
        val relative = sanitizeEntryName(entry.name) ?: return
        if (relative.isEmpty()) return
        val dest = File(rootfsDir, relative)

        if (entry.isDirectory) {
            dest.mkdirs()
            setMode(dest, entry.mode)
            return
        }

        dest.parentFile?.mkdirs()

        when {
            entry.isSymbolicLink -> createSymlink(entry.linkName, dest)
            entry.isLink -> copyHardlink(entry.linkName, dest, entry.mode)
            else -> {
                if (dest.exists()) dest.delete()
                FileOutputStream(dest).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var read = tar.read(buffer)
                    while (read > 0) {
                        output.write(buffer, 0, read)
                        read = tar.read(buffer)
                    }
                }
                setMode(dest, entry.mode)
            }
        }
    }

    private fun sanitizeEntryName(name: String): String? {
        var normalized = name.replace('\\', '/')
        while (normalized.startsWith("./")) normalized = normalized.removePrefix("./")
        normalized = normalized.trimStart('/')
        if (normalized.isEmpty() || normalized == ".") return ""
        if (normalized.split('/').any { it == ".." }) return null
        return normalized
    }

    private fun createSymlink(linkName: String, dest: File) {
        val cleaned = linkName.replace('\\', '/')
        val candidate = if (cleaned.startsWith("/")) {
            File(rootfsDir, cleaned.trimStart('/'))
        } else {
            File(dest.parentFile, cleaned)
        }
        val target = runCatching { candidate.canonicalFile }.getOrNull() ?: return
        if (!isInsideRoot(target)) return

        val relative = dest.parentFile?.toURI()?.relativize(target.toURI())?.path ?: "."
        if (dest.exists()) dest.delete()
        try {
            Os.symlink(relative.ifEmpty { "." }, dest.absolutePath)
        } catch (_: Throwable) {
            // Some file systems reject symlinks; a regular file keeps the runtime usable.
            runCatching { dest.writeText("") }
        }
    }

    private fun copyHardlink(linkName: String, dest: File, mode: Int) {
        val target = File(rootfsDir, linkName.replace('\\', '/').trimStart('/')).canonicalFile
        if (!isInsideRoot(target) || !target.isFile) return
        if (dest.exists()) dest.delete()
        runCatching {
            FileInputStream(target).use { input ->
                FileOutputStream(dest).use { output -> input.copyTo(output) }
            }
            setMode(dest, mode)
        }
    }

    private fun isInsideRoot(file: File): Boolean {
        val root = rootfsDir.canonicalFile
        val path = file.canonicalFile
        return path.path == root.path || path.path.startsWith(root.path + File.separator)
    }

    private fun setMode(file: File, tarMode: Int) {
        val executable = (tarMode and 0x40) != 0 // owner execute bit
        if (executable) {
            file.setExecutable(true, false)
        }
        file.setReadable(true, false)
    }

    private fun writeRuntimeConfig() {
        val etc = File(rootfsDir, "etc")
        etc.mkdirs()
        File(etc, "hostname").writeText("aishell\n")
        File(etc, "hosts").writeText(
            "127.0.0.1 localhost aishell\n::1 localhost ip6-localhost ip6-loopback\n"
        )
        File(etc, "resolv.conf").writeText("nameserver 1.1.1.1\nnameserver 8.8.8.8\n")
        File(etc, "motd").writeText(
            "AI Shell Linux Runtime\nAlpine 3.20.3 · $abi · 离线内置\n\n"
        )

        val profileDir = File(etc, "profile.d")
        profileDir.mkdirs()
        File(profileDir, "ai-shell.sh").writeText(
            """
            export LANG=C.UTF-8
            export LC_ALL=C.UTF-8
            export TERM=xterm-256color
            export COLORTERM=truecolor
            export EDITOR=nano
            export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
            alias ll='ls -alF'
            alias la='ls -A'
            alias grep='grep --color=auto'
            [ -n "${'$'}PS1" ] && export PS1='\[\e[1;34m\]\u@\h\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
            """.trimIndent() + "\n"
        )

        File(rootfsDir, "root").mkdirs()
        File(rootfsDir, "root/.bash_profile").writeText(
            "source /etc/profile\n[ -f /etc/motd ] && cat /etc/motd\n"
        )
        val sshDir = File(rootfsDir, "root/.ssh")
        sshDir.mkdirs()
        runCatching { Os.chmod(sshDir.absolutePath, 448) } // 0700
        File(sshDir, "known_hosts").writeText("")

        val passwd = File(etc, "passwd")
        if (passwd.isFile) {
            passwd.writeText(passwd.readText().replace("/bin/ash", "/bin/bash"))
        }
    }

    private fun setupProotLinks() {
        binDir.mkdirs()
        val nativeDir = File(context.applicationInfo.nativeLibraryDir)
        val mappings = listOf(
            "proot" to File(nativeDir, "libproot.so"),
            "loader" to File(nativeDir, "libproot_loader.so"),
            "libtalloc.so.2" to File(nativeDir, "libtalloc.so"),
            "libandroid-shmem.so" to File(nativeDir, "libandroid-shmem.so")
        )

        mappings.forEach { (linkName, target) ->
            if (!target.isFile) {
                throw IllegalStateException("APK 缺少原生运行时文件：${target.name}")
            }
            runCatching { target.setExecutable(true, false) }
            val link = File(binDir, linkName)
            // Delete unconditionally: File.exists() follows symlinks, so a link
            // left over from a previous APK install is dangling and skipped.
            link.delete()
            try {
                Os.symlink(target.absolutePath, link.absolutePath)
            } catch (_: Throwable) {
                link.delete()
                target.copyTo(link, overwrite = true)
                runCatching { link.setExecutable(true, false) }
            }
        }
    }

    fun status(): JSONObject = JSONObject().apply {
        put("installed", isInstalled())
        put("runtimeVersion", runtimeVersion)
        put("distro", distro)
        put("abi", runCatching { abi }.getOrDefault("unsupported"))
        put("rootfsPath", rootfsDir.absolutePath)
        put("prootPath", File(binDir, "proot").absolutePath)
        put("installedAt", if (markerFile.isFile) markerFile.lastModified() else 0L)
        put("supportedAbis", Build.SUPPORTED_ABIS.joinToString(","))
    }

    fun rootfsFileFor(guestPath: String): File {
        val clean = guestPath.trim().trimStart('/')
        val file = File(rootfsDir, clean)
        val canonical = file.canonicalFile
        val root = rootfsDir.canonicalFile
        if (canonical != root && !canonical.path.startsWith(root.path + File.separator)) {
            throw SecurityException("路径超出内置 Linux 根目录")
        }
        return canonical
    }

    fun sharedDir(): File = sharedDir

    private class CountingInputStream(input: InputStream) : FilterInputStream(input) {
        var count: Long = 0L
            private set

        override fun read(): Int {
            val value = super.read()
            if (value >= 0) count += 1
            return value
        }

        override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
            val read = super.read(buffer, offset, length)
            if (read > 0) count += read
            return read
        }
    }
}
