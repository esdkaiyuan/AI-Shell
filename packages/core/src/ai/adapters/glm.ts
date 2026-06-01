import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class GLMAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: model || this.config.models[0] || 'glm-4',
        messages: messages,
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
      throw new Error(`GLM API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: model || this.config.models[0] || 'glm-4',
          messages: messages,
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
      throw new Error(`GLM Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    // 智谱 v4 接口兼容 OpenAI 风格，通过 /models 动态获取
    const response = await this.client.get('/models');
    const models: string[] = (response.data?.data || [])
      .map((model: any) => model.id)
      .filter((id: string) => typeof id === 'string');
    return models.sort((a, b) => a.localeCompare(b));
  }
}
