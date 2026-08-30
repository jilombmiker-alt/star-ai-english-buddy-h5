import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStarServer } from './server.mjs';

async function start(options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'star-h5-test-'));
  const server = await createStarServer({ dataDir, backendOrigin: 'http://127.0.0.1:9', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin, dataDir,
    close: async () => {
      await new Promise(resolve => server.close(resolve));
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function json(origin, path, method = 'GET', body) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

test('签到只发放一次，成长状态持久化', async () => {
  const app = await start();
  try {
    const first = await json(app.origin, '/api/check-in', 'POST', {});
    const second = await json(app.origin, '/api/check-in', 'POST', {});
    assert.equal(first.body.awarded, 5);
    assert.equal(second.body.awarded, 0);
    assert.equal(second.body.state.profile.points, 5);
    assert.equal(second.body.state.profile.streak, 1);
  } finally { await app.close(); }
});

test('知识点、板块、章节积分不可重复领取并按顺序解锁', async () => {
  const app = await start();
  try {
    const knowledge = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_cat' });
    const duplicate = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_cat' });
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_dog' });
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_bird' });
    const section = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'words_section' });
    const chapter = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'chapter', levelId: 'l1', contentId: 'l1' });
    assert.equal(knowledge.body.awarded, 2);
    assert.equal(duplicate.body.awarded, 0);
    assert.equal(section.body.awarded, 8);
    assert.equal(chapter.body.awarded, 20);
    assert.equal(chapter.body.state.profile.points, 34);
    assert.equal(chapter.body.state.progress.unlockedLevel, 2);
  } finally { await app.close(); }
});

test('免测试只允许预览，锁定关卡不能产生积分', async () => {
  const app = await start();
  try {
    const setting = await json(app.origin, '/api/settings/bypass', 'POST', { enabled: true });
    const previewAward = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'chapter', levelId: 'l6', contentId: 'l6' });
    assert.equal(setting.body.state.settings.bypassTests, true);
    assert.equal(previewAward.status, 409);
    const state = await json(app.origin, '/api/state');
    assert.equal(state.body.profile.points, 0);
    assert.deepEqual(state.body.progress.completedLevels, []);
  } finally { await app.close(); }
});

test('不能绕过学习证据直接完成板块或章节', async () => {
  const app = await start();
  try {
    const section = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'words_section' });
    const chapter = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'chapter', levelId: 'l1', contentId: 'l1' });
    assert.equal(section.status, 409);
    assert.equal(chapter.status, 409);
    const state = await json(app.origin, '/api/state');
    assert.equal(state.body.profile.points, 0);
  } finally { await app.close(); }
});

test('听读背任务必须同时具备完整练习与意思理解证据', async () => {
  const app = await start();
  try {
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'story_core_flow' });
    const tooEarly = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'reading_section' });
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'story_core_meaning' });
    const passed = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'reading_section' });
    assert.equal(tooEarly.status, 409);
    assert.equal(passed.status, 200);
    assert.equal(passed.body.awarded, 8);
  } finally { await app.close(); }
});

test('森林挑战三题全部完成后才能通过挑战节点', async () => {
  const app = await start();
  try {
    for (const id of ['challenge_q1', 'challenge_q2']) {
      await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: id });
    }
    const tooEarly = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'forest_challenge_section' });
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'challenge_q3' });
    const passed = await json(app.origin, '/api/progress/complete', 'POST', { scope: 'section', levelId: 'l1', contentId: 'forest_challenge_section' });
    assert.equal(tooEarly.status, 409);
    assert.equal(passed.status, 200);
  } finally { await app.close(); }
});

test('家长奖品可创建，余额不足时不能兑换', async () => {
  const app = await start();
  try {
    const created = await json(app.origin, '/api/rewards', 'POST', { name: '一起去公园', cost: 20 });
    const redeemed = await json(app.origin, '/api/rewards/redeem', 'POST', { rewardId: created.body.reward.id });
    assert.equal(created.status, 201);
    assert.equal(redeemed.status, 409);
    assert.equal(redeemed.body.error, '积分还不够');
  } finally { await app.close(); }
});

