// ui.js
// 渲染主页 / 古文打卡 / 单词打卡 / 进度 / 成就 / 设置 + 交互

var S = window.Storage;
var P = window.Punch;
// loadClassic / loadWords 由 data-loader.js 提供

// 全局状态（运行期）
const State = {
  classic: null,
  words: [],
  currentPage: 'home',
  classicSession: null,  // { article, currentIdx, mode: 'fill'|'choice' }
  wordSession: null,     // { queue, currentIdx, mode, currentWord, choices }
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============== 入口 ==============
async function boot() {
  State.classic = await loadClassic();
  State.words = (await loadWords()).words;
  bindTabbar();
  bindSettings();
  renderHome();
  renderAchievements();
  renderSettings();
  // 首次进入：根据今天是否已打卡更新按钮
  updateTodayButton();
}

// ============== Tab 切换 ==============
function bindTabbar() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      switchPage(target);
    });
  });
}

function switchPage(name) {
  State.currentPage = name;
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $(`#page-${name}`);
  if (target) target.classList.add('active');
  $$('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.target === name);
  });
  // 页面专属刷新
  if (name === 'progress') renderProgress();
  if (name === 'achievement') renderAchievements();
  if (name === 'settings') renderSettings();
  if (name === 'home') {
    renderHome();
    updateTodayButton();
  }
}

// ============== 主页 ==============
function renderHome() {
  // 日期
  const d = new Date();
  const wkMap = ['日', '一', '二', '三', '四', '五', '六'];
  $('#topbar-date').textContent =
    `${d.getMonth() + 1}月${d.getDate()}日 · 周${wkMap[d.getDay()]}`;

  // 连续 + 积分
  const streak = P.calcStreak();
  const points = S.get('points') || 0;
  $('#topbar-streak-num').textContent = streak;
  $('#topbar-points-num').textContent = points;

  // 今日卡片
  const today = S.get('today') || {};
  const classicDone = today.classicDone;
  const wordDone = today.wordDone;

  // 选一篇古文（轮换：取今天 + 已读长度）
  const articles = State.classic.articles;
  const readList = S.get('readClassic') || [];
  const remaining = articles.filter(a => !readList.includes(a.id));
  const todays = remaining.length > 0 ? remaining[0] : articles[0];
  const article = today.classicId ? articles.find(a => a.id === today.classicId) || todays : todays;

  if (!today.classicId) {
    S.updateToday({ classicId: article.id, date: P.todayStr() });
  }

  $('#today-title').textContent = article.title;
  $('#today-author').textContent = `${article.dynasty} · ${article.author}`;
  $('#today-desc').innerHTML = article.keySentences
    .slice(0, 2)
    .map(s => `<div>${s}</div>`)
    .join('');

  // 进度
  const sentTotal = article.keySentences.length + (article.keyChoices?.length || 0);
  const sentDone = today.classicSentDone || 0;
  $('#today-progress-text').textContent = `${Math.min(sentDone, sentTotal)} / ${sentTotal}`;
  $('#today-progress-fill').style.width = `${(sentDone / sentTotal) * 100}%`;

  // 标签
  const tags = [`<span class="tag">难度 ${article.difficulty}</span>`];
  if (classicDone) tags.push('<span class="tag tag-pink">✓ 古文已完成</span>');
  if (wordDone) tags.push('<span class="tag tag-violet">✓ 单词已完成</span>');
  if (!classicDone && !wordDone) tags.push('<span class="tag">待打卡</span>');
  $('#today-tags').innerHTML = tags.join('');

  // 三栏统计
  $('#stat-classic-num').textContent = readList.length;
  $('#stat-words-num').textContent = S.get('totalWords') || 0;
  const achCount = (S.get('achievements') || []).length;
  $('#stat-achievement-num').textContent = achCount;
  $('#stat-classic-sub').textContent = `/ ${articles.length}`;
  $('#stat-achievement-sub').textContent = '/ 12';

  // 今日按钮文字
  updateTodayButton();
}

