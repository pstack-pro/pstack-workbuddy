# Porting pstack to WorkBuddy / CodeBuddy

This file is the adaptation record. Skill and agent bodies stay in English. Regenerate them with `node scripts/port.mjs`; do not hand-edit `skills/`, `agents/`, `docs/guide/`, or `LICENSE`.

## Upstream pin

| | |
| --- | --- |
| Source | <https://github.com/cursor/plugins> `pstack/` |
| Commit | `e73df471cd4bd918367e99f3dd9c51bd53ddf5f0` |
| Commit time | 2026-10-23T15:56:09-07:00 |
| Plugin version | 0.15.32 (from upstream `.cursor-plugin/plugin.json`) |
| Skills | 58 |
| Agents | 2 (`poteto-agent`, `comment-sicko`) |

Recorded in `UPSTREAM.json`. Official Claude Code support upstream is an adapter document, `docs/harness/claude-code.md`, plus install instructions in the guide. It does not fork the skill bodies per host. This port follows that shape: one CodeBuddy adapter at `docs/harness/codebuddy.md`, injected on `SessionStart`, and mechanical renames in `scripts/port.mjs`.

Earlier ports used for layout: [pstack-claude](https://github.com/pstack-pro/pstack-claude) (plugin manifest, marketplace, Node hooks, `overrides/`, `UPSTREAM.json`) and [pstack-pi](https://github.com/pstack-pro/pstack-pi) (regenerate from upstream, keep skill prose, override `setup-pstack`). Claude Code keeps Cursor tool names behind a shim. CodeBuddy already has Claude-style names (`Agent`, `AskUserQuestion`, `Bash`), so this port renames in the text instead of shimming Cursor names.

## What the script does

`node scripts/port.mjs [path/to/plugins/pstack]` copies `skills/`, `agents/`, and `docs/guide/` from the checkout (or a shallow clone), then:

1. Rewrites Cursor tool names, paths, and feature sentences that have a CodeBuddy equivalent.
2. Prefixes skill slash commands with `pstack:` so they match plugin namespacing (`/poteto-mode` becomes `/pstack:poteto-mode`). The sticky hook still accepts a bare `/poteto-mode`, for a manual copy.
3. Drops skill frontmatter keys CodeBuddy does not document: `icon`, `color`, `paths`, `mode`, `reminder`. Forces `name` to the directory name.
4. When `paths:` was removed, adds one body line telling the model to apply the skill on `.ts` / `.tsx` edits. That is `typescript-best-practices`.
5. Maps agent `is_background:` to `background: true`.
6. Appends a "Sticky mode on CodeBuddy" section to `skills/poteto-mode/SKILL.md`.
7. Injects a short CodeBuddy note under the first heading of any file that still names a Cursor-only model, product, or feature.
8. Replaces the Cursor transcript slug block in `skills/poteto-mode/scripts/worktree-audit.sh`.
9. Copies `overrides/` on top. Today that is only `skills/setup-pstack/SKILL.md`.
10. Replaces `LICENSE` with upstream's MIT text (Copyright (c) 2026 Lauren Tan) and writes `UPSTREAM.json`. Plugin `version` fields are set from that pin.

`node scripts/validate.mjs` checks frontmatter, unique names, hard leftovers, the license pin, and the hooks against fixture stdin. `.github/workflows/validate.yml` re-runs the port against the pinned commit and fails if the tree drifts.

## Frontmatter

CodeBuddy skill fields this port keeps: `name`, `description`, `allowed-tools`, `disable-model-invocation`, `user-invocable`, `context`, `agent`, `model`, `hooks`, `disable`.

Agent fields: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`. Plugin agents cannot carry `hooks`, `mcpServers`, or `permissionMode`. Neither shipped agent uses those.

## Replacements

| Cursor | CodeBuddy |
| --- | --- |
| `Task` | `Agent` |
| `AskQuestion` | `AskUserQuestion` |
| `generalPurpose` | `general-purpose` |
| `readonly: true` | `subagent_type: "Explore"` |
| `readonly: false` | `subagent_type: "general-purpose"` |
| `environment: "cloud"` | `isolation: "worktree"` (a local git worktree, not a cloud machine) |
| `environment: "local"` | omit `isolation` |
| `cloud_base_branch` | tell the worker which branch to check out |
| `subagent_type: "poteto-agent"` | `pstack:poteto-agent` |
| `subagent_type: "comment-sicko"` | `pstack:comment-sicko` |
| `Shell` in the tool list sentence | `Bash` |
| Open a todolist | `TaskCreate`, with an in-reply list if that tool is absent |
| `~/.cursor/rules/pstack-models.mdc` | `~/.codebuddy/rules/pstack-models.md` |
| `~/.cursor/skills/`, `.cursor/skills/` | `~/.codebuddy/skills/`, `.codebuddy/skills/` |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.codebuddy/plugins/`, `.codebuddy-plugin/plugin.json` |
| Transcript slug `~/.cursor/projects/<slug>/agent-transcripts/` | hook `transcript_path`, else `~/.codebuddy/projects/`, `~/.codebuddy/sessions/`, `~/.codebuddy/history.jsonl` |
| `/add-plugin pstack` | `/plugin marketplace add` then `/plugin install` |
| Custom Mode, Option+Enter, Alt+Enter | plugin sticky hook, documented in the skill |
| Built-in `create-skill` | authoring-a-skill playbook |
| Built-in babysit | Babysit playbook |
| `/loop` | finish-condition loop; `CronCreate` is a later check, not `/loop` |
| Cursor cloud agents / dashboard | worktree subagents; reattach by PR and branch |
| `cursor-team-kit` `/deslop` | review the diff, then `/pstack:no-comments` |
| `control-ui` / `control-cli` | a project `verify-*` skill when one exists |
| Resume / message / queue on an Agent id | spawn a fresh agent and paste the prior report |
| Cursor Plan Mode / Projects | `EnterPlanMode` / `ExitPlanMode`; Orchestrate is a local coordinator |

A sentence that still needs a Cursor-only product says so and tells the model to skip that step in one line. The adapter's "No CodeBuddy equivalent" table is the checklist.

## setup-pstack

The override replaces the Cursor skill. It writes `~/.codebuddy/rules/pstack-models.md` with `alwaysApply: true`. User rules load for every project ([directory layout](https://cloud.tencent.com/document/product/1831/137016)). `CODEBUDDY.md` was rejected because a project memory file is shared with the repo and would not match the user-level Cursor rule. `~/.codebuddy/CODEBUDDY.md` would also apply to every casual turn as memory, not as a role table the skills parse.

Effort is a separate `# effort` line (`max`, `xhigh`, `high`, `medium`). CodeBuddy does not encode effort in the model id, and there is no `-fast` suffix. `inherit` and `auto` mean omit Agent `model`.

The skill does not ship a default catalog. It may record ids only after the Agent tool schema, a documented list command, or the user's `/model` paste confirms them. CodeBuddy Code 2.174.0 `--help` printed a `--model` list (`default-model`, `fast-model`, `hy3`, `gpt-5.6-sol`, `glm-5.2`, `kimi-k2.6`, and others). That snapshot is in the skill as a detection hint. Product aliases are not Cursor fast tiers and are not role defaults. A logged-in session was not available here, so none of those ids were written into a rule file.

If `~/.codebuddy` is missing and `~/.workbuddy` exists, the skill also writes `~/.workbuddy/rules/pstack-models.md` and says that path is unverified. The docs read for this port do not list `~/.workbuddy/rules/`.

## Sticky /poteto-mode

CodeBuddy has no Custom Mode and no Option+Enter binding.

| Option | Why it was not used |
| --- | --- |
| Output styles | They append tone. They do not carry the playbook. |
| `settings.json` `agent` | Makes one agent the main thread for every session while the plugin is enabled. That is not a per-chat mode. |
| `CODEBUDDY.md` | Loads for every turn in the project, including casual ones. |

`hooks/hooks.json` registers two command hooks:

- `UserPromptSubmit` runs `hooks/sticky-poteto.mjs`. A prompt that **starts with** `/pstack:poteto-mode` or `/poteto-mode` sets that `session_id` on. `/pstack:poteto-help` does not, even if the rest of the line mentions the mode. Later prompts in the session get the skill body injected until `/pstack:poteto-mode off` or `exit poteto-mode`.
- `SessionStart` runs `hooks/session-start.mjs`. It injects `docs/harness/codebuddy.md`, the model rule when the file exists, `transcript_path`, and a one-line reminder if that session is still on.

State is `${CODEBUDDY_PLUGIN_DATA}/sticky-sessions.json`, or `~/.codebuddy/plugins/data/pstack/` when the host does not set the variable. Rows older than 14 days are dropped. The hook stdout is `{ "continue": true, "hookSpecificOutput": { "hookEventName", "additionalContext" } }`. CodeBuddy Code 2.174.0 reads `additionalContext` and attaches it as a `system-reminder` (confirmed by reading that CLI build, and by the process log spawning both scripts).

The skill body cap inside the sticky hook is 24,000 characters. `skills/poteto-mode/SKILL.md` is about 22 KB today, so the current text is not truncated. A manual copy into `~/.codebuddy/skills/` does not load `hooks/hooks.json`. The skill tells the user to invoke it again on the next task.

## Intentionally kept Cursor words

`scripts/validate.mjs` allows these only in files that also carry the CodeBuddy note. Counts are files, from the last local run:

| Files | What remains, and why |
| --- | --- |
| 15 | `-fast` — called out as absent, or left in an upstream sentence the note covers |
| 15 | `grok-<digit>` — upstream default intent, not a CodeBuddy id |
| 13 | `/loop` — "CodeBuddy has no `/loop`" |
| 10 | the word `Cursor` — attribution or an explicit "no Cursor cloud agents" |
| 8 | `claude-opus-<digit>` / sonnet / haiku — same as Grok, intent labels |
| 8 | `cursor-team-kit` — "CodeBuddy has no cursor-team-kit" |
| 7 | `agent-transcripts` — the shell script and notes say the layout is undocumented here |
| 6 | `Bugbot` — skip steps; `watch-pr` still classifies old review comments |
| 4 | `Custom Mode` — "CodeBuddy has no Custom Mode" |
| 2 | `composer-` |
| 2 | `cursor-grok-` |
| 1 | `gpt-5.<digit>-sol` — the setup skill quotes the 2.174.0 `--help` line |
| 1 | `cloud_base_branch` — "CodeBuddy has no such parameter" |
| 1 | `api2.cursor.sh` |
| 1 | `SendToUser` |
| 1 | `update_state` |

Hard failures (the run must be clean): leftover `AskQuestion`, `generalPurpose`, a `.cursor/` path, `pstack-models.mdc`, `/add-plugin`, `is_background`, `Option+Enter`, `Alt+Enter`, and `environment: "cloud"` or `"local"`. A line that says the feature does not exist is allowed.

## Docs this port was checked against

- <https://www.workbuddy.cn/docs/ide/Features/Skills> — `SKILL.md` frontmatter (`name`, `description`, optional `allowed-tools`, `disable`), plus `scripts/`, `references/`, `assets/`. Project skills live in `.codebuddy/skills/`.
- <https://www.workbuddy.cn/docs/cli/plugins> — `.codebuddy-plugin/plugin.json`, components at the plugin root, `--plugin-dir`, `/plugin-name:skill`, `hooks/hooks.json`.
- <https://www.workbuddy.cn/docs/cli/plugins-reference> — agent frontmatter including `background` and `isolation: "worktree"`, hook event names, marketplace commands, `.workbuddy-plugin/` and `.claude-plugin/` also accepted. This repo ships only `.codebuddy-plugin/`.
- <https://cloud.tencent.com/document/product/1831/137016> — `~/.codebuddy/rules/`, `~/.codebuddy/skills/`, `~/.codebuddy/projects/`, `~/.codebuddy/sessions/`, `~/.codebuddy/history.jsonl`, rule `alwaysApply`.

## Verified on this machine

CodeBuddy Code **2.174.0** from `npm install -g @tencent-ai/codebuddy-code@2.174.0` (user prefix, Linux). No account login was available. `codebuddy -p` stops at "Authentication required" after plugins load.

| Check | Result |
| --- | --- |
| `node scripts/validate.mjs` | Pass. 58 skills, 2 agents. Hook fixtures: help does not stick, `/pstack:poteto-mode` sticks, a later turn re-injects, another `session_id` stays off, `off` clears, bare `/poteto-mode` sticks. |
| `codebuddy plugin validate` on `marketplace.json` and on `plugin.json` | Both valid. |
| `codebuddy plugin marketplace add <repo>` and `plugin install pstack@pstack-workbuddy` against a local directory, `HOME` pointed at an empty temp dir | Installed and enabled, version 0.15.32. Cache contains 58 `SKILL.md` files, both agents, and `hooks/`. |
| Headless `--plugin-dir` plus that install | Log: `Loaded 58 skill(s)`, `Loaded 2 agent(s)`, hooks configuration loaded, `errors=0`. `UserPromptSubmit` and `SessionStart` each spawned the Node scripts. |
| Hook JSON shape | The 2.174.0 bundle assigns `hookSpecificOutput.additionalContext` to the user-prompt and session-start contexts, then wraps them in a system reminder. |

`codebuddy plugin validate` on the repo root validates `marketplace.json` only. Passing `plugin.json` validates that file. Neither command printed per-skill frontmatter diagnostics. Skill acceptance is the loader line above, not the validate command.

## Not verified

- A logged-in turn that actually follows a playbook, spawns `pstack:poteto-agent`, or writes the model rule.
- The model ids an entitled account can call. The `--help` list was not treated as confirmation.
- WorkBuddy desktop UI, the in-chat `/plugin` screens, and whether the desktop app runs `hooks/hooks.json`.
- Whether `~/.workbuddy/skills/` is on the desktop loader path.
- `codebuddy plugin marketplace add pstack-pro/pstack-workbuddy` against GitHub. The local directory add worked. GitHub add needs this repository's default branch to contain `.codebuddy-plugin/marketplace.json`.
- Session resume. Sticky state is keyed by `session_id`. A resume that mints a new id will not stay on. That was not exercised.
- `CronCreate`, `EnterWorktree`, `EnterPlanMode`, and `TaskCreate` behaving as the adapter describes. Those names come from the CLI help and the docs, not from a live tool call in this run.
- The installed-copy log counted 2 hooks. The same tree loaded via `--plugin-dir` was logged as 4 hooks. Both copies still spawned one `UserPromptSubmit` command and one `SessionStart` command. The extra count was not explained.

## Open questions

1. Does WorkBuddy desktop load `~/.workbuddy/skills/` in addition to `~/.codebuddy/skills/`? The pages read here document the `.codebuddy` paths and accept a `.workbuddy-plugin/` manifest directory. They do not list `~/.workbuddy/skills/`.
2. On resume, is `session_id` stable? If it is not, sticky mode needs a different key.
3. Will a future CodeBuddy build still accept `hookSpecificOutput.additionalContext` for `UserPromptSubmit`? 2.174.0 does. The hook also prints only that JSON on stdout, which matches the parser this build uses.
4. Should `fast-model` and the other product aliases become a budget preset once a logged-in `/model` list confirms them? This port leaves that to `/pstack:setup-pstack` on the user's machine.
