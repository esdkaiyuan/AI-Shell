import React from 'react';
import {
  OpenAIIcon,
  ClaudeIcon,
  BaiduIcon,
  AliyunIcon,
  GLMIcon,
  XinghuoIcon,
  MoonshotIcon,
  DeepseekIcon,
  OllamaIcon,
  BotIcon,
} from './Icons';

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, size = 20, className = '' }) => {
  const iconMap: { [key: string]: React.FC<{ size?: number; className?: string }> } = {
    openai: OpenAIIcon,
    claude: ClaudeIcon,
    wenxin: BaiduIcon,
    tongyi: AliyunIcon,
    glm: GLMIcon,
    xinghuo: XinghuoIcon,
    moonshot: MoonshotIcon,
    deepseek: DeepseekIcon,
    ollama: OllamaIcon,
  };

  const IconComponent = iconMap[provider] || BotIcon;
  return <IconComponent size={size} className={className} />;
};
