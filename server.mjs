import http from 'node:http';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  completeWithProvider,
  normalizeProviderSlot,
  providerById,
  publicModelConfig,
  publicProviderCatalog,
} from './model-providers.mjs';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const defaultPort = Number(process.env.STAR_H5_PORT || 4190);
const defaultHost = process.env.STAR_H5_HOST || '127.0.0.1';
const defaultBackendOrigin = process.env.STAR_BACKEND_ORIGIN || 'http://127.0.0.1:4186';
const defaultDataDir = process.env.STAR_DATA_DIR || join(currentDir, 'data');
const appBase = '/app/app_17d01nvsc9f';
const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

const pointRules = { knowledge: 2, section: 8, chapter: 20 };
const sectionRequirements = {
  words_section: { all: ['word_cat', 'word_dog', 'word_bird'] },
  reading_section: { all: ['story_core_flow', 'story_core_meaning'] },
  roleplay_section: { any: ['role_greeting', 'role_friend'] },
  forest_challenge_section: { all: ['challenge_q1', 'challenge_q2', 'challenge_q3'] },
};
const contentLabels = {
  word_cat: '单词 cat', word_dog: '单词 dog', word_bird: '单词 bird',
  story_line_1: '故事第 1 句', story_line_2: '故事第 2 句', story_line_3: '故事第 3 句',
  role_greeting: '情景对话回应', role_friend: '情景对话回应',
  story_core_flow: '核心句听读背', story_core_meaning: '核心句意思理解',
  challenge_q1: '挑战题 1', challenge_q2: '挑战题 2', challenge_q3: '挑战题 3',
  plan_listen: '旧版计划：听故事', plan_words: '旧版计划：认识单词', plan_speak: '旧版计划：开口表达',
};
const allowedEvents = new Set([
  'session_started', 'prompt_selected', 'ai_question_submitted', 'ai_reply_received',
  'level_selected', 'lesson_opened', 'check_in', 'knowledge_completed',
  'section_completed', 'chapter_completed', 'bypass_changed', 'reward_created',
  'reward_redeemed', 'ai_backend_request', 'practice_attempt', 'demo_advance',
  'speaking_assist', 'model_config_saved', 'model_connection_tested',
]);
const allowedContextKeys = new Set([
  'mode', 'source', 'outcome', 'durationMs', 'inputLength', 'levelId', 'contentId',
  'contentLabel', 'scope', 'provider', 'voiceAvailable', 'awarded', 'model', 'screen',
]);

function initialState() {
  return {
    version: 1,
    profile: { points: 0, streak: 0, lastCheckIn: null },
    settings: { bypassTests: false },
    progress: { unlockedLevel: 1, completedLevels: [], completions: [] },
    rewards: [],
    redemptions: [],
  };
}

function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function dayNumber(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request, limit = 16_000) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > limit) throw Object.assign(new Error('request too large'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('invalid json'), { status: 400 }); }
}

function publicState(state) {
  return { ...state, today: dayKey() };
}

function sanitizeContext(input) {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(Object.entries(input)
    .filter(([key, value]) => allowedContextKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 80) : value]));
}

