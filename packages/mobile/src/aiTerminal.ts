/**
 * The tiny switches under the terminal window are the explicit permission
 * boundary between an AI answer and the live PTY. An answer may only read
 * output, fill the input box, or write to the session when the matching
 * switch is on. `run` is never granted implicitly.
 */

export type AICapability = 'context' | 'fill' | 'run';

export interface AICapabilityOption {
  id: AICapability;
  label: string;
  hint: string;
  /** Writing to a live PTY can change state, so it needs an explicit opt-in. */
  sensitive?: boolean;
}

export const AI_CAPABILITIES: AICapabilityOption[] = [
  { id: 'context', label: '读取', hint: '把终端最近输出作为 AI 上下文' },
  { id: 'fill', label: '填入', hint: '把 AI 给出的命令填入终端输入框' },
  {
    id: 'run',
    label: '执行',
    hint: '把 AI 给出的命令直接写入终端执行',
    sensitive: true,
  },
];

export const DEFAULT_AI_CAPABILITIES: AICapability[] = ['context', 'fill'];

export const hasCapability = (
  capabilities: AICapability[],
  id: AICapability
): boolean => capabilities.includes(id);

export const toggleCapability = (
  capabilities: AICapability[],
  id: AICapability
): AICapability[] =>
  hasCapability(capabilities, id)
    ? capabilities.filter(item => item !== id)
    : [...capabilities, id];

/** Languages whose fenced blocks may be treated as shell commands. */
const SHELL_LANGUAGES = new Set([
  '',
  'bash',
  'sh',
  'shell',
  'zsh',
  'console',
  'terminal',
  'alpine',
  'linux',
  'powershell',
  'ps1',
  'cmd',
  'bat',
  'dos',
]);

const MAX_COMMANDS = 3;
const MAX_COMMAND_LENGTH = 300;

/** Prose is never sent to a PTY, even when it appears inside a code fence. */
const COMMAND_HINT =
  /(?:^|\s)(?:sudo|apk|apt|apt-get|yum|dnf|pacman|ls|cd|cat|grep|sed|awk|git|curl|wget|ssh|scp|ps|kill|echo|pwd|df|du|top|htop|tar|unzip|zip|chmod|chown|systemctl|service|journalctl|npm|pnpm|yarn|node|python|pip|docker|kubectl|ping|ip|ifconfig|find|cp|mv|rm|mkdir|touch|head|tail|which|env|export|source|bash|sh|zsh|clear|history|uname|free|id|whoami|date|wc|sort|uniq|xargs|tee|sleep|watch|nano|vi|vim|less|more|stat|file|ln|printf|test)(?:\s|$|[0-9])|[`$|><;&=]|\.\//;

const stripPrompt = (line: string): string =>
  line
    .replace(/^\$\s+/, '')
    .replace(/^[\w.-]+@[\w.-]+(?::[^\s#$]*)?[#$]\s*/, '')
    .trim();

const isRunnable = (line: string): boolean => {
  if (!line || line.length > MAX_COMMAND_LENGTH) return false;
  if (/^(?:#|\/\/|```|\.{3}|…)/.test(line)) return false;
  if (SHELL_LANGUAGES.has(line.toLowerCase())) return false;
  return COMMAND_HINT.test(line);
};

/**
 * Only fenced shell blocks (or standalone inline-code lines) can reach the
 * terminal. Plain prose in an AI answer is deliberately ignored.
 */
export const extractCommands = (answer: string): string[] => {
  const blocks: string[] = [];
  const fenced = /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null = fenced.exec(answer);
  while (match !== null) {
    if (SHELL_LANGUAGES.has(match[1].toLowerCase())) blocks.push(match[2]);
    match = fenced.exec(answer);
  }
  const inline = answer
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^`[^`]+`$/.test(line))
    .map(line => line.slice(1, -1));
  const source = blocks.length ? blocks : inline;
  const commands: string[] = [];
  source.forEach(block => {
    block.split('\n').forEach(raw => {
      const line = stripPrompt(raw);
      if (isRunnable(line) && !commands.includes(line)) commands.push(line);
    });
  });
  return commands.slice(0, MAX_COMMANDS);
};

export interface AIActionPlan {
  commands: string[];
  /** Command placed in the terminal input box, never executed automatically. */
  fill?: string;
  /** Commands written straight into the live PTY. */
  run: string[];
  includeContext: boolean;
}

export const planAIActions = (
  answer: string,
  capabilities: AICapability[]
): AIActionPlan => {
  const commands = extractCommands(answer);
  const canRun = hasCapability(capabilities, 'run');
  const canFill = hasCapability(capabilities, 'fill');
  return {
    commands,
    // Executing already covers filling; avoid leaving a duplicate in the input.
    fill: canFill && !canRun && commands.length ? commands[0] : undefined,
    run: canRun ? commands : [],
    includeContext: hasCapability(capabilities, 'context'),
  };
};

export const describeAIAction = (plan: AIActionPlan): string => {
  if (plan.run.length) return `已在终端执行 ${plan.run.length} 条命令`;
  if (plan.fill) return '已填入终端输入框';
  return '';
};
