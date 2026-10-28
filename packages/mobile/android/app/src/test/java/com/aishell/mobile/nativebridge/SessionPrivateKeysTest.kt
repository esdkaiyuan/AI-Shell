package com.aishell.mobile.nativebridge

import java.io.File
import java.nio.file.Files
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionPrivateKeysTest {
    @Test
    fun removesKeyMaterialWhenItsSessionEnds() {
        val sshDir = Files.createTempDirectory("session-keys").toFile()
        val keys = SessionPrivateKeys(sshDir)
        val guestPath = keys.create("session-1", "private-key")
        val hostFile = File(sshDir, guestPath.removePrefix("/root/.ssh/"))

        assertTrue(hostFile.isFile)
        keys.remove("session-1")
        assertFalse(hostFile.exists())
    }

    @Test
    fun removesPartialKeyMaterialAfterAWriteFailure() {
        val sshDir = Files.createTempDirectory("session-keys").toFile()
        val keys = SessionPrivateKeys(sshDir)
        val target = File(sshDir, "aishell_session-1")
        target.mkdirs()

        assertThrows(Exception::class.java) { keys.create("session-1", "private-key") }

        assertFalse(target.exists())
    }

    @Test
    fun removesAllRemainingKeysDuringRuntimeReset() {
        val sshDir = Files.createTempDirectory("session-keys").toFile()
        val keys = SessionPrivateKeys(sshDir)
        keys.create("session-1", "private-key")
        keys.create("session-2", "private-key")

        keys.clear()

        assertFalse(File(sshDir, "aishell_session-1").exists())
        assertFalse(File(sshDir, "aishell_session-2").exists())
    }

    @Test
    fun preservesUserInstalledKeysDuringRuntimeCleanup() {
        val sshDir = Files.createTempDirectory("session-keys").toFile()
        val userKey = File(sshDir, "id_ed25519").apply { writeText("user-key") }
        val keys = SessionPrivateKeys(sshDir)
        keys.create("session-1", "private-key")

        keys.clear()

        assertTrue(userKey.isFile)
    }
}
