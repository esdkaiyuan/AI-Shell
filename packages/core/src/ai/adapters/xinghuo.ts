import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class XinghuoAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://spark-api.xf-yun.com/v3.5',
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      // 讯飞星火需要特殊的认证方式
      // API Key格式: APPID:APISecret:APIKey
      const [appId, apiSecret, apiKey] = this.config.apiKey.split(':');

      const response = await this.client.post('/chat', {
        header: {
          app_id: appId,
        },
        parameter: {
          chat: {
            domain: model || 'generalv3.5',
            temperature: 0.5,
            max_tokens: 2048,
          },
        },
        payload: {
          message: {
            text: messages.map(m => ({
              role: m.role === 'system' ? 'user' : m.role,
              content: m.content,
            })),
          },
        },
      });

      return {
        content: response.data.payload.choices.text[0].content,
        model: model || 'spark-3.5',
        usage: {
          promptTokens: response.data.payload.usage.text.prompt_tokens,
          completionTokens: response.data.payload.usage.text.completion_tokens,
          totalTokens: response.data.payload.usage.text.total_tokens,
        },
      };
    } catch (error: any) {
      throw new Error(`Xinghuo API Error: ${error.response?.data?.header?.message || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    // 讯飞星火使用WebSocket进行流式传输，这里简化为非流式
    const response = await this.chat(messages, model);
    yield { content: response.content, done: true };
  }

  async listModels(): Promise<string[]> {
    return ['spark-3.5', 'spark-3.0', 'spark-2.0'];
  }
}
