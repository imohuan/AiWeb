/**
 * 测试脚本：直接 HTTP API 生成 commit message
 *
 * 运行方式:
 *   node --import tsx server/routes/git-generate-commit.test.js
 *
 * 说明:
 *   绕过 Agent 子进程，直接用 Anthropic Messages API 生成 commit message。
 *   commit message 是简单任务，默认使用 haiku（最快最便宜）。
 *
 * 模型策略:
 *   - 第三方代理: 透传 ANTHROPIC_SMALL_FAST_MODEL，fallback "haiku"
 *   - 官方 API:   使用 ANTHROPIC_SMALL_FAST_MODEL，fallback claude-3-5-haiku-20241022
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

const PROJECT_PATH = process.env.TEST_PROJECT_PATH || process.cwd();
const COMMIT_GUIDE_PATH = path.join(PROJECT_PATH, "docs", "commit-guide.md");
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

// ============================================================
// 辅助函数
// ============================================================

async function readCommitGuide() {
  try { return await fs.readFile(COMMIT_GUIDE_PATH, "utf-8"); }
  catch { return ""; }
}

async function getTestDiff() {
  return new Promise((resolve) => {
    const child = spawn("git", ["diff", "--cached", "--", "."], {
      cwd: PROJECT_PATH,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.on("close", () => {
      if (!stdout.trim()) {
        const child2 = spawn("git", ["diff", "HEAD", "--", "."], {
          cwd: PROJECT_PATH,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout2 = "";
        child2.stdout.on("data", (d) => (stdout2 += d.toString()));
        child2.on("close", () => {
          resolve(stdout2.trim() ? stdout2.substring(0, 4000) : "(no diff - mock test)");
        });
        return;
      }
      resolve(stdout.substring(0, 4000));
    });
  });
}

function timer(label) {
  const start = Date.now();
  return {
    done() {
      const elapsed = Date.now() - start;
      console.log(`  ⏱ ${label}: ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`);
      return elapsed;
    },
  };
}

// ============================================================
// API 配置解析
// ============================================================

/**
 * commit message 是简单任务，默认使用 haiku（最快最便宜）。
 *
 * 模型选择优先级:
 *   ANTHROPIC_SMALL_FAST_MODEL > ANTHROPIC_DEFAULT_HAIKU_MODEL > 默认 haiku
 */
async function resolveApiConfig() {
  let settingsEnv = {};
  try {
    const content = await fs.readFile(CLAUDE_SETTINGS_PATH, "utf8");
    const settings = JSON.parse(content);
    settingsEnv = settings.env || {};
  } catch {}

  const apiKey =
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.ANTHROPIC_AUTH_TOKEN?.trim() ||
    settingsEnv.ANTHROPIC_API_KEY?.trim() ||
    settingsEnv.ANTHROPIC_AUTH_TOKEN?.trim() ||
    "";

  const baseUrl =
    process.env.ANTHROPIC_BASE_URL?.trim() ||
    settingsEnv.ANTHROPIC_BASE_URL?.trim() ||
    "https://api.anthropic.com";

  const isOfficial = baseUrl === "https://api.anthropic.com";

  // commit message 场景用 haiku：ANTHROPIC_SMALL_FAST_MODEL 优先
  const configuredModel =
    process.env.ANTHROPIC_SMALL_FAST_MODEL?.trim() ||
    settingsEnv.ANTHROPIC_SMALL_FAST_MODEL?.trim() ||
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL?.trim() ||
    settingsEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL?.trim() ||
    "";

  const model = configuredModel
    || (isOfficial ? "claude-3-5-haiku-20241022" : "haiku");

  return { apiKey, baseUrl, model, isOfficial };
}

// ============================================================
// 方式 D: 直接 HTTP API 调用
// ============================================================

async function testD_directHttpApi(diffContext) {
  console.log("\n=== 方式 D: 直接 HTTP API 调用 (haiku) ===");
  console.log("  描述: 绕过 Agent，直接用 Anthropic Messages API + haiku 模型");

  const t = timer("耗时");

  const { apiKey, baseUrl, model, isOfficial } = await resolveApiConfig();

  if (!apiKey) {
    console.log("  ❌ 未找到 API Key");
    t.done();
    return "[ERROR] 未找到 API Key";
  }

  console.log(`  🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`);
  console.log(`  🌐 Base URL: ${baseUrl}`);
  console.log(`  🏷 类型: ${isOfficial ? "官方 Anthropic API" : "第三方代理/自定义端点"}`);
  console.log(`  🤖 模型: ${model}`);

  const commitGuide = await readCommitGuide();
  let systemPrompt;

  if (commitGuide) {
    console.log(`  ✅ 已加载 commit-guide.md (${commitGuide.length} 字符)`);
    systemPrompt = [
      "You are a commit message generator. Follow these rules strictly:",
      "",
      commitGuide,
      "",
      "IMPORTANT: Return ONLY the commit message. No markdown, no explanations.",
    ].join("\n");
  } else {
    console.log("  ⚠️ 未找到 docs/commit-guide.md");
    systemPrompt = [
      "You are a commit message generator. Generate a conventional commit message.",
      "Format: type(scope): subject. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore.",
      "Return ONLY the commit message. No markdown, no explanations.",
    ].join("\n");
  }

  const userMessage = [
    "Generate a commit message based on the diff below.",
    "",
    "```diff",
    diffContext,
    "```",
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = errBody;
      try { errMsg = JSON.parse(errBody).error?.message || errBody; } catch {}
      console.log(`  ❌ HTTP ${response.status}: ${errMsg.substring(0, 300)}`);
      t.done();
      return `[ERROR] HTTP ${response.status}`;
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();

    console.log(`  📊 Token: input=${data.usage?.input_tokens}, output=${data.usage?.output_tokens}`);
    if (data.model && data.model !== model) {
      console.log(`  ℹ️ 实际模型: ${data.model}`);
    }

    t.done();
    return text;
  } catch (err) {
    console.log(`  ❌ 网络错误: ${err.message}`);
    t.done();
    return `[ERROR] ${err.message}`;
  }
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log("🧪 Commit Message 生成测试 (HTTP API + haiku)");
  console.log(`📁 项目路径: ${PROJECT_PATH}`);
  console.log("=".repeat(60));
  const diffContext = await getTestDiff();
  console.log(`📝 Diff 长度: ${diffContext.length} 字符`);
  console.log(`📝 Diff 预览:\n${diffContext.substring(0, 300)}...\n`);

  const result = await testD_directHttpApi(diffContext);

  console.log("\n" + "=".repeat(60));
  console.log("📊 生成结果:");
  console.log(result || "(无输出)");
  console.log("\n✅ 测试完成");
}

main().catch((err) => {
  console.error("测试失败:", err);
  process.exit(1);
});
