import {
  AIService,
  AIProvider,
  AIMessage,
  AIResponse,
  StreamChunk,
  AIAdapter,
} from '../types';
import { AIFactory } from './factory';

export class AIServiceImpl implements AIService {
  private providers: Map<string, AIProvider> = new Map();
  private adapters: Map<string, AIAdapter> = new Map();

  constructor(providers: AIProvider[] = []) {
    providers.forEach(p => this.addProvider(p));
  }

  addProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);

    try {
      const adapter = AIFactory.createAdapter(provider.name, provider);
      this.adapters.set(provider.name, adapter);
    } catch (error) {
      console.error(`Failed to create adapter for ${provider.name}:`, error);
    }
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    this.adapters.delete(name);
  }

  listProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  private getAdapter(provider?: string): AIAdapter {
    if (provider) {
      const adapter = this.adapters.get(provider);
      if (!adapter) {
        throw new Error(`Provider ${provider} not found or not configured`);
      }
      return adapter;
    }

    // Get first enabled provider
    const enabledProvider = Array.from(this.providers.values()).find(p => p.enabled !== false);
    if (!enabledProvider) {
      throw new Error('No AI provider configured');
    }

    const adapter = this.adapters.get(enabledProvider.name);
    if (!adapter) {
      throw new Error(`Adapter for ${enabledProvider.name} not available`);
    }

    return adapter;
  }

  async chat(
    messages: AIMessage[],
    provider?: string,
    model?: string
  ): Promise<AIResponse> {
    const adapter = this.getAdapter(provider);
    return await adapter.chat(messages, model);
  }

  /**
   * 获取指定（已配置）提供商的可用模型列表。
   */
  async listModels(provider?: string): Promise<string[]> {
    const adapter = this.getAdapter(provider);
    return await adapter.listModels();
  }

  /**
   * 用一份临时配置（尚未保存的提供商）拉取模型列表。
   * 供「添加提供商」表单在保存前点击「获取模型列表」时使用。
   */
  async listModelsForConfig(config: AIProvider): Promise<string[]> {
    const adapter = AIFactory.createAdapter(config.name, config);
    return await adapter.listModels();
  }

  async *streamChat(
    messages: AIMessage[],
    provider?: string,
    model?: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const adapter = this.getAdapter(provider);
    yield* adapter.streamChat(messages, model);
  }
}