function updateTodayButton() {
  const btn = $('#btn-start-today');
  const today = S.get('today') || {};
  const bothDone = today.classicDone && today.wordDone;
  btn.textContent = bothDone ? '✓ 今日已完成 · 查看进度' : '开始今日打卡';
}

// ============== 今日打卡入口（智能路由） ==============
function startTodayPunch() {
  const today = S.get('today') || {};
  if (!today.classicDone) {
    openClassicPunch();
  } else if (!today.wordDone) {
    openWordPunch();
  } else {
    showToast('今日已完成 ✓', 1400);
    switchPage('progress');
  }
}

// ============== 古文打卡页 ==============
function openClassicPunch() {
  const today = S.get('today') || {};
  const id = today.classicId;
  const article = State.classic.articles.find(a => a.id === id);
  if (!article) return;

  State.classicSession = {
    article,
    currentIdx: today.classicSentDone || 0,
    items: buildClassicItems(article)
  };

  // 渲染 header
  $('#classic-title').textContent = article.title;
  $('#classic-subtitle').textContent = `${article.dynasty} · ${article.author}`;
  renderClassicPage();
  switchPage('classic');
}

function buildClassicItems(article) {
  // 交替句子填空 + 选择题
  const items = [];
  article.keySentences.forEach((s, i) => {
    items.push({ type: 'fill', text: s, idx: i });
  });
  (article.keyChoices || []).forEach((c, i) => {
    items.push({ type: 'choice', q: c.q, options: c.options, answer: c.answer, idx: i });
  });
  return items;
}

function renderClassicPage() {
  const s = State.classicSession;
  if (!s) return;

  // 进度
  const total = s.items.length;
  const done = s.currentIdx;
  $('#classic-progress-text').textContent = `${Math.min(done, total)} / ${total}`;
  $('#classic-progress-fill').style.width = `${(done / total) * 100}%`;

  // 原文逐句 —— 全文仅显示一半，未做过的句子隐藏（当前句也模糊）
  const halfTotal = Math.ceil(s.article.keySentences.length / 2);
  const visibleSentences = s.article.keySentences.slice(0, halfTotal);
  const html = visibleSentences.map((sent, i) => {
    let cls = 'classic-sentence';
    if (i < s.currentIdx) cls += ' done';
    else if (i === s.currentIdx) cls += ' current';
    return `<span class="${cls}" data-idx="${i}">${escapeHtml(sent)}</span>`;
  }).join('') + `<span class="classic-sentence classic-sentence-truncated" title="下半部分隐藏·作答后逐句解锁">······</span>`;
  $('#classic-text').innerHTML = html;

  // 输入/选择区
  const item = s.items[s.currentIdx];
  if (!item) {
    // 全部完成
    finishClassic();
    return;
  }
  const area = $('#classic-input-area');
  if (item.type === 'fill') {
    area.innerHTML = `
      <div class="classic-prompt">
        <div>请补全第 <span class="text-cyan">${item.idx + 1}</span> 句</div>
        <div class="classic-prompt-zh">${escapeHtml(item.text)}</div>
      </div>
      <div class="classic-input-row">
        <input class="input" id="classic-input" placeholder="输入原文…" autocomplete="off" />
        <button class="btn btn-primary" id="classic-submit">提交</button>
      </div>
    `;
    const inp = $('#classic-input');
    const textEl = $('#classic-text');
    const blurSource = () => textEl.classList.add('classic-text-blurred');
    const clearBlur = () => textEl.classList.remove('classic-text-blurred');
    inp.addEventListener('focus', blurSource);
    inp.addEventListener('input', blurSource);
    inp.addEventListener('blur', clearBlur);
    inp.focus();
    const submit = () => { clearBlur(); doClassicFill(item); };
    $('#classic-submit').addEventListener('click', submit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { clearBlur(); submit(); } });
  } else {
    const choicesHtml = item.options.map((o, i) =>
      `<button class="classic-choice" data-i="${i}">${escapeHtml(o)}</button>`
    ).join('');
    area.innerHTML = `
      <div class="classic-prompt">
        <div>选择题 · 关键句</div>
        <div class="classic-prompt-zh">${escapeHtml(item.q)}</div>
      </div>
      <div class="classic-choices">${choicesHtml}</div>
    `;
    $$('.classic-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        if (i === item.answer) {
          $$('.classic-choice').forEach(b => {
            b.disabled = true;
            if (parseInt(b.dataset.i, 10) === item.answer) b.classList.add('correct');
          });
          advanceClassic();
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          showToast('差一点点，再想想 ✨', 1200);
        }
      });
    });
  }
}

