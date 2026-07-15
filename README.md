# 学习打卡 · Study Punch

> 高三上学期古文背诵 + 英语单词离线打卡 · 单 HTML 网页应用

## 🌐 在线访问（推荐）

**永久链接**：https://xfrom007.github.io/study-punch/

任何设备浏览器打开即可使用，支持 Windows / macOS / 安卓 / iOS，无需下载安装。

## 跨平台支持

| 平台 | 系统要求 | 浏览器 | 操作 |
|---|---|---|---|
| **Windows** | Win10/11 | Edge / Chrome / Firefox | 双击 `index.html` 或拖入浏览器 |
| **macOS** | 10.15+ | Safari / Chrome / Firefox | 双击 `index.html` 或拖入浏览器 |
| **安卓** | Android 8+ | Chrome / Edge | 文件管理器打开 `index.html` |
| **iOS / iPadOS** | iOS 14+ | Safari | "文件" App 找到 `index.html` → 长按 → 用 Safari 打开 |

**完全离线运行**：所有数据、CSS、JS、图片均内嵌，无任何 CDN 或外部依赖。

## 项目结构

```
test-1/temp/2/
├── index.html                       # 主入口（双击打开）
├── manifest.json                    # PWA 标准（添加到主屏幕）
├── assets/
│   ├── css/                         # 样式（3 个）
│   ├── js/                          # 逻辑（6 个）
│   ├── data/
│   │   ├── data.js                  # 主数据（古文 15 + 词 730，内嵌）
│   │   ├── 古文.json                 # 古文数据（开发用）
│   │   └── 英语.json                 # 英语数据（开发用）
│   └── img/
│       ├── icon-192.png             # PWA 图标 192×192
│       └── icon-512.png             # PWA 图标 512×512
└── docs/                            # 项目文档（5 份）
```

## 内容范围

- **古文 15 篇**：部编版高中语文必修上册（人教社 2019 版）必背篇目
  - 劝学 / 师说 / 赤壁赋 / 登泰山记 / 论语十二章 / 大学之道 / 人皆有不忍人之心 / 老子四章 / 五石之瓠 / 兼爱 / 短歌行 / 归园田居 / 将进酒 / 登高 / 茅屋为秋风所破歌
- **英语 730 词**：高考考纲核心词（高三上学期重点）
- **每日打卡量**：1 篇古文 + 20 词

## 功能

- 每日打卡（古文 + 单词）
- 连续天数（streak）/ 累计天数 / 积分
- 12 张成就卡牌（按里程碑解锁）
- 进度页：热力图 + SVG 趋势折线图（7/30/90 天）
- 设置页：导出 / 导入 / 重置
- 深空玻璃拟态 UI（霓虹青 / 紫粉 / 玻璃面板）

## 数据持久化

- 全部数据用 `localStorage` 存储（`study-punch:v1:*`）
- 关闭浏览器后数据保留
- 「设置 → 导出 JSON」可备份到本机
- 「设置 → 导入 JSON」可从备份恢复

## 添加到主屏幕（像 App 一样用）

### 在线版（PWA）推荐
1. 浏览器打开 https://xfrom007.github.io/study-punch/
2. 浏览器菜单 → "添加到主屏幕"
3. 主屏出现"学习打卡"图标 → 像 App 一样使用

### 本地版

### iOS / iPadOS
1. 用 Safari 打开 `index.html`
2. 点底部分享按钮 → "添加到主屏幕"
3. 主屏出现"学习打卡"图标 → 点开全屏运行（无地址栏）

### 安卓（Chrome）
1. 用 Chrome 打开 `index.html`
2. Chrome 菜单（右上角三个点）→ "添加到主屏幕"
3. 主屏出现"学习打卡"图标 → 点开全屏运行

### Windows / macOS
桌面 / Dock 创建快捷方式即可

## 文件传输

把整个 `test-1/temp/2/` 文件夹发给任何人，保留目录结构，对方解压后双击 `index.html` 即可使用。

压缩建议：
- macOS：`tar -cf study-punch.tar test-1/temp/2/`
- Windows：右键文件夹 → "发送到 → 压缩(zipped)文件夹"
- 安卓：用 RAR / ZArchiver 处理 tar

---

*版本：v1.1 · 2026-07-15 · 华安*