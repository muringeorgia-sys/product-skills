# Карта Jira и Confluence Mashina.kg

Снимок на 20.10.2026 по памяти проекта `jira-mashina-setup.md`. Перед работой сверь с последними пунктами памяти и живым REST.

## Доступ

- Jira Server `https://jira.mashina.kg`, Confluence Server `https://confluence.mdigital.kg`. PO залогинен в браузере Comet. Облачные коннекторы Atlassian и `twg` к этим серверам не подходят.
- Инструменты одним вызовом: `ToolSearch` с `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser,mcp__claude-in-chrome__tabs_close_mcp`.
- REST через `fetch` из вкладки домена. На запись заголовок `X-Atlassian-Token: no-check`.
- В JQL этой Jira русские имена статусов и типов не резолвятся — только id: `issuetype = 10000`, `status in (10106, 10126)`. Поля — `cf[10108]`.
- Лимиты `javascript_tool`: 45 с, 3–4 записи за вызов, вывод около 1000 символов.
- Каждая правка шлёт письма наблюдателям, выключить нельзя.

## Проекты

| Ключ | Id | Что лежит | Доска |
|---|---|---|---|
| PRODUCT (бывш. MASHINA, MASHINA1) | 10001 | Только эпики продукта | 5 Product Discovery, 6 Product Delivery |
| MASH «Панель разработки» | 10002 | Задачи разработки, Epic Link на эпик | 2 Sprint Board |
| QA | 10102 | Задачи «QA: …» эпиков | 8 QA analysis |
| DESIGN | проверить по REST | Истории «Дизайн: …» | 7 Product Design |
| MOD «Moderation» (бывш. BUG) | 10100 | Баги и предложения поддержки | 9 Moderation |
| MP «Marketing / Product» | 10003 | Старый Delivery | 4 old Product Delivery |

- Старый ключ MASHINA работает: `MASHINA-483` = `PRODUCT-483`, `project = MASHINA` в JQL и правилах тоже. Смена ключа требовала переиндексации: если поиск отдаёт старые ключи, это не ошибка данных.
- Старые доски 1 «old Product Discovery» и 4 «old Product Delivery» — не трогать, в проверки не включать.

## Типы задач

Epic 10000, История 10001, Задача 10002, Подзадача 10003, Ошибка 10004. В MASH тип «Разработка» 10005. В MOD: Ошибка 10004, Предложение 10101.

## Статусы PRODUCT (порядок меню)

| Статус | Id | Доска |
|---|---|---|
| Инициатива | 10116 | Discovery |
| Отложено | 10117 | Discovery |
| Отклонено | 10118 | Discovery |
| Discovery Backlog | 10119 | Discovery |
| Исследование | 10120 | Discovery |
| Оценка и приоритизация | 10121 | Discovery |
| Формирование требований | 10122 | Discovery |
| Бэклог QA анализа | 10101 | Discovery |
| Ответить QA | 10137 | Discovery |
| Бэклог дизайна | 10131 | Discovery |
| Готово к тех оценке | 10106 | Discovery и Delivery |
| Нужна доработка | 10141 | Delivery |
| Отменено | 10124 | Delivery |
| Бэклог разработки | 10126 | Delivery |
| Разработка | 10128 | Delivery |
| Готово к выпуску | 10129 | Delivery |
| Выпущено | 10103 | Delivery |

Legacy-статусы (Backlog 10005, Review 10013, Selected for Development 10006, to dev 10007, В работе 3 и др.) на досках не видны. Карточка в них = потерянная карточка.

- QA: Бэклог QA анализа 10101, В работе QA 10134, Ответ продакта 10135, QA анализ завершён 10136.
- DESIGN: На оценку 10139, Бэклог дизайна 10131, In Progress 3 («В работе»), На согласовании 10132, Дизайн готов 10133.
- MASH: Backlog, Selected for Development, Holding, Kickback, Сделать → «Бэклог разработки»; В работе, Review, Ready to test, In testing → «Разработка»; Ready to release → «Готово к выпуску»; Готово 10002 → «Выпущено». Id статусов MASH бери из `/rest/api/2/project/MASH/statuses`.
- MOD: Backlog/Новое, Ожидаем уточнения 10143, Валидация 10144, Передано в разработку 10145, Выпущено 10103, Отклонено 10118, Передали пользователю 10146.

## Поля

| Поле | Id |
|---|---|
| Продукт (Mashina.kg 10003, House.kg 10004, Bazar.kg 10005) | `customfield_10201` |
| Epic Link | `customfield_10108` |
| Epic Name | `customfield_10105` |
| Где нужны изменения (Frontend 10006, Mobile 10007, Backend 10036) | `customfield_10202` |
| Reach / Impact / Confidence / Effort (1–5) | `customfield_10204` / `10205` / `10206` / `10207` |
| Оценка RICE = R×I×C÷E | `customfield_10208` |
| Ссылка на требования | `customfield_10209` |
| Ссылка на дизайн | `customfield_10211` |
| Target start / Target end | `customfield_10102` / `10103` |
| Не нужен дизайн («Да» 10037) | `customfield_10215` |
| Сотрудник поддержки (MOD) | `customfield_10216` |

Поля 10213 «Плановая дата релиза» и 10214 «Дата релиза» не ведутся — дата релиза = fixVersion.

## Версии и релизы

- Формат с 19.10.2026: `<Продукт> ДД/ММ/ГГГГ`, например `Mashina.kg 04/11/2026`. Выпущенные версии остались в старом формате.
- Релизы каждые 2 недели по средам: 22.10, 04.11, 18.11, 02.12, 16.12, 30.12.2026, 13.01.2027.
- Новый релиз = версии во всех четырёх проектах PRODUCT, MASH, QA, DESIGN по каждому продукту. Правила ищут версию по имени: нет версии в проекте — задача останется без релиза.
- Дорожки (swimlanes) досок 5, 6, 7, 8 — по релизам «Релиз ДД/ММ/ГГГГ» + «Без релиза». Новый релиз = вручную добавить дорожку на 4 доски.

## Люди (username)

| Кто | Username |
|---|---|
| Олег, PO | `sichenko.oleg` |
| Рахат, финтех | `r.mukambetov` |
| Saadat, Kristina — продакты House/Bazar | `Saadat`, `Kristina` |
| Тех. оценка | `Arlen` (JIRAUSER10137). Не путать с `Arlen1` |
| Дизайн | `Boris`, `Nurdan` (почта в Jira michdem047@gmail.com), `a.bogachev`; наблюдатель Бек `beck.turgunbaev@mad.kg` |
| QA-анализ | `a.vachinich` |

Группы: `mashina-products`, `mashina-design`, `mashina-qa`, `mashina-dev`.

## Confluence

- Продуктовая документация: `https://confluence.mdigital.kg/pages/viewpage.action?pageId=59409127` и дерево потомков.
- Первая строка страницы PRD: `Релиз: ДД.ММ.ГГГГ · Jira: <ключ эпика ссылкой>` (у старых — с `Дизайн: <Figma>` в начале).
- Эпик ссылается на страницу полем 10209 «Ссылка на требования».
- Комментарии: `GET /rest/api/content/<id>/child/comment?depth=all&expand=extensions.resolution`.
