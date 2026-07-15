// welcome.js
// 首次访问欢迎引导 + 滑动返回手势

(function () {
  'use strict';

  // ===== 1. 欢迎引导层 =====
  // localStorage 标志：首次显示，已点"开始使用"后不再显示
  var KEY = 'study-punch:v1:welcome-shown';

  function maybeShowWelcome() {
    var overlay = document.getElementById('welcome-overlay');
    if (!overlay) return;
    var shown = false;
    try { shown = localStorage.getItem(KEY) === '1'; } catch (e) {}

    if (shown) {
      overlay.classList.add('hidden');
      return;
    }

    // 显示引导层（等启动页 + boot 完成）
    setTimeout(function () {
      overlay.classList.remove('hidden');
    }, 2400); // 启动页动画结束后

    // 绑定开始按钮
    var btn = document.getElementById('welcome-start');
    if (btn) {
      btn.addEventListener('click', function () {
        overlay.classList.add('hidden');
        try { localStorage.setItem(KEY, '1'); } catch (e) {}
      });
    }

    // 点遮罩外不能关（强制读完引导）
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowWelcome);
  } else {
    setTimeout(maybeShowWelcome, 100);
  }

  // ===== 2. 滑动返回手势 =====
  // 仅在打卡页（classic / word）生效，从左向右滑超过 80px 触发返回
  function setupSwipeBack() {
    var startX = 0, startY = 0, tracking = false;
    var SWIPE_THRESHOLD = 80;
    var EDGE_ZONE = 40; // 必须从最左边 40px 内开始滑

    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      // 只在打卡/单词页生效
      var activePage = document.querySelector('.page.active');
      if (!activePage) return;
      var pid = activePage.id;
      if (pid !== 'page-classic' && pid !== 'page-word') return;
      // 必须从左边开始
      if (startX > EDGE_ZONE) return;
      tracking = true;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!tracking || e.touches.length !== 1) return;
      var t = e.touches[0];
      var dx = t.clientX - startX;
      var dy = Math.abs(t.clientY - startY);
      // 水平滑动占主导
      if (dx > 10 && dy < dx * 1.5) {
        showSwipeHint(dx);
      }
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      hideSwipeHint();
      if (dx > SWIPE_THRESHOLD) {
        if (window.App && window.App.switchPage) {
          window.App.switchPage('home');
        }
      }
    }, { passive: true });
  }

  // 滑动提示（从左边缘冒出一个 "← 返回" 提示）
  var hintEl = null;
  function showSwipeHint(distance) {
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.className = 'swipe-hint';
      hintEl.textContent = '← 返回';
      document.body.appendChild(hintEl);
    }
    var opacity = Math.min(distance / 100, 0.6);
    hintEl.style.opacity = opacity;
  }
  function hideSwipeHint() {
    if (hintEl) hintEl.style.opacity = 0;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSwipeBack);
  } else {
    setupSwipeBack();
  }

  // ===== 3. 重置引导（设置页用） =====
  window.WelcomeGuide = {
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      var overlay = document.getElementById('welcome-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
      }
    }
  };

  console.log('[welcome] 引导层 + 滑动返回已挂载');
})();
