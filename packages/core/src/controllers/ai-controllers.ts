import { CommandController, ShellContext } from '../types';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class AICommandController implements CommandController {
  name = 'ai';
  description = 'AI助手对话';
  usage = 'ai <your question>';

  async execute(args: string[], context: ShellContext): Promise<string> {
    if (args.length === 0) {
      return 'Usage: ai <your question>\nExample: ai how to list files in current directory';
    }

    const query = args.join(' ');
    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content: 'You are a helpful shell assistant. Provide concise and accurate answers.',
        },
        { role: 'user', content: query },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}

export class ExplainController implements CommandController {
  name = 'explain';
  description = '解释Shell命令';
  usage = 'explain <command>';

  async execute(args: string[], context: ShellContext): Promise<string> {
    if (args.length === 0) {
      return 'Usage: explain <command>\nExample: explain ls -la';
    }

    const command = args.join(' ');
    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content:
            'You are a shell command expert. Explain the following command in detail, including what each flag does.',
        },
        { role: 'user', content: command },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}

export class TranslateController implements CommandController {
  name = 'translate';
  description = '将自然语言转换为Shell命令';
  usage = 'translate <natural language description>';

  async execute(args: string[], context: ShellContext): Promise<string> {
    if (args.length === 0) {
      return 'Usage: translate <description>\nExample: translate find all pdf files in current directory';
    }

    const description = args.join(' ');
    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content:
            'You are a shell command translator. Convert natural language descriptions into shell commands. Only output the command, no explanation.',
        },
        { role: 'user', content: description },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}

export class SuggestController implements CommandController {
  name = 'suggest';
  description = '根据上下文建议命令';
  usage = 'suggest';

  async execute(args: string[], context: ShellContext): Promise<string> {
    const recentHistory = context.history.slice(-5);
    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content:
            'Based on the recent command history, suggest useful next commands. Provide 3-5 suggestions with brief explanations.',
        },
        {
          role: 'user',
          content: `Recent commands:\n${recentHistory.join('\n')}\n\nCurrent directory: ${context.cwd}`,
        },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}

export class FixController implements CommandController {
  name = 'fix';
  description = '修复上一个失败的命令';
  usage = 'fix';

  async execute(args: string[], context: ShellContext): Promise<string> {
    const lastCommand = context.history[context.history.length - 1];
    if (!lastCommand) {
      return 'No previous command found.';
    }

    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content:
            'The user ran a command that failed. Suggest a corrected version and explain what was wrong.',
        },
        {
          role: 'user',
          content: `Failed command: ${lastCommand}\nCurrent directory: ${context.cwd}`,
        },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}

export class OptimizeController implements CommandController {
  name = 'optimize';
  description = '优化Shell命令';
  usage = 'optimize <command>';

  async execute(args: string[], context: ShellContext): Promise<string> {
    if (args.length === 0) {
      return 'Usage: optimize <command>\nExample: optimize find . -name "*.txt"';
    }

    const command = args.join(' ');
    const aiService = context.getAIService();

    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content:
            'You are a shell optimization expert. Suggest a more efficient or better way to accomplish the same task.',
        },
        { role: 'user', content: command },
      ]);

      return response.content;
    } catch (error: unknown) {
      return `Error: ${getErrorMessage(error)}`;
    }
  }
}
