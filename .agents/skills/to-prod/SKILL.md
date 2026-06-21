---
name: to-prod
description: Propagate committed Chatium project changes from dev workspace `s.chtm.khudoley.pro` to prod workspace `p.chtm.khudoley.pro` by mechanically copying the selected diff, then sync/publish prod through `chatium-sync-agent`. Use when the user asks for `to-prod`, `/to-prod`, `/to-sync`, "из s в p", "в прод", "sync prod", or the chain "auto-commit; to-prod; chatium-sync/chaium-sync".
---

# To Prod

## Purpose

Use this skill to promote local changes from the dev Chatium workspace `s.chtm.khudoley.pro`
to the prod workspace `p.chtm.khudoley.pro`.

This is the only sanctioned way for an agent to write into the local prod workspace:
do not hand-edit prod files. All prod file writes must be a mechanical copy/delete
derived from a selected committed diff in `s.chtm.khudoley.pro`.

## Default Chain

When the user asks for `/to-sync`, `auto-commit; to-prod; chatium-sync`, or `auto-commit; to-prod; chaium-sync`:

1. Run the repo's `auto-commit` skill first if there are uncommitted `s` changes.
2. Run this `to-prod` workflow using the newly created commit as the source diff.
3. Run `chatium-sync-agent` for `p.chtm.khudoley.pro` and verify the sync/publish result.

When the user asks only for `to-prod` or `/to-prod`, skip step 1 and use `HEAD` by default
unless the user supplied a commit/range/path scope.

## Source Selection

Resolve `$sRoot` and `$pRoot` before running source-selection commands; see "Copy To Prod".

Choose exactly one source:

- Explicit commit/range from the user: use that.
- No explicit source: use `HEAD`.
- If `HEAD` is a merge commit, ask for a commit or range unless the user clearly wants the
  whole merge.

Build the deployment file list from `git diff --name-status`:

```powershell
git -C $sRoot diff --name-status HEAD~1..HEAD
git -C $sRoot diff --name-status <range>
```

Only deploy application/workspace files. Exclude agent infrastructure and local tooling:
`.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.codegraph/`, `.deprecated/`, `outputs/`,
`work/`, temporary files, and archive artifacts unless the user explicitly includes them.

## Copy To Prod

Resolve roots:

```powershell
$cwd = (Get-Location).Path
if ((Split-Path -Leaf $cwd) -eq 's.chtm.khudoley.pro') {
  $sharedRoot = Split-Path -Parent $cwd
} else {
  $sharedRoot = $cwd
}
$sRoot = Join-Path $sharedRoot 's.chtm.khudoley.pro'
$pRoot = Join-Path $sharedRoot 'p.chtm.khudoley.pro'
```

Before writing, verify both roots exist, `$sRoot` ends with `s.chtm.khudoley.pro`,
`$pRoot` ends with `p.chtm.khudoley.pro`, and both are under the same `$sharedRoot`.

For each selected path:

- `A` or `M`: copy `$sRoot\<path>` to `$pRoot\<path>`, creating the parent directory.
- `D`: delete `$pRoot\<path>` if it exists.
- `R*`: delete the old target path, then copy the new target path.

PowerShell safety:

- Use `Copy-Item -LiteralPath` and `Remove-Item -LiteralPath`.
- Before any delete, resolve/construct the absolute target and verify it starts with `$pRoot`.
- Do not use shell pipelines that enumerate files and pass them to another shell for deletion.
- Do not edit `p.chtm.khudoley.pro` files with `apply_patch`; prod content must come from `s.chtm.khudoley.pro`.

## Verify Prod Diff

After copying, inspect local prod changes:

```powershell
git -C $pRoot status --short
```

Then dry-run Chatium sync:

```powershell
$syncScript = 'D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-sync-agent.mjs'
node $syncScript --workspace p.chtm.khudoley.pro --dry-run --run-id to-prod-dry-run
```

Stop before apply if the dry-run contains paths outside the selected deployment set, unless the
user explicitly asked to publish all pending prod changes.

If the dry-run reports mixed create/delete ambiguity, do not guess. Use `--allow-mixed-create-delete`
only when the selected deployment set itself contains intentional creates and deletes and the
user has confirmed this run.

## Sync Prod

Apply the exact reviewed plan:

```powershell
node $syncScript --workspace p.chtm.khudoley.pro --apply --run-id to-prod-apply
```

For prod, `chatium-sync-agent` automatically invokes the allowed Chatium commit/publish script.
Do not call publish endpoints directly.

Verify after apply:

```powershell
node $syncScript --workspace p.chtm.khudoley.pro --dry-run --run-id to-prod-verify
$commitScript = 'D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-commit-agent.mjs'
node $commitScript --workspace p.chtm.khudoley.pro --dry-run --run-id to-prod-commit-verify
```

Success criteria:

- sync verify has no unexpected changes;
- commit verify reports `selectedChanges: 0`;
- final report includes source commit/range, copied/deleted paths, sync status, and publish status.

## Failure Rules

- If `s` has uncommitted changes and this workflow is not preceded by `auto-commit`, stop and ask
  whether to commit first or deploy a specific commit.
- If `p` already has unrelated local changes, stop before sync and report them.
- If Chatium sync dry-run contains unrelated paths, stop before apply.
- Never use `git reset --hard`, force push, or direct Chatium publish endpoints.
