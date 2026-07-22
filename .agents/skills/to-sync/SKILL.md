---
name: to-sync
description: "Run the full Chatium delivery chain for the single workspace `s.chtm.khudoley.pro`: auto-commit current changes, promote the resulting committed diff from the dev catalog `d/` to the prod catalog `p/` through `to-prod` (mechanical copy; transforms: `config/routes.tsx` + table-id environment segments in `tables/*.table.ts`), then publish with `chatium-sync-agent`. Use when the user invokes `/to-sync`, `$to-sync`, asks for \"auto-commit; to-prod; chatium-sync\", or asks to commit, send d to p, and Chatium sync in one step."
---

# To Sync

## Workflow

Use this skill for the complete delivery chain from dev to prod. Both environments
live in the single workspace `s.chtm.khudoley.pro`: dev copies in `d/`, prod in `p/`
(environments pattern — `inner/docs/006-arch.md`).

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

- Do not hand-edit prod copies (`p/<project>` of a project that has a `d/` counterpart).
- Prod changes must be produced only by the `to-prod` mechanical copy/delete workflow
  (transforms: `config/routes.tsx` + table-id segments in `tables/*.table.ts`).
- If a requested prod change has not yet been made in the `d/` copy, make or request
  the dev change first; do not patch prod as a shortcut.
- Stop if `auto-commit` fails, if the source commit cannot be determined, or if
  `to-prod` reports unrelated prod changes.
- Let `to-prod` perform its own dry-run, apply, and verification through `chatium-sync-agent`.

## Report

At the end, report:

- created commit or source range;
- copied/deleted prod paths and the routes.tsx transform;
- Chatium sync/publish verification status and the transfer commit hash.
