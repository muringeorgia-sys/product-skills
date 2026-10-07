# Создание AGENTS.md

Использовать для постоянных инструкций репозитория. Сначала изучить репозиторий; не выдумывать пути, команды или соглашения. Длинные объяснения из README не дублировать.

## Prompt для создания

```text
Create an AGENTS.md for this repository.

Mode:
Investigate first. Edit only AGENTS.md unless another file is explicitly in scope.

Goal:
Create concise, practical project instructions for Codex.

Cover:
- repository layout and important directories
- verified setup, test, lint, build, and typecheck commands
- coding conventions evidenced by the repository
- architecture and dependency constraints
- do-not rules
- PR expectations and definition of done
- final response format

Constraints:
- keep the document short and operational
- do not duplicate long README content
- do not invent commands or conventions
- infer commands only from package files, CI, Makefiles, scripts, or documentation
- mark unresolved information as unknown

Verification:
- list inspected evidence
- explain where each command came from
- list assumptions and unknowns

Final response:
- summary
- created file
- verified commands
- assumptions and unknowns
- recommended next improvement, only if material
```

## Шаблон файла

Удалять неприменимые секции и заполнять только подтверждёнными данными.

````markdown
# AGENTS.md

## Repository context

[Purpose, stack, and key modules]

## Repository layout

- `[path]` — [purpose]
- `[path]` — [purpose]

## Setup

Use the existing project setup. Do not install new dependencies unless the task requires it and the reason is explained.

Verified commands:

```bash
[install command]
[test command]
[lint command]
[build command]
[typecheck command]
```

If a command fails because of environment limitations, explain the failure and provide the closest local verification.

## How Codex should work

- Inspect relevant files before editing.
- Prefer small, PR-sized changes.
- Propose a short plan before complex or risky edits.
- Follow existing architecture and style.
- Do not refactor unrelated code.
- Avoid formatting-only changes outside the task.
- Do not add dependencies unless necessary and justified.
- Preserve public APIs unless the task explicitly changes them.

## Scope control

Before editing, identify:

- files likely to change;
- files that should remain untouched;
- existing tests or checks;
- possible side effects.

Split work into a task queue if it is larger than one reviewable PR.

## Testing and verification

Run the most relevant existing checks. If full verification is not possible, state:

- what ran;
- what could not run;
- why;
- the recommended manual check.

## Dependency rules

- Prefer existing dependencies and utilities.
- Do not add production dependencies without justification.
- For a new dependency, explain the need, alternatives, and maintenance or security impact.

## Final response format

- Summary
- Files changed
- Important decisions
- Diff summary
- Verification result
- Remaining risks or unknowns
````