function doClassicFill(item) {
  const inp = $('#classic-input');
  const val = (inp.value || '').trim();
  if (!val) { inp.focus(); return; }
  // 容忍标点 / 空白差异：去除全角句逗号、引号、空格后比较
  const norm = s => String(s || '').replace(/[，。、；：？！「」""''《》（）\s]/g, '').toLowerCase();
  const ok = norm(val) === norm(item.text);
  if (ok) {
    inp.style.borderColor = 'var(--c-neon-cyan)';
    if (window.PunchEffects && window.PunchEffects.particleBurst) {
      var r = inp.getBoundingClientRect();
      window.PunchEffects.particleBurst(r.left + r.width/2, r.top + r.height/2, { count: 24 });
    } else {
      burstParticles($('#page-classic'));
    }
    showToast('✓ 答对了！', 800);
    advanceClassic();
  } else {
    inp.style.borderColor = 'var(--c-neon-pink)';
    inp.value = '';
    inp.placeholder = '再想想…（不需输标点）';
    showToast('差一点点，再试试 ✨', 1000);
  }
}

function advanceClassic() {
  const s = State.classicSession;
  s.currentIdx++;
  S.updateToday({ classicSentDone: s.currentIdx });
  setTimeout(renderClassicPage, 350);
}

function finishClassic() {
  P.completeClassic(State.classicSession.article.id);
  $('#classic-text').innerHTML = State.classicSession.article.keySentences
    .map(s => `<span class="classic-sentence done">${s}</span>`).join('');
  $('#classic-input-area').innerHTML = `
    <div style="text-align:center; padding:24px 0;">
      <div style="font-size:48px; margin-bottom:12px;">🎉</div>
      <div style="font-size:20px; font-weight:700; color:var(--c-neon-cyan); margin-bottom:8px;">今日古文已完成</div>
      <div style="font-size:13px; color:var(--c-text-secondary); margin-bottom:20px;">+10 积分 · 已解锁新成就？</div>
      <button class="btn btn-primary btn-block" id="classic-done-btn">继续单词打卡 →</button>
    </div>
  `;
  burstParticles($('#page-classic'), 24);
  $('#classic-done-btn').addEventListener('click', openWordPunch);
}

// ============== 单词打卡页 ==============
function openWordPunch() {
  const today = S.get('today') || {};
  if (!today.wordQueue) {
    const queue = buildDailyWordQueue();
    S.updateToday({ wordQueue: queue });
    today.wordQueue = queue;
  }
  State.wordSession = {
    queue: today.wordQueue,
    currentIdx: today.wordIdx || 0,
    mode: today.wordMode || 'en2zh',
    wrong: []
  };
  switchPage('word');
  // 等页面 active 后再渲染（保证 DOM 可见）
  setTimeout(renderWordPage, 50);
}

