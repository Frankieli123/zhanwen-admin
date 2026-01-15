export function normalizeProviderType(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function buildOpenAIChatCompletionsUrl(providerType: string, baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  const full = String(baseUrl).trim();
  if (!full) return full;

  const normalized = full.replace(/\/+$/, '');
  const lower = normalized.toLowerCase();
  const type = normalizeProviderType(providerType);

  if (lower.endsWith('/v1/chat/completions') || lower.endsWith('/chat/completions')) {
    return full;
  }

  if (type === 'deepseek') {
    return `${normalized}/chat/completions`;
  }

  if (lower.endsWith('/v1')) {
    return `${normalized}/chat/completions`;
  }

  return `${normalized}/v1/chat/completions`;
}

export function buildAnthropicMessagesUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  const full = String(baseUrl).trim();
  if (!full) return full;

  const normalized = full.replace(/\/+$/, '');
  const lower = normalized.toLowerCase();

  if (lower.endsWith('/v1/messages') || lower.endsWith('/messages')) {
    return full;
  }

  if (lower.endsWith('/v1')) {
    return `${normalized}/messages`;
  }

  return `${normalized}/v1/messages`;
}

export function normalizeGeminiModelName(modelName: unknown): string {
  if (typeof modelName !== 'string') return '';
  const name = modelName.trim();
  if (!name) return '';
  return name.toLowerCase().startsWith('models/') ? name.slice('models/'.length) : name;
}

export function buildGeminiModelsUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  const full = String(baseUrl).trim();
  if (!full) return full;

  const normalized = full.replace(/\/+$/, '');
  const lower = normalized.toLowerCase();

  if (lower.endsWith('/v1beta/models') || lower.endsWith('/v1/models') || lower.endsWith('/models')) {
    return normalized;
  }

  if (lower.endsWith('/v1beta') || lower.endsWith('/v1')) {
    return `${normalized}/models`;
  }

  return `${normalized}/v1beta/models`;
}

export function buildGeminiGenerateContentUrl(baseUrl: string, modelName: string): string {
  if (!baseUrl) return baseUrl;
  const full = String(baseUrl).trim();
  if (!full) return full;

  if (/:generatecontent/i.test(full)) {
    return full;
  }

  const model = normalizeGeminiModelName(modelName);
  const normalized = full.replace(/\/+$/, '');
  const lower = normalized.toLowerCase();

  if (!model) return normalized;

  if (lower.endsWith('/v1beta/models') || lower.endsWith('/v1/models') || lower.endsWith('/models')) {
    return `${normalized}/${model}:generateContent`;
  }

  if (lower.endsWith('/v1beta') || lower.endsWith('/v1')) {
    return `${normalized}/models/${model}:generateContent`;
  }

  return `${normalized}/v1beta/models/${model}:generateContent`;
}

export function buildModelInvokeApiUrl(providerType: string, baseUrl: string, modelName?: string): string {
  const type = normalizeProviderType(providerType);
  if (type === 'anthropic') return buildAnthropicMessagesUrl(baseUrl);
  if (type === 'gemini') return buildGeminiGenerateContentUrl(baseUrl, String(modelName || ''));
  return buildOpenAIChatCompletionsUrl(type, baseUrl);
}
