import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../../types';

export class OllamaAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'http://localhost:11434',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    try {
      const response = await this.client.post('/api/chat', {
        model: model || this.config.models[0] || 'llama2',
        messages: messages,
        stream: false,
      });

      return {
        content: response.data.message.content,
        model: response.data.model,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
      };
    } catch (error: any) {
      throw new Error(`Ollama API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.client.post(
        '/api/chat',
        {
          model: model || this.config.models[0] || 'llama2',
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
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';

            if (content) {
              yield { content, done: parsed.done || false };
            }

            if (parsed.done) return;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Ollama Stream Error: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models.map((model: any) => model.name);
    } catch (error) {
      return ['llama2', 'mistral', 'codellama'];
    }
  }
}