test('监控只保留白名单字段，不记录原始对话和隐私字段', async () => {
  const app = await start();
  try {
    await json(app.origin, '/api/events', 'POST', {
      type: 'ai_question_submitted', sessionId: 'anonymous-test',
      context: { mode: 'words', inputLength: 8, rawText: '孩子的真实姓名', school: '某学校' },
    });
    const events = await readFile(join(app.dataDir, 'events.jsonl'), 'utf8');
    assert.match(events, /"mode":"words"/);
    assert.doesNotMatch(events, /真实姓名|某学校|rawText|school/);
    const metrics = await json(app.origin, '/api/metrics');
    assert.equal(metrics.body.funnel.aiQuestions, 1);
    assert.equal(metrics.body.privacy.rawAudioStored, false);
  } finally { await app.close(); }
});

test('学习总结区分唯一内容、总练习和重复练习，完成积分只记一次', async () => {
  const app = await start();
  try {
    for (const outcome of ['incorrect', 'listened', 'correct']) {
      await json(app.origin, '/api/events', 'POST', {
        type: 'practice_attempt', sessionId: 'summary-test',
        context: { levelId: 'l1', mode: 'words', contentId: 'word_cat', contentLabel: '单词 cat', outcome },
      });
    }
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_cat', contentLabel: '单词 cat' });
    await json(app.origin, '/api/progress/complete', 'POST', { scope: 'knowledge', levelId: 'l1', contentId: 'word_cat', contentLabel: '单词 cat' });
    const summary = await json(app.origin, '/api/summary?range=today');
    assert.equal(summary.body.uniqueContent, 1);
    assert.equal(summary.body.practiceAttempts, 3);
    assert.equal(summary.body.repeatAttempts, 2);
    assert.equal(summary.body.pointsEarned, 2);
    assert.equal(summary.body.details[0].completed, true);
    assert.equal(summary.body.details[0].attempts, 3);
  } finally { await app.close(); }
});

test('AI 表达救援在无云端时可降级，且不能完成课程或发积分', async () => {
  const app = await start();
  try {
    const before = await json(app.origin, '/api/state');
    const chinese = await json(app.origin, '/api/speaking-assist', 'POST', { mode: 'cn_to_en', text: '我想和你做朋友' });
    const english = await json(app.origin, '/api/speaking-assist', 'POST', { mode: 'en_feedback', text: 'I go to school yesterday' });
    const after = await json(app.origin, '/api/state');
    assert.equal(chinese.status, 200);
    assert.equal(chinese.body.naturalEnglish, 'Can we be friends?');
    assert.equal(chinese.body.source, 'local_fallback');
    assert.equal(chinese.body.completionEligible, false);
    assert.equal(english.body.simpleEnglish, 'I went to school yesterday.');
    assert.equal(after.body.profile.points, before.body.profile.points);
    assert.deepEqual(after.body.progress.completions, before.body.progress.completions);
    const events = await readFile(join(app.dataDir, 'events.jsonl'), 'utf8');
    assert.doesNotMatch(events, /我想和你做朋友|I go to school yesterday/);
  } finally { await app.close(); }
});

test('AI 表达救援使用后端 DeepSeek 结构化结果且不暴露 key', async () => {
  const mock = http.createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer assist-secret');
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    assert.equal(input.stream, false);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      simpleEnglish: 'I like this bird.', naturalEnglish: 'This little bird is so cute!',
      childFriendlyExplanation: 'cute 是可爱的。', tryAgainText: 'This little bird is so cute!', nextAction: 'retry',
    }) } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const app = await start({ deepseekApiKey: 'assist-secret', deepseekBaseUrl: `http://127.0.0.1:${mock.address().port}` });
  try {
    const response = await json(app.origin, '/api/speaking-assist', 'POST', { mode: 'cn_to_en', text: '我喜欢这只小鸟' });
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'deepseek');
    assert.equal(response.body.naturalEnglish, 'This little bird is so cute!');
    assert.equal(JSON.stringify(response.body).includes('assist-secret'), false);
  } finally {
    await app.close();
    await new Promise(resolve => mock.close(resolve));
  }
});

