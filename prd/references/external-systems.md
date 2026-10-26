# Внешние системы и preprod

## Внешние системы - только через Comet

Redash, Figma, Confluence открывай сразу в браузере Comet через расширение Claude in Chrome (инструменты `mcp__claude-in-chrome__*`). Не встроенный браузер `mcp__Claude_Browser__*`, не облачные коннекторы Figma - корпоративный Confluence self-hosted. Исключение - Jira: она переехала в Cloud, её ведёт коннектор claude.ai Atlassian MCP, пользователь залогинен именно в Comet.

1. Загрузи инструменты одним `ToolSearch`: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser`.
2. `list_connected_browsers` - если подключено несколько, `select_browser` на Comet.
3. Данные бери через `fetch` к REST API из вкладки нужного домена (сессия уже есть), а не кликами:
   - **Jira - новая Cloud `mclassified.atlassian.net`** через коннектор claude.ai Atlassian MCP (не через Comet); эпики по `mashina-scrum-master/references/jira-map.md`, «Создание эпика». Старая `jira.mashina.kg` - только чтение истории.
   - Confluence `confluence.mdigital.kg` - Server REST, на запись заголовок `X-Atlassian-Token: no-check`.
   - Redash `http://92.204.189.31:8082` - `/api/queries/<id>`, `/api/query_results`.
   - Figma - открой ссылку на макет, смотри скриншотом и `get_page_text`.
4. Ограничения `javascript_tool`: таймаут 45 с - не больше 3-4 запросов на запись за вызов; вывод режется ~1000 символов - большой результат выводи в `<pre>` на странице и читай `get_page_text`. После таймаута сначала проверь состояние на сервере, потом повторяй - иначе дубли.

## Preprod

`https://preprod.mashina.kg/` - тестовая среда, созданная для экспериментов. Открывай её в Comet и проверяй всё, что касается фичи: подать, отредактировать, поднять, удалить объявление, купить тариф или услугу, оформить кредитную заявку, пройти платный сценарий до конца. Тестовые данные можно создавать и удалять без согласования - это не прод.

Зачем: снять текущий user flow по шагам, точные тексты экранов и ошибок, граничные случаи (пустое состояние, отказ, повтор) и сетевые запросы (`read_network_requests` - какие эндпоинты и поля уже есть). Всё найденное идёт в «Контекст», «Как должно быть» и критерии приёмки.

Границы, которые не снимаются даже на preprod: реквизиты банковских карт, пароли и коды из SMS в поля не вводишь сам - если сценарий упёрся в них, попроси пользователя пройти этот шаг и продолжай после. Прод-домен `mashina.kg` не трогай ничем, кроме чтения.
