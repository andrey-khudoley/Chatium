---
name: chatium-docs-project
description: Создание и поддержка документации Chatium-приложения (README.md, .CHATIUM-LLM.md, docs/)
---

# chatium-docs-project

Создаёт и поддерживает документацию Chatium-приложения: README.md, .CHATIUM-LLM.md, docs/ (architecture, api, data, imports). Использовать при создании или обновлении документации.

## Обязательные файлы

- **README.md** — общее описание проекта, как запустить, ссылки на docs/
- **.CHATIUM-LLM.md** — словарь для LLM (краткие указатели: что за проект, где README, где детальная документация)
- **docs/architecture.md** — архитектура, роутинг, слои
- **docs/api.md** — таблица эндпоинтов (Method, Path, File, Auth, Назначение)
- **docs/data.md** — таблицы, сущности, связи
- **docs/imports.md** — граф импортов (поддерживается агентом imports-docs)
- **docs/LLM/** — логи диалогов с LLM

## Правила обновления

- После изменений в коде обновлять docs/ в соответствии с правилом renew-docs
- Обновлять .CHATIUM-LLM.md по правилу renew-chatiumllm (словарь, без дублирования деталей из docs/)
- Обновлять README.md по правилу renew-readme (общая картина, ссылки на docs/)
- Логировать диалоги в docs/LLM/ по правилу logging-llm

## Чеклист

- README описывает проект и ссылается на docs/
- .CHATIUM-LLM.md — только указатели для LLM
- docs/architecture.md актуален при изменении структуры или роутов
- docs/api.md содержит все эндпоинты (Method, Path, File, Auth, Назначение)
- docs/data.md описывает таблицы и связи
- docs/imports.md ведётся агентом imports-docs при изменении импортов

## Ссылки на документацию

- **024-project-docs.md** — документация проекта
- **006-arch.md** — архитектура и структура

## Примеры

- `inner/samples/new_project/docs/` — полный набор документации
- `tg/pa_sample/docs/` — пример в tg-приложении
