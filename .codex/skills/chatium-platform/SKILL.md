---
name: chatium-platform
description: Chatium platform rules and subsystem references migrated from Cursor rules/skills. Use when Codex works on Chatium code in this shared root and needs guidance for routing, auth, Vue/client bundles, Heap, jobs, HTTP requests, sender, AI agents/tools, analytics, storage, payments, testing, project docs, shared imports, or LLM conversation logs; also use when validating Chatium-specific correctness against inner/docs and CodeGraph.
---

# Chatium Platform

## Ground Rules

- Work in `s.chtm.khudoley.pro` for implementation, checks, docs, and commits. Environments are catalogs inside it: `d/` — dev/stage copies, `p/` — prod.
- Do not edit prod copies (`p/<project>` of a paired project) directly. Prod writes are allowed only through explicit `to-prod`/`to-sync` mechanical promotion from the `d/` copy.
- Treat this skill as a quick navigation layer. The authoritative source is `inner/docs/`; the migrated Cursor topic files are helpers, not final truth.
- Before implementing a platform-sensitive change, read the relevant `inner/docs` file and use CodeGraph (`codegraph_search` / `codegraph_explore`) to confirm live symbols, route patterns, and examples.

## What To Read

- Always start with `references/rules.md` for workspace-wide Chatium rules.
- Use `references/topic-index.md` to choose one or more topic references under `references/topics/`.
- For LLM conversation logging, read `references/llm-conversation-logger.md` or the role copy in `.codex/skills/chatium-workspace/references/roles/llm-conversation-logger.md`.

## Topic Workflow

1. Identify the touched subsystem: routing, auth, Heap, Vue/client, jobs, external request, sender, analytics, AI tools, docs, testing, etc.
2. Open the matching topic file from `references/topic-index.md`.
3. Open the authoritative `inner/docs/...` file(s) listed at the top of that topic.
4. Use CodeGraph to find real workspace examples for important APIs before writing code.
5. Apply the normal Codex editing flow: scoped changes, `apply_patch` for manual edits, `rg` for text search, and stage-local checks.

## Cursor Migration Notes

- Cursor `Task`, `subagent_type`, `@check`, and `.cursor/...` references are historical. Translate them to current Codex tools, local workflows, and the `.codex/skills/chatium-workspace` references.
- The old stage `.cursor` directory was removed after migration. If a topic mentions `.cursor/rules` or `.cursor/skills`, treat it as provenance and use the migrated Codex references in this skill.
- If a migrated topic contradicts `inner/docs` or live CodeGraph examples, trust `inner/docs` and the current codebase; note the discrepancy in your final report if it affects the task.
