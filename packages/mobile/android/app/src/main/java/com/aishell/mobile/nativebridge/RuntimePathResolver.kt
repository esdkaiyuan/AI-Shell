package com.aishell.mobile.nativebridge

import java.io.File

class RuntimePathResolver(
    private val rootfsDir: File,
    private val sharedDir: File,
    private val externalDir: File?
) {
    fun resolve(guestPath: String): File {
        val relative = guestPath.trim().trimStart('/')
        val root = when {
            relative == "root/shared" || relative.startsWith("root/shared/") -> sharedDir
            externalDir != null && (relative == "root/android" || relative.startsWith("root/android/")) -> externalDir
            else -> rootfsDir
        }
        val childRelative = when (root) {
            sharedDir -> relative.removePrefix("root/shared").trimStart('/')
            externalDir -> relative.removePrefix("root/android").trimStart('/')
            else -> relative
        }
        val file = File(root, childRelative).canonicalFile
        val canonicalRoot = root.canonicalFile
        if (file != canonicalRoot && !file.path.startsWith(canonicalRoot.path + File.separator)) {
            throw SecurityException("路径超出允许访问的根目录")
        }
        return file
    }
}