function cleanSentence(value, fallback, maxLength = 180) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function localSpeakingAssist(mode, heardText) {
  if (mode === 'cn_to_en') {
    const examples = [
      [/朋友|交朋友/, ['I want to be your friend.', 'Can we be friends?', '“Can we be friends?” 更像小朋友自然地问“我们可以做朋友吗？”']],
      [/恐龙/, ['I want to play with the dinosaur.', 'Can I play with the dinosaur?', '想礼貌地问“我可以……吗”，可以用 “Can I…?”。']],
      [/小鸟|鸟/, ['I like this little bird.', 'This little bird is so cute!', '“cute” 是“可爱的”，可以用来夸这只小鸟。']],
      [/猫|小猫/, ['I like the little cat.', 'The little cat is so cute!', '“little cat” 是“小猫”，“so cute” 是“太可爱了”。']],
    ];
    const match = examples.find(([pattern]) => pattern.test(heardText));
    const [simpleEnglish, naturalEnglish, childFriendlyExplanation] = match?.[1] || [
      'Can you help me say this in English?',
      'How can I say this in English?',
      '星星暂时没有连上云端。你可以先用这句话请星星帮忙，课程不会被卡住。',
    ];
    return {
      mode, heardText, simpleEnglish, naturalEnglish, childFriendlyExplanation,
      tryAgainText: naturalEnglish, nextAction: 'retry', source: 'local_fallback',
      completionEligible: false, awardsPoints: false,
    };
  }

  const normalized = heardText.replace(/[.!?]+$/, '').trim();
  let corrected = normalized;
  let explanation = '这句话已经能听懂。星星帮你整理了大小写和结尾，再完整说一次就更自然。';
  if (/\bi go to school yesterday\b/i.test(normalized)) {
    corrected = normalized.replace(/\bi go to school yesterday\b/i, 'I went to school yesterday');
    explanation = '有 yesterday 时，要把 go 变成过去式 went。';
  } else if (/\bi am like\b/i.test(normalized)) {
    corrected = normalized.replace(/\bi am like\b/i, 'I like');
    explanation = '表达“我喜欢”直接说 “I like…”，中间不用 am。';
  } else if (/^my name\s+/i.test(normalized) && !/^my name is\b/i.test(normalized)) {
    corrected = normalized.replace(/^my name\s+/i, 'My name is ');
    explanation = '介绍名字时，用完整句型 “My name is…”。';
  }
  corrected = `${corrected.charAt(0).toUpperCase()}${corrected.slice(1)}`.trim();
  if (corrected && !/[.!?]$/.test(corrected)) corrected += '.';
  return {
    mode, heardText, simpleEnglish: corrected || 'Hello, Star!', naturalEnglish: corrected || 'Hello, Star!',
    childFriendlyExplanation: explanation, tryAgainText: corrected || 'Hello, Star!', nextAction: 'retry',
    source: 'local_fallback', completionEligible: false, awardsPoints: false,
  };
}

