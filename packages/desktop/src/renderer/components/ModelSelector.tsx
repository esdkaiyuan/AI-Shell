import React, { useEffect, useState } from 'react';
import { appSettings } from '../appSettings';
import { ChevronDownIcon, BotIcon } from './Icons';
import './ModelSelector.css';

interface ProviderOption {
  name: string;
  models: string[];
}

/**
 * AI 提供商 / 模型选择器。
 * 列出已配置提供商及其模型，选择结果写入 appSettings，
 * 供 AIAssistantPanel / AIChat 在调用 ai.chat 时传入。
 */
const ModelSelector: React.FC = () => {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const settings = appSettings.get();
    setSelectedProvider(settings.aiProvider);
    setSelectedModel(settings.aiModel);

    window.electronAPI.ai
      .listProviders()
      .then(list => {
        const options: ProviderOption[] = list.map(p => ({
          name: p.name,
          models: p.models || [],
        }));
        setProviders(options);

        // 校验持久化的选择是否仍有效，失效则回退到第一个可用项
        const current = appSettings.get();
        const provider = options.find(p => p.name === current.aiProvider) || options[0];
        if (provider) {
          const model =
            provider.models.find(m => m === current.aiModel) || provider.models[0] || '';
          setSelectedProvider(provider.name);
          setSelectedModel(model);
          if (provider.name !== current.aiProvider || model !== current.aiModel) {
            appSettings.update({ aiProvider: provider.name, aiModel: model });
          }
        }
      })
      .catch(console.error);
  }, []);

  // 订阅外部（如设置页）修改后的同步
  useEffect(() => {
    return appSettings.subscribe(s => {
      setSelectedProvider(s.aiProvider);
      setSelectedModel(s.aiModel);
    });
  }, []);

  const handleSelect = (providerName: string, model: string) => {
    setSelectedProvider(providerName);
    setSelectedModel(model);
    appSettings.update({ aiProvider: providerName, aiModel: model });
    setOpen(false);
  };

  const label = selectedModel
    ? `${selectedProvider} / ${selectedModel}`
    : selectedProvider || '选择模型';

  if (providers.length === 0) {
    return (
      <div className="model-selector empty" title="尚未配置 AI 提供商，请到设置页添加">
        <BotIcon size={13} />
        <span>未配置模型</span>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <button className="model-selector-trigger" onClick={() => setOpen(!open)} title="切换 AI 模型">
        <span className="model-selector-label">{label}</span>
        <ChevronDownIcon size={12} />
      </button>
      {open && (
        <>
          <div className="model-selector-backdrop" onClick={() => setOpen(false)} />
          <div className="model-selector-menu">
            {providers.map(provider => (
              <div key={provider.name} className="model-selector-group">
                <div className="model-selector-group-label">{provider.name}</div>
                {provider.models.length === 0 ? (
                  <button
                    className={`model-selector-item ${selectedProvider === provider.name ? 'selected' : ''}`}
                    onClick={() => handleSelect(provider.name, '')}
                  >
                    默认模型
                  </button>
                ) : (
                  provider.models.map(model => (
                    <button
                      key={model}
                      className={`model-selector-item ${
                        selectedProvider === provider.name && selectedModel === model ? 'selected' : ''
                      }`}
                      onClick={() => handleSelect(provider.name, model)}
                    >
                      {model}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
