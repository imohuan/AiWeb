# i18n 国际化开发指南

## 目录

- [概述](#概述)
- [架构说明](#架构说明)
- [新增翻译的正确流程](#新增翻译的正确流程)
- [常见错误与排查](#常见错误与排查)
- [检查清单](#检查清单)
- [辅助脚本](#辅助脚本)

---

## 概述

本项目使用 `i18next` + `react-i18next` 实现国际化，支持 10 种语言：英语(en)、简体中文(zh-CN)、繁体中文(zh-TW)、日语(ja)、韩语(ko)、德语(de)、法语(fr)、意大利语(it)、俄语(ru)、土耳其语(tr)。

翻译以 **命名空间（namespace）** 为单位组织，每个命名空间对应一个 JSON 文件。目前共有 8 个命名空间：

| 命名空间 | 文件 | 用途 |
|----------|------|------|
| `common` | `common.json` | 通用按钮、状态、时间等 |
| `settings` | `settings.json` | 设置页面（账户、外观、语音、通知、插件、浏览器、关于等） |
| `auth` | `auth.json` | 登录/注册 |
| `sidebar` | `sidebar.json` | 侧边栏（项目列表、搜索、删除确认、归档等） |
| `chat` | `chat.json` | 聊天界面 |
| `codeEditor` | `codeEditor.json` | 代码编辑器 |
| `tasks` | `tasks.json` | TaskMaster 任务管理 |
| `git` | `git.json` | 源代码管理（Git 面板） |

所有翻译文件位于 `src/i18n/locales/<语言代码>/` 目录下。

---

## 架构说明

### 1. 配置文件：`src/i18n/config.js`

该文件是 i18n 的入口，负责两件事：

**A. 导入翻译文件**
```js
import enCommon from './locales/en/common.json';
import enGit from './locales/en/git.json';
// ...每种语言、每个命名空间都需要一行 import
```

**B. 注册资源**
```js
resources: {
  en: {
    common: enCommon,
    git: enGit,
    // ...每个命名空间
  },
  'zh-CN': {
    common: zhCommon,
    git: zhGit,
    // ...
  },
}
```

**关键规则：新增一个命名空间或新增一种语言时，必须在这两个地方都进行配置。**

### 2. 翻译键的使用方式

在组件中使用 `t()` 函数获取翻译：

```tsx
// 使用默认命名空间（common）
const { t } = useTranslation();
t('buttons.save')

// 指定命名空间
const { t } = useTranslation('git');
t('header.publish')

// 跨命名空间引用（推荐方式）
const { t } = useTranslation();
t('git:header.publish')   // 自动查找 git 命名空间
t('sidebar:search.noResults')  // 自动查找 sidebar 命名空间
```

### 3. 英语是参考语言

英语(en)是所有翻译的参考基准。新增翻译键时，**必须先添加到英语的对应 JSON 文件中**，然后同步到其他语言。

---

## 新增翻译的正确流程

### 场景 A：为已有组件添加翻译

1. **在组件中使用 `t()` 替换硬编码文本**
   ```tsx
   // 之前
   <button>Save</button>
   // 之后
   <button>{t('git:changes.commit')}</button>
   ```

2. **在 `src/i18n/locales/en/<namespace>.json` 中添加英语键**
   ```json
   {
     "changes": {
       "commit": "Commit"
     }
   }
   ```

3. **为所有 9 种其他语言添加翻译**（参见[同步多语言](#同步多语言)）

### 场景 B：新增一个命名空间

1. **创建 `src/i18n/locales/en/<新命名空间>.json`**
2. **在 `src/i18n/config.js` 中：**
   - 为英语导入：`import enNewNs from './locales/en/<新命名空间>.json';`
   - 在 `resources.en` 中注册：`newNs: enNewNs`
   - 在 `ns` 数组中添加命名空间名
3. **为所有 9 种语言创建对应的 JSON 文件**
4. **在 `src/i18n/config.js` 中为每种语言导入并注册**

### 场景 C：新增一种语言

1. **创建 `src/i18n/locales/<语言代码>/` 目录**
2. **为每个命名空间创建 JSON 文件**
3. **在 `src/i18n/config.js` 中导入并注册所有命名空间**
4. **在 `src/i18n/languages.js` 中添加语言条目**

---

## 常见错误与排查

### 错误 1：翻译显示英文而非当前语言

**根因：** 翻译文件没有被 `config.js` 注册。

**排查步骤：**
1. 检查 `config.js` 中是否有该语言的 import 语句
2. 检查 `config.js` 的 `resources` 对象中该语言是否包含该命名空间
3. 检查 JSON 文件是否存在于正确的路径

**常见遗漏：**
- 新增了翻译 JSON 文件，但忘记在 `config.js` 中 import 和注册
- 只给英语(en)注册了，其他语言没注册 → 所有语言都 fallback 到英语
- 只注册了部分命名空间，遗漏了新增的命名空间

### 错误 2：`t()` 调用返回键名本身（如 `git:header.publish`）

**根因：** 翻译键在英语参考文件中不存在，i18next 找不到该键。

**排查步骤：**
1. 检查英语 JSON 文件中是否确实存在该键（注意大小写和路径）
2. 使用 `scripts/check-missing-keys.cjs` 脚本检查

### 错误 3：`t()` 调用使用了带默认值的写法但仍然显示英文

**根因：** `t('key', 'default')` 的默认值只在**键完全不存在时**生效。如果英语文件中存在该键但当前语言的翻译文件缺少该键，i18next 会 fallback 到英语，**不会使用默认值**。

**正确做法：** 所有翻译键都应在英语 JSON 中有定义，且所有语言都应同步翻译。

### 错误 4：整门语言完全不工作（始终显示英文）

**根因：** 该语言在 `config.js` 中没有被注册。

例如，本项目之前法语(fr)完全没有 import 和注册，选法语时会 fallback 到英语。

### 错误 5：翻译文件键完整但仍显示英文

**根因：** 代码中的键在英语 JSON 中也不存在。i18next 的 fallback 机制是：当前语言 → fallback 语言(en)。如果 en 中也没有，则返回键名本身或默认值。

**排查：** 运行 `scripts/check-missing-keys.cjs` 检查代码中使用但 EN 文件中不存在的键。

---

## 检查清单

新增翻译时，按以下清单逐项确认：

- [ ] 英语 JSON 文件中已添加新键
- [ ] 所有 9 种其他语言的 JSON 文件中已添加对应翻译
- [ ] `config.js` 中每种语言都已 import 对应的 JSON 文件
- [ ] `config.js` 的 `resources` 中每种语言都已注册该命名空间
- [ ] 如果新增命名空间，`ns` 数组中已添加命名空间名
- [ ] 运行 `scripts/check-missing-keys.cjs` 确认代码中的键都在 EN 文件中存在
- [ ] 运行 `npm run build:client` 确认构建通过
- [ ] 手动切换语言验证翻译是否生效

---

## 同步多语言

翻译文件必须以英语(en)为准，其他 9 种语言保持同步：

```
src/i18n/locales/
├── en/          ← 参考语言，最先更新
├── zh-CN/       ← 同步
├── zh-TW/       ← 同步
├── ja/          ← 同步
├── ko/          ← 同步
├── de/          ← 同步
├── fr/          ← 同步
├── it/          ← 同步
├── ru/          ← 同步
└── tr/          ← 同步
```

**原则：**
1. 先在 `en/` 中添加新键
2. 然后为所有 9 种语言添加翻译
3. **不要跳过任何语言**——跳过的语言会 fallback 到英语，导致用户体验不一致
4. 使用 `node scripts/fill-missing-keys.cjs` 或编写专用脚本来批量生成翻译

### 辅助脚本

项目中有几个辅助脚本位于 `scripts/` 目录：

| 脚本 | 用途 |
|------|------|
| `check-missing-keys.cjs` | 扫描组件代码中使用的所有 `t()` 调用，找出英语 JSON 中缺失的键 |
| `fill-missing-i18n.cjs` | 最初的批量翻译填充脚本 |
| `fill-new-keys.cjs` | 为新增的 git、browser、about 键批量生成翻译 |
| `fill-extra-git-keys.cjs` | 为 git.json 补充 fileChange/fileSelect/diff 键 |
| `fill-missing-sidebar-keys.cjs` | 为 sidebar/common/codeEditor 补充缺失键 |

**验证完整性：**
```bash
# 检查代码中的键是否都在 EN 文件中存在
node scripts/check-missing-keys.cjs

# 检查每种语言是否缺少 EN 中已有的键
node -e "
const fs=require('fs'),path=require('path');
const dir='src/i18n/locales';
const ns=['common','settings','auth','sidebar','chat','codeEditor','tasks','git'];
function flat(o,p=''){const r={};for(const k of Object.keys(o)){const n=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null&&!Array.isArray(o[k]))Object.assign(r,flat(o[k],n));else r[n]=o[k];}return r;}
let en=0;for(const n of ns){const f=path.join(dir,'en',n+'.json');if(fs.existsSync(f))en+=Object.keys(flat(JSON.parse(fs.readFileSync(f,'utf-8')))).length;}
console.log('EN total: '+en+' keys');
for(const l of fs.readdirSync(dir)){if(l==='en')continue;const d=path.join(dir,l);if(!fs.statSync(d).isDirectory())continue;let m=0;
for(const n of ns){const ef=path.join(dir,'en',n+'.json');if(!fs.existsSync(ef))continue;const lf=path.join(d,n+'.json');let lk=new Set();if(fs.existsSync(lf))lk=new Set(Object.keys(flat(JSON.parse(fs.readFileSync(lf,'utf-8')))));for(const k of Object.keys(flat(JSON.parse(fs.readFileSync(ef,'utf-8'))))){if(!lk.has(k))m++;}}
console.log((m?'❌ ':'✅ ')+l+(m?' '+m+' missing':' 100%'));}
"
```

---

## 历史问题记录

以下是本项目在 i18n 改造过程中发现并修复的问题，供参考：

| 问题 | 根因 | 影响范围 |
|------|------|----------|
| Git 面板全英文 | `git.json` 创建后只在 `config.js` 中为 `en` 注册，其他 9 种语言均未注册 | 所有非英语语言 |
| 法语完全不工作 | `config.js` 中完全没有 `fr` 的 import 和注册（历史遗留 bug） | 法语用户 |
| 侧边栏删除确认、归档等显示英文 | 代码中使用 `t('deleteConfirmation.archiveProject', 'Archive project')` 带默认值，但 EN 的 `sidebar.json` 中没有这些键 | 所有语言 |
| 侧边栏运行中/归档搜索显示英文 | `search.modeRunning`、`running.*`、`archived.*` 等键在 EN 文件中不存在 | 所有语言 |
| 文件上传中/完成/失败显示英文 | `common.cancel`、`common.done`、`common.failed` 等键路径不正确 | 所有语言 |
| HTML 预览按钮显示英文 | `actions.previewHtml` 在 EN 的 `codeEditor.json` 中不存在 | 所有语言 |
| 浏览器设置页面全英文 | `browser.*` 键未添加到 `settings.json` | 所有语言 |
| 关于页面全英文 | `about.*` 键未添加到 `settings.json` | 所有语言 |
