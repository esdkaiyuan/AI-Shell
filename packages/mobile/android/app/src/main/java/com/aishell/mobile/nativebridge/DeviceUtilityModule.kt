package com.aishell.mobile.nativebridge

import android.app.ActivityManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Debug
import android.os.StatFs
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class DeviceUtilityModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var lastCpu: Pair<Long, Long>? = null

    override fun getName(): String = "DeviceUtility"

    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                val manager = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                manager.setPrimaryClip(ClipData.newPlainText("AI Shell", text))
                promise.resolve(true)
            } catch (error: Throwable) {
                promise.reject("CLIPBOARD_WRITE", error.message ?: "复制失败", error)
            }
        }
    }

    @ReactMethod
    fun readClipboard(promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                val manager = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = manager.primaryClip
                val text = if (clip != null && clip.itemCount > 0) {
                    clip.getItemAt(0).coerceToText(reactContext).toString()
                } else {
                    ""
                }
                promise.resolve(text)
            } catch (error: Throwable) {
                promise.reject("CLIPBOARD_READ", error.message ?: "读取剪贴板失败", error)
            }
        }
    }

    @ReactMethod
    fun getStats(promise: Promise) {
        try {
            val cpu = sampleCpu()
            val activityManager = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memoryInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memoryInfo)
            val memory = if (memoryInfo.totalMem > 0) {
                100.0 * (1.0 - memoryInfo.availMem.toDouble() / memoryInfo.totalMem.toDouble())
            } else 0.0
            val stat = StatFs(reactContext.filesDir.path)
            val totalDisk = stat.blockCountLong * stat.blockSizeLong
            val availableDisk = stat.availableBlocksLong * stat.blockSizeLong
            val disk = if (totalDisk > 0) {
                100.0 * (1.0 - availableDisk.toDouble() / totalDisk.toDouble())
            } else 0.0
            val processMemory = Debug.getPss().toDouble() / 1024.0

            promise.resolve(Arguments.createMap().apply {
                putDouble("cpu", cpu)
                putDouble("memory", memory)
                putDouble("disk", disk)
                putDouble("uptimeSeconds", SystemClock.elapsedRealtime() / 1000.0)
                putDouble("processMemoryMB", processMemory)
                putDouble("network", 0.0)
            })
        } catch (error: Throwable) {
            promise.reject("STATS", error.message ?: "读取系统状态失败", error)
        }
    }

    private fun sampleCpu(): Double {
        val line = runCatching {
            File("/proc/stat").readLines().firstOrNull { it.startsWith("cpu ") }
        }.getOrNull() ?: return 0.0
        val parts = line.trim().split(Regex("\\s+"))
        if (parts.size < 5) return 0.0
        val values = parts.drop(1).mapNotNull { it.toLongOrNull() }
        if (values.size < 4) return 0.0
        val idle = values[3] + (values.getOrNull(4) ?: 0L)
        val total = values.sum()
        val previous = lastCpu
        lastCpu = idle to total
        if (previous == null) return 0.0
        val totalDiff = total - previous.second
        val idleDiff = idle - previous.first
        if (totalDiff <= 0) return 0.0
        return ((1.0 - idleDiff.toDouble() / totalDiff.toDouble()) * 1000.0).coerceIn(0.0, 100.0).let {
            Math.round(it) / 10.0
        }
    }
}
