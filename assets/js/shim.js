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
  // 总是用 window.PunchData 覆盖 data-loader.js 的 fetch 版本（保证断网/双击也跑全量数据）
  window.loadClassic = function () {
    const data = window.PunchData;
    if (!data || !data.ANCIENT) return { articles: [] };
    return {
      articles: data.ANCIENT.map(a => {
        // 从 key_sentences 提取文本列表（兼容 camelCase / snake_case）
        const keys = a.key_sentences || a.keySentences || [];
        const sentences = keys.map(k => (typeof k === 'string' ? k : k.text));
        let choices = (a.key_choices || a.keyChoices || []).map(c => ({
          q: c.q,
          options: c.options,
          answer: c.answer
        }));
        // 如果原文没提供选择题，从 keySentences 自动生成 2 道（填空多到后期会厌）
        if (choices.length === 0 && sentences.length >= 6) {
          // 从 5-7 句（避开前 4 句填空）抽 2 句
          const pickIdx = [Math.min(5, sentences.length - 1), Math.min(7, sentences.length - 1)];
          pickIdx.forEach(idx => {
            if (idx >= sentences.length) return;
            const sentence = sentences[idx];
            // 截取前半句作问题
            const cutAt = Math.floor(sentence.length / 2);
            const q = sentence.slice(0, cutAt) + '____';
            const answer = sentence.slice(cutAt);
            if (!answer) return;
            // 生成 3 干扰项（从其他句子取后半段）
            const distractors = [];
            for (let i = 0; i < sentences.length && distractors.length < 3; i++) {
              if (i === idx) continue;
              const s = sentences[i];
              const sCut = Math.floor(s.length / 2);
              const half = s.slice(sCut, sCut + answer.length);
              if (half && half !== answer && !distractors.includes(half)) {
                distractors.push(half);
              }
            }
            while (distractors.length < 3) distractors.push('……');
            // 4 个选项里插入正确答案
            const opts = distractors.slice(0, 3);
            const insertAt = Math.floor(Math.random() * 4);
            opts.splice(insertAt, 0, answer);
            choices.push({ q, options: opts, answer: insertAt });
          });
        }
        return {
          id: a.id,
          title: a.title,
          author: a.author,
          dynasty: a.dynasty,
          content: a.content,
          keySentences: sentences,
          keyChoices: choices,
          background: a.background,
          themes: a.themes,
          difficulty: a.difficulty
        };
      })
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

  console.log('[shim] 已挂全局: Storage / Punch / loadClassic / loadWords (基于 agent-B 实现)');
})();