// 每日推送：错题加权（40%）+ 新词轮转（60%）
function buildDailyWordQueue() {
  const cfg = S.PUNISH_CONFIG || { wrongRatio: 0.4, removeAfterCorrect: 3 };
  const goal = (S.get('settings') || {}).dailyGoal?.words || 20;
  const wrongList = S.get('wrongWords') || [];

  // 错题按 wrongCount 降序、排重
  const seen = new Set();
  const weighted = [];
  for (const v of [...wrongList].sort((a, b) => (b.wrongCount || 1) - (a.wrongCount || 1))) {
    if (seen.has(v.en)) continue;
    seen.add(v.en);
    weighted.push(v.en);
    if (weighted.length >= Math.floor(goal * cfg.wrongRatio)) break;
  }

  // 新词：避开已读古文、错题、今日已推
  const learned = new Set(S.get('readClassic') || []);
  const fresh = [];
  for (const w of State.words) {
    if (seen.has(w.en)) continue;
    fresh.push(w.en);
    seen.add(w.en);
    if (fresh.length >= goal - weighted.length) break;
  }

  // 拼够 goal 个，不够则随机补
  const out = [...weighted, ...fresh];
  if (out.length < goal) {
    for (const w of State.words) {
      if (out.includes(w.en)) continue;
      out.push(w.en);
      if (out.length >= goal) break;
    }
  }
  return out.slice(0, goal);
}

function renderWordPage() {
  const s = State.wordSession;
  if (!s) return;
  const total = s.queue.length;
  const done = s.currentIdx;
  const el1 = $('#word-progress-text'); if (el1) el1.textContent = `${Math.min(done, total)} / ${total}`;
  const el2 = $('#word-progress-fill'); if (el2) el2.style.width = `${(done / total) * 100}%`;

  // 模式按钮
  $$('.word-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === s.mode);
  });

  if (done >= total) {
    finishWords();
    return;
  }

  const en = s.queue[done];
  const w = State.words.find(x => x.en === en);
  if (!w) { s.currentIdx++; renderWordPage(); return; }

  const elEn = $('#word-en'); if (elEn) elEn.textContent = w.en;
  const elPh = $('#word-phonetic'); if (elPh) elPh.textContent = w.phonetic;
  const elZh = $('#word-zh'); if (elZh) elZh.textContent = w.zh;
  const elEx = $('#word-example'); if (elEx) elEx.textContent = w.example || '';

  const area = $('#word-input-area');
  const onCorrect = () => {
    const removed = S.markWordCorrect(w.en);
    if (removed) showToast('已从错题本移除 🎯', 1200);
    advanceWord();
  };
  const onWrong = () => {
    s.wrong.push(w.en);
    P.addVocab(w.en);  // 计入错题加权池
  };
  if (s.mode === 'en2zh') {
    const choices = P.makeWordChoices(w, State.words);
    area.innerHTML = `<div class="word-options">
      ${choices.options.map((o, i) => `<button class="word-option" data-i="${i}">${escapeHtml(o)}</button>`).join('')}
    </div>`;
    $$('.word-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        if (i === choices.answerIndex) {
          btn.classList.add('correct');
          $$('.word-option').forEach(b => b.disabled = true);
          onCorrect();
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          onWrong();
        }
      });
    });
  } else if (s.mode === 'spelling') {
    area.innerHTML = `
      <div style="text-align:center; margin-bottom:10px;">
        <div style="font-size:14px; color:var(--text-secondary);">拼写</div>
        <div style="font-size:18px; color:var(--neon-cyan); font-weight:600; margin-top:4px;">${escapeHtml(w.zh)}</div>
      </div>
      <input class="input word-spelling-input" id="word-spell-input" placeholder="拼写单词…" autocomplete="off" />
      <button class="btn btn-primary btn-block" style="margin-top:10px;" id="word-spell-btn">提交</button>
    `;
    setTimeout(() => $('#word-spell-input').focus(), 50);
    const submit = () => {
      const v = ($('#word-spell-input').value || '').trim().toLowerCase();
      if (!v) return;
      if (v === w.en.toLowerCase()) {
        onCorrect();
      } else {
        onWrong();
        showToast(`正确拼写：${w.en}`, 1400);
        advanceWord();  // 拼写模式显示答案后跳过（可手动返回复习）
      }
    };
    $('#word-spell-btn').addEventListener('click', submit);
    $('#word-spell-input').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  } else {
    // zh2en: 给英文 4 选 1
    const others = P.shuffle(State.words.filter(x => x.en !== w.en)).slice(0, 3);
    const opts = P.shuffle([w, ...others]);
    area.innerHTML = `<div class="word-options">
      ${opts.map((o, i) => `<button class="word-option" data-i="${i}">${escapeHtml(o.en)}</button>`).join('')}
    </div>`;
    $$('.word-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        if (opts[i].en === w.en) {
          btn.classList.add('correct');
          $$('.word-option').forEach(b => b.disabled = true);
          onCorrect();
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          onWrong();
        }
      });
    });
  }

  // 重置翻转
  $('#word-card').classList.remove('is-flipped');
}