export async function createStarServer(options = {}) {
  const backendOrigin = options.backendOrigin || defaultBackendOrigin;
  const dataDir = options.dataDir || defaultDataDir;
  const statePath = join(dataDir, 'state.json');
  const eventsPath = join(dataDir, 'events.jsonl');
  const modelConfigPath = join(dataDir, 'model-config.json');
  const apiKey = options.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY ?? '';
  const configuredDeepseekBaseUrl = (options.deepseekBaseUrl || deepseekBaseUrl).replace(/\/$/, '');
  const configuredDeepseekModel = options.deepseekModel || deepseekModel;
  await mkdir(dataDir, { recursive: true });

  let modelConfig;
  try { modelConfig = JSON.parse(await readFile(modelConfigPath, 'utf8')); }
  catch {
    modelConfig = {
      primary: apiKey ? {
        providerId: 'deepseek', model: configuredDeepseekModel,
        baseUrl: configuredDeepseekBaseUrl, apiKey,
      } : null,
      fallbackEnabled: false,
      fallback: null,
    };
  }

  async function saveModelConfig() {
    const temporary = `${modelConfigPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(modelConfig, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, modelConfigPath);
  }

  let state;
  try { state = JSON.parse(await readFile(statePath, 'utf8')); }
  catch { state = initialState(); await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 }); }
  let mutationQueue = Promise.resolve();

  async function saveState() {
    const temporary = `${statePath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, statePath);
  }

  function mutate(mutator) {
    const task = mutationQueue.then(async () => {
      const result = await mutator(state);
      await saveState();
      return result;
    });
    mutationQueue = task.catch(() => {});
    return task;
  }

  async function recordEvent(type, context = {}, sessionId = 'server') {
    if (!allowedEvents.has(type)) return;
    const event = {
      at: new Date().toISOString(), type, sessionId: String(sessionId || 'anonymous').slice(0, 64),
      context: sanitizeContext(context),
    };
    await appendFile(eventsPath, `${JSON.stringify(event)}\n`, { mode: 0o600 });
  }

  async function readEvents() {
    try { return (await readFile(eventsPath, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)); }
    catch { return []; }
  }

  function eventInRange(event, range) {
    const eventDay = dayKey(new Date(event.at));
    const today = dayKey();
    if (range === 'today') return eventDay === today;
    if (range === 'month') return eventDay.slice(0, 7) === today.slice(0, 7);
    const todayNumber = dayNumber(today);
    const utcDay = new Date(todayNumber * 86_400_000).getUTCDay();
    const mondayNumber = todayNumber - ((utcDay + 6) % 7);
    return dayNumber(eventDay) >= mondayNumber && dayNumber(eventDay) <= todayNumber;
  }

  async function learningSummary(range) {
    const safeRange = ['today', 'week', 'month'].includes(range) ? range : 'today';
    const events = (await readEvents()).filter(event => eventInRange(event, safeRange));
    const practices = events.filter(event => event.type === 'practice_attempt' && event.context?.contentId);
    const completions = events.filter(event => ['knowledge_completed', 'section_completed', 'chapter_completed'].includes(event.type));
    const content = new Map();
    for (const event of practices) {
      const id = event.context.contentId;
      const item = content.get(id) || { id, label: event.context.contentLabel || contentLabels[id] || id, attempts: 0, completed: false, awarded: 0 };
      item.attempts += 1;
      if (event.context.contentLabel) item.label = event.context.contentLabel;
      content.set(id, item);
    }
    for (const event of completions) {
      if (event.type !== 'knowledge_completed') continue;
      const id = event.context?.contentId;
      if (!id) continue;
      const item = content.get(id) || { id, label: event.context.contentLabel || contentLabels[id] || id, attempts: 0, completed: false, awarded: 0 };
      item.completed = true;
      item.awarded += Number(event.context.awarded) || 0;
      if (event.context.contentLabel) item.label = event.context.contentLabel;
      content.set(id, item);
    }
    const pointsEarned = events
      .filter(event => ['knowledge_completed', 'section_completed', 'chapter_completed', 'check_in'].includes(event.type))
      .reduce((sum, event) => sum + (Number(event.context?.awarded) || 0), 0);
    return {
      range: safeRange,
      rangeLabel: { today: '今日学习', week: '这周学习', month: '本月学习' }[safeRange],
      uniqueContent: new Set(practices.map(event => event.context.contentId)).size,
      practiceAttempts: practices.length,
      repeatAttempts: Math.max(0, practices.length - new Set(practices.map(event => event.context.contentId)).size),
      pointsEarned,
      chaptersCompleted: completions.filter(event => event.type === 'chapter_completed').length,
      details: [...content.values()].sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label, 'zh-CN')),
    };
  }

  async function getCsrfSession() {
    const pageResponse = await fetch(`${backendOrigin}${appBase}/home`, { signal: AbortSignal.timeout(5000) });
    if (!pageResponse.ok) throw new Error(`backend page returned ${pageResponse.status}`);
    const html = await pageResponse.text();
    const token = html.match(/window\.csrfToken\s*=\s*"([^"]+)"/)?.[1];
    if (!token) throw new Error('csrf token missing');
    return { token, cookie: `suda-csrf-token=${token}` };
  }

  function lessonContext(mode) {
    if (mode === 'companion') {
      return '你是6到12岁儿童的温柔双语伙伴“星星”。这是日常英语对话和情感陪伴，不是课程完成环节。先用一句小学水平的简单英语回应，再用温柔中文接住孩子的情绪或兴趣，最后只问一个轻松的小问题继续对话。不要诊断心理问题，不要索取姓名、学校、电话、地址，不要声称完成任务或发放积分；遇到伤害自己或他人的表达，要建议立刻告诉身边可信任的大人。';
    }
    const action = { plan: '今日学习计划', reading: '听读背与理解', words: '认识三个动物单词', roleplay: '英语情景演绎', challenge: '萌芽之森挑战' }[mode] || '今日学习计划';
    return `你是6到12岁儿童的温柔英语伙伴“星星”。孩子正在本地H5课程，当前任务是“${action}”。第一行用小学水平的简单英语，第二行用温柔中文解释，第三行必须以“下一步：”开头并引导点击H5内的“开始这个任务”。不要索取姓名、学校、电话、地址，不要泄露答案，不要让自由对话替代课程状态。`;
  }

  function availableModelSlots() {
    const slots = [];
    if (modelConfig.primary?.apiKey) slots.push({ name: 'primary', slot: modelConfig.primary });
    if (modelConfig.fallbackEnabled && modelConfig.fallback?.apiKey) slots.push({ name: 'fallback', slot: modelConfig.fallback });
    return slots;
  }

  async function completeWithFallback(messages, options = {}) {
    const attempts = availableModelSlots();
    if (!attempts.length) throw new Error('还没有配置可用的大模型');
    let lastError;
    for (const attempt of attempts) {
      const startedAt = Date.now();
      try {
        const text = await completeWithProvider(attempt.slot, messages, options);
        await recordEvent('ai_backend_request', {
          provider: attempt.slot.providerId, model: attempt.slot.model, mode: options.mode || 'companion',
          outcome: attempt.name === 'fallback' ? 'fallback_success' : 'success',
          durationMs: Date.now() - startedAt, inputLength: options.inputLength || 0,
        });
        return { text, slot: attempt.slot, fallbackUsed: attempt.name === 'fallback' };
      } catch (error) {
        lastError = error;
        await recordEvent('ai_backend_request', {
          provider: attempt.slot.providerId, model: attempt.slot.model, mode: options.mode || 'companion',
          outcome: 'failed', durationMs: Date.now() - startedAt, inputLength: options.inputLength || 0,
        });
      }
    }
    throw lastError || new Error('所有模型都暂时不可用');
  }

  async function streamConfiguredModel(question, mode, response) {
    const result = await completeWithFallback([
      { role: 'system', content: lessonContext(mode) },
      { role: 'user', content: question },
    ], { mode, inputLength: question.length, maxTokens: 260, temperature: 0.5 });
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
    response.write(`data: ${JSON.stringify({ data: { delta: { content: result.text } }, meta: { provider: result.slot.providerId, model: result.slot.model, fallbackUsed: result.fallbackUsed } })}\n\n`);
    response.end();
  }

  async function streamExistingCloud(question, mode, response) {
    const session = await getCsrfSession();
    const upstream = await fetch(`${backendOrigin}${appBase}/api/capability/star-open-conversation/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: session.cookie, 'X-Suda-Csrf-Token': session.token },
      body: JSON.stringify({ action: 'textGenerate', params: { child_message: question, lesson_context: lessonContext(mode) } }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok || !upstream.body) throw new Error(`backend AI returned ${upstream.status}`);
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
    for await (const chunk of upstream.body) response.write(chunk);
    response.end();
  }

  async function streamAi(request, response) {
    const input = await readJson(request);
    const question = typeof input.question === 'string' ? input.question.trim().slice(0, 160) : '';
    const mode = ['companion', 'plan', 'reading', 'words', 'roleplay', 'challenge'].includes(input.mode) ? input.mode : 'companion';
    if (!question) return sendJson(response, 400, { error: 'question required' });
    try {
      if (availableModelSlots().length) await streamConfiguredModel(question, mode, response);
      else await streamExistingCloud(question, mode, response);
    } catch (error) {
      if (!response.headersSent) sendJson(response, 503, { error: 'cloud AI unavailable', detail: error.message });
      else response.end();
    }
  }

  async function cloudSpeakingAssist(mode, heardText) {
    const task = mode === 'cn_to_en'
      ? '孩子用中文表达了想法。给出一条小学水平的直接英语和一条更自然但同样简单的英语。'
      : '孩子说了一句英语。温柔纠正必要的语法或用词；如果本来正确，就只做轻微自然化，不要制造错误。';
    const result = await completeWithFallback([
      { role: 'system', content: `你是6到12岁儿童的温柔英语伙伴“星星”。${task}只返回JSON对象，字段必须是 simpleEnglish、naturalEnglish、childFriendlyExplanation、tryAgainText、nextAction。英语不超过小学水平；中文解释不超过45字；nextAction只能是retry或continue。不要索取隐私，不要声称完成课程，不要发积分。` },
      { role: 'user', content: heardText },
    ], { mode: 'speaking_assist', inputLength: heardText.length, maxTokens: 320, temperature: 0.3 });
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    const fallback = localSpeakingAssist(mode, heardText);
    return {
      mode,
      heardText,
      simpleEnglish: cleanSentence(parsed.simpleEnglish, fallback.simpleEnglish),
      naturalEnglish: cleanSentence(parsed.naturalEnglish, fallback.naturalEnglish),
      childFriendlyExplanation: cleanSentence(parsed.childFriendlyExplanation, fallback.childFriendlyExplanation, 100),
      tryAgainText: cleanSentence(parsed.tryAgainText, fallback.tryAgainText),
      nextAction: ['retry', 'continue'].includes(parsed.nextAction) ? parsed.nextAction : 'retry',
      source: result.slot.providerId, model: result.slot.model, fallbackUsed: result.fallbackUsed,
      completionEligible: false, awardsPoints: false,
    };
  }

  async function speakingAssist(request, response) {
    const input = await readJson(request);
    const mode = ['cn_to_en', 'en_feedback'].includes(input.mode) ? input.mode : null;
    const heardText = typeof input.text === 'string' ? input.text.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    if (!mode || !heardText) return sendJson(response, 400, { error: '请选择帮助方式并录入或输入一句话' });
    const startedAt = Date.now();
    let result;
    try {
      result = availableModelSlots().length ? await cloudSpeakingAssist(mode, heardText) : localSpeakingAssist(mode, heardText);
    } catch {
      result = localSpeakingAssist(mode, heardText);
    }
    await recordEvent('speaking_assist', {
      mode, source: result.source, outcome: result.source === 'local_fallback' ? 'local_fallback' : 'cloud',
      inputLength: heardText.length, durationMs: Date.now() - startedAt,
    });
    return sendJson(response, 200, result);
  }

  async function metrics() {
    const events = await readEvents();
    const count = type => events.filter(event => event.type === type).length;
    const aiEvents = events.filter(event => event.type === 'ai_reply_received');
    const durations = aiEvents.map(event => Number(event.context?.durationMs)).filter(Number.isFinite);
    return {
      generatedAt: new Date().toISOString(),
      funnel: {
        sessions: count('session_started'), aiQuestions: count('ai_question_submitted'), lessonsOpened: count('lesson_opened'), practiceAttempts: count('practice_attempt'),
        knowledgeCompleted: count('knowledge_completed'), chaptersCompleted: count('chapter_completed'), checkIns: count('check_in'), rewardsRedeemed: count('reward_redeemed'),
      },
      ai: {
        success: aiEvents.filter(event => event.context?.outcome === 'cloud').length,
        fallback: aiEvents.filter(event => event.context?.outcome === 'local_fallback').length,
        averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      },
      privacy: { rawAudioStored: false, rawConversationStoredInAnalytics: false, personalProfileRequired: false },
    };
  }

  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        const primary = availableModelSlots()[0]?.slot;
        if (primary) return sendJson(response, 200, { ok: true, cloudAdapter: true, provider: primary.providerId, model: primary.model, configuredFallback: availableModelSlots().length > 1 });
        try {
          const backend = await fetch(`${backendOrigin}${appBase}/home`, { signal: AbortSignal.timeout(3000) });
          return sendJson(response, backend.ok ? 200 : 503, { ok: backend.ok, cloudAdapter: backend.ok, provider: 'existing_cloud' });
        } catch { return sendJson(response, 503, { ok: false, cloudAdapter: false, provider: 'local_fallback' }); }
      }
      if (request.method === 'GET' && url.pathname === '/api/config/status') return sendJson(response, 200, { ...publicModelConfig(modelConfig), credentialsExposedToBrowser: false });
      if (request.method === 'GET' && url.pathname === '/api/model/catalog') return sendJson(response, 200, { providers: publicProviderCatalog(), customModelAllowed: true });
      if (request.method === 'GET' && url.pathname === '/api/model/config') return sendJson(response, 200, publicModelConfig(modelConfig));
      if (request.method === 'POST' && url.pathname === '/api/model/config') {
        const input = await readJson(request);
        const previous = modelConfig;
        const primary = normalizeProviderSlot(input.primary, previous.primary);
        const fallbackEnabled = input.fallbackEnabled === true;
        const fallback = fallbackEnabled ? normalizeProviderSlot(input.fallback, previous.fallback) : null;
        modelConfig = { primary, fallbackEnabled, fallback };
        await saveModelConfig();
        await recordEvent('model_config_saved', { provider: primary.providerId, model: primary.model, outcome: fallbackEnabled ? 'with_fallback' : 'primary_only' });
        return sendJson(response, 200, { config: publicModelConfig(modelConfig), message: '配置已安全保存在本机服务端' });
      }
      if (request.method === 'POST' && url.pathname === '/api/model/test') {
        const input = await readJson(request);
        const slotName = input.slot === 'fallback' ? 'fallback' : 'primary';
        const slot = slotName === 'fallback' && modelConfig.fallbackEnabled ? modelConfig.fallback : modelConfig.primary;
        if (!slot?.apiKey) return sendJson(response, 400, { error: `${slotName === 'fallback' ? '备用' : '主'}模型还没有保存 API Key` });
        const startedAt = Date.now();
        try {
          await completeWithProvider(slot, [
            { role: 'system', content: '你是儿童英语学习服务的连接检测助手。' },
            { role: 'user', content: '只回复 OK' },
          ], { maxTokens: 16, temperature: 0 });
          const durationMs = Date.now() - startedAt;
          await recordEvent('model_connection_tested', { provider: slot.providerId, model: slot.model, outcome: 'success', durationMs });
          return sendJson(response, 200, { ok: true, provider: providerById(slot.providerId)?.name || slot.providerId, model: slot.model, durationMs });
        } catch (error) {
          await recordEvent('model_connection_tested', { provider: slot.providerId, model: slot.model, outcome: 'failed', durationMs: Date.now() - startedAt });
          return sendJson(response, 502, { error: error.message });
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/voice/status') return sendJson(response, 200, { provider: 'browser_default_female', configured: true, voiceName: '默认女生', credentialsExposedToBrowser: false });
      if (request.method === 'GET' && url.pathname === '/api/state') return sendJson(response, 200, publicState(state));
      if (request.method === 'GET' && url.pathname === '/api/metrics') return sendJson(response, 200, await metrics());
      if (request.method === 'GET' && url.pathname === '/api/summary') return sendJson(response, 200, await learningSummary(url.searchParams.get('range')));
      if (request.method === 'POST' && url.pathname === '/api/star') return await streamAi(request, response);
      if (request.method === 'POST' && url.pathname === '/api/speaking-assist') return await speakingAssist(request, response);
      if (request.method === 'POST' && url.pathname === '/api/events') {
        const input = await readJson(request);
        if (!allowedEvents.has(input.type)) return sendJson(response, 400, { error: 'event type not allowed' });
        await recordEvent(input.type, input.context, input.sessionId);
        return sendJson(response, 202, { accepted: true });
      }
      if (request.method === 'POST' && url.pathname === '/api/check-in') {
        const result = await mutate(async draft => {
          const today = dayKey();
          if (draft.profile.lastCheckIn === today) return { awarded: 0, alreadyChecked: true };
          const previous = draft.profile.lastCheckIn;
          draft.profile.streak = previous && dayNumber(today) - dayNumber(previous) === 1 ? draft.profile.streak + 1 : 1;
          draft.profile.lastCheckIn = today;
          draft.profile.points += 5;
          return { awarded: 5, alreadyChecked: false };
        });
        await recordEvent('check_in', { awarded: result.awarded });
        return sendJson(response, 200, { ...result, state: publicState(state) });
      }
      if (request.method === 'POST' && url.pathname === '/api/settings/bypass') {
        const input = await readJson(request);
        if (typeof input.enabled !== 'boolean') return sendJson(response, 400, { error: 'enabled must be boolean' });
        await mutate(async draft => { draft.settings.bypassTests = input.enabled; });
        await recordEvent('bypass_changed', { outcome: input.enabled ? 'enabled' : 'disabled' });
        return sendJson(response, 200, { state: publicState(state) });
      }
      if (request.method === 'POST' && url.pathname === '/api/progress/complete') {
        const input = await readJson(request);
        const scope = ['knowledge', 'section', 'chapter'].includes(input.scope) ? input.scope : null;
        const levelId = /^l[1-6]$/.test(input.levelId) ? input.levelId : null;
        const contentId = typeof input.contentId === 'string' ? input.contentId.trim().slice(0, 60) : '';
        const contentLabel = typeof input.contentLabel === 'string' ? input.contentLabel.trim().slice(0, 60) : contentId;
        if (!scope || !levelId || !contentId) return sendJson(response, 400, { error: 'valid scope, levelId and contentId required' });
        const levelNumber = Number(levelId.slice(1));
        if (levelNumber > state.progress.unlockedLevel) return sendJson(response, 409, { error: '免测试预览不能产生掌握记录或积分' });
        if (scope === 'section') {
          const requirement = sectionRequirements[contentId];
          if (!requirement) return sendJson(response, 409, { error: '这个板块没有可验证的完成规则' });
          const learned = new Set(state.progress.completions.filter(item => item.levelId === levelId && item.scope === 'knowledge').map(item => item.contentId));
          const passed = requirement.all ? requirement.all.every(id => learned.has(id)) : requirement.any.some(id => learned.has(id));
          if (!passed) return sendJson(response, 409, { error: '请先完成板块中的真实学习校验' });
        }
        if (scope === 'chapter') {
          const hasPassedSection = state.progress.completions.some(item => item.levelId === levelId && item.scope === 'section');
          if (!hasPassedSection) return sendJson(response, 409, { error: '请先通过至少一个真实学习板块' });
        }
        const completionKey = `${levelId}:${scope}:${contentId}`;
        const result = await mutate(async draft => {
          if (draft.progress.completions.some(item => item.key === completionKey)) return { awarded: 0, alreadyCompleted: true };
          const awarded = pointRules[scope];
          draft.progress.completions.push({ key: completionKey, levelId, scope, contentId, contentLabel, completedAt: new Date().toISOString(), awarded });
          draft.profile.points += awarded;
          if (scope === 'chapter') {
            if (!draft.progress.completedLevels.includes(levelId)) draft.progress.completedLevels.push(levelId);
            draft.progress.unlockedLevel = Math.min(6, Math.max(draft.progress.unlockedLevel, levelNumber + 1));
          }
          return { awarded, alreadyCompleted: false };
        });
        if (!result.alreadyCompleted) await recordEvent(`${scope}_completed`, { scope, levelId, contentId, contentLabel, awarded: result.awarded });
        return sendJson(response, 200, { ...result, state: publicState(state) });
      }
      if (request.method === 'POST' && url.pathname === '/api/rewards') {
        const input = await readJson(request);
        const name = typeof input.name === 'string' ? input.name.trim().slice(0, 40) : '';
        const cost = Number(input.cost);
        if (!name || !Number.isInteger(cost) || cost < 1 || cost > 10_000) return sendJson(response, 400, { error: '请填写 1 到 10000 的整数积分和奖品名称' });
        const reward = { id: crypto.randomUUID(), name, cost, createdAt: new Date().toISOString() };
        await mutate(async draft => { draft.rewards.push(reward); });
        await recordEvent('reward_created', { awarded: cost });
        return sendJson(response, 201, { reward, state: publicState(state) });
      }
      if (request.method === 'POST' && url.pathname === '/api/rewards/redeem') {
        const input = await readJson(request);
        const redemption = await mutate(async draft => {
          const reward = draft.rewards.find(item => item.id === input.rewardId);
          if (!reward) throw Object.assign(new Error('奖品不存在'), { status: 404 });
          if (draft.profile.points < reward.cost) throw Object.assign(new Error('积分还不够'), { status: 409 });
          const record = { id: crypto.randomUUID(), rewardId: reward.id, name: reward.name, cost: reward.cost, redeemedAt: new Date().toISOString(), status: 'waiting_for_parent' };
          draft.profile.points -= reward.cost;
          draft.redemptions.push(record);
          return record;
        });
        await recordEvent('reward_redeemed', { awarded: redemption.cost });
        return sendJson(response, 200, { redemption, state: publicState(state) });
      }
      if (request.method === 'GET' && files.has(url.pathname)) {
        const [name, contentType] = files.get(url.pathname);
        const contents = await readFile(join(currentDir, name));
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        response.end(contents);
        return;
      }
      sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status || 500, { error: error.message || 'server error' });
      else response.end();
    }
  });
}

export async function startServer(options = {}) {
  const host = options.host || defaultHost;
  const port = options.port ?? defaultPort;
  const server = await createStarServer(options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  console.log(`Star H5 preview: http://${host}:${address.port}`);
  console.log(`AI provider: configurable model center${process.env.DEEPSEEK_API_KEY ? ` (legacy default ${deepseekModel})` : ''}`);
  console.log('Voice provider: browser default female voice');
  return server;
}

if (process.argv[1] === currentFile) await startServer();
