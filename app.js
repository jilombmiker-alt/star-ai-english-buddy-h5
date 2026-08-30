const state = {
  messages: [],
  currentMode: 'plan',
  currentLevelId: 'l1',
  currentPreview: false,
  demoOnly: false,
  currentScreen: 'home',
  currentSummaryRange: 'today',
  lessonSectionPassed: false,
  wordQuizIndex: 0,
  readingStage: 0,
  readingHintLevel: 0,
  lessonRecognition: null,
  reciteTranscript: '',
  reciteRecording: false,
  reciteFallback: false,
  challengeIndex: 0,
  speakingAssistMode: 'cn_to_en',
  speakingAssistDraft: '',
  speakingAssistResult: null,
  speakingAssistBusy: false,
  speakingAssistRecording: false,
  assistRecordingRequested: false,
  assistRecognition: null,
  assistRestartTimer: null,
  returnToPlan: false,
  autoReturnTimer: null,
  busy: false,
  speakingId: null,
  currentAudio: null,
  defaultFemaleVoiceAvailable: 'speechSynthesis' in window,
  modelCatalog: [],
  modelConfig: null,
  recognition: null,
  recognitionFinal: '',
  recognitionInterim: '',
  recordingStartedAt: 0,
  recordingTimerId: null,
  growth: null,
  sessionId: sessionStorage.getItem('star-h5-session') || crypto.randomUUID(),
};

sessionStorage.setItem('star-h5-session', state.sessionId);

const levels = [
  { id: 'l1', number: 1, title: '森林里的新朋友', knowledge: 'cat · dog · bird', mode: 'words' },
  { id: 'l2', number: 2, title: '魔法商店问候', knowledge: 'hello · name · friend', mode: 'roleplay' },
  { id: 'l3', number: 3, title: '红色小鸟的故事', knowledge: '颜色 · 动物 · 简单句', mode: 'reading' },
  { id: 'l4', number: 4, title: '我的一天', knowledge: 'morning · school · night', mode: 'plan' },
  { id: 'l5', number: 5, title: '快乐食物派对', knowledge: 'apple · milk · cake', mode: 'words' },
  { id: 'l6', number: 6, title: '星星的小舞台', knowledge: '综合听说与情景表达', mode: 'roleplay' },
];

const modeInfo = {
  companion: { title: '英语对话与陪伴', description: '星星会用简单英语和温柔中文陪你聊。' },
  plan: { title: '今日学习计划', description: '星星会按今天的节奏安排听、读、理解、背诵、单词和情景表达。' },
  reading: { title: '朗读一个小故事', description: '点一句听一句，再跟着星星读出来。' },
  words: { title: '认识三个动物单词', description: '点击单词卡听发音，再试着大声说一次。' },
  roleplay: { title: '英语情景演绎', description: '你来选台词，星星继续和你对话。' },
  challenge: { title: '萌芽之森挑战关', description: '把听懂、单词和情景表达放在一起完成挑战。' },
};

const localReplies = {
  companion: "I'm here with you.\n星星在这里陪你。你愿意告诉我，今天哪件事让你印象最深吗？",
  plan: "Let's make a tiny plan today!\n好呀，我们用三个很小的任务开始，不会有压力。\n下一步：点击“开始这个任务”查看今日计划。",
  reading: "Let's read a little story together!\n我先读一句，你可以点每一句反复听。\n下一步：点击“开始这个任务”进入朗读故事。",
  words: "Let's learn three animal words!\n今天认识 cat、dog 和 bird，点卡片就能听发音。\n下一步：点击“开始这个任务”认识单词。",
  roleplay: "You are the hero in our story!\n你来选择英语台词，我会继续接住你的对话。\n下一步：点击“开始这个任务”开始情景演绎。",
  challenge: "Ready for a forest challenge?\n准备好啦，我们把今天学过的内容连起来闯关。\n下一步：点击“开始这个任务”进入萌芽之森挑战。",
};

const elements = {
  homeScreen: document.querySelector('#homeScreen'),
  taskScreen: document.querySelector('#taskScreen'),
  screenViewport: document.querySelector('#screenViewport'),
  screenName: document.querySelector('#screenName'),
  aiStatus: document.querySelector('#aiStatus'),
  voiceName: document.querySelector('#voiceName'),
  chatLog: document.querySelector('#chatLog'),
  composer: document.querySelector('#composer'),
  input: document.querySelector('#messageInput'),
  send: document.querySelector('#sendButton'),
  talk: document.querySelector('#talkButton'),
  talkLabel: document.querySelector('#talkLabel'),
  talkHint: document.querySelector('#talkHint'),
  voiceRecording: document.querySelector('#voiceRecording'),
  recordingTimer: document.querySelector('#recordingTimer'),
  liveTranscript: document.querySelector('#liveTranscript'),
  finishRecording: document.querySelector('#finishRecordingButton'),
  voiceReview: document.querySelector('#voiceReview'),
  voiceTranscript: document.querySelector('#voiceTranscript'),
  retryVoice: document.querySelector('#retryVoiceButton'),
  confirmVoice: document.querySelector('#confirmVoiceButton'),
  nextStep: document.querySelector('#nextStep'),
  nextTitle: document.querySelector('#next-title'),
  nextDescription: document.querySelector('#nextDescription'),
  startLesson: document.querySelector('#startLessonButton'),
  lessonPanel: document.querySelector('#lessonPanel'),
  lessonTitle: document.querySelector('#lessonTitle'),
  lessonContent: document.querySelector('#lessonContent'),
  closeLesson: document.querySelector('#closeLesson'),
  reset: document.querySelector('#resetButton'),
  modelSettingsButton: document.querySelector('#modelSettingsButton'),
  modelSettingsDialog: document.querySelector('#modelSettingsDialog'),
  closeModelSettings: document.querySelector('#closeModelSettings'),
  cancelModelSettings: document.querySelector('#cancelModelSettings'),
  modelSettingsForm: document.querySelector('#modelSettingsForm'),
  modelFormStatus: document.querySelector('#modelFormStatus'),
  fallbackEnabled: document.querySelector('#fallbackEnabled'),
  fallbackFields: document.querySelector('#fallbackFields'),
  starTemplate: document.querySelector('#starMessageTemplate'),
  pointsBalance: document.querySelector('#pointsBalance'),
  streakCount: document.querySelector('#streakCount'),
  checkIn: document.querySelector('#checkInButton'),
  levelPanel: document.querySelector('#levelPanel'),
  growthPanel: document.querySelector('#growthPanel'),
  levelMap: document.querySelector('#levelMap'),
  summaryUnique: document.querySelector('#summaryUnique'),
  summaryAttempts: document.querySelector('#summaryAttempts'),
  summaryRepeats: document.querySelector('#summaryRepeats'),
  summaryPoints: document.querySelector('#summaryPoints'),
  studyDetailTitle: document.querySelector('#studyDetailTitle'),
  studyDetailList: document.querySelector('#studyDetailList'),
  testAdvance: document.querySelector('#testAdvanceButton'),
  dailyPlan: document.querySelector('#dailyPlanButton'),
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `request failed: ${response.status}`);
  return data;
}

function modelProvider(providerId) {
  return state.modelCatalog.find(provider => provider.id === providerId) || null;
}

function modelSlotNodes(slotName) {
  return {
    provider: document.querySelector(`[data-provider-select="${slotName}"]`),
    model: document.querySelector(`[data-model-select="${slotName}"]`),
    customModel: document.querySelector(`[data-custom-model="${slotName}"]`),
    apiKey: document.querySelector(`[data-api-key="${slotName}"]`),
    baseUrl: document.querySelector(`[data-base-url="${slotName}"]`),
    hint: document.querySelector(`[data-provider-hint="${slotName}"]`),
    keyStatus: document.querySelector(`[data-key-status="${slotName}"]`),
    toggleKey: document.querySelector(`[data-toggle-key="${slotName}"]`),
    test: document.querySelector(`[data-test-model="${slotName}"]`),
  };
}

function setModelFormStatus(message, status = '') {
  elements.modelFormStatus.textContent = message;
  if (status) elements.modelFormStatus.dataset.state = status;
  else delete elements.modelFormStatus.dataset.state;
}

