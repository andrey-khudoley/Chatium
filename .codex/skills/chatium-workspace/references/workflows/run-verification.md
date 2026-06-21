# run-verification

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/run-verification/SKILL.md`.
> This is a Codex workflow reference. The old stage `.cursor` directory was removed after migration.

Runs technical verification for a Chatium project after implementation or review.
Prefer the fuller Codex role `references/roles/verification-runner.md` when the user invokes `/check`
or asks for a full verification pass.

## When To Use

- After code review and before the final report.
- As the verification phase of `/pipeline`, `/pp`, or `/ppN`.
- When the user asks to "проверить", "прогнать проверки", "готово ли", or explicitly names `run-verification`.

## Codex Workflow

1. Determine scope from `git diff`, untracked files, and any explicit user paths.
2. Run available local checks through shell commands from `s.chtm.khudoley.pro`.
   Prefer existing scripts such as `node scripts/check-types.mjs` and `node scripts/check-style.mjs` when present.
3. Apply the relevant local checker references:
   - `references/roles/standards-checker.md` for `inner/docs/001-standards.md`;
   - `references/roles/file-based-routing-checker.md` for routing and link rules;
   - `references/roles/runtime-architecture-checker.md` for runtime/architecture risks;
   - `references/roles/chatium-platform-checker.md` for subsystem-specific platform rules.
4. Use `.codex/skills/chatium-platform/SKILL.md` for topic-specific references, then verify with the listed `inner/docs/...` files and CodeGraph.
5. If tests exist, describe or run the project-specific route/page-based scenario. Chatium does not have one universal test CLI; do not fake `ctx`.
6. Return one consolidated verification report with prioritized issues.

## Output Shape

- **Линтер/стиль:** passed / failed / not run, with the command.
- **Типы:** passed / failed / not run, with the command.
- **Стандарты:** passed / findings.
- **Роутинг:** passed / findings.
- **Архитектура/рантайм:** passed / findings.
- **Платформа:** passed / findings.
- **Тесты:** passed / failed / not applicable / manual scenario.
- **Общий вердикт:** ready / needs fixes / blocked.
