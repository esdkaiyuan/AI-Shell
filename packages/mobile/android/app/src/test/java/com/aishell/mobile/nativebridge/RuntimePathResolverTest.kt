package com.aishell.mobile.nativebridge

import java.io.File
import java.nio.file.Files
import org.junit.Assert.assertEquals
import org.junit.Test

class RuntimePathResolverTest {
    @Test
    fun resolvesBindMountsToTheirHostDirectories() {
        val root = Files.createTempDirectory("runtime-paths").toFile()
        val rootfs = File(root, "rootfs")
        val shared = File(root, "shared")
        val external = File(root, "external")
        val resolver = RuntimePathResolver(rootfs, shared, external)

        assertEquals(File(shared, "demo.txt").canonicalFile, resolver.resolve("/root/shared/demo.txt"))
        assertEquals(File(external, "demo.txt").canonicalFile, resolver.resolve("/root/android/demo.txt"))
        assertEquals(File(rootfs, "root/demo.txt").canonicalFile, resolver.resolve("/root/demo.txt"))
        assertEquals(
            File(rootfs, "root/shared_backup/demo.txt").canonicalFile,
            resolver.resolve("/root/shared_backup/demo.txt")
        )
    }

    @Test(expected = SecurityException::class)
    fun rejectsTraversalOutsideBindMounts() {
        val root = Files.createTempDirectory("runtime-paths").toFile()
        val resolver = RuntimePathResolver(
            File(root, "rootfs"),
            File(root, "shared"),
            File(root, "external")
        )

        resolver.resolve("/root/shared/../outside.txt")
    }
}
