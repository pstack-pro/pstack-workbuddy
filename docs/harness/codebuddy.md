# pstack on WorkBuddy / CodeBuddy

pstack skills were written for Cursor. This port rewrites the names that have a CodeBuddy equivalent. Where a line still uses a Cursor name, apply this file and say what you did. `<plugin>` is the directory that contains `skills/` and this file. Never pass a field or value the tool schema rejects.

Plugin commands are `/pstack:<skill>`. A manual copy into `.codebuddy/skills/`, `~/.codebuddy/skills/`, or `~/.workbuddy/skills/` registers `/<skill>` with no prefix. The skill text uses the plugin form.

## Tools

| Cursor | CodeBuddy |
| --- | --- |
| `Task` | `Agent`. Several `Agent` calls in one message run in parallel. `run_in_background: true` is a documented Agent parameter. `TaskOutput` reads a background result. |
| `AskQuestion` | `AskUserQuestion`. |
| Open a todolist | `TaskCreate` and `TaskUpdate`. CodeBuddy has no separate todolist tool. If those tools are absent, keep the list in the reply and update it at each phase. |
| Run another pstack skill | Read `<plugin>/skills/<name>/SKILL.md`, or invoke `/pstack:<name>` (plugin install) or `/<name>` (manual copy). |
| `Shell` | `Bash` (`PowerShell` on Windows). |
| `Grep`, `Glob`, `Read`, `Edit`, `Write` | Same names. |

## Subagents

| Cursor | CodeBuddy |
| --- | --- |
| `subagent_type: generalPurpose` | `general-purpose`. It can edit files. |
| `poteto-agent`, `comment-sicko` | `pstack:poteto-agent`, `pstack:comment-sicko` when the plugin is installed. Manual copies use the names without the prefix. |
| `readonly: true` | `subagent_type: "Explore"`. Docs describe Explore as strictly read-only. They do not say it keeps MCP. When the worker needs MCP, use `general-purpose` and tell it not to edit, then check `git status`. |
| `readonly: false` / agent mode | `general-purpose`. |
| `environment: "cloud"` | `isolation: "worktree"` on a plugin agent, or the `EnterWorktree` tool. This is a local git worktree, not a Cursor cloud machine. |
| `environment: "local"` | Omit `isolation`. CodeBuddy has no `environment` field. |
| `cloud_base_branch` | CodeBuddy has no such parameter. Tell the worker which branch to check out. |
| `resume` / message / queue on an Agent id | Not documented. Spawn a fresh `Agent` and paste the prior report and branch. Do not invent a resume parameter. |
| `file_attachments` | Not documented. List the paths in the brief. |
| `background: true` on an agent file | Documented. Same effect as the caller passing `run_in_background: true`. |
| Plugin agent `permissionMode`, `hooks`, `mcpServers` | Not supported on plugin agents. Do not add them. |

Built-in subagent names include `general-purpose`, `Explore`, and `Plan`. `model` accepts a model id, a product alias, `lite`, `reasoning`, `inherit`, or `default`. `effort` accepts `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. Omit `model` to inherit the parent. There is no `-fast` suffix.

## Models

Cursor compound slugs such as `claude-opus-5-5-xhigh`, `grok-4.7-xhigh-fast`, `cursor-grok-*`, and `composer-*` are not CodeBuddy model ids. Do not pass them. A bare name can still be a CodeBuddy id. CodeBuddy Code 2.174.0 `--help` listed `gpt-5.6-sol` among others. That snapshot is not this session's entitlement.

Read the role line in `~/.codebuddy/rules/pstack-models.md`. `/pstack:setup-pstack` writes that file with `alwaysApply: true`. User rules load for every project. If the file or the line is missing, omit `model` and say which role had no line.

`inherit-parent` and `auto` in that file mean omit `model`. A panel line is a list. One subagent runs per entry. `arena cross-judge pool` picks one entry whose model family differs from the parent when it can.

The `# effort` line is the budget. It is separate from the model id. CodeBuddy does not encode effort inside the slug. The ladder is `max` > `xhigh` > `high` > `medium` > `low` > `minimal`. Raise or lower `effort` by one step the way the skill says to raise or lower the Cursor effort token. There is no fast mode. When a skill says "use fast", keep the role's model and say there is no `-fast` tier.

