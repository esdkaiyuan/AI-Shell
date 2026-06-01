import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class MoonshotAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.moonshot.cn/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: model || this.config.models[0] || 'moonshot-v1-8k',
        messages: messages,
        temperature: 0.3,
      });

      return {
        content: response.data.choices[0].message.content,
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Moonshot API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: model || this.config.models[0] || 'moonshot-v1-8k',
          messages: messages,
          stream: true,
          temperature: 0.3,
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
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Moonshot Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    // Moonshot 兼容 OpenAI 接口，通过 /models 动态获取
    const response = await this.client.get('/models');
    const models: string[] = (response.data?.data || [])
      .map((model: any) => model.id)
      .filter((id: string) => typeof id === 'string');
    return models.sort((a, b) => a.localeCompare(b));
  }
}
