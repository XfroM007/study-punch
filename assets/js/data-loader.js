// data-loader.js
// 加载 JSON 数据。优先 fetch 真实文件，失败回退到内置 mock。
// 这样 agent-A 内容到位时自动切换，断网/双击打开也能跑。

const FALLBACK_CLASSIC = {
  articles: [
    {
      id: 'g001',
      title: '劝学',
      author: '荀子',
      dynasty: '战国',
      difficulty: '★★★★',
      keySentences: [
        '学不可以已。',
        '青，取之于蓝，而青于蓝。',
        '君子曰：学不可以已。',
        '故不积跬步，无以至千里。',
        '锲而舍之，朽木不折。',
        '锲而不舍，金石可镂。'
      ],
      keyChoices: [
        { q: '故不积跬步，____', options: ['无以至千里', '无以成江海', '无以至江河', '无以至山巅'], answer: 0 },
        { q: '锲而不舍，____', options: ['金石可镂', '朽木不折', '功在不舍', '可至千里'], answer: 0 }
      ]
    }
  ]
};

const FALLBACK_WORDS = {
  words: [
    { en: 'abandon', phonetic: '/əˈbændən/', zh: '放弃；抛弃', example: 'He abandoned his car in the snow.' },
    { en: 'ability', phonetic: '/əˈbɪləti/', zh: '能力；才能', example: 'She has the ability to succeed.' },
    { en: 'absolute', phonetic: '/ˈæbsəluːt/', zh: '绝对的；完全的', example: 'absolute silence' },
    { en: 'absorb', phonetic: '/əbˈzɔːrb/', zh: '吸收；吸引', example: 'Plants absorb water.' },
    { en: 'abstract', phonetic: '/ˈæbstrækt/', zh: '抽象的；摘要', example: 'Beauty is abstract.' },
    { en: 'academic', phonetic: '/ˌækəˈdemɪk/', 'zh': '学术的；学院的', example: 'academic research' },
    { en: 'accept', phonetic: '/əkˈsept/', zh: '接受；承认', example: 'accept an invitation' },
    { en: 'access', phonetic: '/ˈækses/', zh: '通道；访问', example: 'access to education' },
    { en: 'accident', phonetic: '/ˈæksɪdənt/', zh: '事故；意外', example: 'a car accident' },
    { en: 'accompany', phonetic: '/əˈkʌmpəni/', zh: '陪伴；伴随', example: 'accompany a friend' },
    { en: 'accomplish', phonetic: '/əˈkɑːmplɪʃ/', zh: '完成；实现', example: 'accomplish a goal' },
    { en: 'account', phonetic: '/əˈkaʊnt/', zh: '账户；描述', example: 'bank account' },
    { en: 'accurate', phonetic: '/ˈækjərət/', zh: '准确的；精确的', example: 'accurate measurement' },
    { en: 'achieve', phonetic: '/əˈtʃiːv/', zh: '实现；达成', example: 'achieve success' },
    { en: 'acknowledge', phonetic: '/əkˈnɑːlɪdʒ/', zh: '承认；致谢', example: 'acknowledge a mistake' },
    { en: 'acquire', phonetic: '/əˈkwaɪər/', zh: '获得；习得', example: 'acquire knowledge' },
    { en: 'adapt', phonetic: '/əˈdæpt/', zh: '适应；改编', example: 'adapt to new rules' },
    { en: 'adequate', phonetic: '/ˈædɪkwət/', zh: '足够的；适当的', example: 'adequate preparation' },
    { en: 'adjust', phonetic: '/əˈdʒʌst/', zh: '调整；调节', example: 'adjust the volume' },
    { en: 'admire', phonetic: '/ədˈmaɪər/', zh: '钦佩；欣赏', example: 'admire courage' }
  ]
};

async function tryFetchJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function loadClassic() {
  const data = await tryFetchJSON('./assets/data/古文.json');
  return data || FALLBACK_CLASSIC;
}

async function loadWords() {
  const data = await tryFetchJSON('./assets/data/单词.json');
  return data || FALLBACK_WORDS;
}

var FALLBACK = {
  classic: FALLBACK_CLASSIC,
  words: FALLBACK_WORDS
};