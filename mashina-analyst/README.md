# mashina-analyst

Продуктовый аналитик Mashina.kg: данные → инсайты → отчёт .md.

| Файл | Что |
|---|---|
| `~/.claude/agents/mashina-analyst.md` | Агент (Opus, effort high) |
| `SKILL.md` | Порядок работы, 7 шагов |
| `lore.md` | Роль, мышление, границы |
| `references/sources.md` | Redash, GA4, Looker Studio, Adjust, таблицы плана и маркетинга: доступы и ловушки |
| `scripts/redash_run.ps1` | Запуск запроса Redash по API с параметром-списком |
| `scripts/adjust_report.ps1` | Отчёт Adjust по API |
| `scripts/set_adjust_token.ps1` | Ввод токена Adjust в скрытом окне |
| `references/report-template.md` | Шаблон отчёта |
| `references/review-checklist.md` | Самопроверка |

Запуск: «найди инсайты», «почему упала выручка …», «разбери воронку …», /mashina-analyst.

Итог: `<спринт-папка>/Инсайты_<Тема>_<дата>.md`.

Доступ: Redash — API (`REDASH_API_KEY`); Adjust — API (`ADJUST_API_TOKEN`); таблицы — MCP google-sheets; остальное — браузер Comet через Claude in Chrome. Только чтение, кроме таблицы плана (факт и прогноз по скриншоту финотчёта).

Создан 2026-10-20.
