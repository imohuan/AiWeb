# Commit 提交规范

## 基本规则：只提交暂存的更改

执行 `git commit` 时，**只会提交已经 `git add` 进暂存区（staging area）的文件**。工作区中未暂存的修改不会被提交。

```bash
# 查看当前状态（哪些暂存了、哪些没暂存）
git status

# 只把想提交的文件加入暂存区
git add <file>

# 提交（只提交暂存区的内容）
git commit -m "你的提交信息"
```

## Husky 钩子自动检查

本项目使用 [Husky](https://typicode.github.io/husky/) 管理 Git 钩子，提交时会自动触发以下检查：

### 1. pre-commit（提交前检查）

- **触发时机**：执行 `git commit` 时，在填写 commit message 之前
- **做了什么**：运行 `npx lint-staged`
- **lint-staged 规则**（配置在 `package.json`）：
  - `src/**/*.{ts,tsx,js,jsx}` → 运行 ESLint 检查
  - `server/**/*.{js,ts}` → 运行 ESLint 检查
- **注意**：lint-staged 只检查**暂存区中**匹配这些路径的文件，不会扫描整个项目

### 2. commit-msg（提交信息检查）

- **触发时机**：保存 commit message 之后、正式提交之前
- **做了什么**：运行 `npx commitlint --edit` 校验 commit message 格式
- **规则**：遵循 [Conventional Commits](https://www.conventionalcommits.org) 规范

## Commit Message 格式规范

```
<type>(<scope>): <subject>
```

### type（必填）

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能，如空格、缩进） |
| `refactor` | 重构（既不是新功能也不是修 bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或外部依赖变更 |
| `ci` | CI/CD 配置变更 |
| `chore` | 杂项（依赖更新、工具配置等） |
| `revert` | 回滚之前的 commit |

### scope（可选）

变更影响的范围，比如 `deps`、`api`、`ui` 等。

### subject（必填）

- 用英文写
- 全部小写
- 结尾不要加句号
- 简洁描述做了什么

### 正确示例

```
feat(ui): add dark mode toggle
fix(api): handle empty response from login endpoint
chore(deps): update eslint to v9
docs: add commit convention guide
refactor(utils): simplify date formatting logic
```

### 错误示例

```
# 没有 type
add pnpm workspace

# 首字母大写
Feat: add dark mode

# 结尾有句号
fix: handle empty response.
```

## 实际操作流程

```bash
# 1. 改完代码，看看改了啥
git status

# 2. 把要提交的文件加入暂存区
git add package.json pnpm-lock.yaml

# 3. 提交（husky 会自动跑 lint-staged + commitlint）
git commit -m "chore(deps): add pnpm workspace support"

# 4. 确认无误后推送到远端
git push
```

## 注意事项

- 只有 `git add` 过的文件才会被提交，工作区里没暂存的改动不会被提交也不会被 lint-staged 检查
- 如果 commit message 不符合规范，commitlint 会直接拒绝提交，改好 message 再试
- 如果 lint-staged 报 ESLint 错误，修好代码后重新 `git add` 再提交
- 不要用 `--no-verify` 跳过钩子，除非你非常清楚自己在干嘛