function advanceWord() {
  const s = State.wordSession;
  s.currentIdx++;
  S.updateToday({ wordIdx: s.currentIdx });
  burstParticles($('#page-word'), 8);
  setTimeout(renderWordPage, 280);
}

function finishWords() {
  const s = State.wordSession;
  P.completeWords(s.queue, s.wrong);
  // 检查今日是否都完成了
  const today = S.get('today') || {};
  if (today.classicDone && today.wordDone && !today.completed) {
    P.completeDay();
    // 打卡成功 - 粒子扩散特效
    if (window.PunchEffects && window.PunchEffects.particleBurst) {
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      window.PunchEffects.particleBurst(cx, cy, { count: 40, colors: ['#00f5ff', '#ff006e', '#ffea00', '#7b61ff', '#00ff88'] });
      // 再从按钮位置补一波
      var btn = document.getElementById('word-done-btn') || document.activeElement;
      if (btn && btn.getBoundingClientRect) {
        var r = btn.getBoundingClientRect();
        setTimeout(function() {
          window.PunchEffects.particleBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 20 });
        }, 200);
      }
    }
    showToast('今日打卡完成！🌟 +' + (10 + (P.calcStreak() >= 30 ? 50 : P.calcStreak() >= 7 ? 20 : 0)), 2400);
  } else {
    showToast('单词打卡完成 +5 积分 ✨', 1600);
  }
  $('#word-input-area').innerHTML = `
    <div style="text-align:center; padding:24px 0;">
      <div style="font-size:48px; margin-bottom:12px;">✅</div>
      <div style="font-size:18px; font-weight:700; color:var(--c-neon-cyan); margin-bottom:8px;">${s.queue.length} 个单词打卡完毕</div>
      <div style="font-size:13px; color:var(--c-text-secondary); margin-bottom:20px;">错 ${s.wrong.length} 个已加入生词本</div>
      <button class="btn btn-primary btn-block" id="word-done-btn">返回主页</button>
    </div>
  `;
  burstParticles($('#page-word'), 18);
  $('#word-done-btn').addEventListener('click', () => switchPage('home'));
}

function bindWordModes() {
  $$('.word-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const s = State.wordSession;
      if (s) s.mode = mode;
      S.updateToday({ wordMode: mode });
      renderWordPage();
    });
  });
  $('#word-card').addEventListener('click', () => {
    $('#word-card').classList.toggle('is-flipped');
  });
}

// ============== 进度页 ==============
function renderProgress() {
  // 三栏 stat
  const streak = P.calcStreak();
  const totalDays = S.get('totalDays') || 0;
  const readList = S.get('readClassic') || [];
  const totalWords = S.get('totalWords') || 0;

  $('#prog-stat-streak').textContent = streak;
  $('#prog-stat-days').textContent = totalDays;
  $('#prog-stat-classic').textContent = readList.length;
  $('#prog-stat-words').textContent = totalWords;

  // 热力图（最近 90 天）
  const heat = $('#heatmap');
  const history = S.get('history') || {};
  const cells = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const rec = history[k];
    let lvl = 0;
    if (rec && rec.completed) {
      const cw = (rec.wordIds?.length || 0);
      if (cw >= 20) lvl = 4;
      else if (cw >= 15) lvl = 3;
      else if (cw >= 10) lvl = 2;
      else lvl = 1;
    }
    cells.push(`<div class="heatmap-cell lvl-${lvl}" title="${k}"></div>`);
  }
  heat.innerHTML = cells.join('');

  // 完读篇目列表
  const list = $('#prog-classic-list');
  const articles = State.classic.articles;
  if (readList.length === 0) {
    list.innerHTML = '<div class="text-muted" style="padding:16px; text-align:center; font-size:13px;">还没开始 · 点击首页开始第一次打卡吧</div>';
  } else {
    list.innerHTML = readList.map(id => {
      const a = articles.find(x => x.id === id);
      if (!a) return '';
      return `<div class="row" style="padding:14px 0; border-bottom:1px solid var(--c-glass-border);">
        <div style="flex:1;">
          <div style="font-size:15px; font-weight:600;">${a.title}</div>
          <div style="font-size:12px; color:var(--c-text-muted); margin-top:2px;">${a.dynasty} · ${a.author}</div>
        </div>
        <span class="tag tag-pink">✓ 已读</span>
      </div>`;
    }).join('');
  }
}

