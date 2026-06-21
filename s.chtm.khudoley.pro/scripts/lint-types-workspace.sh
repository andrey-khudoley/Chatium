#!/usr/bin/env bash
# Совместимость: строгая проверка типов всего workspace.
# Делегирует в scripts/check-types.mjs (vue-tsc + строгий конфиг с реальными типами Chatium).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/check-types.mjs"
