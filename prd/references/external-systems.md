# Внешние системы, прод и preprod

## Внешние системы - только через Comet

Redash, Figma, Confluence открывай сразу в браузере Comet через расширение Claude in Chrome (инструменты `mcp__claude-in-chrome__*`). Не встроенный браузер `mcp__Claude_Browser__*`, не облачные коннекторы Figma - корпоративный Confluence self-hosted. Исключение - Jira: она переехала в Cloud, её ведёт коннектор claude.ai Atlassian MCP, пользователь залогинен именно в Comet.

**Только расширение Claude in Chrome (правило PO от 04.11.2026).** Confluence (страница, вложения, проверка) и удаление задач Jira - только через расширение в браузере Chrome/Comet. Запасные пути не использовать: Confluence MCP через bb-bridge, bb-browser, копирование файлов в папку плагина. `list_connected_browsers` пустой - остановись, попроси пользователя подключить расширение и продолжай после его ответа. Эпик и поля Jira до этого можно делать коннектором Atlassian MCP.

1. Загрузи инструменты одним `ToolSearch`: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser`.
2. `list_connected_browsers` - если подключено несколько, `select_browser` на Comet.
3. Данные бери через `fetch` к REST API из вкладки нужного домена (сессия уже есть), а не кликами:
   - **Jira - новая Cloud `mclassified.atlassian.net`** через коннектор claude.ai Atlassian MCP (не через Comet); эпики по `mashina-scrum-master/references/jira-map.md`, «Создание эпика». Старая `jira.mashina.kg` - только чтение истории.
   - Confluence `confluence.mdigital.kg` - Server REST, на запись заголовок `X-Atlassian-Token: no-check`.
   - Redash `http://92.204.189.31:8082` - `/api/queries/<id>`, `/api/query_results`.
   - Figma - открой ссылку на макет, смотри скриншотом и `get_page_text`.
4. Ограничения `javascript_tool`: таймаут 45 с - не больше 3-4 запросов на запись за вызов; вывод режется ~1000 символов - большой результат выводи в `<pre>` на странице и читай `get_page_text`. После таймаута сначала проверь состояние на сервере, потом повторяй - иначе дубли.

## Прод и preprod

Текущее поведение и актуальные данные смотри на проде `https://mashina.kg/` в Comet: экраны, тексты, цены, тарифы, объявления, сетевые запросы. Только чтение: ничего не отправляй, не публикуй, не оплачивай и не меняй.

`https://preprod.mashina.kg/` открывай только в одном случае: нужно подать заявку на автофинансирование или лизинг. Шаги до отправки снимай на проде, заявку подавай на preprod. Тестовые данные там можно создавать и удалять без согласования.

Другие сценарии с записью (подать, поднять, удалить объявление, купить тариф или услугу) смотри на проде до шага отправки и дальше не иди. То, что осталось непроверенным, - в список «Допущения», в PRD без пометок.

Зачем: снять текущий user flow по шагам, точные тексты экранов и ошибок, граничные случаи (пустое состояние, отказ, повтор) и сетевые запросы (`read_network_requests` - какие эндпоинты и поля уже есть). Всё найденное идёт в «Контекст», «Как должно быть» и критерии приёмки.

Границы для обеих сред: реквизиты банковских карт, пароли и коды из SMS в поля не вводишь сам - если сценарий упёрся в них, попроси пользователя пройти этот шаг и продолжай после.
