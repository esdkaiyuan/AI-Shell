package com.aishell.mobile.nativebridge

import android.system.Os
import java.io.File
import java.util.concurrent.ConcurrentHashMap

class SessionPrivateKeys(private val sshDir: File) {
    private val keys = ConcurrentHashMap<String, File>()

    fun create(sessionId: String, privateKey: String): String {
        remove(sessionId)
        sshDir.mkdirs()
        runCatching { Os.chmod(sshDir.absolutePath, 448) }
        val safeId = sessionId.replace(Regex("[^A-Za-z0-9_.-]"), "_")
        val file = File(sshDir, "aishell_$safeId")
        try {
            file.writeText(privateKey.trimEnd() + "\n")
            runCatching { Os.chmod(file.absolutePath, 384) }
        } catch (error: Throwable) {
            file.delete()
            throw error
        }
        keys[sessionId] = file
        return "/root/.ssh/aishell_$safeId"
    }

    fun remove(sessionId: String) {
        keys.remove(sessionId)?.delete()
    }

    fun clear() {
        keys.clear()
        sshDir.listFiles()?.filter { it.isFile && it.name.startsWith("aishell_") }?.forEach { it.delete() }
    }
}
