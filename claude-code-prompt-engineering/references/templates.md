# Шаблоны промптов для Claude Code

Возьми шаблон под тип задачи, заполни плейсхолдеры в `[...]` данными пользователя. Не выдумывай факты, пути, числа и поведение — чего нет, помечай как `Допущение:` или оставляй пользователю.

## Анти-паттерн

Плохо: `Fix the bug.` — нет симптома, области, repro, проверки; агент может менять лишнее. Любой шаблон ниже решает это.

---

## 1. Repo analysis

```text
Analyze this repository before making any changes.

Goal:
- understand how [feature/domain] works
- identify the key files, modules, and data flow
- explain where future changes should likely be made

Scope:
- inspect the repository structure
- focus on [domain/module], if identifiable
- do not edit files

Return:
- short architecture summary
- relevant files and why they matter
- step-by-step flow explanation
- likely extension points
- risks or unclear areas
- recommended next prompt for implementation
```

---

## 2. Bug investigation only

```text
Investigate this bug without editing files yet.

Symptom:
[описание проблемы]

Repro steps:
[шаги воспроизведения, если есть]

Context:
[что недавно менялось / где проявляется]

Scope:
- inspect relevant files
- identify likely root causes
- do not make code changes yet

Return:
- most likely root causes
- evidence from the codebase
- files involved
- fastest validation checks
- recommended fix approach
- risks / unknowns
```

---

## 3. Bug fix

```text
Investigate and fix this bug.

Symptom:
[описание ошибки]

Repro steps:
[как воспроизвести]

Expected behavior:
[как должно работать]

Current behavior:
[как работает сейчас]

Scope:
- start by inspecting relevant files
- modify only files needed for this bug
- do not refactor unrelated code

Before editing:
- explain the likely root cause
- propose the smallest safe fix

Implementation rules:
- keep the fix minimal
- preserve existing public behavior
- do not introduce new dependencies unless clearly necessary
- do not hard-code only to satisfy the current test

Acceptance criteria:
- the bug no longer reproduces
- existing behavior is not broken
- relevant tests pass

Verification:
- run [test command]
- if tests cannot be run, explain why and suggest manual verification

Final response:
- root cause
- files changed
- summary of the diff
- verification result
- remaining risks
```

---

## 4. Feature implementation

```text
Implement [feature].

Context:
[что за продукт / модуль / текущая логика]

Goal:
[какой пользовательский или технический результат нужен]

Scope:
- inspect existing patterns first
- follow the existing architecture and style
- modify only [allowed files/directories]

Out of scope:
- do not redesign unrelated systems
- do not change public APIs unless required
- do not add new dependencies unless necessary

Before editing:
- identify relevant files
- propose a short implementation plan
- mention risks or open questions

Acceptance criteria:
- [criterion 1]
- [criterion 2]
- [criterion 3]
- tests/lint/build pass

Verification:
- run [commands]
- explain what was verified

Final response:
- implementation summary
- files changed
- important decisions
- test results
- remaining risks
```

---

## 5. Refactoring

```text
Refactor [module/area] safely.

Goal:
[зачем: readability / maintainability / duplication / architecture]

Scope:
- allowed area: [files/directories]
- preserve current behavior
- avoid broad architectural changes unless clearly justified

Out of scope:
- no unrelated formatting-only changes
- no public API changes
- no new dependencies
- no behavior changes unless explicitly required

Before editing:
- inspect current structure
- identify refactoring opportunities
- propose a short plan

Implementation rules:
- make small reviewable changes
- keep behavior equivalent
- prefer existing project conventions
- do not over-engineer

Acceptance criteria:
- behavior remains the same
- code is simpler / clearer by [specific criterion]
- tests pass

Verification:
- run [tests/lint/build]
- explain how behavior preservation was checked

Final response:
- what changed
- why it is safer / simpler
- files changed
- verification result
- risks
```

---

## 6. Code review

```text
Review the current changes.

Focus on:
- correctness
- edge cases
- security
- performance
- maintainability
- unintended side effects
- consistency with existing patterns

Do not rewrite the code.

Return:
- critical issues
- non-critical suggestions
- questions / uncertainties
- files or functions involved
- overall risk level
- recommended next action
```

---

## 7. Test writing

```text
Add or improve tests for [feature/module].

Context:
[что делает функциональность]

Scope:
- inspect existing test style first
- add tests in the existing test structure
- do not rewrite production code unless needed to make behavior testable

Test cases should cover:
- happy path
- edge cases
- failure cases
- regression case for [specific bug], if relevant

Acceptance criteria:
- tests follow existing project conventions
- tests are meaningful, not just snapshot/noise
- tests fail before the fix if this is a regression case
- tests pass after implementation

Verification:
- run relevant test command
- explain what was covered
```

---

## 8. Architecture review

```text
Review the architecture of [module/system].

Goal:
- understand current design
- identify risks, coupling, complexity, and maintainability issues
- suggest practical improvements

Scope:
- analyze only
- do not edit files

Return:
- architecture summary
- main components and data flow
- strengths
- risks / bottlenecks
- improvement options
- trade-offs
- recommended first step
```

---

## 9. Documentation

```text
Create or improve documentation for [module/feature].

Context:
[что делает модуль]

Scope:
- inspect relevant code first
- document actual behavior, not assumptions
- do not change production code unless documentation requires small references

Output should include:
- overview
- setup / usage
- important flows
- configuration
- edge cases
- troubleshooting
- examples, if useful

Verification:
- ensure docs match the current code
- list any areas where behavior was unclear
```

---

## 10. Migration

```text
Plan and implement migration from [old approach] to [new approach].

Context:
[текущая система]

Goal:
[зачем миграция]

Scope:
- inspect current usage first
- identify all affected files
- propose a staged migration plan before editing

Constraints:
- avoid breaking existing behavior
- keep changes reviewable
- do not migrate unrelated areas
- preserve backward compatibility if required

Acceptance criteria:
- all relevant usages migrated
- tests pass
- old behavior remains supported or is intentionally removed
- migration risks are documented

Final response:
- migration summary
- files changed
- compatibility notes
- verification result
- remaining risks
```

---

## Шаблон постоянной инструкции проекта (CLAUDE.md / AGENTS.md)

Используй, когда пользователь хочет создать постоянную инструкцию проекта.

````markdown
# Project Instructions for Claude Code

## Project context
[Кратко: стек, архитектура, ключевые модули]

## How to work in this repo
- Always inspect relevant files before editing.
- Prefer small, focused changes.
- Do not refactor unrelated code.
- Follow existing project conventions.
- Do not add dependencies unless necessary and justified.
- Preserve public APIs unless the task explicitly requires changing them.
- For risky changes, explain the plan first.

## Before editing
For non-trivial tasks:
1. Identify relevant files.
2. Explain the likely approach.
3. Mention risks or open questions.
4. Then make changes.

## Testing and verification
Use these commands when relevant:
```bash
[test command]
[lint command]
[build command]
```
If a command cannot be run, explain why and suggest manual verification.

## Final response format
After completing a task, respond with:
- Summary
- Files changed
- Important decisions
- Verification result
- Remaining risks or uncertainties
````
