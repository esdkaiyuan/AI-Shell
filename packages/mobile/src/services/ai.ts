import type { AIProviderConfig } from './config';
import { presetById } from './config';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const TIMEOUT_MS = 60000;

const trimBase = (value: string) => value.trim().replace(/\/+$/, '');

const readError = async (response: Response): Promise<string> => {
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text);
    return (
      parsed?.error?.message ||
      parsed?.error_msg ||
      parsed?.message ||
      parsed?.error ||
      `HTTP ${response.status}`
    );
  } catch {
    return text.slice(0, 300) || `HTTP ${response.status}`;
  }
};

const request = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller?.signal });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络或代理设置。');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const postJson = (url: string, body: unknown, headers: Record<string, string>) =>
  request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const withSystem = (messages: AIChatMessage[], systemPrompt?: string): AIChatMessage[] => {
  const filtered = messages.filter(message => message.role !== 'system');
  return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...filtered] : filtered;
};

const openAiCompatible = async (
  provider: AIProviderConfig,
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  const base = trimBase(provider.baseURL);
  const response = await postJson(
    `${base}/chat/completions`,
    {
      model: provider.model || provider.models[0],
      messages: withSystem(messages, systemPrompt),
      stream: false,
    },
    { Authorization: `Bearer ${provider.apiKey}` }
  );
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  throw new Error('提供商返回了空内容。');
};

const claude = async (
  provider: AIProviderConfig,
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  const base = trimBase(provider.baseURL);
  const response = await postJson(
    `${base}/messages`,
    {
      model: provider.model || provider.models[0],
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.filter(message => message.role !== 'system'),
    },
    {
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    }
  );
  const data = await response.json();
  const content = Array.isArray(data?.content)
    ? data.content.map((part: { text?: string }) => part.text || '').join('\n')
    : '';
  if (content.trim()) return content;
  throw new Error('Claude 返回了空内容。');
};

const ollama = async (
  provider: AIProviderConfig,
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  const base = trimBase(provider.baseURL);
  const response = await postJson(
    `${base}/api/chat`,
    {
      model: provider.model || provider.models[0],
      messages: withSystem(messages, systemPrompt),
      stream: false,
    },
    {}
  );
  const data = await response.json();
  const content = data?.message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  throw new Error('Ollama 返回了空内容，请确认模型已在服务端拉取。');
};

const WENXIN_ENDPOINTS: Record<string, string> = {
  'ernie-4.0-8k': 'completions_pro',
  'ernie-3.5-8k': 'completions',
  'ernie-speed-128k': 'ernie_speed',
  'ernie-bot-4': 'completions_pro',
  'ernie-bot': 'completions',
  'ernie-bot-turbo': 'eb-instant',
  'ernie-speed': 'ernie_speed',
};

const wenxin = async (
  provider: AIProviderConfig,
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  const [apiKey, secretKey] = provider.apiKey.split(':');
  if (!apiKey || !secretKey) {
    throw new Error('文心一言 Key 格式应为 API_KEY:SECRET_KEY');
  }
  const base = trimBase(provider.baseURL || 'https://aip.baidubce.com');
  const tokenResponse = await request(
    `${base}/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(
      apiKey
    )}&client_secret=${encodeURIComponent(secretKey)}`,
    { method: 'POST' }
  );
  const tokenData = await tokenResponse.json();
  if (!tokenData?.access_token) {
    throw new Error(tokenData?.error_description || '获取文心 access_token 失败');
  }
  const endpoint = WENXIN_ENDPOINTS[provider.model] || 'completions';
  const response = await postJson(
    `${base}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${endpoint}?access_token=${encodeURIComponent(
      tokenData.access_token
    )}`,
    {
      system: systemPrompt,
      messages: messages.filter(message => message.role !== 'system'),
    },
    {}
  );
  const data = await response.json();
  if (typeof data?.result === 'string' && data.result.trim()) return data.result;
  throw new Error(data?.error_msg || '文心一言返回了空内容。');
};

export const sendChat = async (
  provider: AIProviderConfig,
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  if (!provider.apiKey && provider.protocol !== 'ollama') {
    throw new Error('尚未配置 API Key。');
  }
  switch (provider.protocol) {
    case 'openai':
      return openAiCompatible(provider, messages, systemPrompt);
    case 'claude':
      return claude(provider, messages, systemPrompt);
    case 'ollama':
      return ollama(provider, messages, systemPrompt);
    case 'wenxin':
      return wenxin(provider, messages, systemPrompt);
    case 'xinghuo':
      throw new Error('移动端当前版本暂不支持讯飞星火（WebSocket 签名鉴权），请改用其他 Provider。');
    default:
      throw new Error(`不支持的 Provider 协议：${provider.protocol}`);
  }
};

export const listProviderModels = async (provider: AIProviderConfig): Promise<string[]> => {
  const preset = presetById(provider.presetId);
  if (!preset?.supportsModelList) return provider.models.length ? provider.models : [];
  const base = trimBase(provider.baseURL);

  try {
    if (provider.protocol === 'ollama') {
      const response = await request(`${base}/api/tags`, { method: 'GET' });
      const data = await response.json();
      const models = (data?.models || []).map((item: { name?: string }) => item.name).filter(Boolean);
      return models.length ? models : provider.models;
    }

    if (provider.protocol === 'claude') {
      const response = await request(`${base}/models`, {
        method: 'GET',
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      const data = await response.json();
      const models = (data?.data || []).map((item: { id?: string }) => item.id).filter(Boolean);
      return models.length ? models : provider.models;
    }

    const response = await request(`${base}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${provider.apiKey}` },
    });
    const data = await response.json();
    const models = (data?.data || []).map((item: { id?: string }) => item.id).filter(Boolean);
    return models.length ? models : provider.models;
  } catch (error) {
    throw new Error(`模型列表拉取失败：${error instanceof Error ? error.message : String(error)}`);
  }
};