function renderModelChoices(slotName, preferredModel = '') {
  const nodes = modelSlotNodes(slotName);
  const provider = modelProvider(nodes.provider.value) || state.modelCatalog[0];
  if (!provider) return;
  const knownModel = provider.models.some(model => model.id === preferredModel);
  nodes.model.innerHTML = [
    ...provider.models.map(model => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.name)} · ${escapeHtml(model.tag)}</option>`),
    '<option value="__custom__">填写其他模型 ID…</option>',
  ].join('');
  nodes.model.value = knownModel ? preferredModel : (preferredModel ? '__custom__' : (provider.models[0]?.id || '__custom__'));
  nodes.customModel.hidden = nodes.model.value !== '__custom__';
  nodes.customModel.value = knownModel ? '' : preferredModel;
  nodes.baseUrl.value = provider.baseUrl;
  nodes.hint.innerHTML = `<b>${escapeHtml(provider.region)}</b><span>${escapeHtml(provider.summary)}</span>`;
}

function renderModelSlot(slotName, savedSlot, defaultProviderId) {
  const nodes = modelSlotNodes(slotName);
  nodes.provider.innerHTML = state.modelCatalog.map(provider => `<option value="${escapeHtml(provider.id)}">${escapeHtml(provider.name)}</option>`).join('');
  nodes.provider.value = savedSlot?.providerId || defaultProviderId;
  renderModelChoices(slotName, savedSlot?.model || '');
  if (savedSlot?.baseUrl) nodes.baseUrl.value = savedSlot.baseUrl;
  nodes.apiKey.value = '';
  nodes.apiKey.placeholder = savedSlot?.hasKey ? '已安全保存；留空不会覆盖' : '粘贴新的 API Key';
  nodes.keyStatus.textContent = savedSlot?.hasKey ? 'Key 已保存在本机服务端，不会回传页面' : '尚未保存 Key';
  nodes.keyStatus.dataset.saved = savedSlot?.hasKey ? 'true' : 'false';
}

function updateFallbackAvailability() {
  const enabled = elements.fallbackEnabled.checked;
  elements.fallbackFields.setAttribute('aria-disabled', String(!enabled));
  modelSlotNodes('fallback').provider.disabled = !enabled;
  modelSlotNodes('fallback').model.disabled = !enabled;
  modelSlotNodes('fallback').customModel.disabled = !enabled;
  modelSlotNodes('fallback').apiKey.disabled = !enabled;
  modelSlotNodes('fallback').baseUrl.disabled = !enabled;
  modelSlotNodes('fallback').toggleKey.disabled = !enabled;
  modelSlotNodes('fallback').test.disabled = !enabled;
}

async function loadModelCenter() {
  const [catalog, config] = await Promise.all([api('/api/model/catalog'), api('/api/model/config')]);
  state.modelCatalog = catalog.providers || [];
  state.modelConfig = config;
  renderModelSlot('primary', config.primary, 'deepseek');
  renderModelSlot('fallback', config.fallback, 'qwen');
  elements.fallbackEnabled.checked = config.fallbackEnabled === true;
  updateFallbackAvailability();
}

function collectModelSlot(slotName) {
  const nodes = modelSlotNodes(slotName);
  const model = nodes.model.value === '__custom__' ? nodes.customModel.value.trim() : nodes.model.value;
  return {
    providerId: nodes.provider.value,
    model,
    baseUrl: nodes.baseUrl.value.trim(),
    apiKey: nodes.apiKey.value.trim(),
    keepExistingKey: true,
  };
}

async function saveModelCenter() {
  const primary = collectModelSlot('primary');
  const fallbackEnabled = elements.fallbackEnabled.checked;
  const fallback = fallbackEnabled ? collectModelSlot('fallback') : null;
  if (!primary.model) throw new Error('请为主模型选择或填写模型 ID');
  const primaryKeepsKey = state.modelConfig?.primary?.hasKey && state.modelConfig.primary.providerId === primary.providerId;
  if (!primary.apiKey && !primaryKeepsKey) throw new Error('更换厂商后，请填写新的主模型 API Key');
  if (fallbackEnabled && !fallback.model) throw new Error('请为备用模型选择或填写模型 ID');
  const fallbackKeepsKey = state.modelConfig?.fallback?.hasKey && state.modelConfig.fallback.providerId === fallback?.providerId;
  if (fallbackEnabled && !fallback.apiKey && !fallbackKeepsKey) throw new Error('请填写备用模型 API Key，或者先关闭备用模型');
  const result = await api('/api/model/config', {
    method: 'POST', body: JSON.stringify({ primary, fallbackEnabled, fallback }),
  });
  state.modelConfig = result.config;
  renderModelSlot('primary', result.config.primary, primary.providerId);
  renderModelSlot('fallback', result.config.fallback, fallback?.providerId || 'qwen');
  elements.fallbackEnabled.checked = result.config.fallbackEnabled;
  updateFallbackAvailability();
  setModelFormStatus(result.message, 'success');
  await checkAiHealth();
  return result;
}

async function openModelCenter() {
  setModelFormStatus('正在读取本机模型配置…');
  elements.modelSettingsDialog.showModal();
  try {
    await loadModelCenter();
    setModelFormStatus('请选择主模型；需要时再启用备用模型。Key 留空不会覆盖已经保存的值。');
  } catch (error) {
    setModelFormStatus(`模型配置读取失败：${error.message}`, 'error');
  }
}

function track(type, context = {}) {
  const body = JSON.stringify({ type, sessionId: state.sessionId, context });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
}

function showPointsToast(text) {
  document.querySelector('.points-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'points-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = text;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

const screenMeta = {
  home: ['homeScreen', '英语对话 · 中英文陪伴'],
  map: ['levelPanel', '学习计划 · 学习关卡'],
  task: ['taskScreen', '任务 · 跟着星星学习'],
  report: ['growthPanel', '成长 · 我的学习记录'],
};

function showScreen(name) {
  const target = screenMeta[name] ? name : 'home';
  Object.values(screenMeta).forEach(([id]) => { elements[id].hidden = true; });
  elements[screenMeta[target][0]].hidden = false;
  elements.screenName.textContent = screenMeta[target][1];
  state.currentScreen = target;
  document.querySelectorAll('.app-tabs [data-screen-target]').forEach(button => {
    const selected = button.dataset.screenTarget === target || (target === 'task' && button.dataset.screenTarget === 'map');
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (target === 'report') void loadLearningSummary(state.currentSummaryRange);
  if (target === 'map') renderGrowth();
  history.replaceState({ screen: target }, '', location.pathname);
  elements.screenViewport.scrollTo({ top: 0, behavior: 'auto' });
}

async function loadLearningSummary(range = 'today') {
  state.currentSummaryRange = range;
  document.querySelectorAll('[data-summary-range]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.summaryRange === range));
  });
  elements.studyDetailList.innerHTML = '<p class="empty-rewards">正在读取学习记录…</p>';
  try {
    const summary = await api(`/api/summary?range=${encodeURIComponent(range)}`);
    elements.summaryUnique.textContent = summary.uniqueContent;
    elements.summaryAttempts.textContent = summary.practiceAttempts;
    elements.summaryRepeats.textContent = summary.repeatAttempts;
    elements.summaryPoints.textContent = summary.pointsEarned;
    elements.studyDetailTitle.textContent = `${summary.rangeLabel}内容`;
    if (!summary.details.length) {
      elements.studyDetailList.innerHTML = '<p class="empty-rewards">这一时间段还没有真实练习记录。万能推进不会出现在这里。</p>';
      return;
    }
    elements.studyDetailList.innerHTML = summary.details.map(item => `<div class="study-detail-item"><span><strong>${item.label}</strong><small>${item.completed ? '已通过校验 · 掌握只记一次' : '已有练习 · 尚未通过校验'}</small></span><b>${item.attempts} 次${item.attempts > 1 ? ` · 重复 ${item.attempts - 1}` : ''}</b></div>`).join('');
  } catch {
    elements.studyDetailList.innerHTML = '<p class="empty-rewards">学习报告暂时无法读取，请稍后重试。</p>';
  }
}

function renderGrowth() {
  if (!state.growth) return;
  const { profile, progress } = state.growth;
  elements.pointsBalance.textContent = profile.points;
  elements.streakCount.textContent = profile.streak;
  const checkedToday = profile.lastCheckIn === state.growth.today;
  elements.checkIn.disabled = checkedToday;
  elements.checkIn.innerHTML = checkedToday ? '今日已签到<span>明天再来</span>' : '今日签到 <span>+5</span>';
  const hasCompletion = (scope, contentId, levelId = 'l1') => progress.completions.some(item => item.levelId === levelId && item.scope === scope && item.contentId === contentId);
  const challengeCompleted = hasCompletion('section', 'forest_challenge_section');
  const challengeUnlocked = progress.completedLevels.includes('l1') || ['reading_section', 'words_section', 'roleplay_section'].every(id => hasCompletion('section', id));
  const challengeEntry = document.querySelector('[data-learning-entry="challenge"]');
  const challengeEntryStatus = challengeEntry?.querySelector('[data-challenge-entry-status]');
  if (challengeEntry) challengeEntry.disabled = !challengeUnlocked;
  if (challengeEntryStatus) challengeEntryStatus.textContent = challengeCompleted ? '已完成 · 还可以再练' : challengeUnlocked ? '已解锁 · 综合闯关' : '完成基础任务后解锁';
  elements.levelMap.innerHTML = '<div class="tree-origin"><strong>萌芽之森学习树</strong><small>融合原项目的故事、挑战和 Boss 路径；当前先开放可玩的挑战分支</small></div>';
  levels.forEach(level => {
    const completed = progress.completedLevels.includes(level.id);
    const unlocked = level.number <= progress.unlockedLevel;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-node tree-node';
    button.disabled = !unlocked;
    button.dataset.levelId = level.id;
    button.dataset.completed = String(completed);
    button.dataset.preview = 'false';
    const status = completed ? '已完成' : unlocked ? '可以学习' : '尚未解锁';
    button.innerHTML = `<span class="level-badge">${String(level.number).padStart(2, '0')}</span><span><strong>${level.title}</strong><small>${level.knowledge}</small></span><span class="level-state">${status}</span>`;
    const row = document.createElement('div');
    row.className = `tree-row ${level.number % 2 ? 'tree-left' : 'tree-right'}`;
    row.append(button);
    elements.levelMap.append(row);
    if (level.id === 'l1') {
      const branch = document.createElement('div');
      branch.className = 'tree-row tree-branch';
      const challenge = document.createElement('button');
      challenge.type = 'button';
      challenge.className = 'level-node challenge-node';
      challenge.dataset.challengeId = 'forest_challenge';
      challenge.dataset.completed = String(challengeCompleted);
      challenge.dataset.preview = 'false';
      challenge.disabled = !challengeUnlocked;
      const challengeStatus = challengeCompleted ? '挑战完成' : challengeUnlocked ? '可以挑战' : '完成本章后解锁';
      challenge.innerHTML = `<span class="level-badge">CH</span><span><strong>颜色测验 · 森林挑战</strong><small>来自原版萌芽之森挑战节点</small></span><span class="level-state">${challengeStatus}</span>`;
      branch.append(challenge);
      elements.levelMap.append(branch);
    }
  });

}

async function loadGrowthState() {
  try {
    state.growth = await api('/api/state');
    renderGrowth();
  } catch {
    showPointsToast('成长数据暂时无法读取，请稍后刷新。');
  }
}

async function awardProgress(scope, contentId, levelId = state.currentLevelId, contentLabel = contentId) {
  if (state.currentPreview || state.demoOnly) {
    showPointsToast('当前是验收预览：可以看流程，但不会记掌握或积分。');
    return false;
  }
  try {
    const result = await api('/api/progress/complete', {
      method: 'POST',
      body: JSON.stringify({ scope, contentId, levelId, contentLabel }),
    });
    state.growth = result.state;
    renderGrowth();
    if (result.awarded > 0) showPointsToast(`完成${scope === 'knowledge' ? '知识点' : scope === 'section' ? '板块' : '章节'}，获得 ${result.awarded} 积分！`);
    if (result.alreadyCompleted) showPointsToast('这个学习成果已经记过积分啦，重复练习不会刷分。');
    return true;
  } catch {
    showPointsToast('这次学习记录没有保存成功，可以稍后再点一次。');
    return false;
  }
}

function trackPractice(contentId, contentLabel, outcome = 'attempted') {
  track('practice_attempt', { contentId, contentLabel, levelId: state.currentLevelId, mode: state.currentMode, outcome });
}

function hasCompletion(scope, contentId, levelId = state.currentLevelId) {
  return Boolean(state.growth?.progress.completions.some(item => item.levelId === levelId && item.scope === scope && item.contentId === contentId));
}

function inferMode(text) {
  const value = text.toLowerCase();
  if (/计划|今日学习|学习任务|study plan/.test(value)) return 'plan';
  if (/挑战|闯关|challenge/.test(value)) return 'challenge';
  if (/故事|朗读|read/.test(value)) return 'reading';
  if (/单词|动物|word|cat|dog|bird/.test(value)) return 'words';
  if (/演|情景|对话|role|play/.test(value)) return 'roleplay';
  return 'companion';
}

function saveMessages() {
  localStorage.setItem('star-h5-dialogue-v2', JSON.stringify(state.messages.slice(-20)));
}

function addMessage(role, text, status = 'done') {
  const message = { id: makeId(role), role, text, status };
  state.messages.push(message);
  renderMessage(message);
  saveMessages();
  return message;
}

function renderMessage(message) {
  let node;
  if (message.role === 'star') {
    node = elements.starTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.messageId = message.id;
    node.querySelector('.message-text').textContent = message.text;
    const meta = node.querySelector('.message-meta small');
    if (message.status === 'streaming') {
      meta.textContent = 'AI 正在回复…';
      node.disabled = true;
    } else if (message.status === 'local') {
      meta.textContent = '本地引导 · 点击重听';
    }
    node.setAttribute('aria-label', `星星 AI 说：${message.text}。点击重新播报`);
  } else {
    node = document.createElement('div');
    node.className = 'message child-message';
    const main = document.createElement('span');
    main.className = 'message-main';
    const meta = document.createElement('span');
    meta.className = 'message-meta';
    meta.innerHTML = '<strong>我</strong><small>刚刚说</small>';
    const text = document.createElement('span');
    text.className = 'message-text';
    text.textContent = message.text;
    main.append(meta, text);
    node.append(main);
  }
  elements.chatLog.append(node);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function updateMessage(message, text, status) {
  message.text = text;
  message.status = status;
  const node = elements.chatLog.querySelector(`[data-message-id="${message.id}"]`);
  if (!node) return;
  node.querySelector('.message-text').textContent = text;
  const meta = node.querySelector('.message-meta small');
  node.disabled = status === 'streaming';
  meta.textContent = status === 'streaming' ? 'AI 正在回复…' : status === 'local' ? '本地引导 · 点击重听' : '点击重听';
  node.setAttribute('aria-label', `星星 AI 说：${text}。点击重新播报`);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
  saveMessages();
}

function setAiStatus(kind, text) {
  elements.aiStatus.dataset.state = kind;
  elements.aiStatus.querySelector('strong').textContent = text;
}

function setBusy(value) {
  state.busy = value;
  elements.send.disabled = value || !elements.input.value.trim();
  document.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = value; });
  elements.input.disabled = value;
}

function showNextStep(mode) {
  state.currentMode = mode;
  const info = modeInfo[mode];
  elements.nextTitle.textContent = info.title;
  const today = new Date().getDay();
  const planMinutes = today === 0 || today === 6 ? 15 : 10;
  elements.nextDescription.textContent = mode === 'plan' ? `${info.description} 今天预计 ${planMinutes} 分钟。` : info.description;
  elements.nextStep.hidden = false;
  elements.lessonPanel.hidden = true;
  showScreen('task');
}

function splitBilingualSpeech(text) {
  const clean = text.replace(/下一步：/g, '').replace(/\s+/g, ' ').trim();
  const chineseStart = clean.search(/[\u3400-\u9fff]/);
  if (chineseStart < 0) return clean ? [{ text: clean, language: 'en' }] : [];
  if (chineseStart === 0) return [{ text: clean, language: 'zh-cn' }];
  const english = clean.slice(0, chineseStart).trim();
  const chinese = clean.slice(chineseStart).trim();
  return [english && { text: english, language: 'en' }, chinese && { text: chinese, language: 'zh-cn' }].filter(Boolean);
}

async function refreshVoiceName() {
  state.defaultFemaleVoiceAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  elements.voiceName.textContent = state.defaultFemaleVoiceAvailable
    ? '声音：默认女生 · 英文后中文'
    : '声音：当前浏览器暂不支持语音播报';
}

function pickDefaultFemaleVoice(language) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const languagePrefix = language === 'en' ? 'en' : 'zh';
  const preferredNames = language === 'en'
    ? ['Samantha', 'Ava', 'Allison', 'Karen', 'Victoria', 'female']
    : ['Tingting', 'Meijia', 'Xiaoxiao', 'Xiaoyi', 'Yu-shu', 'female'];
  const sameLanguage = voices.filter(voice => voice.lang?.toLowerCase().startsWith(languagePrefix));
  return preferredNames.map(name => sameLanguage.find(voice => voice.name.toLowerCase().includes(name.toLowerCase()))).find(Boolean)
    || sameLanguage.find(voice => voice.default)
    || sameLanguage[0]
    || voices.find(voice => voice.default)
    || voices[0]
    || null;
}

async function playDefaultFemalePart(part) {
  await new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(part.text);
    const voice = pickDefaultFemaleVoice(part.language);
    if (voice) utterance.voice = voice;
    utterance.lang = part.language === 'en' ? 'en-US' : 'zh-CN';
    utterance.rate = part.language === 'en' ? 0.86 : 0.92;
    utterance.pitch = 1.08;
    utterance.onend = resolve;
    utterance.onerror = event => reject(new Error(event.error || 'speech synthesis unavailable'));
    window.speechSynthesis.speak(utterance);
  });
}

async function speakText(text, messageId = null) {
  state.currentAudio?.pause();
  state.currentAudio = null;
  window.speechSynthesis?.cancel?.();
  state.speakingId = messageId;
  const messageNode = messageId ? elements.chatLog.querySelector(`[data-message-id="${messageId}"]`) : null;
  const meta = messageNode?.querySelector('.message-meta small');
  if (!state.defaultFemaleVoiceAvailable) {
    if (meta) meta.textContent = '浏览器暂不支持播报';
    showPointsToast('当前浏览器暂不支持语音播报。');
    state.speakingId = null;
    return;
  }
  try {
    const parts = splitBilingualSpeech(text);
    for (const [index, part] of parts.entries()) {
      if (meta) meta.textContent = part.language === 'en' ? '默认女生正在读英文…' : '默认女生正在读中文…';
      await playDefaultFemalePart(part);
      if (index < parts.length - 1) await new Promise(resolve => window.setTimeout(resolve, 260));
    }
  } catch {
    if (meta) meta.textContent = '默认女生暂时无法播报';
    showPointsToast('默认女生暂时无法播报，请检查浏览器声音权限。');
    state.speakingId = null;
    return;
  }
  if (state.speakingId === messageId && meta) meta.textContent = '点击重听';
  state.speakingId = null;
}

async function requestStar(question, mode, message) {
  const response = await fetch('/api/star', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, mode }),
  });
  if (!response.ok || !response.body) throw new Error(`AI request failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const delta = parsed?.data?.delta?.content;
        if (typeof delta === 'string') {
          content += delta;
          updateMessage(message, content, 'streaming');
        }
      } catch {
        // 忽略不完整的 SSE 行，等待下一批数据。
      }
    }
  }
  if (!content.trim()) throw new Error('AI returned empty content');
  return content.trim();
}

