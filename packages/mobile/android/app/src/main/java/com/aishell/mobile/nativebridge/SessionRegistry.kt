package com.aishell.mobile.nativebridge

class SessionRegistry<T> {
    private val pending = mutableSetOf<String>()
    private val sessions = mutableMapOf<String, T>()

    @Synchronized
    fun begin(sessionId: String) {
        pending.add(sessionId)
    }

    @Synchronized
    fun register(sessionId: String, session: T): Boolean {
        if (!pending.remove(sessionId)) return false
        sessions[sessionId] = session
        return true
    }

    @Synchronized
    fun remove(sessionId: String): T? {
        pending.remove(sessionId)
        return sessions.remove(sessionId)
    }

    @Synchronized
    fun get(sessionId: String): T? = sessions[sessionId]

    @Synchronized
    fun drain(): List<T> {
        pending.clear()
        val result = sessions.values.toList()
        sessions.clear()
        return result
    }
}
