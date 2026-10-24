---
name: setup-pstack
description: Configure which CodeBuddy models pstack uses per role and at what reasoning effort. Detects models you can confirm in this session and writes an always-applied user rule at ~/.codebuddy/rules/pstack-models.md. Use for /pstack:setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack (WorkBuddy / CodeBuddy)

> **CodeBuddy.** Read `docs/harness/codebuddy.md` before you follow this skill. Cursor model ids are not CodeBuddy model ids.

Write `~/.codebuddy/rules/pstack-models.md`. CodeBuddy loads every user rule with `alwaysApply: true` (the default) into new sessions. That is the stand-in for Cursor's always-applied user rule. Do not write the role table into `CODEBUDDY.md`. A project memory file would be shared with the repo and would not match the user-level Cursor rule.

Upstream Cursor defaults, which are not CodeBuddy model ids, were `grok-4.7-xhigh-fast` for code roles and `claude-opus-5-5-xhigh` for judgment roles. Use those only as intent labels (a faster code model, a stronger judgment model) while you pick from models confirmed in this session.

Documented `effort` values are `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`. Effort is not encoded in the model id. There is no `-fast` suffix.

## Steps

### 1. Detect available models

Confirm model ids before you write them. In order:

1. The model ids the `Agent` tool schema accepts in this session.
2. A list command only if `codebuddy --help` (or the product docs in front of you) actually documents one. Do not invent a flag.
3. Otherwise ask the user to paste the ids from `/model`.

CodeBuddy Code 2.174.0 `--help` printed these `--model` choices: `default-model`, `fast-model`, `balanced-model`, `primary-model`, `deep-model`, `hy4-preview`, `hy3`, `deepseek-v4.1-flash`, `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4`, `gemini-3.5-flash`, `glm-5.3-flash`, `glm-5.3`, `glm-5.2`, `kimi-k3`, `kimi-k2.6`, `kimi-k2.8-preview`. That is a snapshot of one binary. A later CLI will differ, and the list is not proof this account can call them. Product aliases (`default-model`, `fast-model`, and the rest) are not Cursor `-fast` tiers and are not role defaults. Docs also mention examples such as `gpt-5`, `gpt-5.1-codex`, `gemini-3.0-flash`, `sonnet`, `lite`, and `reasoning`. Examples are not the user's entitled set. Never write a real id you have not confirmed in this session. `inherit` and `auto` are always valid. Both mean omit Agent `model` so the subagent runs on the parent chat model. `default` means the same thing.

WorkBuddy desktop and CodeBuddy Code can expose different catalogs. Record which surface you detected from. If you cannot detect any, stop after the user pastes ids or chooses all-`inherit`. Do not guess Tencent, Cursor, or Claude slugs.

### 2. Load current state

If `~/.codebuddy/rules/pstack-models.md` exists, read its `# budget` line, its `# effort` line, and its role values. Otherwise start from the shape in step 5, with every role set to `inherit` and budget `large`. Drop a role that is not in step 5.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer `AskUserQuestion`. Offer these labels. Name the current budget when the rule has one. With no rule, say `large` matches the upstream default effort (`xhigh`).

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Set `# effort` to `max`, `xhigh`, `high`, or `medium`. Do not rewrite model ids to bake the effort in. `inherit` and `auto` stay as they are. On a re-run, keep a role the user already set to a confirmed id.

**(c) Show the roles and confirm.** Group the confirmed ids into a code bucket and a judgment bucket when you can tell them apart. Put a code id on `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `how explorer`, `why investigators`, `reflect tooling`, and `swarm workers`. Put a judgment id on `judgment and prose`, `hardest tasks`, `how explainer`, `why synthesizer`, and `reflect judgment, divergent, synthesizer`. Panel roles (`arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`) are lists. Prefer two confirmed ids from different families so the cross-check is real. If only one family is confirmed, use one entry and say the cross-model check is weaker than upstream's Claude-plus-Grok panel.

Prefer `AskUserQuestion`. Offer the confirmed ids plus `inherit` and `auto`. One subagent runs per panel entry. `arena cross-judge pool` is a list, and Arena picks one value whose family differs from the parent when it can.

### 4. Validate

Every real id in the file must be in the confirmed set. `inherit` and `auto` always pass. If a chosen id is not confirmed, stop and ask again.

### 5. Write the rule

Create `~/.codebuddy/rules/` if needed. Overwrite `~/.codebuddy/rules/pstack-models.md` so re-runs stay idempotent. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to omit model for that role.
# `inherit` or `auto`: omit Agent `model` so the role runs on the parent chat model.
# Panel lines are lists. One subagent runs per entry.
# effort: xhigh
# budget: large (xhigh)
# Cursor defaults were not CodeBuddy model ids (code: grok-4.7-xhigh-fast, judgment: claude-opus-5-5-xhigh).
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
how explorer: inherit
how explainer: inherit
why investigators: inherit
why synthesizer: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit
arena cross-judge pool: inherit
swarm workers: inherit
architect runners: inherit
interrogate reviewers: inherit
```

Replace each `inherit` with the confirmed choice. Keep the `# effort` and `# budget` lines in sync with step 3.

The docs this port read put user rules in `~/.codebuddy/rules/`, not `~/.workbuddy/rules/`. WorkBuddy desktop skills can live in `~/.workbuddy/skills/`, but a desktop rules directory was not documented. If `~/.workbuddy` exists and `~/.codebuddy` does not, also write `~/.workbuddy/rules/pstack-models.md` and tell the user that path is unverified. Do not invent a third path.

### 6. Confirm

Tell the user the absolute path you wrote. The rule applies to new sessions. A session that is already open needs a restart or `/clear` before CodeBuddy reloads rules. Re-running this skill updates the file.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /pstack:create-verification-skill." On yes, run that skill. It writes `.codebuddy/skills/verify-<app>/`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /pstack:create-formal-verification-skill." On yes, run that skill. On no, move on without pushing.
