# product-skills

Claude Code skills for Mashina.kg product work.

| Skill | What it does |
|---|---|
| `prd/` | Short one-to-two page PRD: user story, context, target behavior, diagram, analytics tables, acceptance criteria |
| `analytics-spec/` | Analytics tracking spec for developers: events, parameters, attribution, metrics, dashboards |
| `weekly-report/` | Weekly product report for the CEO as a 6-slide .pptx built from Redash and the sprint task sheet |

## Quick install

Copies the three skills into your personal Claude Code skills folder. Other skills already there are kept.

macOS / Linux:

```bash
git clone https://github.com/muringeorgia-sys/product-skills.git /tmp/product-skills
mkdir -p ~/.claude/skills
cp -r /tmp/product-skills/{prd,analytics-spec,weekly-report} ~/.claude/skills/
rm -rf /tmp/product-skills
```

Windows (PowerShell):

```powershell
git clone https://github.com/muringeorgia-sys/product-skills.git $env:TEMP\product-skills
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force $env:TEMP\product-skills\prd, $env:TEMP\product-skills\analytics-spec, $env:TEMP\product-skills\weekly-report "$HOME\.claude\skills\"
Remove-Item -Recurse -Force $env:TEMP\product-skills
```

Restart the Claude Code session, then call `/prd`, `/analytics-spec` or `/weekly-report`. `weekly-report` also needs Node.js 18+ and `npm i pptxgenjs jszip`, see `weekly-report/INSTALL.md`.

To get the latest version, run the same commands again.

---

# product-skills (RU)

Скиллы Claude Code для продуктовой работы в Mashina.kg.

| Скилл | Что делает |
|---|---|
| `prd/` | Короткий PRD на одну-две страницы: user story, контекст, как должно быть, диаграмма, таблицы аналитики, критерии приёмки |
| `analytics-spec/` | ТЗ на разметку аналитики для разработчиков: события, параметры, атрибуция, метрики, дашборды |
| `weekly-report/` | Еженедельный продуктовый отчёт для CEO - презентация .pptx из 6 слайдов по данным Redash и таблицы задач спринтов |

## Быстрая установка

Копирует три скилла в личную папку скиллов Claude Code. Остальные скиллы в этой папке не трогает.

macOS / Linux:

```bash
git clone https://github.com/muringeorgia-sys/product-skills.git /tmp/product-skills
mkdir -p ~/.claude/skills
cp -r /tmp/product-skills/{prd,analytics-spec,weekly-report} ~/.claude/skills/
rm -rf /tmp/product-skills
```

Windows (PowerShell):

```powershell
git clone https://github.com/muringeorgia-sys/product-skills.git $env:TEMP\product-skills
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force $env:TEMP\product-skills\prd, $env:TEMP\product-skills\analytics-spec, $env:TEMP\product-skills\weekly-report "$HOME\.claude\skills\"
Remove-Item -Recurse -Force $env:TEMP\product-skills
```

Перезапусти сессию Claude Code и вызывай `/prd`, `/analytics-spec` или `/weekly-report`. Для `weekly-report` дополнительно нужны Node.js 18+ и `npm i pptxgenjs jszip`, подробности в `weekly-report/INSTALL.md`.

Чтобы получить свежую версию, запусти те же команды ещё раз.