async function sendMessage(raw, requestedMode) {
  const question = raw.trim();
  if (!question || state.busy) return;
  const mode = requestedMode || inferMode(question);
  const startedAt = performance.now();
  track('ai_question_submitted', { mode, source: requestedMode ? 'suggestion' : 'text_or_voice', inputLength: question.length });
  addMessage('child', question);
  const starMessage = addMessage('star', '星星正在想一想…', 'streaming');
  setBusy(true);
  setAiStatus('waiting', '云端 AI 正在理解你');
  let finalText;
  try {
    finalText = await requestStar(question, mode, starMessage);
    updateMessage(starMessage, finalText, 'done');
    setAiStatus('cloud', '云端 AI 已回应 · 课程任务由本地流程控制');
    track('ai_reply_received', { mode, outcome: 'cloud', durationMs: Math.round(performance.now() - startedAt) });
  } catch {
    finalText = localReplies[mode];
    updateMessage(starMessage, finalText, 'local');
    setAiStatus('local', '云端暂时不可用 · 已切换本地课程引导');
    track('ai_reply_received', { mode, outcome: 'local_fallback', durationMs: Math.round(performance.now() - startedAt) });
  } finally {
    setBusy(false);
    if (mode !== 'companion') showNextStep(mode);
    else showScreen('home');
  }
  void speakText(finalText, starMessage.id);
}

