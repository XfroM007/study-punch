// storage.js
// localStorage 持久化层。
// key 命名: study-punch:v1:*
// 与 agent-C 对齐的命名空间（agent-C 也用同一前缀）。

const PREFIX = 'study-punch:v1';

const DEFAULTS = {
  // 今日状态
  today: null,
  // 历史打卡记录: { 'YYYY-MM-DD': { classicId, wordIds: [...], score } }
  history: {},
  // 连续天数
  streak: 0,
  // 累计天数
  totalDays: 0,
  // 已读古文 ID 集合（数组形式以便 JSON 序列化）
  readClassic: [],
  // 累计单词数
  totalWords: 0,
  // 积分
  points: 0,
  // 已达成成就 ID 集合
  achievements: [],
  // 生词本 / 错题本（对齐 docs/数据结构.md 中 wrong-words 字段）
  // 字段：{ en, wrongCount, correctStreak, lastWrong }
  wrongWords: [],
  // 用户设置
  settings: {
    theme: 'deep',
    reminderTime: '20:00',
    dailyGoal: { classic: 1, words: 20 }
  }
};

function key(k) { return `${PREFIX}:${k}`; }

function getAll() {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    try {
      const raw = localStorage.getItem(key(k));
      out[k] = raw ? JSON.parse(raw) : DEFAULTS[k];
    } catch (e) {
      out[k] = DEFAULTS[k];
    }
  }
  return out;
}

function get(k) {
  try {
    const raw = localStorage.getItem(key(k));
    return raw ? JSON.parse(raw) : DEFAULTS[k];
  } catch (e) {
    return DEFAULTS[k];
  }
}

function set(k, v) {
  localStorage.setItem(key(k), JSON.stringify(v));
}

function updateToday(patch) {
  const today = get('today') || {};
  const next = { ...today, ...patch, updatedAt: Date.now() };
  set('today', next);
  return next;
}

function clearToday() {
  set('today', null);
}

function recordDay(dateStr, payload) {
  const history = get('history') || {};
  history[dateStr] = { ...(history[dateStr] || {}), ...payload };
  set('history', history);
}

function addReadClassic(id) {
  const list = get('readClassic') || [];
  if (!list.includes(id)) {
    list.push(id);
    set('readClassic', list);
  }
  return list;
}

function addAchievement(id) {
  const list = get('achievements') || [];
  if (!list.includes(id)) {
    list.push(id);
    set('achievements', list);
    return true; // 新达成
  }
  return false;
}

function addVocab(en) {
  // 兼容旧 key：从 vocab 迁移到 wrongWords
  const oldList = get('vocab') || [];
  if (oldList.length && !(get('wrongWords') || []).length) {
    set('wrongWords', oldList.map(v => ({
      en: v.en,
      wrongCount: 1,
      correctStreak: 0,
      lastWrong: v.addedAt || Date.now()
    })));
    set('vocab', []);
  }
  const list = get('wrongWords') || [];
  const existing = list.find(v => v.en === en);
  if (existing) {
    existing.wrongCount = (existing.wrongCount || 1) + 1;
    existing.correctStreak = 0;
    existing.lastWrong = Date.now();
  } else {
    list.push({ en, wrongCount: 1, correctStreak: 0, lastWrong: Date.now() });
  }
  set('wrongWords', list);
  return list;
}

function removeVocab(en) {
  const list = (get('wrongWords') || []).filter(v => v.en !== en);
  set('wrongWords', list);
  return list;
}

// 答对时调用：连续答对 N 次后自动从错题本移出
function markWordCorrect(en) {
  const list = get('wrongWords') || [];
  const target = PUNISH_CONFIG.removeAfterCorrect; // 移出门槛
  let removed = false;
  const next = [];
  for (const v of list) {
    if (v.en === en) {
      v.correctStreak = (v.correctStreak || 0) + 1;
      v.lastWrong = v.lastWrong || Date.now();
      if (v.correctStreak >= target) {
        removed = true;
        continue; // 移出
      }
    }
    next.push(v);
  }
  set('wrongWords', next);
  return removed;
}

const PUNISH_CONFIG = {
  removeAfterCorrect: 3,  // 连续答对 3 次移出错题本
  wrongRatio: 0.4         // 每日推送中错题占比
};

function exportJSON() {
  return JSON.stringify(getAll(), null, 2);
}

function importJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    for (const k of Object.keys(DEFAULTS)) {
      if (data[k] !== undefined) set(k, data[k]);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function resetAll() {
  for (const k of Object.keys(DEFAULTS)) {
    localStorage.removeItem(key(k));
  }
}

var __x = { DEFAULTS, PUNISH_CONFIG };
// ===== 挂全局（file:// 双击运行需要） =====
// 注：前端 agent-B 自创的 storage API（与 agent-C 命名不同，但已与 ui.js 配对）
window.PunchStorage = {
  init: () => {},  // noop（这套存储直接读 localStorage，无需 init）
  getAll, get, set, updateToday, clearToday, recordDay,
  addReadClassic, addAchievement, addVocab, removeVocab, markWordCorrect,
  exportJSON, importJSON, resetAll,
  DEFAULTS, PUNISH_CONFIG
};
