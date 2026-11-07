import { AgentTool, ToolCall } from './types';

// 内置工具清单。执行层位于 desktop 主进程，core 只负责描述与校验，
// 这样同一套协议可被桌面端 / 移动端 / 未来的远端 agent 复用。
export const BUILTIN_TOOLS: AgentTool[] = [
  {
    name: 'run_command',
    description: '在当前工作目录执行一条 shell 命令并返回 stdout/stderr 与退出码。用于查看状态、运行构建、查询系统等。',
    risk: 'write',
    parameters: [
      { name: 'command', type: 'string', description: '要执行的完整命令（单条，不要用交互式命令）', required: true },
      { name: 'cwd', type: 'string', description: '可选：执行目录，必须是工作区或用户主目录内的路径' },
    ],
  },
  {
    name: 'read_file',
    description: '读取一个文本文件的完整内容。',
    risk: 'read',
    parameters: [{ name: 'path', type: 'string', description: '文件绝对路径', required: true }],
  },
  {
    name: 'write_file',
    description: '把内容写入一个文本文件（不存在则创建，存在则覆盖）。',
    risk: 'write',
    parameters: [
      { name: 'path', type: 'string', description: '文件绝对路径', required: true },
      { name: 'content', type: 'string', description: '要写入的完整文本', required: true },
    ],
  },
  {
    name: 'list_directory',
    description: '列出目录下的文件与子目录。',
    risk: 'read',
    parameters: [{ name: 'path', type: 'string', description: '目录绝对路径，省略则用工作区根目录' }],
  },
  {
    name: 'get_terminal_context',
    description: '获取当前活动终端最近的输出（含命令与报错），用于分析失败原因。',
    risk: 'read',
    parameters: [],
  },
  {
    name: 'search_history',
    description: '在历史命令中搜索，返回匹配的命令与退出码。',
    risk: 'read',
    parameters: [{ name: 'query', type: 'string', description: '搜索关键词', required: true }],
  },
];

export function getTool(name: string, tools: AgentTool[] = BUILTIN_TOOLS): AgentTool | undefined {
  return tools.find(tool => tool.name === name);
}

/** 校验工具名与参数，返回错误描述；合法时返回 null */
export function validateToolCall(
  call: ToolCall,
  tools: AgentTool[] = BUILTIN_TOOLS
): string | null {
  if (!call || typeof call.tool !== 'string' || !call.tool.trim()) {
    return '工具调用缺少 tool 字段';
  }
  const tool = getTool(call.tool, tools);
  if (!tool) {
    return `未知工具 "${call.tool}"，可用工具：${tools.map(t => t.name).join(', ')}`;
  }
  const args = call.args ?? {};
  if (typeof args !== 'object' || Array.isArray(args)) {
    return `工具 ${tool.name} 的 args 必须是对象`;
  }
  for (const param of tool.parameters) {
    if (!param.required) continue;
    const value = args[param.name];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return `工具 ${tool.name} 缺少必填参数 ${param.name}`;
    }
    if (param.type === 'string' && typeof value !== 'string') {
      return `工具 ${tool.name} 的参数 ${param.name} 必须是字符串`;
    }
    if (param.type === 'number' && typeof value !== 'number') {
      return `工具 ${tool.name} 的参数 ${param.name} 必须是数字`;
    }
    if (param.type === 'boolean' && typeof value !== 'boolean') {
      return `工具 ${tool.name} 的参数 ${param.name} 必须是布尔值`;
    }
  }
  return null;
}
