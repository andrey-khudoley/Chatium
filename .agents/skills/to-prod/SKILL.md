---
name: to-prod
description: Promote committed Chatium project changes from the dev catalog `d/` to the prod catalog `p/` inside the single workspace `s.chtm.khudoley.pro` (mechanical copy of the selected diff; the only transformed file is `config/routes.tsx`), then publish through `chatium-sync-agent`. Use when the user asks for `to-prod`, `/to-prod`, `/to-sync`, "из d в p", "в прод", "sync prod", or the chain "auto-commit; to-prod; chatium-sync".
---

# To Prod

## Purpose

Use this skill to promote committed changes of a project's dev copy
`s.chtm.khudoley.pro/d/<path>` to its prod copy `s.chtm.khudoley.pro/p/<path>`.

Both copies live in the SAME workspace and account (environments pattern —
`inner/docs/006-arch.md` → «Окружения stage/prod: два каталога проекта»). Data
separation comes from Heap table pairs switched by the static `IS_PROD` selector
derived from `PROJECT_ROOT`.

This is the only sanctioned way for an agent to write into a prod copy: do not
hand-edit `p/<project>` files of a project that has a `d/` counterpart. All prod
writes must be a mechanical copy/delete derived from a selected committed diff of
the `d/` copy, with exactly TWO deterministic transforms:

- `config/routes.tsx`: `PROJECT_ROOT` literal `'d/<path>'` → `'p/<path>'`.
  `DOMAIN` stays unchanged — one domain serves both catalogs.
- `tables/*.table.ts`: environment segment in Heap table ids `__stage_` → `__prod_`
  (and `(stage)` → `(prod)` in customMeta labels). A Heap table id may be declared
  in exactly ONE file of the account — re-declaring it is a platform BuildError
  `Detected duplicate heap table name` (`inner/docs/008-heap.md` «Окружения stage/prod»).

## Default Chain

When the user asks for `/to-sync` or "auto-commit; to-prod; chatium-sync":

1. Run the repo's `auto-commit` skill first if there are uncommitted changes.
2. Run this `to-prod` workflow using the newly created commit(s) as the source diff.
3. Publish through `chatium-sync-agent` for `s.chtm.khudoley.pro` and verify.

When the user asks only for `to-prod` or `/to-prod`, skip step 1 and use `HEAD` by
default unless the user supplied a commit/range/path scope.

## Source Selection

Choose exactly one source:

- Explicit commit/range from the user: use that.
- No explicit source: use `HEAD`.
- If `HEAD` is a merge commit, ask for a commit or range unless the user clearly
  wants the whole merge.

Build the deployment file list from `git diff --name-status <range>` limited to
`s.chtm.khudoley.pro/d/<project>/`. Only deploy application files. Exclude agent
infrastructure and local tooling: `.agents/`, `.claude/`, `.codex/`, `.cursor/`,
`.codegraph/`, `deprecated/`, `inner/`, temporary files. `docs/LLM/` is gitignored
and never transfers.

## Copy To Prod

Resolve roots (PowerShell):

```powershell
$cwd = (Get-Location).Path
if ((Split-Path -Leaf $cwd) -eq 's.chtm.khudoley.pro') { $sharedRoot = Split-Path -Parent $cwd } else { $sharedRoot = $cwd }
$wsRoot = Join-Path $sharedRoot 's.chtm.khudoley.pro'
```

For each selected path `s.chtm.khudoley.pro/d/<project>/<rel>` the target is
`s.chtm.khudoley.pro/p/<project>/<rel>`:

- `A` or `M`: copy source to target, creating the parent directory.
- `D`: delete the target if it exists.
- `R*`: delete the old target path, then copy the new target path.

Then apply the two sanctioned transforms to the copied files:
`p/<project>/config/routes.tsx` (`PROJECT_ROOT` `d/…` → `p/…`; comments may be
aligned; `DOMAIN` untouched) and `p/<project>/tables/*.table.ts` (`__stage_` →
`__prod_` in table ids, `(stage)` → `(prod)` in labels). No other prod-copy file
may be edited.

PowerShell safety:

- Use `Copy-Item -LiteralPath` and `Remove-Item -LiteralPath`.
- Before any delete, verify the absolute target starts with `$wsRoot\p\`.
- Do not hand-edit other prod-copy files; their content must come from `d/`.

## Verify & Publish

Inspect local changes:

```powershell
git status --short   # only p/<project> paths expected among new changes
```

Dry-run Chatium sync for the single workspace:

```powershell
$syncScript = 'D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-sync-agent.mjs'
node $syncScript --workspace s.chtm.khudoley.pro --dry-run --run-id to-prod-dry-run
```

Stop before apply if the dry-run contains paths outside the selected deployment
set, unless the user explicitly asked to publish all pending changes. Use
`--allow-mixed-create-delete` only when the deployment set itself intentionally
mixes creates and deletes.

Apply and verify:

```powershell
node $syncScript --workspace s.chtm.khudoley.pro --apply --run-id to-prod-apply
node $syncScript --workspace s.chtm.khudoley.pro --dry-run --run-id to-prod-verify   # counts: {}
```

Finish with a git transfer commit of the `p/<project>` tree (message references the
source commits/range) and push.

Success criteria:

- sync verify has no unexpected changes;
- prod copy differs from dev copy only in `config/routes.tsx` and the table-id
  environment segments in `tables/*.table.ts`;
- final report includes source commit/range, copied/deleted paths, transform
  confirmation, sync status, and the transfer commit hash.

## Failure Rules

- If the workspace has uncommitted changes and this workflow is not preceded by
  `auto-commit`, stop and ask whether to commit first or deploy a specific commit.
- If `p/<project>` already has unrelated local changes, stop before sync and report.
- If the sync dry-run contains unrelated paths, stop before apply.
- Never use `git reset --hard`, force push, or direct publish endpoints.
