// Agent 命令安全规则（纯函数，无 Electron 依赖，便于单测）

export const MAX_COMMAND_OUTPUT = 64 * 1024;
export const MAX_FILE_SIZE = 1024 * 1024;
export const MAX_WRITE_LENGTH = 512 * 1024;
export const MAX_DIRECTORY_ENTRIES = 200;
export const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;

export interface DangerRule {
  pattern: RegExp;
  reason: string;
}

// 只拦截明确不可逆 / 影响系统全局的操作，避免误伤日常命令。
export const DANGEROUS_COMMAND_RULES: DangerRule[] = [
  { pattern: /\brm\s+-[a-z]*[rf][a-z]*\s+\/(?:\s|$|\*|;|&&|\|)/i, reason: '递归删除根目录' },
  { pattern: /\brm\s+-[a-z]*[rf][a-z]*\s+~(?:\/|\s|$|\*)/i, reason: '递归删除用户主目录' },
  { pattern: /\b(format|mkfs)(\.\w+)?\s/i, reason: '磁盘格式化' },
  { pattern: /\bdd\s+if=\S*\s+of=\/dev\//i, reason: '直接写入块设备' },
  { pattern: /\b(del|rd|rmdir)\s+\/[sq]\b/i, reason: 'Windows 递归删除' },
  { pattern: /:\(\)\s*\{[^}]*\|\s*:\s*&\s*\}\s*;?\s*:/, reason: 'fork 炸弹' },
  { pattern: /(?:^|[;&|]\s*)(?:sudo\s+)?(?:shutdown|reboot|halt|poweroff)\b/i, reason: '关机或重启系统' },
  { pattern: />\s*\/dev\/(sd|nvme|hd)/i, reason: '覆盖磁盘设备' },
  { pattern: /\bchmod\s+-R\s+777\s+\//i, reason: '递归放开根目录权限' },
  { pattern: /\breg\s+delete\b/i, reason: '删除注册表项' },
  { pattern: /\bRemove-Item\b[^\n]*-Recurse[^\n]*\b(C:\\|%SystemDrive%|\/)/i, reason: 'PowerShell 递归删除系统路径' },
];

/** 返回命中的危险原因；安全命令返回 null */
export function detectDangerousCommand(command: string): string | null {
  if (typeof command !== 'string') return '命令必须是字符串';
  const normalized = command.trim();
  if (!normalized) return '命令不能为空';
  for (const rule of DANGEROUS_COMMAND_RULES) {
    if (rule.pattern.test(normalized)) return rule.reason;
  }
  return null;
}

export function truncateOutput(text: string, max = MAX_COMMAND_OUTPUT): string {
  if (!text) return '';
  return text.length > max
    ? `${text.slice(0, max)}\n…（输出已截断，共 ${text.length} 字符）`
    : text;
}
