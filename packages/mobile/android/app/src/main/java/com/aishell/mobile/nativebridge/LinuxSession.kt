package com.aishell.mobile.nativebridge

import java.io.InputStreamReader
import java.util.concurrent.atomic.AtomicBoolean

class LinuxSession(
    val id: String,
    private val process: Process,
    private val onOutput: (String) -> Unit,
    private val onExit: (Int) -> Unit
) {
    private val closing = AtomicBoolean(false)
    private val reader = Thread({ readLoop() }, "aishell-linux-$id").apply { isDaemon = true }

    fun start() {
        reader.start()
    }

    fun write(data: String) {
        if (closing.get()) return
        val output = process.outputStream
        output.write(data.toByteArray(Charsets.UTF_8))
        output.flush()
    }

    fun stop() {
        if (!closing.compareAndSet(false, true)) return
        runCatching {
            process.outputStream.write("exit\n".toByteArray(Charsets.UTF_8))
            process.outputStream.flush()
        }
        Thread.sleep(120)
        if (process.isAlive) process.destroy()
        Thread.sleep(180)
        if (process.isAlive) process.destroyForcibly()
    }

    private fun readLoop() {
        try {
            InputStreamReader(process.inputStream, Charsets.UTF_8).use { reader ->
                val buffer = CharArray(8192)
                while (!closing.get()) {
                    val read = reader.read(buffer)
                    if (read < 0) break
                    if (read > 0) onOutput(String(buffer, 0, read))
                }
            }
        } catch (_: Throwable) {
            // Process ended or was stopped.
        } finally {
            val code = runCatching { process.waitFor() }.getOrDefault(-1)
            onExit(code)
        }
    }
}
