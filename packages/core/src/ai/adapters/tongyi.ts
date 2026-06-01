import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class TongyiAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const response = await this.client.post('/services/aigc/text-generation/generation', {
        model: model || this.config.models[0] || 'qwen-turbo',
        input: {
          messages: messages,
        },
        parameters: {
          result_format: 'message',
        },
      });

      const output = response.data.output;
      return {
        content: output.choices[0].message.content,
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage.input_tokens,
          completionTokens: response.data.usage.output_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Tongyi API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.client.post(
        '/services/aigc/text-generation/generation',
        {
          model: model || this.config.models[0] || 'qwen-turbo',
          input: {
            messages: messages,
          },
          parameters: {
            result_format: 'message',
            incremental_output: true,
          },
        },
        {
          headers: {
            'X-DashScope-SSE': 'enable',
          },
          responseType: 'stream',
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();

            try {
              const parsed = JSON.parse(data);
              const content = parsed.output?.choices[0]?.message?.content || '';

              if (content) {
                yield { content, done: false };
              }

              if (parsed.output?.finish_reason === 'stop') {
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
      throw new Error(`Tongyi Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
    ];
  }
}
