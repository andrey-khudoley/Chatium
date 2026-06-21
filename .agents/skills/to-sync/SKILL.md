---
name: to-sync
description: "Run the full Chatium delivery chain for this workspace: auto-commit current dev changes, promote the resulting committed diff from `s.chtm.khudoley.pro` to `p.chtm.khudoley.pro` through `to-prod`, then sync/publish prod with `chatium-sync-agent`. Use when the user invokes `/to-sync`, `$to-sync`, asks for \"auto-commit; to-prod; chatium-sync/chaium-sync\", or asks to commit, send s to p, and Chatium sync in one step."
---

# To Sync

## Workflow

Use this skill for the complete delivery chain from stage/dev to prod. The stage workspace
is `s.chtm.khudoley.pro`; the prod workspace is `p.chtm.khudoley.pro`.

1. Run `.agents/skills/auto-commit/SKILL.md` first.
2. Capture the commit or commits created by `auto-commit`.
3. Run `.agents/skills/to-prod/SKILL.md`.
4. If `auto-commit` created exactly one commit, pass that commit as the `to-prod` source.
5. If it created multiple commits, pass the created range to `to-prod`.
6. If there were no uncommitted changes, use `HEAD` unless the user supplied an explicit commit or range.

## Arguments

Treat user-provided arguments as follows:

- Obvious commit or range (`HEAD`, `HEAD~2..HEAD`, SHA, `A..B`): pass to `to-prod`.
- `--no-push` or grouping hints: pass to `auto-commit`.
- Mixed text: use it as guidance for `auto-commit`, then use the created commit or range for `to-prod`.

## Safety

- Do not edit `p.chtm.khudoley.pro` directly.
- Prod changes must be produced only by the `to-prod` mechanical copy/delete workflow.
- If a requested prod change has not yet been made in `s.chtm.khudoley.pro`, make or request the stage change first; do not patch prod as a shortcut.
- Stop if `auto-commit` fails, if the source commit cannot be determined, or if `to-prod` reports unrelated prod changes.
- Let `to-prod` perform its own dry-run, apply, and verification through `chatium-sync-agent`.

## Report

At the end, report:

- created commit or source range;
- copied/deleted prod paths from `to-prod`;
- Chatium sync/publish verification status.
