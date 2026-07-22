# Chatium Workspace Rules

Migrated from `s.chtm.khudoley.pro/.cursor/rules/*.mdc` and adapted for Codex in the shared root. These are operational rules; for detailed platform semantics, read the matching `inner/docs/...` file.

## Workspace Boundary

- Implement and verify in `s.chtm.khudoley.pro` (the single workspace; environments as catalogs: `d/` dev, `p/` prod).
- Do not edit prod copies (`p/<project>` of a paired project) directly.
- Promote to prod only when the user explicitly asks for `to-prod`, `/to-prod`, `/to-sync`, or equivalent wording (mechanical copy `d/` → `p/`; transforms: `config/routes.tsx` + table-id segments in `tables/*.table.ts`).

## Core Chatium Constraints

- `ctx` and `app` are globals; do not import them.
- Use `ctx.account.log()` for platform logging, or a project logger wrapper if one exists. Do not use `console.log()` in project code.
- File-based routing: one file is one route; prefer route path `'/'`.
- Build internal route links with route objects and `withProjectRoot(route.url())` / `withProjectRootAndSubroute(...)`; avoid hardcoded project URLs.
- Heap/tables are server-only. Vue/client code may import only `shared/*` modules marked with `// @shared` and allowed client dependencies.
- Heap counting uses `countBy`, filtering uses `where`, sorting uses object order syntax, and Money values use methods such as `.add()`, `.subtract()`, `.multiply()`.
- Use `runWithExclusiveLock` for real race conditions.
- Protected endpoints must begin with `requireRealUser(ctx)` or `requireAccountRole(ctx, 'admin')` / the locally established admin role.
- Prefer built-in Chatium modules (`@app/auth`, `@app/request`, `@app/sync`, `@app/feed`, `@app/heap`, `@sender`, `@ai-agents/sdk`, etc.); do not assume npm packages are available inside Chatium runtime.

## Shared Imports And Vue Client Bundle

- Client code (`pages/*.vue`, browser components, shared web routes) must not import `lib/`, `repos/`, or `tables/`.
- Move client-safe constants/types/helpers into `shared/` and put `// @shared` on the first line.
- If Vue needs setting keys or enum strings from a server lib, extract them to `shared/<name>.ts` and import them from both server and client.
- Importing route objects into Vue for `.run()` / `.url()` is allowed only when the route file is designed as a shared route and does not drag server-only modules into the client bundle.

## Type And Style Checks

- For standard verification use the current Codex workspace workflow: `node scripts/check-types.mjs <paths>` and `node scripts/check-style.mjs <paths>` from `s.chtm.khudoley.pro`.
- The old Cursor `ts-lint.mdc` scripts (`npm run ts-lint:touched`, `scripts/lint-types-touched.sh`) are historical fallback notes. Prefer the current check scripts unless a task explicitly asks for the old check path.
- If TypeScript/style checks fail, fix relevant failures or report the blocker with the command output summary.

## Documentation After Code Changes

When changing an app project root (a directory with `index.tsx` / `index.ts` and its own docs), check whether these need updates:

- `README.md`
- `.CHATIUM-LLM.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/data.md`
- `docs/imports.md`
- `docs/LLM/`

Do not create project docs for unrelated infrastructure, `.cursor`, `.codex`, generic shared code, or gateway internals unless the specific project documentation owns that behavior.

## Spec-as-Source

- In projects where `docs/spec/` or `docs/spec/spec.md` is the source of truth, do not edit code, project docs, or tests without an explicit user command to make changes.
- If the needed change was not already reflected in the spec, report the mismatch first and wait for explicit permission to update the spec and/or implement it.
- Treat "check", "compare", "verify", reviews, and discussions as analysis/reporting only unless the user explicitly asks to edit.
- After implementation, compare the result against the spec; if they differ, report that the spec needs to be updated or reconciled instead of silently adapting the code.

## LLM Conversation Logs

- If a project has `docs/LLM/`, update it only when you have enough conversation context to preserve the full relevant exchange.
- Do not log code blocks verbatim; summarize code as `[код опущен]` or as file/change bullets.
- Number new files by the next numeric prefix in `docs/LLM/`.
- Get current date/time through shell when writing timestamps.
- For full rules, read `references/llm-conversation-logger.md`.

## Date And Encoding

- Use shell for current date/time in reports, changelogs, and docs logs.
- Text files are expected to be UTF-8. In Windows PowerShell, use `Get-Content -Encoding UTF8`, `Select-String -Encoding UTF8`, or dot-source `.\s.chtm.khudoley.pro\scripts\codex-utf8.ps1`.

## Cursor-Specific Items

- Cursor `.mdc` metadata such as `alwaysApply` is historical. Apply the rule content through Codex judgment and current workspace instructions.
- Cursor `Task`, `subagent_type`, `@check`, and `.cursor/agents` instructions map to Codex local workflows or explicit subagent workflows only when the user requests delegation.
