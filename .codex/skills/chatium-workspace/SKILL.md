---
name: chatium-workspace
description: Workspace-specific Chatium development workflows for the shared root containing stage `s.chtm.khudoley.pro` and prod `p.chtm.khudoley.pro`. Use when Codex works on Chatium tasks in this root, including task formalization, implementation planning, plan review, code review, standards/routing/runtime checks, technical verification, documentation updates, to-prod propagation, full to-sync delivery, or when the user invokes /check, /pipeline, /pp, /to-prod, /to-sync, or references migrated Claude agents/commands.
---

# Chatium Workspace

## Overview

This skill is the Codex-native entrypoint for the former `.claude/agents` and `.claude/commands` setup.

## Workspace Layout

- `s.chtm.khudoley.pro` is the stage/dev workspace. Implement code, docs, tests, checks, and commits there.
- `p.chtm.khudoley.pro` is the prod workspace. Do not edit it directly.
- Prod changes are allowed only through an explicit user request for `to-prod`, `/to-prod`, `/to-sync`, or equivalent delivery wording. The actual prod writes must be mechanical copy/delete operations derived from a selected diff/commit in `s.chtm.khudoley.pro`.
- If the user asks to change prod without explicitly authorizing direct prod work, make the change in `s.chtm.khudoley.pro` and wait for explicit promotion instruction.
- `s.chtm.khudoley.pro/p/` is a normal project directory inside stage; it is not the prod workspace.

## Platform References

For subsystem-specific Chatium knowledge migrated from Cursor rules/skills, use
`.codex/skills/chatium-platform/SKILL.md`. It contains workspace rules, a topic index,
adapted `chatium-*` references, and the LLM conversation logger.

When a task touches routing, auth, Vue/client bundles, Heap, jobs, requests, sender,
analytics, payments, testing, AI tools, project docs, or shared imports:

1. Open the relevant `chatium-platform` topic.
2. Read the authoritative `inner/docs/...` document listed there.
3. Use CodeGraph to confirm current symbols and examples before editing.

## CodeGraph

CodeGraph is initialized in the shared root (`.codegraph/`). For code understanding,
architecture questions, symbol lookup, callers/callees, and impact analysis, use
MCP CodeGraph first (`codegraph_explore`, `codegraph_search`, `codegraph_status`,
`codegraph_impact`). Use `rg` for simple text search or to verify a very specific
detail.

If CodeGraph reports that the project is not initialized, stale, or unavailable,
run `codegraph init -i` from the shared root and verify with `codegraph status`.

Do not copy Claude mechanics literally. Translate them to Codex:

- Claude `Read/Grep/Glob/Bash/Edit/Write` -> Codex shell execution, `rg`, shell file reads, and `apply_patch`.
- Claude `Agent` / `subagent_type` -> Codex `spawn_agent`, but only when the user explicitly asks for subagents, delegation, or parallel agent work.
- `/pipeline` and `/pp` are explicit delegated workflows because their documented purpose includes subagents/parallel workers.
- `/check`, code review, plan review, standards checks, routing checks, runtime checks, docs updates, and planning are local workflows unless the user explicitly asks to delegate them.
- Claude `tools`, `model`, and `allowed-tools` metadata are historical source metadata, not executable Codex config.

## Quick Selection

Open only the reference needed for the current request:

- User asks to formalize a vague task: `references/roles/task-formalizer.md`
- User asks for an implementation plan: `references/roles/planner.md`
- User asks to review a plan: `references/roles/plan-reviewer.md`
- User asks to review code: `references/roles/code-reviewer.md`
- User asks whether review coverage is complete: `references/roles/completeness-reviewer.md`
- User asks for standards check: `references/roles/standards-checker.md`
- User asks about file-based routing: `references/roles/file-based-routing-checker.md`
- User asks for platform invariants or Chatium-specific platform risks: `references/roles/chatium-platform-checker.md`
- User asks for implementation by delegated role: `references/roles/implementer.md`
- User asks to check LLM logging coverage: `references/roles/logging-coverage-checker.md`
- User asks about runtime/architecture risks: `references/roles/runtime-architecture-checker.md`
- User asks to verify current changes or invokes `/check`: `references/workflows/check.md` and, as needed, `references/roles/verification-runner.md`
- User explicitly invokes `run-verification` or asks for a verification report: `references/workflows/run-verification.md`
- User asks for a final pipeline/task report: `references/workflows/final-report.md`
- User asks to update docs after code changes: `references/roles/docs-keeper.md`
- User asks to log or update the LLM conversation history: `references/roles/llm-conversation-logger.md`
- User asks about a Chatium subsystem or migrated Cursor rules/skills: `.codex/skills/chatium-platform/SKILL.md`
- User wants pre-implementation discussion: `references/roles/discussion-architect.md`
- User invokes `/pipeline` or asks for automatic pipeline selection: `references/workflows/pipeline.md` and `references/roles/pp-orchestrator.md`
- User invokes `/pp` or `/ppN`, or asks for parallel agents: `references/workflows/pp.md` and `references/roles/pp-orchestrator.md`
- User invokes `/to-prod`, asks to move changes from `s` to `p`, or asks for `auto-commit; to-prod; chatium-sync/chaium-sync`: `.agents/skills/to-prod/SKILL.md`
- User invokes `/to-sync`: run `.agents/skills/auto-commit/SKILL.md`, then `.agents/skills/to-prod/SKILL.md`

