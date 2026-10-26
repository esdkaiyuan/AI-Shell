// aiStreamAbort.test.ts
// 流式中断（AbortSignal）链路的行为验证：
// 验证 core 的 streamChat 能把 signal 透传到 adapter，并在中断时停止产出。
import { describe, it, expect } from 'vitest';
import { AIServiceImpl } from './service';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../types';

/** 记录收到的 signal，用于验证透传 */
class ProbeAdapter extends AIAdapter {
  receivedSignal?: AbortSignal;
  yielded = 0;

  constructor(config: AIProvider) {
    super(config);
  }

  async chat(): Promise<AIResponse> {
    return { content: '', model: 'probe' };
  }

  async *streamChat(
    _messages: AIMessage[],
    _model?: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.receivedSignal = signal;
    for (let i = 0; i < 10; i++) {
      if (signal?.aborted) return;
      this.yielded++;
      yield { content: `chunk${i}`, done: false };
      await new Promise(r => setTimeout(r, 1));
    }
    yield { content: '', done: true };
  }

  async listModels(): Promise<string[]> {
    return ['gpt-4o'];
  }
}

const provider: AIProvider = {
  name: 'openai',
  apiKey: 'k',
  models: ['gpt-4o'],
};

describe('AIServiceImpl.streamChat signal 透传', () => {
  it('passes AbortSignal through to the adapter', async () => {
    const service = new AIServiceImpl([provider]);
    const adapter = new ProbeAdapter(provider);
    // 用适配器实例替换内部创建的适配器
    (service as unknown as { adapters: Map<string, AIAdapter> }).adapters.set(
      'openai',
      adapter
    );

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of service.streamChat(
      [{ role: 'user', content: 'hi' }],
      'openai',
      'gpt-4o',
      controller.signal
    )) {
      chunks.push(chunk.content);
    }

    expect(adapter.receivedSignal).toBe(controller.signal);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('stops producing chunks once aborted', async () => {
    const service = new AIServiceImpl([provider]);
    const adapter = new ProbeAdapter(provider);
    (service as unknown as { adapters: Map<string, AIAdapter> }).adapters.set(
      'openai',
      adapter
    );

    const controller = new AbortController();
    let count = 0;
    for await (const chunk of service.streamChat(
      [{ role: 'user', content: 'hi' }],
      'openai',
      'gpt-4o',
      controller.signal
    )) {
      count++;
      expect(chunk).toBeDefined();
      // 第 2 个 chunk 时中断
      if (count === 2) controller.abort();
    }

    expect(count).toBeLessThan(10);
    expect(adapter.yielded).toBeLessThan(10);
  });

  it('works without a signal (backwards compatible)', async () => {
    const service = new AIServiceImpl([provider]);
    const adapter = new ProbeAdapter(provider);
    (service as unknown as { adapters: Map<string, AIAdapter> }).adapters.set(
      'openai',
      adapter
    );

    const chunks: string[] = [];
    for await (const chunk of service.streamChat(
      [{ role: 'user', content: 'hi' }],
      'openai'
    )) {
      chunks.push(chunk.content);
    }

    expect(adapter.receivedSignal).toBeUndefined();
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('throws for unknown provider', async () => {
    const service = new AIServiceImpl([provider]);
    const run = async () => {
      for await (const chunk of service.streamChat(
        [{ role: 'user', content: 'hi' }],
        'missing'
      )) {
        // 不应进入循环体
        expect(chunk).toBeUndefined();
      }
    };
    await expect(run()).rejects.toThrow(/not found or not configured/);
  });
});

describe('AbortController 基础行为', () => {
  it('aborted flag flips after abort()', () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });
});
