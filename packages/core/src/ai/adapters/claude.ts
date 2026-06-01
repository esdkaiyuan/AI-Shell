import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class ClaudeAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      // Convert messages format for Claude
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.post('/messages', {
        model: model || this.config.models[0] || 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: conversationMessages,
      });

      return {
        content: response.data.content[0].text,
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage.input_tokens,
          completionTokens: response.data.usage.output_tokens,
          totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Claude API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.post(
        '/messages',
        {
          model: model || this.config.models[0] || 'claude-3-sonnet-20240229',
          max_tokens: 4096,
          system: systemMessage?.content,
          messages: conversationMessages,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text || '';
                if (content) {
                  yield { content, done: false };
                }
              } else if (parsed.type === 'message_stop') {
                yield { content: '', done: true };
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Claude Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic 提供 /models 接口，返回 { data: [{ id, ... }] }
    const response = await this.client.get('/models');
    const models: string[] = (response.data?.data || [])
      .map((model: any) => model.id)
      .filter((id: string) => typeof id === 'string');
    return models.sort((a, b) => b.localeCompare(a));
  }
}