For a full inventory, read `references/index.md`.

## Chatium Invariants

Keep these in active memory while working in this workspace:

- `ctx` and `app` are global; do not import them.
- Log with `ctx.account.log()`, not `console.log()`.
- File-based routing: one file is one route; prefer route path `'/'`.
- Route links must use `withProjectRoot(route.url())` or `withProjectRootAndSubroute(base, '/sub')`; avoid hardcoded URLs.
- Heap/tables are server-only. Vue may import only `shared/*` marked with `// @shared`; no `tables/`, `repos/`, or `lib/` in `.vue`.
- Use Heap `countBy`, `where`, and object `order` syntax. Do not use `findAll().length`, `filter`, or `{ field, direction }`.
- Use Money methods (`.add()`, `.subtract()`, `.multiply()`), not arithmetic operators.
- Use `runWithExclusiveLock` for real race conditions.
- Protected endpoints must start with `requireRealUser(ctx)` or `requireAccountRole(ctx, 'admin')`.
- `// @ts-ignore` is allowed only for Chatium system modules without local types.

## Encoding-Sensitive Files

Workspace text files are expected to be UTF-8. On Windows PowerShell 5.1, plain `Get-Content`
can decode UTF-8 without BOM as ANSI and show Cyrillic as mojibake (`Р...`, `СЃ...`, `вЂ”`).
Before treating a file as corrupted, re-read it with `Get-Content -Encoding UTF8` or dot-source
`.\s.chtm.khudoley.pro\scripts\codex-utf8.ps1` for the command session.

When reading or searching Cyrillic text in PowerShell:

- Use `Get-Content -Encoding UTF8`, not plain `Get-Content`.
- Use `Select-String -Encoding UTF8` when matching Cyrillic.
- Use explicit `-Encoding UTF8` for `Set-Content`, `Add-Content`, or `Out-File`.

Some legacy workspace files, especially GC userscripts, may still contain or display real mojibake.
When editing such files:

- Prefer ASCII anchors, selectors, function names, line numbers, or very small hunks for `apply_patch`.
- Avoid using wide Cyrillic comments or garbled text as required patch context.
- If a patch fails unexpectedly, inspect exact nearby lines with numbered output and retry with a narrower ASCII-only context.
- Keep inserted operational code ASCII where practical, and verify with `git diff` plus a syntax check when applicable.
- Do not rewrite or normalize the whole file encoding unless the user explicitly asks; preserve unrelated bytes.

## Date And Docs

When current date/time is needed for reports, changelog entries, or `docs/LLM/` files, run `date` through shell. Do not rely on model time.

After code changes in an app project root (`index.tsx` / `index.ts` with `docs/`), check whether README, `.CHATIUM-LLM.md`, `docs/architecture.md`, `docs/api.md`, `docs/data.md`, or `docs/LLM/` need updates. Use `docs-keeper` for substantial changes.

## Spec-as-Source Projects

- In projects where `docs/spec/` or `docs/spec/spec.md` is the source of truth, do not edit code, project docs, or tests without an explicit user command to make changes.
- If the needed change was not already reflected in the spec, report the mismatch first and wait for explicit permission to update the spec and/or implement it.
- Treat requests such as "check", "compare", "verify", reviews, and discussions as analysis/reporting only unless the user explicitly asks to edit.
- After implementation, compare the result against the spec; if they differ, report that the spec needs to be updated or reconciled instead of silently adapting the code.
