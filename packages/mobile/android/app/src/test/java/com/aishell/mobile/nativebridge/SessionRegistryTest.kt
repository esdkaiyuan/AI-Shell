package com.aishell.mobile.nativebridge

import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionRegistryTest {
    @Test
    fun rejectsRegistrationAfterStartupWasCancelled() {
        val sessions = SessionRegistry<String>()
        sessions.begin("session-1")

        assertTrue(sessions.remove("session-1") == null)
        assertFalse(sessions.register("session-1", "process"))
        assertTrue(sessions.drain().isEmpty())
    }

    @Test
    fun removesARegisteredSessionExactlyOnce() {
        val sessions = SessionRegistry<String>()
        sessions.begin("session-1")

        assertTrue(sessions.register("session-1", "process"))
        assertTrue(sessions.remove("session-1") == "process")
        assertNull(sessions.remove("session-1"))
    }
}
