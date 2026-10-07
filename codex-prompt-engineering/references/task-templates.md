# Шаблоны задач для Codex

## Содержание

- [Repository analysis](#repository-analysis)
- [Plan first](#plan-first)
- [Bug investigation](#bug-investigation)
- [Bug fix](#bug-fix)
- [Feature implementation](#feature-implementation)
- [Refactoring](#refactoring)
- [Test coverage](#test-coverage)
- [PR review](#pr-review)
- [Migration](#migration)
- [Task queue](#task-queue)
- [Cloud environment setup](#cloud-environment-setup)
- [Короткий универсальный шаблон](#короткий-универсальный-шаблон)

Адаптировать шаблон под факты пользователя. Удалять неприменимые блоки и не выдумывать значения вместо плейсхолдеров.

## Repository analysis

```text
Analyze this repository before making any changes.

Mode:
Investigate only. Do not edit files.

Goal:
Understand how [feature/domain] works and where future changes should be made.

Context:
[what is already known]

Relevant areas:
- [directory/module/file, if known]

Return:
- short architecture summary
- relevant files and why they matter
- data flow / control flow
- existing patterns to follow
- likely extension points
- risks or unclear areas
- recommended next Codex task
```

## Plan first

```text
Plan the implementation before editing files.

Goal:
[desired result]

Context:
[confirmed context]

Scope:
[areas Codex may inspect]

Out of scope:
[areas or behavior that must remain unchanged]

Mode:
Plan first. Do not edit files yet.

Return:
- relevant files to inspect
- current behavior summary
- proposed implementation plan
- expected files to change
- risks and open questions
- verification plan
- whether this should remain one PR-sized task or be split
```

## Bug investigation

```text
Investigate this bug without editing files.

Symptom:
[observed problem]

Reproduction:
[steps, input, environment, logs, or state]

Expected behavior:
[expected outcome]

Current behavior:
[actual outcome]

Context:
[recent changes or relevant conditions]

Scope:
- inspect relevant implementation and tests
- identify likely root causes
- do not make changes

Return:
- likely root cause
- evidence from code or reproducible behavior
- files involved
- fastest validation checks
- recommended fix task
- risks / unknowns
```

## Bug fix

```text
Investigate and fix [specific bug].

Symptom:
[observed problem]

Reproduction:
[steps or failing test]

Expected behavior:
[expected outcome]

Current behavior:
[actual outcome]

Scope:
- inspect the relevant implementation and tests first
- modify only files needed for this bug
- do not refactor unrelated code

Before editing:
- identify the evidence-backed root cause
- propose the smallest safe fix

Constraints:
- preserve unrelated public behavior
- use existing patterns and dependencies
- do not hard-code only to satisfy the current test

Done when:
- the bug no longer reproduces
- a meaningful regression check covers the failure when practical
- relevant existing checks pass

Verification:
- run [known relevant commands]
- if a check cannot run, explain why and provide the closest manual check

Final response:
- root cause
- files changed
- diff summary
- verification result
- remaining risks
```

## Feature implementation

```text
Implement [feature].

Goal:
[user-visible or technical result]

Context:
[product, module, and current behavior]

Relevant areas:
- [known files/directories/modules]

Scope:
- inspect existing patterns first
- follow the existing architecture and style
- modify only [allowed areas]

Out of scope:
- do not redesign unrelated systems
- do not change public APIs unless required by the goal
- do not add dependencies unless necessary and justified

Before editing:
- identify relevant files
- propose a short implementation plan
- mention risks or open questions

Done when:
- [observable criterion 1]
- [observable criterion 2]
- [observable criterion 3]
- relevant checks pass

Verification:
- run [known commands]
- explain what was verified

Final response:
- implementation summary
- files changed
- important decisions
- diff summary
- test results
- remaining risks
```

## Refactoring

```text
Refactor [module/area] safely.

Goal:
[specific maintainability, readability, or duplication outcome]

Scope:
- allowed area: [files/directories]
- preserve current behavior

Out of scope:
- no unrelated formatting changes
- no public API changes
- no new dependencies
- no behavior changes unless explicitly listed

Before editing:
- inspect the current structure
- identify concrete refactoring opportunities
- propose a short plan

Implementation rules:
- make small reviewable changes
- follow existing project conventions
- do not over-engineer

Done when:
- behavior remains equivalent
- [specific simplification criterion] is met
- relevant checks pass

Verification:
- run [tests/lint/build]
- explain how behavior preservation was checked

Final response:
- what changed and why
- files changed
- diff summary
- verification result
- risks
```

## Test coverage

```text
Add or improve tests for [feature/module].

Context:
[behavior under test]

Scope:
- inspect the existing test style first
- add tests in the existing test structure
- do not rewrite production code unless needed for testability

Cover:
- happy path
- relevant edge cases
- relevant failure cases
- regression case for [specific bug], if applicable

Done when:
- tests follow project conventions
- assertions verify behavior rather than implementation noise
- a regression test fails before the fix when practical
- relevant tests pass

Verification:
- run [test command]
- explain the covered behavior and any remaining gaps
```

## PR review

```text
Review the current changes / PR.

Mode:
Review only. Do not edit files.

Focus on:
- correctness and edge cases
- security and privacy
- performance
- unintended side effects
- consistency with existing patterns
- test coverage
- migration or compatibility risks

Return:
- findings ordered by severity
- precise files, functions, and lines when available
- evidence and impact for each finding
- questions / uncertainties
- overall risk level
- recommended next action

If no actionable issues are found, say so explicitly and mention residual verification gaps.
```

## Migration

```text
Plan and implement migration from [old approach] to [new approach].

Context:
[current system and reason for migration]

Goal:
[target state]

Mode:
Plan first unless the migration is already narrow and well understood.

Scope:
- inspect all current usages first
- identify affected files and compatibility boundaries
- propose staged, reviewable steps before editing

Constraints:
- preserve behavior and backward compatibility where required
- do not migrate unrelated areas
- document intentional removals

Done when:
- all in-scope usages are migrated
- relevant checks pass
- old behavior remains supported or is intentionally removed
- migration and rollback risks are documented

Final response:
- migration summary
- files changed
- compatibility notes
- verification result
- remaining risks
```

## Task queue

```text
Split this work into a Codex task queue.

Goal:
[overall outcome]

Context:
[confirmed context]

Constraints:
- each task must be PR-sized
- tasks that may run in parallel must not modify the same files or tightly coupled logic
- each task must have explicit Done when and Verification sections
- order tasks by dependency and risk

Return:
A task queue table with:
- Task ID
- Title
- Goal
- Scope
- Out of scope
- Files likely affected
- Dependencies
- Done when
- Verification
- Risk level
- Recommended mode
```

## Cloud environment setup

```text
Help configure a Codex cloud environment for this repository.

Mode:
Investigate only. Do not edit project code unless setup documentation is explicitly in scope.

Goal:
Identify the setup Codex needs to run tests, lint, build, and type checks.

Scope:
- inspect package files, lockfiles, build and test configs, Dockerfiles, CI, AGENTS.md, and README
- identify required runtime versions
- identify required environment variable names without exposing secret values
- identify existing install, test, lint, build, and typecheck commands

Return:
- recommended setup script
- maintenance script, if useful
- required environment variables and why they are needed
- verified commands
- risks, missing information, and environment limitations
```

## Короткий универсальный шаблон

```text
Task:
[do X]

Goal:
[observable result Y]

Context:
[confirmed facts]

Scope:
- [allowed areas]

Out of scope:
- [protected areas or behavior]

Mode:
[Investigate only / Plan first / Implement / Review only / Goal mode]

Constraints:
- keep changes minimal and focused
- follow existing patterns
- do not change unrelated files
- do not add dependencies unless necessary and justified

Done when:
- [criterion 1]
- [criterion 2]
- relevant checks pass

Verification:
- run [known commands or instruct Codex to discover existing checks]

Final response:
- summary
- files changed
- diff summary
- verification result
- risks / unknowns
```
