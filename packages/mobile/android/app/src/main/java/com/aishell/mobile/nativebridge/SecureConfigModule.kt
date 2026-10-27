package com.aishell.mobile.nativebridge

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureConfigModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val PREFS = "aishell_secure_config"
        private const val KEY_ALIAS = "aishell_config_aes_v1"
        private const val PAYLOAD = "payload"
        private const val KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }

    private val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun getName(): String = "SecureConfig"

    @ReactMethod
    fun save(value: String, promise: Promise) {
        try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
            val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val payload = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + "." +
                Base64.encodeToString(encrypted, Base64.NO_WRAP)
            prefs.edit().putString(PAYLOAD, payload).apply()
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject("SECURE_SAVE", error.message ?: "安全存储写入失败", error)
        }
    }

    @ReactMethod
    fun load(promise: Promise) {
        try {
            val raw = prefs.getString(PAYLOAD, null)
            if (raw.isNullOrEmpty()) {
                promise.resolve("")
                return
            }
            val parts = raw.split('.', limit = 2)
            if (parts.size != 2) {
                promise.resolve("")
                return
            }
            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val data = Base64.decode(parts[1], Base64.NO_WRAP)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
            promise.resolve(String(cipher.doFinal(data), Charsets.UTF_8))
        } catch (error: Throwable) {
            prefs.edit().remove(PAYLOAD).apply()
            promise.reject("SECURE_LOAD", error.message ?: "安全存储读取失败", error)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            prefs.edit().clear().apply()
            val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
            promise.resolve(true)
        } catch (error: Throwable) {
            promise.reject("SECURE_CLEAR", error.message ?: "安全存储清理失败", error)
        }
    }

    @ReactMethod
    fun getStorageInfo(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putString("type", "Android Keystore")
            putString("algorithm", "AES-256-GCM")
            putBoolean("available", true)
            putBoolean("hasConfig", !prefs.getString(PAYLOAD, null).isNullOrEmpty())
        })
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }
}
