# pstack-workbuddy

[pstack](https://github.com/cursor/plugins/tree/main/pstack) 的非官方社区移植，给腾讯 WorkBuddy 桌面版使用。技能正文保持英文。本仓库不隶属于、也不代表 Cursor 或腾讯。

技能、代理和指南正文的版权属于 Lauren Tan（Copyright (c) 2026 Lauren Tan），以 MIT 协议授权，见 [LICENSE](LICENSE)。移植部分见 [NOTICE](NOTICE)。

上游版本：**pstack 0.15.32**，提交 [`e73df471cd4bd918367e99f3dd9c51bd53ddf5f0`](https://github.com/cursor/plugins/commit/e73df471cd4bd918367e99f3dd9c51bd53ddf5f0)（2026-10-23）。本次移植 **58 个技能**、**2 个代理**（`poteto-agent`、`comment-sicko`）。

## 环境

- WorkBuddy 桌面版。配置根目录是 `~/.workbuddy/`。
- 插件钩子会调用系统里的 `node`。Node.js 18 或更新版本即可。

## 安装

插件安装后，命令带命名空间，例如 `/pstack:poteto-mode`。只复制技能目录则没有 `pstack:` 前缀，也**不会**加载钩子，因此模式不能跨回合保持。

### 插件市场

仓库清单在 `.workbuddy-plugin/plugin.json`，市场清单在 `.workbuddy-plugin/marketplace.json`。在 WorkBuddy 里添加这个 GitHub 仓库或它的 zip（本机已安装的市场就是目录和 zip 两种），然后安装 `pstack@pstack-workbuddy`。

对话里如果有插件命令，可以输入：

```text
/plugin marketplace add pstack-pro/pstack-workbuddy
/plugin install pstack@pstack-workbuddy
```

桌面版设置页上的具体按钮名称以你安装的 WorkBuddy 为准。装好后插件文件在 `~/.workbuddy/plugins/cache/pstack-workbuddy/pstack/<version>/`。

本地克隆，用来改代码：

```bash
git clone https://github.com/pstack-pro/pstack-workbuddy.git
```

把这个目录按「本地目录」市场添加，再安装 `pstack`。

### 只复制技能

```bash
git clone https://github.com/pstack-pro/pstack-workbuddy.git
mkdir -p ~/.workbuddy/skills
cp -R pstack-workbuddy/skills/. ~/.workbuddy/skills/
```

这和已经放在 `~/.workbuddy/skills/<name>/SKILL.md` 的技能是同一位置。复制之后如果列表没刷新，重启 WorkBuddy。`~/.workbuddy/.skill-list-cache.json` 是应用自己的缓存，不要手改。

手动复制**不会**安装 `agents/` 和 `hooks/`。需要子代理和粘性模式时，用插件安装。

### 从 SkillHub / zip 安装

SkillHub（skillhub.cn）和 WorkBuddy 的「上传技能」都是一个 zip 里一个技能，`SKILL.md` 在 zip 根上。在仓库里生成这个包：

```bash
node scripts/bundle.mjs
```

产物是 `dist/pstack-<版本>.zip`（版本来自 `UPSTREAM.json`，当前是 `dist/pstack-0.15.32.zip`）。解压到 `~/.workbuddy/skills/pstack/`：

```bash
mkdir -p ~/.workbuddy/skills/pstack
unzip -o -d ~/.workbuddy/skills/pstack dist/pstack-0.15.32.zip
```

也可以在 SkillHub 安装，slug 是 `pstack`。WorkBuddy 5.8.3 会发现里面 `skills/<名字>/SKILL.md` 这一层，每个技能单独可调用，命令不带 `pstack:` 前缀，例如 `/setup-pstack`、`/poteto-mode`。列表没刷新就重启 WorkBuddy。

SkillHub 不收没有扩展名的文件，也会跳过图片。这个 zip 里许可证是 `LICENSE.md`，移植说明是 `NOTICE.md`，指南图片没有打进去。技能若写着运行 `scripts/watch-pr/watch-pr`，包里的文件是 `skills/poteto-mode/scripts/watch-pr/watch-pr.ts`，用 `bun` 加上原来的参数运行。

这次安装带上技能、指南和 `agents/` 里的参考文档。钩子不在包里：`/poteto-mode` 每开一个新任务要再调用一次，`~/.workbuddy/pstack-models.md` 也不会在会话开始时注入，技能要模型角色时直接读那个文件。`agents/poteto-agent.md` 和 `agents/comment-sicko.md` 没有注册成子代理。技能若要求 `pstack:poteto-agent` 或 `pstack:comment-sicko`，用 `general-purpose` 子代理，把对应文档的正文和本目录 `skills/poteto-mode/SKILL.md` 的绝对路径写进提示。要跨回合保持和注册好的代理，用上面的插件市场安装 `pstack@pstack-workbuddy`。

## 开始

1. `/pstack:setup-pstack`：读取 `~/.workbuddy/models.json` 里的模型 `id`（只读 id，不读密钥），确认后写入 `~/.workbuddy/pstack-models.md`。会话开始时的钩子会把这个文件注入上下文。WorkBuddy 没有会自动加载它的规则目录。
2. `/pstack:poteto-mode <任务>`：主入口。插件安装后，这个命令会在当前 `session_id` 上保持，直到你发送 `/pstack:poteto-mode off`（或 `exit poteto-mode`）。
3. 已经打开的会话要读到新的模型文件，需要新开一轮对话。

还没跑 setup 也可以用。模型文件不存在时，子代理省略 `model`，沿用当前对话的模型。

## 和 Cursor 版的差别

技能正文尽量保持原样。Cursor 才有的名字，能对应的已改成 WorkBuddy 的名字；没有对应物的，在正文里写明，不另造一个。

- 对照表：[docs/harness/workbuddy.md](docs/harness/workbuddy.md)。`SessionStart` 钩子会把它和模型文件一起注入。
- 粘性 `/poteto-mode`：WorkBuddy 没有 Custom Mode，也没有 Option+Enter。`hooks/hooks.json` 在每次用户发言时按会话重新注入技能。内置的 ask / plan / craft / expert 交互模式不是给第三方插件加的模式槽，这个移植没有去模仿它们。
- 逐项改动、没有对应物的功能、以及已经验证和尚未在桌面版点过的部分，见 [PORTING.md](PORTING.md)。

## 追踪上游

不要手改 `skills/`、`agents/`、`docs/guide/` 和 `LICENSE`。

```bash
node scripts/port.mjs /path/to/plugins/pstack
node scripts/bundle.mjs
node scripts/validate.mjs
```

`scripts/port.mjs` 从上游 checkout 重新生成这些目录，再盖上 `overrides/`（目前是 `setup-pstack`）。版本钉在 `UPSTREAM.json`。

## 相关仓库

- 上游：<https://github.com/cursor/plugins/tree/main/pstack>
- Claude Code 移植：<https://github.com/pstack-pro/pstack-claude>
- pi 移植：<https://github.com/pstack-pro/pstack-pi>

## English

Unofficial community port of [pstack](https://github.com/cursor/plugins/tree/main/pstack) (Lauren Tan / poteto) for the Tencent WorkBuddy desktop app. Not affiliated with Cursor or Tencent. Skill text stays in English. Upstream pin: pstack **0.15.32** at `e73df471cd4bd918367e99f3dd9c51bd53ddf5f0`, 58 skills and 2 agents.

The live config root is `~/.workbuddy/`. Install from this repo's `.workbuddy-plugin/marketplace.json` (GitHub repo or zip), then install `pstack@pstack-workbuddy`. Or copy `skills/` into `~/.workbuddy/skills/`. A manual copy has no `pstack:` prefix and does not load hooks.

`node scripts/bundle.mjs` writes `dist/pstack-<version>.zip` for SkillHub and WorkBuddy's skill upload. Unzip it to `~/.workbuddy/skills/pstack/`, or install slug `pstack` from SkillHub. Nested `skills/<name>/SKILL.md` files show up as their own commands. That install leaves out hooks and does not register the files in `agents/`. The zip names the license `LICENSE.md` and the port notice `NOTICE.md`, drops guide images, and ships the bun launcher as `skills/poteto-mode/scripts/watch-pr/watch-pr.ts`.

Then `/pstack:setup-pstack`, which reads model `id` fields from `~/.workbuddy/models.json` and writes `~/.workbuddy/pstack-models.md`. The session hook injects that file. `/pstack:poteto-mode <task>` stays on until `/pstack:poteto-mode off`. Details are in [PORTING.md](PORTING.md). The MIT text in [LICENSE](LICENSE) is Lauren Tan's.
