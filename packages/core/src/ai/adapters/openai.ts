import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class OpenAIAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: model || this.config.models[0] || 'gpt-3.5-turbo',
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
      throw new Error(`OpenAI API Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: model || this.config.models[0] || 'gpt-3.5-turbo',
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
      throw new Error(`OpenAI Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    // 通过访问 /models 接口动态获取可用模型列表
    const response = await this.client.get('/models');
    const models: string[] = (response.data?.data || [])
      .map((model: any) => model.id)
      .filter((id: string) => typeof id === 'string');
    // 排序，常用的对话模型排在前面
    return models.sort((a, b) => a.localeCompare(b));
  }
}
