#!/usr/bin/env bash
# Совместимость: строгая проверка типов по затронутым путям.
# Делегирует в scripts/check-types.mjs (vue-tsc + строгий конфиг с реальными типами Chatium).
#   bash scripts/lint-types-touched.sh p/some/app/lib/foo.ts p/other
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/check-types.mjs" "$@"
