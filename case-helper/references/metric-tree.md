# Metric tree

Use this card when the user needs to understand how metrics of a product, function, or business connect and is not evaluating a concrete feature, variant, or change. If the decision is whether a concrete feature works or which variant wins, use [experiments-metrics.md](experiments-metrics.md) instead.

## First pass

When a material ambiguity remains, start with one question in this exact format:

```text
**[Short literal question for the interviewer]**
[Russian translation of "Possible answers:"] [2-4 directions, each changing the tree structure]
```

First ask for the decision or business goal that the tree must support. The goal determines the top-level metric and the audience determines the needed cuts. Do not add a number, heading, or explanation before the question, and do not ask anything that will not change the tree.

## Build the tree

1. State the management decision and product goal.
2. Choose one top-level metric that directly reflects that goal. Define its form, unit of analysis, period, numerator, denominator, filters, and exclusions.
3. Decompose it into causally plausible drivers until reaching controllable metrics or events. Do not present correlation as causation.
4. Add limiting metrics to reveal harm caused by optimizing the drivers.
5. Define cuts that could change interpretation, such as cohort, channel, platform, or user type. These are analytical cuts, not test and control groups.
6. Label missing events, definitions, or data as working hypotheses, not facts.

Every named metric must be a mean, median, percentile, share, or conversion. A conversion is the share of an explicitly defined eligible population or preceding funnel step that completed the target action in the stated period.

## Output structure

Use idiomatic Russian translations of the following labels in user-facing output; do not output the English labels.

```text
1. Goal and management decision
- [Decision the tree will support]

2. Top-level metric
- [Concrete metric and its definition]

3. Metric tree
- [Top-level metric]
  - [Driver 1]
    - [Controllable metric or event]
  - [Driver 2]

4. Ограничивающие метрики
- [Concrete metric]

5. Segments and cuts
- [Cuts and why they matter]

6. Working assumptions and data gaps
- [Only definitions needed for the tree]
```

Do not add randomization, test/control, sample size, rollout rules, or an A/B-test primary metric until the user proposes a concrete change to test.