function renderLesson(mode) {
  const info = modeInfo[mode];
  state.currentMode = mode;
  state.lessonSectionPassed = false;
  state.wordQuizIndex = 0;
  state.readingStage = 0;
  state.readingHintLevel = 0;
  state.reciteTranscript = '';
  state.reciteRecording = false;
  state.reciteFallback = false;
  state.challengeIndex = 0;
  state.speakingAssistMode = 'cn_to_en';
  state.speakingAssistDraft = '';
  state.speakingAssistResult = null;
  state.speakingAssistBusy = false;
  state.speakingAssistRecording = false;
  state.assistRecordingRequested = false;
  clearTimeout(state.assistRestartTimer);
  state.assistRestartTimer = null;
  state.assistRecognition?.stop();
  state.assistRecognition = null;
  elements.lessonTitle.textContent = info.title;
  elements.closeLesson.textContent = state.returnToPlan && mode !== 'plan' ? '返回任务目录' : '返回关卡';
  elements.lessonContent.innerHTML = '';
  if (mode === 'plan') {
    state.currentLevelId = 'l1';
    state.returnToPlan = true;
    const tasks = [
      { mode: 'reading', section: 'reading_section', number: 1, title: '听读背一个核心句', detail: '听一遍 → 看着读 → 理解 → 再听 → 尝试背诵' },
      { mode: 'words', section: 'words_section', number: 2, title: '认识 3 个动物单词', detail: '听音练习 → 三题选义校验' },
      { mode: 'roleplay', section: 'roleplay_section', number: 3, title: '完成一轮情景表达', detail: '理解问题 → 选择并说出回应' },
    ];
    const taskHtml = tasks.map(task => {
      const done = hasCompletion('section', task.section, 'l1');
      return `<button class="task-item" type="button" data-launch-mode="${task.mode}" data-done="${done}"><span class="task-number">${done ? '✓' : task.number}</span><span><strong>${task.title}</strong><small>${done ? '已完成 · 可以重复练习' : task.detail}</small></span></button>`;
    }).join('');
    const challengeReady = tasks.every(task => hasCompletion('section', task.section, 'l1'));
    const challengeDone = hasCompletion('section', 'forest_challenge_section', 'l1');
    elements.lessonContent.innerHTML = `
      <div class="mission-directory"><span>今日任务目录</span><strong>${tasks.filter(task => hasCompletion('section', task.section, 'l1')).length} / 3 个基础任务完成</strong><small>每个子任务完成后会自动回到这里，不需要孩子自己找返回按钮。</small></div>
      <div class="task-list">${taskHtml}</div>
      <button class="task-item challenge-task" type="button" data-launch-mode="challenge" data-done="${challengeDone}" ${challengeReady ? '' : 'disabled'}><span class="task-number">CH</span><span><strong>萌芽之森挑战关</strong><small>${challengeDone ? '挑战已完成 · 可再次挑战' : challengeReady ? '基础任务已完成，进入综合挑战' : '完成上面 3 个任务后解锁'}</small></span></button>`;
  } else if (mode === 'words') {
    elements.lessonContent.innerHTML = `
      <p class="lesson-intro">先点卡片反复听，再完成下面的听音选义。仅播放不算掌握，答对才会自动通过。</p>
      <div class="word-grid">
        <button class="word-card" type="button" data-practice-speak="cat" data-content-id="word_cat" data-content-label="单词 cat"><span class="word-letter">C</span><span><strong>cat</strong><small>小猫 · 点我听</small></span></button>
        <button class="word-card" type="button" data-practice-speak="dog" data-content-id="word_dog" data-content-label="单词 dog"><span class="word-letter">D</span><span><strong>dog</strong><small>小狗 · 点我听</small></span></button>
        <button class="word-card" type="button" data-practice-speak="bird" data-content-id="word_bird" data-content-label="单词 bird"><span class="word-letter">B</span><span><strong>bird</strong><small>小鸟 · 点我听</small></span></button>
      </div>
      <div class="role-scene" id="wordQuestion"><strong>第 1 题：</strong>哪个词是“小猫”？</div>
      <div class="role-options" id="wordAnswers">
        <button class="role-option" type="button" data-word-answer="dog">dog</button><button class="role-option" type="button" data-word-answer="cat">cat</button><button class="role-option" type="button" data-word-answer="bird">bird</button>
      </div>
      <div class="lesson-feedback" id="wordFeedback" hidden></div>`;
  } else if (mode === 'reading') {
    elements.lessonContent.innerHTML = '<div id="readingCoach"></div>';
    renderReadingCoach();
  } else if (mode === 'roleplay') {
    elements.lessonContent.innerHTML = '<div id="roleplayCoach"></div>';
    renderRoleplayCoach();
  } else {
    elements.lessonContent.innerHTML = '<div id="challengeCoach"></div>';
    renderChallengeCoach();
  }
  if (state.currentPreview || state.demoOnly) {
    const preview = document.createElement('div');
    preview.className = 'completion-status';
    preview.textContent = '免测试预览：只查看交互，不记录掌握或积分。';
    elements.lessonContent.append(preview);
  }
  elements.nextStep.hidden = true;
  elements.lessonPanel.hidden = false;
  track('lesson_opened', { mode, levelId: state.currentLevelId });
}

