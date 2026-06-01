// AI Provider Types
export interface AIProvider {
  name: string;
  apiKey: string;
  baseURL?: string;
  models: string[];
  enabled?: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// Abstract AI Adapter
export abstract class AIAdapter {
  protected config: AIProvider;

  constructor(config: AIProvider) {
    this.config = config;
  }

  abstract chat(messages: AIMessage[], model?: string): Promise<AIResponse>;
  abstract streamChat(
    messages: AIMessage[],
    model?: string
  ): AsyncGenerator<StreamChunk, void, unknown>;
  abstract listModels(): Promise<string[]>;
}

// Command Controller Types
export interface ShellContext {
  cwd: string;
  env: Record<string, string>;
  history: string[];
  getAIService(): AIService;
}

export interface CommandController {
  name: string;
  description: string;
  usage: string;
  execute(args: string[], context: ShellContext): Promise<string>;
}

// Storage Types
export interface CommandHistory {
  id: number;
  command: string;
  cwd: string;
  timestamp: number;
  exitCode: number;
}

export interface SSHConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  config?: Record<string, unknown>;
}

export interface SyncData {
  deviceId: string;
  timestamp: number;
  type: 'history' | 'config' | 'ssh' | 'ai';
  data: unknown;
}

// AI Service Interface
export interface AIService {
  chat(messages: AIMessage[], provider?: string, model?: string): Promise<AIResponse>;
  streamChat(
    messages: AIMessage[],
    provider?: string,
    model?: string
  ): AsyncGenerator<StreamChunk, void, unknown>;
  listProviders(): AIProvider[];
  addProvider(provider: AIProvider): void;
  removeProvider(name: string): void;
  listModels(provider?: string): Promise<string[]>;
  listModelsForConfig(config: AIProvider): Promise<string[]>;
}