// ============== 成就页 ==============
function renderAchievements() {
  const list = P.getAllAchievements();
  const grid = $('#achievement-grid');
  grid.innerHTML = list.map(a => `
    <div class="flip-card achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" data-id="${a.id}" title="${a.desc}">
      <div class="flip-card-inner">
        <div class="flip-card-face">
          <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      </div>
    </div>
  `).join('');
  // 翻转交互
  $$('.achievement-card').forEach(c => {
    c.addEventListener('click', () => {
      const id = c.dataset.id;
      const data = list.find(x => x.id === id);
      if (data) {
        showToast(`${data.icon} ${data.name}\n${data.desc}`, 1800);
      }
    });
  });
}

// ============== 设置页 ==============
function renderSettings() {
  const settings = S.get('settings') || {};
  $('#set-reminder-time').textContent = settings.reminderTime || '20:00';
  $('#set-classic-goal').textContent = settings.dailyGoal?.classic ?? 1;
  $('#set-words-goal').textContent = settings.dailyGoal?.words ?? 20;

  // 主题按钮 active
  $$('.theme-pick').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === (settings.theme || 'deep'));
  });
}

function bindSettings() {
  $$('.theme-pick').forEach(b => {
    b.addEventListener('click', () => {
      const theme = b.dataset.theme;
      const settings = S.get('settings') || {};
      settings.theme = theme;
      S.set('settings', settings);
      renderSettings();
      showToast(theme === 'deep' ? '已切换：深空玻璃' : '已切换：极地玻璃（占位）', 1200);
    });
  });

  $('#btn-export').addEventListener('click', () => {
    const data = S.exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-punch-${P.todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出 JSON', 1200);
  });

  $('#btn-import').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (S.importJSON(ev.target.result)) {
          showToast('导入成功 · 刷新页面', 1500);
          setTimeout(() => location.reload(), 800);
        } else {
          showToast('导入失败 · 文件格式错误', 1500);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  });

  $('#btn-reset').addEventListener('click', () => {
    if (confirm('确定重置所有数据？此操作不可恢复。')) {
      S.resetAll();
      showToast('已重置 · 即将刷新', 1200);
      setTimeout(() => location.reload(), 800);
    }
  });
}

// ============== 工具：粒子、Toast、HTML 转义 ==============
function burstParticles(host, count = 12) {
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'particle-burst';
  host.appendChild(wrap);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 60 + Math.random() * 80;
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    if (Math.random() > 0.5) p.style.background = 'var(--c-neon-pink)';
    if (Math.random() > 0.7) p.style.background = 'var(--c-neon-purple)';
    wrap.appendChild(p);
  }
  setTimeout(() => wrap.remove(), 1300);
}

let toastTimer = null;
function showToast(text, ms = 1500) {
  const t = $('#toast');
  t.innerHTML = `<div class="toast-icon">✨</div><div class="toast-title">${escapeHtml(text.split('\n')[0])}</div>${text.split('\n')[1] ? `<div class="toast-desc">${escapeHtml(text.split('\n')[1])}</div>` : ''}`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============== 暴露给 inline 入口 ==============
window.App = {
  openClassicPunch,
  openWordPunch,
  switchPage,
  startTodayPunch,
  bindWordModes,
  boot
};