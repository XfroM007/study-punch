// shim.js
// 兼容层：连接 ui.js 与 storage.js / punch.js 的命名（agent-B 自创 API）
// 当前 storage.js / punch.js 已经是 agent-B 风格实现，shim 只做轻量确认。

(function () {
  'use strict';

  // ===== 1. Storage 兼容 =====
  // storage.js 末尾已挂 window.PunchStorage，但 ui.js 用 window.Storage
  // 用 Object.defineProperty 强写，避开浏览器原生 Storage 构造函数冲突
  if (window.PunchStorage) {
    try {
      Object.defineProperty(window, 'Storage', { value: window.PunchStorage, writable: true, configurable: true });
    } catch (e) {
      window.Storage = window.PunchStorage;
    }
  }

  // ===== 2. Punch 兼容 =====
  // punch.js 末尾已挂 window.Punch，无需额外动作

  // ===== 3. data-loader 兼容 =====
  // data.js 把数据挂在 window.PunchData（ANCIENT + WORDS）
  // ui.js 期望 loadClassic() 和 loadWords() 返回 {articles} / {words}
  if (typeof window.loadClassic !== 'function') {
    window.loadClassic = function () {
      const data = window.PunchData;
      if (!data || !data.ANCIENT) return { articles: [] };
      return {
        articles: data.ANCIENT.map(a => ({
          id: a.id,
          title: a.title,
          author: a.author,
          dynasty: a.dynasty,
          content: a.content,
          key_sentences: a.key_sentences || [],
          background: a.background,
          themes: a.themes,
          difficulty: a.difficulty
        }))
      };
    };

    window.loadWords = function () {
      const data = window.PunchData;
      if (!data || !data.WORDS) return { words: [] };
      return {
        words: data.WORDS.map(w => ({
          en: w.word,
          zh: Array.isArray(w.translations) ? w.translations[0] : (w.translations || ''),
          id: w.id,
          pos: w.pos,
          phonetic: w.phonetic,
          translations: w.translations,
          difficulty: w.difficulty,
          tags: w.tags
        }))
      };
    };
  }

  console.log('[shim] 已挂全局: Storage / Punch / loadClassic / loadWords (基于 agent-B 实现)');
})();