Docs show example ids (`gpt-5`, `gpt-5.1-codex`, `gemini-3.0-flash`, `sonnet`) and variants (`lite`, `reasoning`). Those examples are not the user's entitled set. Never write a slug you have not seen in this session's Agent schema, a documented list command, or the user's paste from `/model`.

## Paths

| Cursor | CodeBuddy |
| --- | --- |
| `~/.cursor/rules/pstack-models.mdc` | `~/.codebuddy/rules/pstack-models.md` (`alwaysApply` defaults to true). |
| `.cursor/skills/`, `~/.cursor/skills/` | `.codebuddy/skills/`, `~/.codebuddy/skills/`. WorkBuddy desktop also loads `~/.workbuddy/skills/`. A `~/.workbuddy/rules/` directory is not in the docs this port read. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.codebuddy/plugins/`, `.codebuddy-plugin/plugin.json`. The loader also accepts `.workbuddy-plugin/` and `.claude-plugin/`. This repo ships only `.codebuddy-plugin/`. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Not this layout. Use the hook's `transcript_path` when it is in context. Otherwise look in `~/.codebuddy/projects/`, `~/.codebuddy/sessions/`, and `~/.codebuddy/history.jsonl`, and name the path you used. Do not invent a slug. Do not read another workspace's sessions. |
| Project memory | `CODEBUDDY.md` or `.codebuddy/CODEBUDDY.md`. Rules: `.codebuddy/rules/*.md` and `~/.codebuddy/rules/*.md`. |

## Sticky /poteto-mode

CodeBuddy has no Custom Mode, and no Option+Enter or Alt+Enter binding that pins a skill.

The plugin's `UserPromptSubmit` hook is the stand-in. A prompt that starts with `/pstack:poteto-mode` or `/poteto-mode` turns the mode on for that `session_id`. Later prompts in the session get the skill injected again until `/pstack:poteto-mode off` or `exit poteto-mode`. `SessionStart` repeats a short reminder if that session is still on.

Output styles only append tone. `settings.json` `agent` would make one agent the main thread for every session while the plugin is enabled, and WorkBuddy's `codebuddy.mainAgent.allowUnopted` defaults to off. An always-applied `CODEBUDDY.md` would also cover casual turns. None of those is a per-chat mode.

A manual skill copy does not load `hooks/hooks.json`. Re-invoke the skill on the next task.

## No CodeBuddy equivalent

When a step needs one of these, write one line, `Skipped on CodeBuddy: <step>. <reason>.`, then continue. Do not invent the feature. Do not stop the whole task.

| Cursor | What to do |
| --- | --- |
| Custom Mode, Option+Enter, Alt+Enter, "Use as Mode" | The sticky hook above, or re-invoke the skill. |
| `/loop` | No such command. The Autonomous run playbook is the finish-condition loop. `CronCreate` schedules a later check. It is not `/loop`. A durable cron needs permission. |
| `/add-plugin` | `/plugin marketplace add` then `/plugin install`. See the README. |
| Bugbot, agentic security review | No Bugbot product. Triage existing GitHub review threads with the forge command the step names. Skip a step that starts, waits for, or configures Bugbot. The `watch-pr` script still recognizes a comment whose author or body looks like Bugbot, so old threads can be classified. |
| Cursor Automations, `update_state` routines, `api2.cursor.sh` webhooks, `SendToUser` secret-request | Skip. `make-bot-ui` cannot mint a webhook routine here. |
| Cursor cloud agents and the cloud dashboard | `isolation: "worktree"` or `EnterWorktree`. Skip dashboard status and "runs while the laptop is closed". |
| `cursor-team-kit` (`/deslop`, `control-cli`, `control-ui`) | No such plugin. For `/deslop`, review the diff yourself and run `/pstack:no-comments`. For control skills, use a project `verify-*` skill if one exists. |
| Built-in `create-skill` and built-in babysit | Use the authoring-a-skill playbook, and the Babysit playbook. |
| Cursor Plan Mode / Projects | Plan mode is `EnterPlanMode` / `ExitPlanMode`. There is no Cursor Project object. Orchestrate is a local coordinator plus worktree subagents. |
| Built-in PR tool | Not a skip. Use the forge CLI the step names (`gh`, or `origin` when it is installed). |