test('DeepSeek 适配层隐藏 key 并把回复转成 H5 统一格式', async () => {
  const mock = http.createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer test-secret');
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    assert.match(body.messages[0].content, /双语伙伴|情感陪伴/);
    assert.equal(body.stream, false);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: 'Hello 星星' } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const app = await start({ deepseekApiKey: 'test-secret', deepseekBaseUrl: `http://127.0.0.1:${mock.address().port}` });
  try {
    const config = await json(app.origin, '/api/config/status');
    assert.equal(config.body.primary.providerId, 'deepseek');
    assert.equal(config.body.primary.hasKey, true);
    assert.equal(config.body.keyExposedToBrowser, false);
    assert.equal(JSON.stringify(config.body).includes('test-secret'), false);
    const response = await fetch(`${app.origin}/api/star`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '我今天有一点难过', mode: 'companion' }),
    });
    const stream = await response.text();
    assert.match(stream, /Hello 星星/);
    assert.match(stream, /"data":\{"delta":\{"content"/);
  } finally {
    await app.close();
    await new Promise(resolve => mock.close(resolve));
  }
});

test('默认女生语音不需要豆包凭证且凭证不会暴露', async () => {
  const app = await start();
  try {
    const status = await json(app.origin, '/api/voice/status');
    assert.equal(status.body.provider, 'browser_default_female');
    assert.equal(status.body.configured, true);
    assert.equal(status.body.voiceName, '默认女生');
    assert.equal(status.body.credentialsExposedToBrowser, false);
  } finally { await app.close(); }
});

test('模型目录足够详细且保存后只向浏览器返回脱敏状态', async () => {
  const app = await start();
  try {
    const catalog = await json(app.origin, '/api/model/catalog');
    assert.ok(catalog.body.providers.length >= 9);
    assert.ok(catalog.body.providers.some(provider => provider.id === 'openai'));
    assert.ok(catalog.body.providers.some(provider => provider.id === 'qwen'));
    const saved = await json(app.origin, '/api/model/config', 'POST', {
      primary: { providerId: 'deepseek', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com', apiKey: 'primary-secret' },
      fallbackEnabled: true,
      fallback: { providerId: 'qwen', model: 'qwen3.7-plus', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: 'fallback-secret' },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.config.primary.hasKey, true);
    assert.equal(saved.body.config.fallback.hasKey, true);
    assert.equal(JSON.stringify(saved.body).includes('primary-secret'), false);
    assert.equal(JSON.stringify(saved.body).includes('fallback-secret'), false);
    const disk = await readFile(join(app.dataDir, 'model-config.json'), 'utf8');
    assert.match(disk, /primary-secret/);
  } finally { await app.close(); }
});

test('主模型失败后自动使用已启用的备用模型', async () => {
  const primary = http.createServer((_request, response) => {
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'primary failed' }));
  });
  const fallback = http.createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer fallback-key');
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    assert.equal(body.model, 'qwen3.7-plus');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: 'Fallback is ready.\n备用模型已经接住啦。' } }] }));
  });
  await new Promise(resolve => primary.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => fallback.listen(0, '127.0.0.1', resolve));
  const app = await start();
  try {
    await json(app.origin, '/api/model/config', 'POST', {
      primary: { providerId: 'deepseek', model: 'deepseek-v4-flash', baseUrl: `http://127.0.0.1:${primary.address().port}`, apiKey: 'primary-key' },
      fallbackEnabled: true,
      fallback: { providerId: 'qwen', model: 'qwen3.7-plus', baseUrl: `http://127.0.0.1:${fallback.address().port}`, apiKey: 'fallback-key' },
    });
    const response = await fetch(`${app.origin}/api/star`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '和我聊聊今天的学习', mode: 'companion' }),
    });
    const stream = await response.text();
    assert.match(stream, /备用模型已经接住啦/);
    assert.match(stream, /"fallbackUsed":true/);
  } finally {
    await app.close();
    await new Promise(resolve => primary.close(resolve));
    await new Promise(resolve => fallback.close(resolve));
  }
});
