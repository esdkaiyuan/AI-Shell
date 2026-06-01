import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class WenxinAdapter extends AIAdapter {
  private client: AxiosInstance;
  private accessToken: string = '';

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://aip.baidubce.com',
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      // API Key format: "API_KEY:SECRET_KEY"
      const [apiKey, secretKey] = this.config.apiKey.split(':');

      const response = await this.client.get('/oauth/2.0/token', {
        params: {
          grant_type: 'client_credentials',
          client_id: apiKey,
          client_secret: secretKey,
        },
      });

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error: any) {
      throw new Error(`Wenxin Auth Error: ${error.message}`);
    }
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const token = await this.getAccessToken();
      const modelPath = model || 'ernie-bot-turbo';

      const response = await this.client.post(
        `/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelPath}`,
        {
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content,
          })),
        },
        {
          params: { access_token: token },
        }
      );

      return {
        content: response.data.result,
        model: modelPath,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Wenxin API Error: ${error.response?.data?.error_msg || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const token = await this.getAccessToken();
      const modelPath = model || 'ernie-bot-turbo';

      const response = await this.client.post(
        `/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelPath}`,
        {
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content,
          })),
          stream: true,
        },
        {
          params: { access_token: token },
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
              const content = parsed.result || '';

              if (content) {
                yield { content, done: parsed.is_end || false };
              }

              if (parsed.is_end) return;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Wenxin Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'ernie-bot-4',
      'ernie-bot',
      'ernie-bot-turbo',
      'ernie-speed',
    ];
  }
}
