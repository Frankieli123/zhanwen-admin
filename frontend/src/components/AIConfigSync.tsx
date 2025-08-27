import React, { useEffect } from 'react';
import { AIConfigService } from '../services/aiConfigService';

interface AIConfigSyncProps {
  onConfigChange?: () => void;
  children?: React.ReactNode;
}

/**
 * AI配置同步组件
 * 监听AI配置变化并自动刷新相关数据
 */
export const AIConfigSync: React.FC<AIConfigSyncProps> = ({ onConfigChange, children }) => {
  useEffect(() => {
    const handleCacheCleared = () => {
      console.log('AIConfigSync: 检测到AI配置缓存已清除');
      if (onConfigChange) {
        onConfigChange();
      }
    };

    // 监听缓存清除事件
    window.addEventListener('ai-config-cache-cleared', handleCacheCleared);

    return () => {
      window.removeEventListener('ai-config-cache-cleared', handleCacheCleared);
    };
  }, [onConfigChange]);

  return <>{children}</>;
};

/**
 * 使用AI配置同步的Hook
 */
export const useAIConfigSync = (callback?: () => void) => {
  useEffect(() => {
    const handleCacheCleared = () => {
      console.log('useAIConfigSync: AI配置已更新');
      if (callback) {
        callback();
      }
    };

    window.addEventListener('ai-config-cache-cleared', handleCacheCleared);

    return () => {
      window.removeEventListener('ai-config-cache-cleared', handleCacheCleared);
    };
  }, [callback]);

  return {
    forceRefresh: AIConfigService.forceRefresh,
    clearCache: AIConfigService.clearCache,
  };
};

export default AIConfigSync;