function renderRoleplayCoach() {
  const coach = elements.lessonContent.querySelector('#roleplayCoach');
  if (!coach) return;
  const mode = state.speakingAssistMode;
  const result = state.speakingAssistResult;
  const recognitionAvailable = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const resultHtml = result ? `
    <div class="assist-result" role="status">
      <div class="assist-source"><span>${result.source === 'deepseek' ? '云端 AI' : '本地演示'}</span><small>只给表达建议，不代替课程校验</small></div>
      <div class="assist-bubble assist-bubble-star"><small>${mode === 'cn_to_en' ? '简单说法' : '星星帮你整理'}</small><strong>${escapeHtml(result.simpleEnglish)}</strong></div>
      <div class="assist-bubble assist-bubble-star is-natural"><small>更自然一点</small><strong>${escapeHtml(result.naturalEnglish)}</strong><p>${escapeHtml(result.childFriendlyExplanation)}</p></div>
      <div class="assist-actions">
        <button type="button" data-assist-speak="${escapeHtml(result.tryAgainText)}">听星星说</button>
        <button type="button" data-assist-retry>我再试一次</button>
        <button type="button" data-assist-continue>继续这个故事</button>
      </div>
    </div>` : '';
  coach.innerHTML = `
    <p class="lesson-intro">情景：星星在魔法商店遇见你。你可以直接回应，也可以随时让星星帮你组织英语。</p>
    <div class="role-scene role-scene-dialogue"><span class="speaker-dot" aria-hidden="true">S</span><span><small>星星 · 点句子可以重听</small><button type="button" data-assist-speak="Hello! What is your name?"><strong>Hello! What is your name?</strong></button><em>你好！你叫什么名字？</em></span></div>
    <section class="speaking-assist" aria-labelledby="assistTitle">
      <div class="assist-heading"><span><small>AI 正在课程里陪你</small><strong id="assistTitle">卡住了？直接告诉星星</strong></span><span class="assist-status-dot" aria-hidden="true"></span></div>
      <div class="assist-tabs" role="tablist" aria-label="选择星星的帮助方式">
        <button type="button" role="tab" aria-selected="${mode === 'cn_to_en'}" data-assist-mode="cn_to_en">中文不会说</button>
        <button type="button" role="tab" aria-selected="${mode === 'en_feedback'}" data-assist-mode="en_feedback">我说了英语</button>
      </div>
      <label class="assist-input-label" for="speakingAssistInput">${mode === 'cn_to_en' ? '先用中文说想法，星星帮你变成简单英语' : '把刚才说的英语放这里，星星会温柔地帮你改'}</label>
      <textarea id="speakingAssistInput" maxlength="200" aria-describedby="assistInputHint assistInputError" placeholder="${mode === 'cn_to_en' ? '例如：我想和你做朋友' : '例如：I go to school yesterday'}">${escapeHtml(state.speakingAssistDraft)}</textarea>
      <p id="assistInputHint" class="assist-input-hint">语音识别后会先显示文字；确认无误再发送，不会自动提交。</p>
      <p id="assistInputError" class="assist-input-error" role="alert" hidden></p>
      <div class="assist-submit-row">
        <button type="button" class="assist-voice-button" data-assist-voice aria-pressed="${state.speakingAssistRecording}" ${recognitionAvailable ? '' : 'disabled'}>${state.speakingAssistRecording ? '录入完毕' : '点击开始录入'}</button>
        <button type="button" class="assist-send-button" data-assist-submit ${state.speakingAssistBusy ? 'disabled' : ''}>${state.speakingAssistBusy ? '星星正在想…' : '确认并请星星帮忙'}</button>
      </div>
      ${state.speakingAssistRecording ? '<p class="assist-recording-note" role="status"><span></span>正在持续监听。说完后，请再点一次“录入完毕”。</p>' : ''}
      ${recognitionAvailable ? '' : '<p class="assist-unavailable">当前浏览器不能语音转文字，可以直接打字或点下方备选台词。</p>'}
      ${resultHtml}
    </section>
    <div class="role-divider"><span>或者直接选一句</span></div>
    <div class="role-options" id="roleOptions">
      <button class="role-option" type="button" data-role-reply="Hello! I am a little wizard." data-knowledge-id="role_greeting">Hello! I am a little wizard.</button>
      <button class="role-option" type="button" data-role-reply="Nice to meet you, Star!" data-knowledge-id="role_friend">Nice to meet you, Star!</button>
    </div>
    <div class="lesson-feedback" id="roleFeedback" hidden></div>`;
}

function launchAssistRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || !state.assistRecordingRequested) return;
  const recognition = new Recognition();
  recognition.lang = state.speakingAssistMode === 'cn_to_en' ? 'zh-CN' : 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  state.assistRecognition = recognition;
  const startedAt = Date.now();
  const existingDraft = state.speakingAssistDraft;
  let receivedResult = false;
  recognition.onresult = event => {
    receivedResult = true;
    let transcript = '';
    for (let index = 0; index < event.results.length; index += 1) transcript += `${event.results[index]?.[0]?.transcript || ''} `;
    state.speakingAssistDraft = `${existingDraft} ${transcript}`.trim();
    const input = elements.lessonContent.querySelector('#speakingAssistInput');
    if (input) input.value = state.speakingAssistDraft;
  };
  recognition.onerror = event => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      state.assistRecordingRequested = false;
      showPointsToast('没有麦克风权限，可以直接打字继续。');
    } else if (!['no-speech', 'aborted'].includes(event.error)) {
      showPointsToast('这次没有听清，可以再录一次或直接修改文字。');
    }
  };
  recognition.onend = () => {
    if (state.assistRecognition === recognition) state.assistRecognition = null;
    if (state.assistRecordingRequested) {
      const endedImmediately = !receivedResult && Date.now() - startedAt < 350;
      if (endedImmediately) {
        state.assistRecordingRequested = false;
        state.speakingAssistRecording = false;
        renderRoleplayCoach();
        showPointsToast('当前浏览器没有持续开启语音识别，可以直接打字继续。');
        return;
      }
      state.assistRestartTimer = window.setTimeout(launchAssistRecognition, 180);
      return;
    }
    state.speakingAssistRecording = false;
    renderRoleplayCoach();
    elements.lessonContent.querySelector('#speakingAssistInput')?.focus();
  };
  try { recognition.start(); } catch {
    state.assistRecognition = null;
    state.assistRecordingRequested = false;
    state.speakingAssistRecording = false;
    renderRoleplayCoach();
    showPointsToast('语音识别没有启动，可以直接打字继续。');
  }
}

function startAssistRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;
  if (state.assistRecordingRequested) {
    state.assistRecordingRequested = false;
    clearTimeout(state.assistRestartTimer);
    state.assistRestartTimer = null;
    if (state.assistRecognition) state.assistRecognition.stop();
    else {
      state.speakingAssistRecording = false;
      renderRoleplayCoach();
    }
    return;
  }
  state.assistRecordingRequested = true;
  state.speakingAssistRecording = true;
  renderRoleplayCoach();
  launchAssistRecognition();
}

async function submitSpeakingAssist() {
  const input = elements.lessonContent.querySelector('#speakingAssistInput');
  const error = elements.lessonContent.querySelector('#assistInputError');
  const text = input?.value.trim() || '';
  state.speakingAssistDraft = text;
  if (!text) {
    error.hidden = false;
    error.textContent = '先说一句或输入一句，星星才能帮你。';
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
    return;
  }
  input?.removeAttribute('aria-invalid');
  error.hidden = true;
  state.speakingAssistBusy = true;
  renderRoleplayCoach();
  try {
    state.speakingAssistResult = await api('/api/speaking-assist', {
      method: 'POST', body: JSON.stringify({ mode: state.speakingAssistMode, text }),
    });
    trackPractice('role_ai_expression', 'AI 表达救援', state.speakingAssistMode);
  } catch (requestError) {
    showPointsToast(requestError.message || '星星暂时没有接住，再试一次吧。');
  } finally {
    state.speakingAssistBusy = false;
    renderRoleplayCoach();
  }
}

