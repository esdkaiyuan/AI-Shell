import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LocalStorage, ToolCall, ToolResult } from '@ai-shell/core';
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_COMMAND_OUTPUT,
  MAX_DIRECTORY_ENTRIES,
  MAX_FILE_SIZE,
  MAX_WRITE_LENGTH,
  detectDangerousCommand,
  truncateOutput,
} from './agentSafety';
import { assertPathAllowed, resolveExplorerRoot } from './pathSecurity';

// Agent 工具执行层：所有文件/命令操作都经过 assertPathAllowed 与危险命令拦截。
// core 只定义工具协议，这里负责真正落地，边界与资源管理器保持一致。

export interface AgentToolDeps {
  storage: LocalStorage | null;
  /** 当前 run 的终端上下文（由渲染层在发起任务时传入） */
  getTerminalContext: () => string;
}

interface CommandOutcome {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  aborted: boolean;
}

function runCommand(
  command: string,
  cwd: string,
  signal?: AbortSignal
): Promise<CommandOutcome> {
  return new Promise(resolve => {
    const child = exec(
      command,
      {
        cwd,
        timeout: DEFAULT_COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_COMMAND_OUTPUT * 2,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === 'number' ? error.code : -1) : 0;
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode,
          timedOut: error?.killed === true && !signal?.aborted,
          aborted: signal?.aborted === true,
        });
      }
    );

    if (signal) {
      const onAbort = () => child.kill();
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function stringArg(call: ToolCall, name: string): string {
  const value = call.args?.[name];
  return value === undefined || value === null ? '' : String(value);
}

export function createToolExecutor(deps: AgentToolDeps) {
  return async function executeTool(
    call: ToolCall,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    const started = Date.now();
    const done = (ok: boolean, output: string): ToolResult => ({
      ok,
      output: truncateOutput(output),
      durationMs: Date.now() - started,
    });

    try {
      switch (call.tool) {
        case 'run_command': {
          const command = stringArg(call, 'command').trim();
          const danger = detectDangerousCommand(command);
          if (danger) return done(false, `[安全拦截] 已拒绝执行：${danger}。命令：${command}`);

          const cwdArg = stringArg(call, 'cwd').trim();
          const cwd = cwdArg ? assertPathAllowed(cwdArg) : resolveExplorerRoot('workspace');
          const stat = await fs.stat(cwd).catch(() => null);
          if (!stat?.isDirectory()) return done(false, `工作目录不存在或不是目录：${cwd}`);

          if (signal?.aborted) return done(false, '已中断，命令未执行');
          const outcome = await runCommand(command, cwd, signal);
          const parts = [
            `退出码：${outcome.exitCode}${outcome.aborted ? '（已中断）' : ''}${outcome.timedOut ? '（超时）' : ''}`,
            `stdout:\n${truncateOutput(outcome.stdout) || '（空）'}`,
          ];
          if (outcome.stderr) parts.push(`stderr:\n${truncateOutput(outcome.stderr)}`);
          if (outcome.aborted) return done(false, parts.join('\n'));
          return done(outcome.exitCode === 0, parts.join('\n'));
        }

        case 'read_file': {
          const target = assertPathAllowed(stringArg(call, 'path'));
          const stat = await fs.stat(target);
          if (!stat.isFile()) return done(false, `不是文件：${target}`);
          if (stat.size > MAX_FILE_SIZE) {
            return done(false, `文件过大（${stat.size} 字节），超过 ${MAX_FILE_SIZE} 字节上限`);
          }
          const content = await fs.readFile(target, 'utf8');
          return done(true, content || '（空文件）');
        }

        case 'write_file': {
          const target = assertPathAllowed(stringArg(call, 'path'));
          const content = stringArg(call, 'content');
          if (content.length > MAX_WRITE_LENGTH) {
            return done(false, `写入内容过长（${content.length} 字符），超过 ${MAX_WRITE_LENGTH} 上限`);
          }
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, content, 'utf8');
          return done(true, `已写入 ${target}（${content.length} 字符）`);
        }

        case 'list_directory': {
          const raw = stringArg(call, 'path').trim();
          const target = raw ? assertPathAllowed(raw) : resolveExplorerRoot('workspace');
          const entries = await fs.readdir(target, { withFileTypes: true });
          const lines = entries.slice(0, MAX_DIRECTORY_ENTRIES).map(entry => {
            const kind = entry.isDirectory() ? 'dir ' : entry.isSymbolicLink() ? 'link' : 'file';
            return `${kind}  ${entry.name}`;
          });
          const suffix = entries.length > MAX_DIRECTORY_ENTRIES
            ? `\n…（仅显示前 ${MAX_DIRECTORY_ENTRIES} 项，共 ${entries.length} 项）`
            : '';
          return done(true, `${target}\n${lines.join('\n') || '（空目录）'}${suffix}`);
        }

        case 'get_terminal_context': {
          const context = deps.getTerminalContext();
          return done(true, context || '（当前没有可用的终端输出上下文）');
        }

        case 'search_history': {
          const query = stringArg(call, 'query').trim();
          if (!query) return done(false, '搜索关键词不能为空');
          if (!deps.storage) return done(false, '历史命令存储尚未初始化');
          const rows = deps.storage.searchCommandHistory(query, 20);
          if (!rows.length) return done(true, `没有匹配 "${query}" 的历史命令`);
          return done(
            true,
            rows.map(row => `[${row.exitCode}] ${row.command}  (${row.cwd})`).join('\n')
          );
        }

        default:
          return done(false, `未实现的工具：${call.tool}`);
      }
    } catch (error: unknown) {
      return done(false, `[工具执行异常] ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}
