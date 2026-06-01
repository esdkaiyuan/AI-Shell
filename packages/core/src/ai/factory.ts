import { AIAdapter, AIProvider } from '../types';
import { OpenAIAdapter } from './adapters/openai';
import { ClaudeAdapter } from './adapters/claude';
import { WenxinAdapter } from './adapters/wenxin';
import { TongyiAdapter } from './adapters/tongyi';
import { GLMAdapter } from './adapters/glm';
import { XinghuoAdapter } from './adapters/xinghuo';
import { MoonshotAdapter } from './adapters/moonshot';
import { DeepSeekAdapter } from './adapters/deepseek';
import { OllamaAdapter } from './adapters/ollama';

export class AIFactory {
  static createAdapter(provider: string, config: AIProvider): AIAdapter {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'claude':
      case 'anthropic':
        return new ClaudeAdapter(config);
      case 'wenxin':
      case 'baidu':
        return new WenxinAdapter(config);
      case 'tongyi':
      case 'qwen':
        return new TongyiAdapter(config);
      case 'glm':
      case 'chatglm':
        return new GLMAdapter(config);
      case 'xinghuo':
      case 'spark':
        return new XinghuoAdapter(config);
      case 'moonshot':
      case 'kimi':
        return new MoonshotAdapter(config);
      case 'deepseek':
        return new DeepSeekAdapter(config);
      case 'ollama':
        return new OllamaAdapter(config);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return [
      'openai',
      'claude',
      'wenxin',
      'tongyi',
      'glm',
      'xinghuo',
      'moonshot',
      'deepseek',
      'ollama',
    ];
  }
}
