# pstack-workbuddy

[pstack](https://github.com/cursor/plugins/tree/main/pstack) 的非官方社区移植，让腾讯 WorkBuddy / CodeBuddy 能按 Cursor 用户的方式安装和使用 poteto（Lauren Tan）的 agent 工作流。

本仓库**不隶属于、也不代表 Cursor 或腾讯**。技能、代理和指南正文的版权属于 Lauren Tan（Copyright (c) 2026 Lauren Tan），以 MIT 协议授权，见 [LICENSE](LICENSE)。移植脚本、钩子和安装说明见 [NOTICE](NOTICE)。

上游版本：**pstack 0.15.32**，提交 [`e73df471cd4bd918367e99f3dd9c51bd53ddf5f0`](https://github.com/cursor/plugins/commit/e73df471cd4bd918367e99f3dd9c51bd53ddf5f0)（2026-10-23）。本次移植 **58 个技能**、**2 个代理**（`poteto-agent`、`comment-sicko`）。技能正文保持英文。

## 环境

- CodeBuddy Code，或 WorkBuddy 桌面版。本仓库在 Linux 上用 npm 包 `@tencent-ai/codebuddy-code@2.174.0` 验证过插件发现。
- 插件钩子会调用系统里的 `node`。Node.js 18 或更新版本即可。

## 安装

插件安装后，命令带命名空间，例如 `/pstack:poteto-mode`。手动复制技能目录则没有 `pstack:` 前缀，也**不会**加载钩子，因此 `/poteto-mode` 不能跨回合保持。

### 插件市场（推荐）

在 CodeBuddy Code 对话里：

```text
/plugin marketplace add pstack-pro/pstack-workbuddy
/plugin install pstack@pstack-workbuddy
```

或者在终端：

```bash
codebuddy plugin marketplace add pstack-pro/pstack-workbuddy
codebuddy plugin install pstack@pstack-workbuddy
```

更新与卸载：

```bash
codebuddy plugin marketplace update pstack-workbuddy
codebuddy plugin update pstack@pstack-workbuddy
codebuddy plugin uninstall pstack@pstack-workbuddy
codebuddy plugin marketplace remove pstack-workbuddy
```

本地克隆，用来改代码或只在当前会话试一次：

```bash
git clone https://github.com/pstack-pro/pstack-workbuddy.git
codebuddy --plugin-dir ./pstack-workbuddy

# 或者安装到用户级（写入 ~/.codebuddy）
codebuddy plugin marketplace add ./pstack-workbuddy
codebuddy plugin install pstack@pstack-workbuddy
```

同一台机器上，市场名 `pstack-workbuddy` 是全局的。GitHub 源和本地目录不要同时加。要换源，先在用过的项目里卸载，再从新源安装。

### 只复制技能

插件是完整体（技能、代理、粘性钩子）。只想要技能文件时：

```bash
git clone https://github.com/pstack-pro/pstack-workbuddy.git
mkdir -p ~/.codebuddy/skills
cp -R pstack-workbuddy/skills/. ~/.codebuddy/skills/
```

项目级放在仓库的 `.codebuddy/skills/`。官方文档写明的用户技能目录是 `~/.codebuddy/skills/`，项目技能目录是 `.codebuddy/skills/`。WorkBuddy 桌面版如果还读取 `~/.workbuddy/skills/`，把同样的目录再拷一份。这次移植读到的文档没有把 `~/.workbuddy/skills/` 列为加载路径；清单目录 `.workbuddy-plugin/` 是被接受的。桌面版没出现技能时，改用 `~/.codebuddy/skills/`。

手动复制**不会**安装 `agents/` 和 `hooks/`。需要子代理和粘性模式时，用上面的插件安装。

## 开始

1. `/pstack:setup-pstack`：确认本会话能用的模型，并写入 `~/.codebuddy/rules/pstack-models.md`。该文件是用户级规则，`alwaysApply: true`，新会话都会加载。这是 Cursor 里 `~/.cursor/rules/pstack-models.mdc` 的对应物。
2. `/pstack:poteto-mode <任务>`：主入口。插件安装后，这个命令会在当前 `session_id` 上保持到你发送 `/pstack:poteto-mode off`（或 `exit poteto-mode`）。
3. 已打开的会话要读到新规则，需要新开一轮或 `/clear`。

还没跑 setup 也可以用。角色表不存在时，子代理省略 `model`，沿用当前对话的模型。

## 和 Cursor 版的差别

技能正文尽量保持原样。Cursor 才有的名字，能对应的已改成 CodeBuddy 的名字；没有对应物的，在正文里写明，不另造一个。

- 对照表：[docs/harness/codebuddy.md](docs/harness/codebuddy.md)。`SessionStart` 钩子会把它和模型规则一起注入。
- 粘性 `/poteto-mode`：CodeBuddy 没有 Custom Mode，也没有 Option+Enter。`hooks/hooks.json` 在 `UserPromptSubmit` 里按会话重新注入技能。输出风格只改语气；`settings.json` 的 `agent` 会改掉所有会话；写进 `CODEBUDDY.md` 也会盖住普通对话。所以都不用。
- 逐项改动、没有对应物的功能、以及已经验证和尚未验证的部分，见 [PORTING.md](PORTING.md)。

## 追踪上游

不要手改 `skills/`、`agents/`、`docs/guide/` 和 `LICENSE`。

```bash
node scripts/port.mjs /path/to/plugins/pstack
node scripts/validate.mjs
```

`scripts/port.mjs` 从上游 checkout 重新生成这些目录，再盖上 `overrides/`（目前是 `setup-pstack`）。版本钉在 `UPSTREAM.json`。不传路径时，脚本会把 `github.com/cursor/plugins` 浅克隆到系统临时目录。

## 相关仓库

- 上游：<https://github.com/cursor/plugins/tree/main/pstack>
- Claude Code 移植：<https://github.com/pstack-pro/pstack-claude>
- pi 移植：<https://github.com/pstack-pro/pstack-pi>

## English

Unofficial community port of [pstack](https://github.com/cursor/plugins/tree/main/pstack) (Lauren Tan / poteto) for Tencent WorkBuddy and CodeBuddy. Not affiliated with Cursor or Tencent. Skill text stays in English. Upstream pin: pstack **0.15.32** at `e73df471cd4bd918367e99f3dd9c51bd53ddf5f0`, 58 skills and 2 agents.

Install the plugin (namespaced commands, sticky `/pstack:poteto-mode`):

```bash
codebuddy plugin marketplace add pstack-pro/pstack-workbuddy
codebuddy plugin install pstack@pstack-workbuddy
```

Or copy `skills/` into `~/.codebuddy/skills/` or `.codebuddy/skills/`. A manual copy has no `pstack:` prefix and does not load hooks, so poteto-mode applies to one message. Plugin install is what registers `agents/` and the sticky hook.

Then `/pstack:setup-pstack`, then `/pstack:poteto-mode <task>`. Turn the mode off with `/pstack:poteto-mode off`. Model choices go to `~/.codebuddy/rules/pstack-models.md` (`alwaysApply: true`). Adaptations and the verified / untested list are in [PORTING.md](PORTING.md). The MIT text in [LICENSE](LICENSE) is Lauren Tan's.