function renderReadingCoach() {
  const coach = elements.lessonContent.querySelector('#readingCoach');
  if (!coach) return;
  const sentence = 'A little cat sees a red bird.';
  const steps = ['听一遍', '看着读', '理解意思', '再听一遍', '尝试背诵'];
  const progress = Math.min(100, state.readingStage / steps.length * 100);
  let body = '';
  if (state.readingStage === 0) {
    body = `<div class="reading-card"><span>第 1 步 · 先只用耳朵听</span><strong>先不看文字，听星星读完整句子。</strong><button type="button" data-reading-action="listen-first">播放第一遍</button></div>`;
  } else if (state.readingStage === 1) {
    body = `<div class="reading-card"><span>第 2 步 · 看着读一遍</span><strong>${sentence}</strong><p>一只小猫看见一只红色的小鸟。</p><button type="button" data-reading-action="read-aloud">我已经看着读了一遍</button><small>体验版记录“已尝试朗读”，不虚构发音分数。</small></div>`;
  } else if (state.readingStage === 2) {
    body = `<div class="reading-card"><span>第 3 步 · 理解意思</span><strong>这句话说了什么？</strong><div class="meaning-options"><button type="button" data-meaning-answer="wrong">一只小狗追着小猫跑</button><button type="button" data-meaning-answer="correct">一只小猫看见红色小鸟</button><button type="button" data-meaning-answer="wrong">一只小鸟在树上睡觉</button></div><div id="meaningFeedback" class="lesson-feedback" hidden></div></div>`;
  } else if (state.readingStage === 3) {
    body = `<div class="reading-card"><span>第 4 步 · 带着理解再听</span><strong>${sentence}</strong><p>这次注意 little cat 和 red bird。</p><button type="button" data-reading-action="listen-second">播放第二遍</button></div>`;
  } else {
    const hint = state.readingHintLevel === 0 ? '先试着不看文字说出来。想不起来可以要提示。' : state.readingHintLevel === 1 ? '<b>A little…</b>（只提示开头）' : `<b>${sentence}</b><br>跟着提示再说一次也算认真练习。`;
    body = `<div class="reading-card recite-card"><span>第 5 步 · 尝试背一遍</span><strong>现在把句子藏起来啦</strong><p id="reciteHint">${hint}</p><div class="hint-actions"><button type="button" data-reading-action="hint-word" ${state.readingHintLevel >= 1 ? 'disabled' : ''}>给我开头提示</button><button type="button" data-reading-action="hint-full" ${state.readingHintLevel >= 2 ? 'disabled' : ''}>显示完整提示</button></div><div class="lesson-recorder"><button type="button" data-reading-action="${state.reciteRecording ? 'stop-recite-voice' : 'start-recite-voice'}">${state.reciteRecording ? '录入完毕' : state.reciteTranscript ? '重新录入背诵' : '点击开始背诵录音'}</button><div id="lessonReciteTranscript">${state.reciteTranscript || (state.reciteRecording ? '正在听，请开始背诵……' : '识别文字会显示在这里，不会自动提交。')}</div></div><button type="button" class="recite-fallback" data-reading-action="recite-fallback">无法使用语音？完成一次口头尝试后点这里</button><button id="reciteConfirm" type="button" class="primary-learning-action" data-reading-action="recite-done" ${state.reciteTranscript || state.reciteFallback ? '' : 'disabled'}>确认这次背诵尝试</button><small>系统只检查是否完成有效尝试，不虚构发音分数；背不到可以用提示后再录一次。</small></div>`;
  }
  coach.innerHTML = `<div class="learning-steps">${steps.map((step, index) => `<span data-state="${index < state.readingStage ? 'done' : index === state.readingStage ? 'current' : 'waiting'}"><b>${index + 1}</b>${step}</span>`).join('')}</div><div class="lesson-progress"><span style="width:${progress}%"></span></div>${body}`;
}

function renderChallengeCoach() {
  const coach = elements.lessonContent.querySelector('#challengeCoach');
  if (!coach) return;
  const questions = [
    { prompt: '哪个词是“小猫”？', answer: 'cat', options: ['dog', 'cat', 'bird'], id: 'challenge_q1' },
    { prompt: 'A little cat sees a red bird. 是什么意思？', answer: '一只小猫看见红色小鸟', options: ['小狗在跑', '一只小猫看见红色小鸟', '小鸟在唱歌'], id: 'challenge_q2' },
    { prompt: 'Star 说 “Hello!” 时，哪句回应最合适？', answer: 'Hello, Star!', options: ['Good night.', 'Hello, Star!', 'Three cats.'], id: 'challenge_q3' },
  ];
  const current = questions[state.challengeIndex];
  coach.innerHTML = `<div class="mission-directory"><span>原版萌芽之森 · 挑战节点</span><strong>${state.challengeIndex} / 3 已通过</strong><small>这是把原树状图内容融合进新 H5 的第一条可玩挑战分支。</small></div><div class="reading-card"><span>挑战 ${state.challengeIndex + 1}</span><strong>${current.prompt}</strong><div class="meaning-options">${current.options.map(option => `<button type="button" data-challenge-answer="${option}" data-answer-id="${current.id}">${option}</button>`).join('')}</div><div id="challengeFeedback" class="lesson-feedback" hidden></div></div>`;
}

function startReciteRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showPointsToast('当前浏览器不支持英语语音转写，请完成口头尝试后使用下方备用按钮。');
    return;
  }
  if (state.lessonRecognition) return;
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  state.reciteTranscript = '';
  state.reciteRecording = true;
  state.lessonRecognition = recognition;
  renderReadingCoach();
  recognition.onresult = event => {
    let text = '';
    for (let index = 0; index < event.results.length; index += 1) text += `${event.results[index]?.[0]?.transcript || ''} `;
    state.reciteTranscript = text.trim();
    const output = elements.lessonContent.querySelector('#lessonReciteTranscript');
    if (output) output.textContent = state.reciteTranscript || '正在听，请继续背诵……';
  };
  recognition.onerror = event => {
    const output = elements.lessonContent.querySelector('#lessonReciteTranscript');
    if (output) output.textContent = event.error === 'not-allowed' ? '没有麦克风权限，请使用下方口头尝试备用按钮。' : '这次没有听清，可以重新录入或使用提示。';
  };
  recognition.onend = () => {
    state.lessonRecognition = null;
    state.reciteRecording = false;
    renderReadingCoach();
  };
  try { recognition.start(); } catch { recognition.onend(); }
}

async function passLessonSection(sectionId, label) {
  if (state.lessonSectionPassed) return true;
  const saved = await awardProgress('section', sectionId, state.currentLevelId, label);
  if (!saved) return false;
  state.lessonSectionPassed = true;
  clearTimeout(state.autoReturnTimer);
  if (state.currentPreview || state.demoOnly) return true;
  const destination = state.returnToPlan ? '今日任务目录' : '关卡总地图';
  const status = document.createElement('div');
  status.className = 'completion-status';
  status.innerHTML = `<strong>这个任务完成啦！</strong><span>星星正在带你返回${destination}…</span>`;
  elements.lessonContent.append(status);
  if (!state.returnToPlan && sectionId !== 'forest_challenge_section') {
    await awardProgress('chapter', state.currentLevelId, state.currentLevelId, `第 ${state.currentLevelId.slice(1)} 关章节`);
  }
  state.autoReturnTimer = window.setTimeout(() => {
    if (state.returnToPlan) renderLesson('plan');
    else showScreen('map');
  }, 1300);
  return true;
}

async function checkAiHealth() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('unavailable');
    const health = await response.json();
    const provider = modelProvider(health.provider);
    const fallbackText = health.configuredFallback ? ' · 已启用备用模型' : '';
    setAiStatus('cloud', `${provider?.name || '云端 AI'} · ${health.model || '已连接'}${fallbackText}`);
  } catch {
    setAiStatus('local', '尚未配置模型 · 可体验本地课程引导');
  }
}

function setupRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    elements.talkHint.textContent = '当前浏览器不支持录音识别；请打字或点击建议按钮';
    elements.talk.disabled = true;
    return;
  }
  const updateTimer = () => {
    const elapsed = Math.floor((Date.now() - state.recordingStartedAt) / 1000);
    elements.recordingTimer.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  };
  const finishReview = () => {
    clearInterval(state.recordingTimerId);
    state.recordingTimerId = null;
    state.recognition = null;
    elements.talk.classList.remove('is-listening');
    elements.talk.hidden = false;
    elements.voiceRecording.hidden = true;
    elements.voiceReview.hidden = false;
    const transcript = `${state.recognitionFinal} ${state.recognitionInterim}`.trim();
    elements.voiceTranscript.value = transcript;
    elements.voiceTranscript.focus();
    elements.talkLabel.textContent = '点击开始语音录入';
    elements.talkHint.textContent = '录入时会实时显示文字，不会自动发送';
  };
  const start = () => {
    if (state.busy || state.recognition) return;
    window.speechSynthesis?.cancel();
    state.recognitionFinal = '';
    state.recognitionInterim = '';
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) state.recognitionFinal += `${text} `;
        else interim += text;
      }
      state.recognitionInterim = interim;
      elements.liveTranscript.textContent = `${state.recognitionFinal}${interim}`.trim() || '星星正在听，请开始说话……';
    };
    recognition.onerror = event => {
      elements.liveTranscript.textContent = event.error === 'not-allowed'
        ? '没有麦克风权限。你仍可以在确认框里打字，或返回点击建议按钮。'
        : '这次没有听清。可以修改识别文字，或重新录入。';
    };
    recognition.onend = finishReview;
    state.recognition = recognition;
    elements.talk.classList.add('is-listening');
    elements.talk.hidden = true;
    elements.voiceReview.hidden = true;
    elements.voiceRecording.hidden = false;
    elements.liveTranscript.textContent = '星星正在听，请开始说话……';
    state.recordingStartedAt = Date.now();
    updateTimer();
    state.recordingTimerId = window.setInterval(updateTimer, 1000);
    try { recognition.start(); } catch { recognition.onend(); }
  };
  elements.talk.addEventListener('click', start);
  elements.finishRecording.addEventListener('click', () => state.recognition?.stop());
  elements.retryVoice.addEventListener('click', start);
  elements.confirmVoice.addEventListener('click', () => {
    const value = elements.voiceTranscript.value.trim();
    if (!value) {
      elements.voiceTranscript.focus();
      showPointsToast('还没有可发送的文字，可以重新录入或直接修改。');
      return;
    }
    elements.voiceReview.hidden = true;
    elements.talk.hidden = false;
    elements.voiceTranscript.value = '';
    void sendMessage(value);
  });
}

