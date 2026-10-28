import { afterEach, describe, expect, it, vi } from 'vitest';
import { listProviderModels, sendChat } from './ai';
import type { AIProviderConfig } from './config';

vi.mock('react-native', () => ({
  DeviceEventEmitter: { addListener: vi.fn() },
  NativeModules: {},
  Platform: { OS: 'android' },
}));

const provider = (overrides: Partial<AIProviderConfig> = {}): AIProviderConfig => ({
  id: 'wenxin',
  presetId: 'wenxin',
  name: 'wenxin',
  displayName: '文心一言',
  protocol: 'wenxin',
  baseURL: 'https://aip.baidubce.com',
  apiKey: 'api-key:secret-key',
  model: 'ernie-3.5-8k',
  models: ['ernie-3.5-8k'],
  enabled: true,
  updatedAt: 1,
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mobile AI providers', () => {
  it('sends the Wenxin system prompt through its dedicated field', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: 'ok' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendChat(provider(), [{ role: 'user', content: 'hello' }], 'system prompt');

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body.system).toBe('system prompt');
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('reports model list request failures instead of claiming a successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const openAi = provider({ protocol: 'openai', presetId: 'openai', baseURL: 'https://api.openai.com/v1' });

    await expect(listProviderModels(openAi)).rejects.toThrow('模型列表拉取失败');
  });
});
