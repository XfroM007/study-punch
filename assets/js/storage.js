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
  // 生词本
  vocab: [],
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
  const list = get('vocab') || [];
  if (!list.find(v => v.en === en)) {
    list.push({ en, addedAt: Date.now() });
    set('vocab', list);
  }
  return list;
}

function removeVocab(en) {
  const list = (get('vocab') || []).filter(v => v.en !== en);
  set('vocab', list);
  return list;
}

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

var __x = { DEFAULTS };
// ===== 挂全局（file:// 双击运行需要） =====
// 注：前端 agent-B 自创的 storage API（与 agent-C 命名不同，但已与 ui.js 配对）
window.PunchStorage = {
  init: () => {},  // noop（这套存储直接读 localStorage，无需 init）
  getAll, get, set, updateToday, clearToday, recordDay,
  addReadClassic, addAchievement, addVocab, removeVocab,
  exportJSON, importJSON, resetAll,
  DEFAULTS
};