elements.input.addEventListener('input', () => { elements.send.disabled = state.busy || !elements.input.value.trim(); });
elements.composer.addEventListener('submit', event => {
  event.preventDefault();
  const value = elements.input.value;
  elements.input.value = '';
  elements.send.disabled = true;
  void sendMessage(value);
});
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  state.currentPreview = false;
  track('prompt_selected', { mode: button.dataset.mode });
  void sendMessage(button.dataset.prompt, button.dataset.mode);
}));
elements.chatLog.addEventListener('click', event => {
  const button = event.target.closest('[data-message-id]');
  if (!button || button.disabled) return;
  const message = state.messages.find(item => item.id === button.dataset.messageId);
  if (message) void speakText(message.text, message.id);
});
elements.startLesson.addEventListener('click', () => renderLesson(state.currentMode));
elements.closeLesson.addEventListener('click', () => {
  clearTimeout(state.autoReturnTimer);
  state.lessonRecognition?.stop();
  state.assistRecordingRequested = false;
  clearTimeout(state.assistRestartTimer);
  state.assistRecognition?.stop();
  if (state.returnToPlan && state.currentMode !== 'plan') renderLesson('plan');
  else showScreen('map');
});
elements.lessonContent.addEventListener('click', async event => {
  const assistMode = event.target.closest('[data-assist-mode]');
  if (assistMode) {
    state.assistRecordingRequested = false;
    clearTimeout(state.assistRestartTimer);
    state.assistRecognition?.stop();
    state.speakingAssistMode = assistMode.dataset.assistMode;
    state.speakingAssistDraft = '';
    state.speakingAssistResult = null;
    renderRoleplayCoach();
    elements.lessonContent.querySelector('#speakingAssistInput')?.focus();
    return;
  }
  const assistVoice = event.target.closest('[data-assist-voice]');
  if (assistVoice) {
    startAssistRecognition();
    return;
  }
  const assistSubmit = event.target.closest('[data-assist-submit]');
  if (assistSubmit) {
    await submitSpeakingAssist();
    return;
  }
  const assistSpeak = event.target.closest('[data-assist-speak]');
  if (assistSpeak) {
    await speakText(assistSpeak.dataset.assistSpeak);
    return;
  }
  const assistRetry = event.target.closest('[data-assist-retry]');
  if (assistRetry) {
    state.speakingAssistResult = null;
    renderRoleplayCoach();
    elements.lessonContent.querySelector('#speakingAssistInput')?.focus();
    return;
  }
  const assistContinue = event.target.closest('[data-assist-continue]');
  if (assistContinue) {
    elements.lessonContent.querySelector('#roleOptions')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    showPointsToast('现在选一句回应，或用星星刚教你的句子再说一次。');
    return;
  }
  const launch = event.target.closest('[data-launch-mode]');
  if (launch) {
    state.currentMode = launch.dataset.launchMode;
    state.demoOnly = false;
    renderLesson(state.currentMode);
    return;
  }
  const practice = event.target.closest('[data-practice-speak]');
  if (practice) {
    trackPractice(practice.dataset.contentId, practice.dataset.contentLabel, 'listened');
    await speakText(practice.dataset.practiceSpeak);
    showPointsToast('已记录一次听音练习；答对下面的问题才算掌握。');
    return;
  }
  const readingAction = event.target.closest('[data-reading-action]');
  if (readingAction) {
    const action = readingAction.dataset.readingAction;
    const sentence = 'A little cat sees a red bird.';
    if (action === 'listen-first' || action === 'listen-second') {
      trackPractice('story_core_flow', '核心句听读背', action === 'listen-first' ? 'listen_first' : 'listen_again');
      readingAction.disabled = true;
      await speakText(sentence);
      state.readingStage += 1;
      renderReadingCoach();
    } else if (action === 'read-aloud') {
      trackPractice('story_core_flow', '核心句听读背', 'read_aloud_attempt');
      state.readingStage = 2;
      renderReadingCoach();
    } else if (action === 'hint-word') {
      state.readingHintLevel = Math.max(state.readingHintLevel, 1);
      trackPractice('story_core_flow', '核心句听读背', 'recite_hint_first_word');
      renderReadingCoach();
    } else if (action === 'hint-full') {
      state.readingHintLevel = 2;
      trackPractice('story_core_flow', '核心句听读背', 'recite_hint_full');
      renderReadingCoach();
    } else if (action === 'start-recite-voice') {
      startReciteRecognition();
    } else if (action === 'stop-recite-voice') {
      state.lessonRecognition?.stop();
    } else if (action === 'recite-fallback') {
      state.reciteFallback = true;
      trackPractice('story_core_flow', '核心句听读背', 'voice_unavailable_self_attempt');
      renderReadingCoach();
    } else if (action === 'recite-done') {
      if (!state.reciteTranscript && !state.reciteFallback) {
        showPointsToast('请先完成一次背诵录入，或使用无法语音时的备用入口。');
        return;
      }
      const voiceOutcome = state.reciteTranscript ? 'voice_transcript_confirmed' : 'voice_unavailable_self_attempt_confirmed';
      trackPractice('story_core_flow', '核心句听读背', `${voiceOutcome}${state.readingHintLevel ? '_with_hint' : '_without_hint'}`);
      await awardProgress('knowledge', 'story_core_flow', state.currentLevelId, '核心句听读背');
      state.readingStage = 5;
      await passLessonSection('reading_section', '听读背与理解板块');
    }
    return;
  }
  const meaningAnswer = event.target.closest('[data-meaning-answer]');
  if (meaningAnswer) {
    const correct = meaningAnswer.dataset.meaningAnswer === 'correct';
    trackPractice('story_core_meaning', '核心句意思理解', correct ? 'correct' : 'incorrect');
    const feedback = elements.lessonContent.querySelector('#meaningFeedback');
    if (!correct) {
      feedback.hidden = false;
      feedback.textContent = '再看看：cat 是小猫，sees 是看见，red bird 是红色小鸟。';
      return;
    }
    await awardProgress('knowledge', 'story_core_meaning', state.currentLevelId, '核心句意思理解');
    state.readingStage = 3;
    renderReadingCoach();
    return;
  }
  const wordAnswer = event.target.closest('[data-word-answer]');
  if (wordAnswer) {
    const quiz = [
      { answer: 'cat', zh: '小猫', id: 'word_cat', label: '单词 cat' },
      { answer: 'dog', zh: '小狗', id: 'word_dog', label: '单词 dog' },
      { answer: 'bird', zh: '小鸟', id: 'word_bird', label: '单词 bird' },
    ];
    const current = quiz[state.wordQuizIndex];
    const correct = wordAnswer.dataset.wordAnswer === current.answer;
    trackPractice(current.id, current.label, correct ? 'correct' : 'incorrect');
    const feedback = elements.lessonContent.querySelector('#wordFeedback');
    feedback.hidden = false;
    if (!correct) {
      feedback.textContent = `再想一想：${current.zh} 的英语不是 ${wordAnswer.dataset.wordAnswer}。可以先点上面的卡片听一听。`;
      return;
    }
    await awardProgress('knowledge', current.id, state.currentLevelId, current.label);
    state.wordQuizIndex += 1;
    if (state.wordQuizIndex >= quiz.length) {
      feedback.textContent = 'Three out of three! 三题都答对了，单词板块已自动通过。';
      elements.lessonContent.querySelector('#wordAnswers').hidden = true;
      elements.lessonContent.querySelector('#wordQuestion').textContent = '听音选义：3 / 3 已通过';
      await passLessonSection('words_section', '动物单词板块');
    } else {
      const next = quiz[state.wordQuizIndex];
      feedback.textContent = `答对了！下一题继续认识“${next.zh}”。`;
      elements.lessonContent.querySelector('#wordQuestion').innerHTML = `<strong>第 ${state.wordQuizIndex + 1} 题：</strong>哪个词是“${next.zh}”？`;
    }
    return;
  }
  const reply = event.target.closest('[data-role-reply]');
  if (reply) {
    trackPractice(reply.dataset.knowledgeId, '情景对话回应', 'responded');
    await speakText(reply.dataset.roleReply);
    await awardProgress('knowledge', reply.dataset.knowledgeId, state.currentLevelId, '情景对话回应');
    await passLessonSection('roleplay_section', '情景演绎板块');
    const feedback = elements.lessonContent.querySelector('#roleFeedback');
    feedback.hidden = false;
    feedback.textContent = `Star: Nice to meet you! 说得很棒，我们已经完成一轮情景对话。`;
    return;
  }
  const challengeAnswer = event.target.closest('[data-challenge-answer]');
  if (challengeAnswer) {
    const answers = ['cat', '一只小猫看见红色小鸟', 'Hello, Star!'];
    const correct = challengeAnswer.dataset.challengeAnswer === answers[state.challengeIndex];
    trackPractice(challengeAnswer.dataset.answerId, '萌芽之森综合挑战', correct ? 'correct' : 'incorrect');
    const feedback = elements.lessonContent.querySelector('#challengeFeedback');
    if (!correct) {
      feedback.hidden = false;
      feedback.textContent = '还差一点，回想一下刚才的单词、句子意思和问候方式。';
      return;
    }
    await awardProgress('knowledge', challengeAnswer.dataset.answerId, state.currentLevelId, `挑战题 ${state.challengeIndex + 1}`);
    state.challengeIndex += 1;
    if (state.challengeIndex >= 3) await passLessonSection('forest_challenge_section', '萌芽之森综合挑战');
    else renderChallengeCoach();
  }
});

