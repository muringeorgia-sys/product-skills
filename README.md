# product-skills

Claude Code skills for Mashina.kg product work.

| Skill | What it does |
|---|---|
| `prd/` | Short one-to-two page PRD: user story, context, target behavior, diagram, analytics tables, acceptance criteria |
| `analytics-spec/` | Analytics tracking spec for developers: events, parameters, attribution, metrics, dashboards |
| `weekly-report/` | Weekly product report for the CEO as a 6-slide .pptx built from Redash and the sprint task sheet |

## Install

Clone into the Claude Code personal skills folder:

- Windows: `C:\Users\<name>\.claude\skills`
- macOS / Linux: `~/.claude/skills`

Each skill folder must sit directly in `skills/` with its `SKILL.md` inside. Restart the Claude Code session to pick them up.

## Updating

Updates are manual. Edit the skill locally, then:

```bash
git add prd analytics-spec weekly-report
git commit -m "Update <skill>: <what changed>"
git push
```
