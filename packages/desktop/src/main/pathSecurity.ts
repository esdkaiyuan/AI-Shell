import { app } from 'electron';
import * as path from 'path';

// 资源管理器与 Agent 共用的路径安全边界：文件操作只能发生在工作区 / 用户主目录内。
// 单独成文件，避免主进程与 Agent 执行层各维护一份规则而产生偏差。

export type ExplorerRoot = 'workspace' | 'home';

export function resolveExplorerRoot(root: ExplorerRoot): string {
  return root === 'home' ? app.getPath('home') : process.cwd();
}

export function isPathInsideRoot(targetPath: string, rootPath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return (
    relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return (['workspace', 'home'] as ExplorerRoot[]).some(root =>
    isPathInsideRoot(resolved, resolveExplorerRoot(root))
  );
}

/** 校验并返回规范化后的绝对路径，越界直接抛错 */
export function assertPathAllowed(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  if (!isPathAllowed(resolved)) {
    throw new Error('路径超出允许范围（仅限工作区与用户主目录）');
  }
  return resolved;
}
