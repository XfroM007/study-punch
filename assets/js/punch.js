// punch.js
// 打卡逻辑：古文 / 单词 / 连续天数 / 积分 / 成就解锁
// shim.js 会挂全局 window.Punch，这里用 var S 占位
var S = window.Storage || {};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isTodayDone() {
  const today = S.get('today');
  return today && today.date === todayStr() && today.completed;
}

// 计算连续天数（基于 history 倒推）
function calcStreak() {
  const history = S.get('history') || {};
  let streak = 0;
  const d = new Date();
  // 今天未打卡不算断
  if (!history[todayStr()]) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const k = `${y}-${m}-${day}`;
    if (history[k] && history[k].completed) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function addPoints(n) {
  S.set('points', (S.get('points') || 0) + n);
}

// 完成古文打卡
function completeClassic(classicId) {
  S.addReadClassic(classicId);
  S.updateToday({ classicId, classicDone: true });
  addPoints(10);
  checkAchievements();
}

// 完成单词打卡（id 数组）
function completeWords(wordIds, wrongOnes = []) {
  const total = (S.get('totalWords') || 0) + wordIds.length;
  S.set('totalWords', total);
  S.updateToday({ wordIds, wordDone: true, wordCount: wordIds.length });
  // 生词本
  for (const w of wrongOnes) S.addVocab(w);
  addPoints(5);
  checkAchievements();
}

// 完成今日（古典+单词都做完）
function completeDay() {
  const date = todayStr();
  const today = S.get('today') || {};
  S.recordDay(date, {
    classicId: today.classicId,
    wordIds: today.wordIds || [],
    completed: true,
    completedAt: Date.now()
  });
  S.updateToday({ completed: true, date });
  // 积分
  const streak = calcStreak();
  let bonus = 10; // 基础
  if (streak >= 30) bonus += 50;
  else if (streak >= 7) bonus += 20;
  addPoints(bonus);
  S.set('streak', streak);
  S.set('totalDays', (S.get('totalDays') || 0) + 1);
  checkAchievements();
}

// 成就定义
const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', name: '初出茅庐', desc: '完成首次打卡', check: (s) => s.totalDays >= 1 },
  { id: 'streak3', icon: '🔥', name: '三日连击', desc: '连续 3 天', check: (s) => s.streak >= 3 },
  { id: 'streak7', icon: '⚡', name: '一周之力', desc: '连续 7 天', check: (s) => s.streak >= 7 },
  { id: 'streak30', icon: '🌟', name: '月度坚守', desc: '连续 30 天', check: (s) => s.streak >= 30 },
  { id: 'classic1', icon: '📜', name: '一文已读', desc: '完读 1 篇', check: (s) => s.readClassic.length >= 1 },
  { id: 'classic3', icon: '📚', name: '三篇在握', desc: '完读 3 篇', check: (s) => s.readClassic.length >= 3 },
  { id: 'classic5', icon: '🏛️', name: '五经通读', desc: '完读 5 篇', check: (s) => s.readClassic.length >= 5 },
  { id: 'classicAll', icon: '👑', name: '古文全收', desc: '完读全部', check: (s) => s.readClassic.length >= 14 },
  { id: 'words100', icon: '💯', name: '百词斩', desc: '累计 100 词', check: (s) => s.totalWords >= 100 },
  { id: 'words500', icon: '🚀', name: '五百里程', desc: '累计 500 词', check: (s) => s.totalWords >= 500 },
  { id: 'words1000', icon: '🏆', name: '千词之王', desc: '累计 1000 词', check: (s) => s.totalWords >= 1000 },
  { id: 'points500', icon: '💎', name: '积分达人', desc: '积分达 500', check: (s) => s.points >= 500 }
];

function checkAchievements() {
  const stats = {
    streak: S.get('streak') || 0,
    totalDays: S.get('totalDays') || 0,
    readClassic: S.get('readClassic') || [],
    totalWords: S.get('totalWords') || 0,
    points: S.get('points') || 0
  };
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (S.addAchievement(a.id)) {
      newly.push(a);
    }
  }
  return newly;
}

function getAllAchievements() {
  const unlocked = S.get('achievements') || [];
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: unlocked.includes(a.id) }));
}

// 工具：洗牌
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 给一个单词生成 4 选 1
function makeWordChoices(target, allWords) {
  const others = shuffle(allWords.filter(w => w.en !== target.en)).slice(0, 3);
  const opts = shuffle([target, ...others]);
  return {
    options: opts.map(w => w.zh),
    answerIndex: opts.findIndex(w => w.en === target.en)
  };
}
// ===== 挂全局（file:// 双击运行需要） =====
// 注：这套是 agent-B 前端写的，与 ui.js 配套的轻量版（agent-C 的严格两阶段提交不在内）
window.Punch = {
  todayStr, isTodayDone, calcStreak, completeClassic, completeWords, completeDay,
  checkAchievements, getAllAchievements, shuffle, makeWordChoices, addPoints
};
