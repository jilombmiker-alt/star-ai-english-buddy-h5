const catalog = [
  {
    id: 'deepseek', name: 'DeepSeek', shortName: 'DS', apiStyle: 'openai-chat',
    baseUrl: 'https://api.deepseek.com',
    summary: '中文理解强、成本友好，适合日常陪伴和学习计划。', region: '中国服务',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', tag: '推荐 · 快速' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', tag: '复杂规划' },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', shortName: 'OA', apiStyle: 'openai-responses',
    baseUrl: 'https://api.openai.com/v1',
    summary: '多语言和视觉能力完整，适合高质量课程导演与复杂反馈。', region: '海外服务',
    models: [
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', tag: '推荐 · 低成本' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', tag: '均衡' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', tag: '高质量' },
    ],
  },
  {
    id: 'anthropic', name: 'Anthropic Claude', shortName: 'CL', apiStyle: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    summary: '对话自然、长文本稳定，适合耐心讲解和故事互动。', region: '海外服务',
    models: [
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', tag: '推荐 · 均衡' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tag: '快速' },
      { id: 'claude-opus-5', name: 'Claude Opus 5', tag: '复杂任务' },
      { id: 'claude-fable-5', name: 'Claude Fable 5', tag: '旗舰' },
    ],
  },
  {
    id: 'google', name: 'Google Gemini', shortName: 'GM', apiStyle: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    summary: '多模态覆盖广，适合后续拍照识物、故事图片和英语任务。', region: '海外服务',
    models: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: '推荐 · 均衡' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: '低成本' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', tag: '复杂推理' },
    ],
  },
  {
    id: 'doubao', name: '豆包 · 火山方舟', shortName: 'DB', apiStyle: 'openai-responses',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    summary: '国内访问方便，适合中文陪伴、课程规划与图片理解。', region: '中国服务',
    models: [
      { id: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite', tag: '推荐 · 快速' },
    ],
  },
  {
    id: 'qwen', name: '阿里云百炼 · 千问', shortName: 'QW', apiStyle: 'openai-chat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    summary: '中文与教育场景丰富，也能在百炼中切换多家第三方模型。', region: '中国服务',
    models: [
      { id: 'qwen3.8-max', name: 'Qwen 3.8 Max', tag: '高质量' },
      { id: 'qwen3.7-plus', name: 'Qwen 3.7 Plus', tag: '推荐 · 均衡' },
      { id: 'qwen3.7-flash', name: 'Qwen 3.7 Flash', tag: '低延迟' },
    ],
  },
  {
    id: 'minimax', name: 'MiniMax', shortName: 'MM', apiStyle: 'openai-chat',
    baseUrl: 'https://api.minimaxi.com/v1',
    summary: '长上下文和角色互动能力突出，适合连续陪伴和情景演绎。', region: '中国服务',
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', tag: '推荐 · 均衡' },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 Highspeed', tag: '低延迟' },
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', tag: '高性价比' },
    ],
  },
  {
    id: 'tencent', name: '腾讯云 TokenHub', shortName: 'HY', apiStyle: 'openai-chat',
    baseUrl: 'https://tokenhub.tencentmaas.com/v1',
    summary: '国内服务，含通用、角色扮演和翻译方向模型。', region: '中国服务',
    models: [
      { id: 'hy3-preview', name: 'Hunyuan HY3 Preview', tag: '推荐 · 通用' },
      { id: 'hunyuan-role-latest', name: 'Hunyuan Role', tag: '情景角色' },
      { id: 'hy-mt2-pro', name: 'Hunyuan Translation', tag: '中英翻译' },
    ],
  },
  {
    id: 'custom', name: 'OpenAI 兼容接口', shortName: 'API', apiStyle: 'openai-chat',
    baseUrl: 'https://api.example.com/v1',
    summary: '用于硅基流动、自建模型或其他兼容 /chat/completions 的服务。', region: '自定义',
    models: [],
  },
];

export const MODEL_PROVIDERS = Object.freeze(catalog.map(provider => Object.freeze({
  ...provider,
  models: Object.freeze(provider.models.map(model => Object.freeze({ ...model }))),
})));

