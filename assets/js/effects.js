// effects.js
// 惊艳细节三件套：启动页消失、粒子扩散、SVG 折线图

(function () {
  'use strict';

  // ===== 1. 启动页 =====
  function hideBootScreen() {
    var boot = document.getElementById('boot-screen');
    if (!boot) return;
    setTimeout(function () {
      boot.classList.add('fade-out');
      setTimeout(function () {
        if (boot.parentNode) boot.parentNode.removeChild(boot);
      }, 800);
    }, 1800); // 与 CSS 进度条动画同步
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideBootScreen);
  } else {
    hideBootScreen();
  }

  // ===== 2. 粒子扩散特效 =====
  // 用法：PunchEffects.particleBurst(x, y, options)
  function particleBurst(x, y, opts) {
    opts = opts || {};
    var count = opts.count || 28;
    var colors = opts.colors || ['#00f5ff', '#ff006e', '#ffea00', '#7b61ff', '#00ff88'];
    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      var distance = 80 + Math.random() * 120;
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance;
      var size = 4 + Math.random() * 6;
      var color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = [
        'left:' + x + 'px',
        'top:' + y + 'px',
        'width:' + size + 'px',
        'height:' + size + 'px',
        'background:' + color,
        'box-shadow:0 0 ' + (size * 2) + 'px ' + color,
        '--dx:' + dx + 'px',
        '--dy:' + dy + 'px'
      ].join(';');
      canvas.appendChild(p);
      // 自动回收
      (function (el) {
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 1300);
      })(p);
    }
  }

  // ===== 3. SVG 折线图 =====
  // 用法：PunchEffects.renderTrend('trend-svg-wrap', 30)
  function renderTrend(containerId, days) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;

    // 从 localStorage 拉日志
    var logs = [];
    try {
      var raw = localStorage.getItem('study-punch:v1:daily-log');
      if (raw) logs = JSON.parse(raw);
    } catch (e) {}

    // 计算每天积分
    var scores = {};
    logs.forEach(function (log) {
      scores[log.date] = (scores[log.date] || 0) + (log.score || 30);
    });

    // 生成 N 天序列（最近 N 天，含今天）
    var series = [];
    var today = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      series.push({ date: key, score: scores[key] || 0 });
    }

    var max = Math.max.apply(null, series.map(function (s) { return s.score; }));
    max = Math.max(max, 30); // 最小刻度 30

    // 全部为 0 时显示空状态
    if (max === 30 && series.every(function (s) { return s.score === 0; })) {
      wrap.innerHTML = '<div class="trend-empty">尚无打卡数据 · 完成今日打卡后开始记录 ✨</div>';
      return;
    }

    // SVG 尺寸
    var W = wrap.clientWidth || 320;
    var H = 140;
    var pad = { l: 30, r: 10, t: 10, b: 20 };
    var cw = W - pad.l - pad.r;
    var ch = H - pad.t - pad.b;

    // 计算坐标
    var pts = series.map(function (s, i) {
      var x = pad.l + (i / Math.max(series.length - 1, 1)) * cw;
      var y = pad.t + ch - (s.score / max) * ch;
      return { x: x, y: y, score: s.score, date: s.date };
    });

    // 折线 + 渐变填充
    var pathLine = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var pathArea = pathLine + ' L' + pts[pts.length - 1].x + ',' + (pad.t + ch) + ' L' + pts[0].x + ',' + (pad.t + ch) + ' Z';

    var svg = '<svg class="trend-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    svg += '<defs>';
    svg += '<linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#00f5ff" stop-opacity="0.6"/>';
    svg += '<stop offset="100%" stop-color="#00f5ff" stop-opacity="0"/>';
    svg += '</linearGradient>';
    svg += '<linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">';
    svg += '<stop offset="0%" stop-color="#00f5ff"/>';
    svg += '<stop offset="100%" stop-color="#ff006e"/>';
    svg += '</linearGradient>';
    svg += '</defs>';

    // 网格线
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
      var y = pad.t + ch * p;
      svg += '<line class="trend-grid-line" x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '"/>';
    });

    // Y 轴标签（最高值）
    svg += '<text class="trend-axis-label" x="' + (pad.l - 4) + '" y="' + (pad.t + 4) + '" text-anchor="end">' + max + '</text>';
    svg += '<text class="trend-axis-label" x="' + (pad.l - 4) + '" y="' + (pad.t + ch) + '" text-anchor="end">0</text>';

    // X 轴标签（首/中/末）
    if (pts.length > 0) {
      svg += '<text class="trend-axis-label" x="' + pts[0].x + '" y="' + (H - 4) + '" text-anchor="middle">' + pts[0].date.slice(5) + '</text>';
      svg += '<text class="trend-axis-label" x="' + pts[Math.floor(pts.length / 2)].x + '" y="' + (H - 4) + '" text-anchor="middle">' + pts[Math.floor(pts.length / 2)].date.slice(5) + '</text>';
      svg += '<text class="trend-axis-label" x="' + pts[pts.length - 1].x + '" y="' + (H - 4) + '" text-anchor="middle">' + pts[pts.length - 1].date.slice(5) + '</text>';
    }

    // 面积 + 折线
    svg += '<path class="trend-area" d="' + pathArea + '"/>';
    svg += '<path class="trend-line" d="' + pathLine + '"/>';

    // 数据点
    pts.forEach(function (p) {
      var cls = p.score > 0 ? 'trend-dot' : 'trend-dot-empty';
      svg += '<circle class="' + cls + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3"/>';
    });

    svg += '</svg>';
    wrap.innerHTML = svg;
  }

  // ===== 4. Tab 切换挂载 =====
  // 当进入进度页时，渲染默认 30 天趋势
  function setupTrendTabs() {
    var currentRange = 30;
    function update(range) {
      currentRange = range;
      document.querySelectorAll('.trend-tab').forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-range') == range);
      });
      renderTrend('trend-svg-wrap', parseInt(range, 10));
    }
    document.querySelectorAll('.trend-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        update(t.getAttribute('data-range'));
      });
    });
    // 默认渲染 30 天
    setTimeout(function () { update('30'); }, 100);
    window.PunchEffectsTrendUpdate = update;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTrendTabs);
  } else {
    setupTrendTabs();
  }

  // 暴露 API
  window.PunchEffects = {
    particleBurst: particleBurst,
    renderTrend: renderTrend,
    updateTrend: function (range) {
      if (typeof range === 'string') range = parseInt(range, 10);
      renderTrend('trend-svg-wrap', range);
    }
  };
})();
