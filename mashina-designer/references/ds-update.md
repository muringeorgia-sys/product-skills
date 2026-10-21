# Обновление дизайн-системы из Figma

Когда нужно: дизайнеры поменяли компоненты или токены в Figma, или в `design-system.md` появилось «Нет в DS», а компонент уже нарисован.

Кто делает: отдельный агент (достаточно Sonnet) с доступом к Figma MCP. Работа только на чтение Figma.

## Источник

- Файл: `https://www.figma.com/design/cBVCpuVZssfUSt2UG3bfNh/Design-System`, fileKey `cBVCpuVZssfUSt2UG3bfNh`.
- `get_metadata` без nodeId показывает только страницу «Logo». Страница «⚙️ Components» (`0:1`) открывается напрямую, но целиком слишком большая — работать по секциям. Список секций и узлов — в `design-system/figma-map.md`.
- Подключённые библиотеки: «Design System» (актуальная), «Icons_Mashina» (иконки). «DS:Mashina_Old» не использовать.
- Логотипы auto.ru на странице «Logo» — чужой бренд, не выгружать.
- Основной логотип взят из файла Graph/Identity 14.10.2026. Этот файл не открывать — запрет пользователя.

## Порядок

1. `create_session` с fileKey, дальше один sessionId на все вызовы.
2. Перед `get_design_context` прочитать MCP-ресурс `skill://figma/figma-design-to-code/SKILL.md`.
3. Токены: `get_variable_defs` по каждой секции. Сравнить с `design-system/tokens.css`: что добавилось, изменилось, пропало.
4. Компоненты: `get_screenshot` секции, `get_design_context` или `get_metadata` вариантов. Обновить `components.css` и `kit.html`.
5. Иконки: `download_assets` (svgAssets), сохранить в `design-system/icons/<имя>.svg`, цвет `currentColor`.
6. Отрендерить `kit.html`, сравнить с Figma, исправить расхождения:
   `node ~/.claude/skills/prd/scripts/render_html.js design-system/kit.html <png> 1440` из корня проекта.
7. Обновить `design-system.md` и `figma-map.md`, дату выгрузки — в шапке `design-system.md`.
8. Пересобрать один из готовых прототипов и проверить, что классы не сломались:
   `node scripts/build.cjs <исходник> --check`.

## Правила

- Значения — только из Figma, без округления.
- Имена классов не переименовывать без нужды: на них держатся готовые прототипы. Переименование — с записью в `design-system.md`, раздел «Изменения».
- Если Figma ограничивает запросы, вызвать `whoami`, зафиксировать и остановиться.