export function publicProviderCatalog() {
  return MODEL_PROVIDERS.map(({ apiStyle, ...provider }) => ({ ...provider, models: provider.models.map(model => ({ ...model })) }));
}

export function providerById(id) {
  return MODEL_PROVIDERS.find(provider => provider.id === id) || null;
}

export function normalizeProviderSlot(input, previous = null) {
  if (!input || typeof input !== 'object') return null;
  const provider = providerById(String(input.providerId || ''));
  if (!provider) throw Object.assign(new Error('请选择有效的模型厂商'), { status: 400 });
  const model = String(input.model || '').trim().slice(0, 120);
  const baseUrl = String(input.baseUrl || provider.baseUrl).trim().replace(/\/$/, '').slice(0, 300);
  const suppliedKey = typeof input.apiKey === 'string' ? input.apiKey.trim().slice(0, 500) : '';
  const apiKey = suppliedKey || (input.keepExistingKey !== false && previous?.providerId === provider.id ? previous.apiKey : '');
  if (!model) throw Object.assign(new Error('请选择或填写模型 ID'), { status: 400 });
  if (!/^https:\/\//i.test(baseUrl) && !/^http:\/\/127\.0\.0\.1(?::\d+)?/i.test(baseUrl)) {
    throw Object.assign(new Error('API 地址必须使用 HTTPS；本机测试可使用 127.0.0.1'), { status: 400 });
  }
  return { providerId: provider.id, model, baseUrl, apiKey };
}

export function publicModelConfig(config) {
  const cleanSlot = slot => slot ? {
    providerId: slot.providerId,
    model: slot.model,
    baseUrl: slot.baseUrl,
    hasKey: Boolean(slot.apiKey),
  } : null;
  return {
    primary: cleanSlot(config.primary),
    fallbackEnabled: Boolean(config.fallbackEnabled && config.fallback),
    fallback: cleanSlot(config.fallback),
    keyExposedToBrowser: false,
    storage: 'local_server_only',
  };
}

function outputTextFromResponses(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  return (payload?.output || []).flatMap(item => item?.content || [])
    .map(part => part?.text || part?.content || '').filter(Boolean).join('');
}

function cleanModelText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error('模型没有返回可读文字');
  return text;
}

async function fetchJson(url, options, providerName) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${providerName} 连接失败（HTTP ${response.status}）`);
  return response.json();
}

export async function completeWithProvider(slot, messages, options = {}) {
  const provider = providerById(slot?.providerId);
  if (!provider || !slot?.apiKey) throw new Error('模型配置或 API Key 不完整');
  const maxTokens = Math.min(800, Math.max(32, Number(options.maxTokens) || 260));
  const system = messages.find(message => message.role === 'system')?.content || '';
  const conversation = messages.filter(message => message.role !== 'system');

  if (provider.apiStyle === 'anthropic') {
    const payload = await fetchJson(`${slot.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': slot.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: slot.model, system, messages: conversation, max_tokens: maxTokens, temperature: options.temperature ?? 0.45 }),
    }, provider.name);
    return cleanModelText((payload.content || []).map(part => part?.text || '').join(''));
  }

  if (provider.apiStyle === 'gemini') {
    const payload = await fetchJson(`${slot.baseUrl}/v1beta/models/${encodeURIComponent(slot.model)}:generateContent?key=${encodeURIComponent(slot.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: conversation.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { temperature: options.temperature ?? 0.45, maxOutputTokens: maxTokens },
      }),
    }, provider.name);
    return cleanModelText((payload.candidates?.[0]?.content?.parts || []).map(part => part?.text || '').join(''));
  }

  if (provider.apiStyle === 'openai-responses') {
    const payload = await fetchJson(`${slot.baseUrl}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slot.apiKey}` },
      body: JSON.stringify({ model: slot.model, instructions: system, input: conversation, max_output_tokens: maxTokens }),
    }, provider.name);
    return cleanModelText(outputTextFromResponses(payload));
  }

  const payload = await fetchJson(`${slot.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slot.apiKey}` },
    body: JSON.stringify({ model: slot.model, messages, temperature: options.temperature ?? 0.45, max_tokens: maxTokens, stream: false }),
  }, provider.name);
  return cleanModelText(payload?.choices?.[0]?.message?.content);
}