elements.lessonContent.addEventListener('input', event => {
  if (event.target.matches('#speakingAssistInput')) {
    state.speakingAssistDraft = event.target.value;
    event.target.removeAttribute('aria-invalid');
    const error = elements.lessonContent.querySelector('#assistInputError');
    if (error) error.hidden = true;
  }
});

document.querySelectorAll('[data-screen-target]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screenTarget)));
document.querySelectorAll('[data-summary-range]').forEach(button => button.addEventListener('click', () => void loadLearningSummary(button.dataset.summaryRange)));
elements.dailyPlan.addEventListener('click', () => {
  state.currentLevelId = 'l1';
  state.currentMode = 'plan';
  state.currentPreview = false;
  state.demoOnly = false;
  state.returnToPlan = true;
  showNextStep('plan');
  track('level_selected', { levelId: 'l1', mode: 'plan', source: 'daily_plan' });
});

elements.levelPanel.addEventListener('click', event => {
  const entry = event.target.closest('[data-learning-entry]');
  if (!entry || entry.disabled) return;
  const mode = entry.dataset.learningEntry;
  if (!modeInfo[mode]) return;
  state.currentLevelId = 'l1';
  state.currentMode = mode;
  state.currentPreview = false;
  state.demoOnly = false;
  state.returnToPlan = mode === 'plan';
  showNextStep(mode);
  track('level_selected', { levelId: 'l1', mode, source: 'learning_hub' });
});

elements.checkIn.addEventListener('click', async () => {
  elements.checkIn.disabled = true;
  try {
    const result = await api('/api/check-in', { method: 'POST', body: '{}' });
    state.growth = result.state;
    renderGrowth();
    showPointsToast(result.awarded ? `签到成功，获得 ${result.awarded} 积分！` : '今天已经签到过啦。');
  } catch {
    elements.checkIn.disabled = false;
    showPointsToast('签到没有保存成功，请稍后再试。');
  }
});

elements.levelMap.addEventListener('click', event => {
  const challenge = event.target.closest('[data-challenge-id]');
  if (challenge && !challenge.disabled) {
    state.currentLevelId = 'l1';
    state.currentMode = 'challenge';
    state.returnToPlan = false;
    state.currentPreview = challenge.dataset.preview === 'true';
    state.demoOnly = state.currentPreview;
    showNextStep('challenge');
    elements.nextTitle.textContent = '萌芽之森 · 颜色测验挑战';
    elements.nextDescription.textContent = challenge.dataset.preview === 'true' ? '当前为免测试预览，不产生掌握记录。' : '综合检查单词、句意和问候表达，完成后自动返回地图。';
    track('level_selected', { levelId: 'l1', mode: 'challenge', source: state.currentPreview ? 'local_demo' : 'tree_challenge' });
    return;
  }
  const button = event.target.closest('[data-level-id]');
  if (!button || button.disabled) return;
  const level = levels.find(item => item.id === button.dataset.levelId);
  if (!level) return;
  state.currentLevelId = level.id;
  state.currentMode = level.mode;
  state.returnToPlan = false;
  state.currentPreview = button.dataset.preview === 'true';
  state.demoOnly = state.currentPreview;
  showNextStep(level.mode);
  elements.nextTitle.textContent = `第 ${level.number} 关 · ${level.title}`;
  elements.nextDescription.textContent = `${level.knowledge}。${button.dataset.preview === 'true' ? '当前为免测试预览，不产生掌握记录。' : '完成后可获得章节积分。'}`;
  track('level_selected', { levelId: level.id, mode: level.mode, source: button.dataset.preview === 'true' ? 'local_demo' : 'normal' });
});

function advanceDemo() {
  track('demo_advance', { screen: state.currentScreen, outcome: 'navigation_only' });
  if (state.currentScreen === 'home') {
    showScreen('map');
    return;
  }
  if (state.currentScreen === 'map') {
    const level = levels[0];
    state.currentLevelId = level.id;
    state.currentMode = level.mode;
    state.currentPreview = true;
    state.demoOnly = true;
    showNextStep(level.mode);
    elements.nextTitle.textContent = `验收预览 · 第 ${level.number} 关`;
    elements.nextDescription.textContent = '万能键只带你查看下一页，不会把任务标记为完成，也不会增加积分。';
    return;
  }
  if (state.currentScreen === 'task' && !elements.nextStep.hidden) {
    renderLesson(state.currentMode);
    return;
  }
  if (state.currentScreen === 'task') {
    showScreen('report');
    return;
  }
  showScreen('home');
}

elements.testAdvance.addEventListener('click', advanceDemo);

elements.modelSettingsButton.addEventListener('click', () => { void openModelCenter(); });
elements.closeModelSettings.addEventListener('click', () => elements.modelSettingsDialog.close());
elements.cancelModelSettings.addEventListener('click', () => elements.modelSettingsDialog.close());
elements.modelSettingsDialog.addEventListener('cancel', event => {
  event.preventDefault();
  elements.modelSettingsDialog.close();
});

document.querySelectorAll('[data-provider-select]').forEach(select => {
  select.addEventListener('change', () => renderModelChoices(select.dataset.providerSelect));
});

document.querySelectorAll('[data-model-select]').forEach(select => {
  select.addEventListener('change', () => {
    const nodes = modelSlotNodes(select.dataset.modelSelect);
    nodes.customModel.hidden = select.value !== '__custom__';
    if (!nodes.customModel.hidden) nodes.customModel.focus();
  });
});

document.querySelectorAll('[data-toggle-key]').forEach(button => {
  button.addEventListener('click', () => {
    const input = modelSlotNodes(button.dataset.toggleKey).apiKey;
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? '显示' : '隐藏';
  });
});

elements.fallbackEnabled.addEventListener('change', updateFallbackAvailability);

elements.modelSettingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = document.querySelector('#saveModelSettings');
  submit.disabled = true;
  setModelFormStatus('正在把配置安全保存到本机后端…');
  try {
    await saveModelCenter();
  } catch (error) {
    setModelFormStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll('[data-test-model]').forEach(button => {
  button.addEventListener('click', async () => {
    const slot = button.dataset.testModel;
    button.disabled = true;
    setModelFormStatus(`正在保存并测试${slot === 'fallback' ? '备用' : '主'}模型，会消耗极少量 Token…`);
    try {
      await saveModelCenter();
      const result = await api('/api/model/test', { method: 'POST', body: JSON.stringify({ slot }) });
      setModelFormStatus(`${result.provider} · ${result.model} 连接成功（${result.durationMs}ms）`, 'success');
    } catch (error) {
      setModelFormStatus(`连接失败：${error.message}`, 'error');
    } finally {
      updateFallbackAvailability();
      if (slot === 'primary') button.disabled = false;
    }
  });
});

elements.reset.addEventListener('click', () => {
  if (!window.confirm('重新开始后会清空本机上的对话记录。继续吗？')) return;
  localStorage.removeItem('star-h5-dialogue-v2');
  state.currentAudio?.pause();
  state.currentAudio = null;
  state.messages = [];
  elements.chatLog.innerHTML = '';
  elements.nextStep.hidden = true;
  elements.lessonPanel.hidden = true;
  showScreen('home');
  addMessage('star', "Hi! I'm Star. How are you today?\n你好呀，我是星星。开心、难过或想分享一件小事，都可以告诉我。", 'done');
});

const saved = JSON.parse(localStorage.getItem('star-h5-dialogue-v2') || '[]');
if (Array.isArray(saved) && saved.length) {
  state.messages = saved.map(message => message.status === 'streaming'
    ? { ...message, text: '刚才的话没有说完。你可以继续告诉星星，或者点一个对话建议。', status: 'local' }
    : message);
  state.messages.forEach(renderMessage);
} else {
  addMessage('star', "Hi! I'm Star. How are you today?\n你好呀，我是星星。开心、难过或想分享一件小事，都可以告诉我。", 'done');
}

void refreshVoiceName();
if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => { void refreshVoiceName(); };
setupRecognition();
void loadModelCenter().then(checkAiHealth).catch(checkAiHealth);
void loadGrowthState();
showScreen('home');
track('session_started', { voiceAvailable: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition) });
