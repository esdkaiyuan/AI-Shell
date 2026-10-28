package com.aishell.mobile.nativebridge

import android.system.Os
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

class LinuxRuntimeModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val EVENT_INSTALL = "aishell:install"
        private const val EVENT_SESSION = "aishell:session"
        private const val MAX_DIRECTORY_ENTRIES = 500
        private const val MAX_READ_BYTES = 128 * 1024
        private const val PATH_ENV = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        private val HOST_PATTERN = Regex("^[A-Za-z0-9._:%-]+$")
        private val USER_PATTERN = Regex("^[A-Za-z0-9._-]+$")
        private val CWD_PATTERN = Regex("^/[A-Za-z0-9._/@-]*$")
    }

    private val installer = RootfsInstaller(reactContext)
    private val privateKeys by lazy { SessionPrivateKeys(File(installer.rootfsDir, "root/.ssh")) }
    private val sessions = SessionRegistry<LinuxSession>()
    private val executor = Executors.newCachedThreadPool()

    init {
        privateKeys.clear()
    }

    override fun getName(): String = "LinuxRuntime"

    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            promise.resolve(statusMap())
        } catch (error: Throwable) {
            promise.reject("LINUX_STATUS", message(error), error)
        }
    }

    @ReactMethod
    fun install(promise: Promise) {
        executor.execute {
            try {
                installer.ensureInstalled(::emitInstallProgress)
                promise.resolve(statusMap())
            } catch (error: Throwable) {
                promise.reject("LINUX_INSTALL", message(error), error)
            }
        }
    }

    @ReactMethod
    fun startSession(options: ReadableMap, promise: Promise) {
        val sessionId = options.getString("sessionId") ?: UUID.randomUUID().toString()
        sessions.begin(sessionId)
        executor.execute {
            try {
                installer.ensureInstalled(::emitInstallProgress)

                val mode = options.getString("mode") ?: "shell"
                val cwd = sanitizeCwd(options.getString("cwd") ?: "/root")
                val cols = clamp(if (options.hasKey("cols")) options.getInt("cols") else 84, 20, 300)
                val rows = clamp(if (options.hasKey("rows")) options.getInt("rows") else 30, 10, 200)

                val inner = when (mode) {
                    "ssh" -> buildSshCommand(sessionId, options)
                    else -> "exec /bin/bash -l"
                }
                val command = listOf(
                    File(installer.binDir, "proot").absolutePath,
                    "--link2symlink",
                    "-0",
                    "-r",
                    installer.rootfsDir.absolutePath,
                    "-b",
                    "/dev",
                    "-b",
                    "/proc",
                    "-b",
                    "/sys",
                    "-b",
                    installer.sharedDir().absolutePath + ":/root/shared"
                ) + externalBindArgs() + listOf(
                    "-w",
                    cwd,
                    "/usr/bin/env",
                    "-i",
                    "HOME=/root",
                    "PATH=$PATH_ENV",
                    "TERM=xterm-256color",
                    "LANG=C.UTF-8",
                    "LC_ALL=C.UTF-8",
                    "COLORTERM=truecolor",
                    "/usr/bin/script",
                    "-q",
                    "-f",
                    "-c",
                    "stty rows $rows cols $cols 2>/dev/null; $inner",
                    "/dev/null"
                )

                val builder = ProcessBuilder(command).redirectErrorStream(true)
                builder.environment().apply {
                    put("PROOT_TMP_DIR", installer.tmpDir.absolutePath)
                    put("PROOT_LOADER", File(installer.binDir, "loader").absolutePath)
                    put("PROOT_NO_SECCOMP", "1")
                    put("LD_LIBRARY_PATH", reactContext.applicationInfo.nativeLibraryDir + ":" + installer.binDir.absolutePath)
                }

                val process = builder.start()
                val session = LinuxSession(
                    id = sessionId,
                    process = process,
                    onOutput = { data -> emitSessionOutput(sessionId, data) },
                    onExit = { code ->
                        sessions.remove(sessionId)
                        privateKeys.remove(sessionId)
                        emitSessionExit(sessionId, code)
                    }
                )
                if (!sessions.register(sessionId, session)) {
                    session.stop()
                    throw IllegalStateException("会话已停止")
                }
                session.start()

                promise.resolve(Arguments.createMap().apply {
                    putString("sessionId", sessionId)
                    putString("mode", mode)
                    putString("cwd", cwd)
                })
            } catch (error: Throwable) {
                sessions.remove(sessionId)
                privateKeys.remove(sessionId)
                promise.reject("LINUX_START", message(error), error)
            }
        }
    }

    @ReactMethod
    fun writeSession(sessionId: String, data: String, promise: Promise) {
        try {
            val session = sessions.get(sessionId) ?: throw IllegalStateException("会话不存在或已结束")
            session.write(data)
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject("LINUX_WRITE", message(error), error)
        }
    }

    @ReactMethod
    fun resizeSession(sessionId: String, cols: Int, rows: Int, promise: Promise) {
        // The bundled `script` PTY does not expose resize; keep the API stable.
        promise.resolve(sessions.get(sessionId) != null)
    }

    @ReactMethod
    fun stopSession(sessionId: String, promise: Promise) {
        val session = sessions.remove(sessionId)
        session?.stop()
        privateKeys.remove(sessionId)
        promise.resolve(session != null)
    }

    @ReactMethod
    fun resetRuntime(promise: Promise) {
        executor.execute {
            try {
                sessions.drain().forEach { it.stop() }
                privateKeys.clear()
                installer.reset()
                promise.resolve(statusMap())
            } catch (error: Throwable) {
                promise.reject("LINUX_RESET", message(error), error)
            }
        }
    }

    @ReactMethod
    fun listDirectory(guestPath: String, promise: Promise) {
        executor.execute {
            try {
                val dir = runtimeFile(normalizeGuestPath(guestPath))
                if (!dir.isDirectory) throw IllegalStateException("不是目录：$guestPath")
                val base = normalizeGuestPath(guestPath).trimEnd('/')
                val entries = dir.listFiles()?.toList().orEmpty()
                    .sortedWith(compareByDescending<File> { it.isDirectory }.thenBy { it.name.lowercase() })
                    .take(MAX_DIRECTORY_ENTRIES)

                val array: WritableArray = Arguments.createArray()
                entries.forEach { file ->
                    val path = if (base == "/" || base.isEmpty()) "/${file.name}" else "$base/${file.name}"
                    array.pushMap(Arguments.createMap().apply {
                        putString("name", file.name)
                        putString("path", path)
                        putString("type", if (file.isDirectory) "directory" else "file")
                        putDouble("size", file.length().toDouble())
                        putDouble("modifiedAt", file.lastModified().toDouble())
                        putBoolean("hidden", file.name.startsWith("."))
                    })
                }
                promise.resolve(array)
            } catch (error: Throwable) {
                promise.reject("LINUX_LIST", message(error), error)
            }
        }
    }

    @ReactMethod
    fun readFile(guestPath: String, promise: Promise) {
        executor.execute {
            try {
                val file = runtimeFile(normalizeGuestPath(guestPath))
                if (!file.isFile) throw IllegalStateException("不是文件：$guestPath")
                val size = file.length()
                val readLength = minOf(size, MAX_READ_BYTES.toLong()).toInt()
                val bytes = ByteArray(readLength)
                var offset = 0
                file.inputStream().use { input ->
                    while (offset < readLength) {
                        val read = input.read(bytes, offset, readLength - offset)
                        if (read < 0) break
                        offset += read
                    }
                }
                val data = if (offset == bytes.size) bytes else bytes.copyOf(offset)
                val binary = data.any { it == 0.toByte() }
                val content = if (binary) Base64.encodeToString(data, Base64.NO_WRAP) else String(data, Charsets.UTF_8)
                promise.resolve(Arguments.createMap().apply {
                    putString("content", content)
                    putBoolean("binary", binary)
                    putBoolean("truncated", size > MAX_READ_BYTES)
                    putDouble("size", size.toDouble())
                })
            } catch (error: Throwable) {
                promise.reject("LINUX_READ", message(error), error)
            }
        }
    }

    @ReactMethod
    fun writeFile(guestPath: String, content: String, promise: Promise) {
        executor.execute {
            try {
                val path = normalizeGuestPath(guestPath)
                if (!path.startsWith("/root/")) {
                    throw SecurityException("只允许写入 /root 目录")
                }
                val file = runtimeFile(path)
                file.parentFile?.mkdirs()
                file.writeText(content)
                if (path.contains("/.ssh/")) {
                    runCatching { Os.chmod(file.absolutePath, 384) } // 0600
                }
                promise.resolve(true)
            } catch (error: Throwable) {
                promise.reject("LINUX_WRITE_FILE", message(error), error)
            }
        }
    }

    override fun invalidate() {
        sessions.drain().forEach { it.stop() }
        privateKeys.clear()
        executor.shutdownNow()
        super.invalidate()
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by NativeEventEmitter on some platforms.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by NativeEventEmitter on some platforms.
    }

    private fun statusMap(): WritableMap = Arguments.createMap().apply {
        putBoolean("installed", installer.isInstalled())
        putString("runtimeVersion", installer.runtimeVersion)
        putString("distro", installer.distro)
        putString("abi", runCatching { installer.abi }.getOrDefault("unsupported"))
        putString("rootfsPath", installer.rootfsDir.absolutePath)
        putDouble("installedAt", if (installer.isInstalled()) installer.rootfsDir.lastModified().toDouble() else 0.0)
        putString("supportedAbis", android.os.Build.SUPPORTED_ABIS.joinToString(","))
    }

    private fun buildSshCommand(sessionId: String, options: ReadableMap): String {
        val host = options.getString("host")?.trim().orEmpty()
        val user = options.getString("username")?.trim().orEmpty()
        val port = (if (options.hasKey("port")) options.getInt("port") else 22)
            .let { if (it in 1..65535) it else 22 }
        if (!HOST_PATTERN.matches(host)) throw IllegalArgumentException("SSH 主机名格式无效")
        if (!USER_PATTERN.matches(user)) throw IllegalArgumentException("SSH 用户名格式无效")

        val privateKey = options.getString("privateKey")?.trim()
        val keyPath = if (!privateKey.isNullOrEmpty()) writePrivateKey(sessionId, privateKey) else null

        val args = mutableListOf(
            "/usr/bin/ssh",
            "-p",
            port.toString(),
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            "UserKnownHostsFile=/root/.ssh/known_hosts",
            "-o",
            "ServerAliveInterval=30"
        )
        if (keyPath != null) {
            args += listOf("-i", keyPath)
        }
        args += "$user@$host"
        return "exec " + args.joinToString(" ") { shellQuote(it) }
    }

    private fun writePrivateKey(sessionId: String, privateKey: String): String =
        privateKeys.create(sessionId, privateKey)

    private fun runtimeFile(guestPath: String): File = RuntimePathResolver(
        installer.rootfsDir,
        installer.sharedDir(),
        reactContext.getExternalFilesDir(null)
    ).resolve(guestPath)

    private fun externalBindArgs(): List<String> {
        val external = reactContext.getExternalFilesDir(null) ?: return emptyList()
        external.mkdirs()
        return listOf("-b", external.absolutePath + ":/root/android")
    }

    private fun normalizeGuestPath(path: String): String {
        val trimmed = path.trim()
        val normalized = "/" + trimmed.trimStart('/').replace(Regex("/+"), "/")
        if (normalized.contains("..")) throw SecurityException("路径无效")
        return normalized
    }

    private fun sanitizeCwd(path: String): String {
        val trimmed = path.trim()
        return if (CWD_PATTERN.matches(trimmed)) trimmed.trimEnd('/').ifEmpty { "/root" } else "/root"
    }

    private fun shellQuote(value: String): String = "'" + value.replace("'", "'\\''") + "'"

    private fun emitInstallProgress(phase: String, percent: Int) {
        emitEvent(EVENT_INSTALL, Arguments.createMap().apply {
            putString("phase", phase)
            putInt("percent", percent)
        })
    }

    private fun emitSessionOutput(sessionId: String, data: String) {
        emitEvent(EVENT_SESSION, Arguments.createMap().apply {
            putString("sessionId", sessionId)
            putString("type", "output")
            putString("data", data)
        })
    }

    private fun emitSessionExit(sessionId: String, code: Int) {
        emitEvent(EVENT_SESSION, Arguments.createMap().apply {
            putString("sessionId", sessionId)
            putString("type", "exit")
            putString("data", "")
            putInt("code", code)
        })
    }

    private fun emitEvent(name: String, payload: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, payload)
    }

    private fun message(error: Throwable): String = error.message ?: error.javaClass.simpleName

    private fun clamp(value: Int, min: Int, max: Int): Int = value.coerceIn(min, max)
}
