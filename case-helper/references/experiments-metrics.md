# Experiments, metrics, and BI

Use this card for A/B tests, effect estimation, metric definitions, junior explanations, BI specifications, and metric-decline diagnostics. Do not use it to build a metric tree without a concrete feature or variant; read [metric-tree.md](metric-tree.md) instead.

## A/B test

Use an A/B test only when there is a concrete feature, change, variant, or comparison and the decision is to launch, reject, or choose a variant. When the case starts with a proposed feature or task, first validate its business goal or strategic priority, the problem and target metric, evidence for this hypothesis, and priority against alternatives. Ask at least one such question before designing the test or choosing metrics.

The first non-empty output must have exactly two parts:

```text
**[Short literal question for the interviewer]**
[Russian translation of "Possible answers:"] [2-4 directions, each changing the next step]
```

Do not put a number, heading, or explanation before it. Do not send a bare question without options. Options are prompts, not claims about the situation.

Keep the first-line question very short, usually two to six words. Put context, definitions, and examples only in the possible-answers line; for example, write `Какая бизнес-цель?`, not an expanded version of that question.

Before designing the test, establish the change, audience, user value, business goal, and success criterion. Ask about baseline, traffic, acceptable risk, and duration only when they are necessary for a decision. Do not invent sample size when they are unavailable. For the minimum detectable effect, give one or two ways to select its value from available data rather than proposing a number yourself: for example, use the historical gap between pre-defined user groups with different discipline or risk, or calculate a business break-even threshold. State the data needed for each option. In the separate statistical-parameters section, state only alpha=0.05 and beta=0.20, without explanation or calculation.

The answer must include:

- a hypothesis: if X for Y, then Z changes because ...;
- primary, secondary, and limiting metrics. Before defining the primary metric, write the causal chain `exposure trigger -> eligible pre-exposure audience -> target action -> window`. Its denominator is the audience eligible at the trigger, not a broader upstream cohort. In its own section, write only the operational metric definition: denominator, target action, and period. Put comparison instructions and assumptions elsewhere. Select metric form from the causal hypothesis and plausible side effects, rather than filling the list with shares or conversions. Use shares and conversions for funnel steps; use a mean, median, or percentile for time, effort, or intensity only when the intervention can affect it; use NPS only when it can plausibly change satisfaction. Do not add a time or satisfaction metric merely for variety. Do not include the test or control arm in a primary-metric definition: define the outcome for the selected target audience, then compare it between the two arms. For a push, use adjacent denominators for mechanism metrics, such as `conversion from delivered notifications to notification opening` or `conversion from notification opening to lesson start`; do not use the opaque phrase `conversion from assigned users`. Derive the primary metric from the current feature hypothesis, not from an earlier case or a generic tree. Treat delivery, opens, clicks, and next actions as primary or diagnostic only according to their causal role;
- separate mandatory sections for selected segments and excluded segments. Before randomization, derive segments both from the causal mechanism and from every limiting metric: for each limiting metric, identify pre-experiment characteristics that plausibly increase its risk of deterioration. Classify every candidate as included, excluded from exposure, or included with a mandatory post-analysis cut. Make the decision from expected incremental value, foreseeable harm, and the intended rollout policy; state the rationale. Exclusion is a product-policy choice to prevent expected harm, not a way to remove an inconvenient result. Define all status rules, randomization strata, and post-analysis cuts using only data known before randomization. A high historical likelihood of success is one possible signal, not a universal rule: the same method applies to every feature and limiting-metric risk. If a segment remains eligible for rollout despite an expectedly different benefit or harm, include it and predeclare the corresponding analysis cut. Define every cut with a specific pre-experiment variable and lookback window, then use fixed bands or categories; never derive it from behaviour after assignment. These sections define the target audience before randomization; they are not the test and control arms;
- for a push about a continuous learning-day series, use completed historical series if historical risk of breaking the series is relevant to targeting or post-analysis. Do not automatically exclude or isolate the most disciplined users merely because they are likely to reach day 7 without intervention. Do not call a threshold P50 until its historical variable and lookback window are defined. Never define a post-analysis cut by day-7 behavior in the current test;
- randomization unit, equal split unless another allocation is justified, and a group-comparability check;
- a separate minimum-detectable-effect section with one or two plainly worded, case-relevant options, not an invented number or a list of required inputs. For example: a break-even uplift in the target action, or a historical benchmark defined through a concrete pre-experiment cohort and percentile; a separate statistical-parameters section that contains only alpha=0.05 and beta=0.20; baseline, sample size, and duration, with every unavailable input labeled as an assumption;
- seasonality, concurrent changes, group overlap, and a predeclared decision rule.

Before launch, fix the effect direction and decision rule. Always distinguish relative percent change from percentage-point change. After the test, first compare the observed effect between the control and test arms against the predeclared business threshold or minimum detectable effect and limiting metrics. Then conduct mandatory post-analysis in predeclared segments; use it to interpret heterogeneous effects, not to replace the overall comparison. Use short bullets in the interpretation section: comparison of primary and limiting metrics; secondary-metric mechanism check; comparability, seasonality, and concurrent-change checks; cuts for every segment expected to have a different benefit or elevated limiting-metric risk; and the boundary of what population the result can support. A positive movement alone does not justify rollout.

If traffic is insufficient, propose an appropriate pilot, usability test, cohort analysis, or historical analysis with its limitations rather than a weak A/B test.

Use [metric-tree.md](metric-tree.md) only to explain product, function, or business metric relationships when no concrete feature-effect decision exists. For a single-feature A/B test, derive the primary metric directly from the causal hypothesis; a tree may only provide context for secondary metrics and long-term effects.

## Metric definition

Before writing a formula, establish the product goal, object counted, aggregation level, event or state, period, numerator, denominator, filters, segments, and exclusions. End with up to five definitions or working hypotheses that remove material ambiguity. Include only definitions used later. If a definition, period, threshold, or SLA is missing, label a proposal as a working hypothesis rather than a fact.

Select the metric form from the decision and causal hypothesis: use a mean, median, percentile, share, conversion, or NPS score. Define a conversion as the share of a clearly defined eligible population or preceding funnel step that completed a target action. Do not call a raw property a metric: replace `wait time` with `median wait time per ride`, `95th-percentile wait time`, `share of rides above the working wait threshold`, or `conversion from restaurant view to order creation`. Do not add a metric type just to make a list look more varied.

Use this specification format:

```text
Metric name and question answered
Formula
Unit of analysis and period
Events/sources and filters
Segments
Calculation example
Limitations and data-quality checks
```

For a junior explanation, use a simple definition, one short product example, and one common mistake. For BI, add the expected data mart, fields, aggregation, join, refresh frequency, and validation criteria; do not invent table or event names.

## Diagnostics

For a metric decline, first check definition or tracking changes, then decompose by cohort, segment, funnel, channel, and time. Separate the observation from causal hypotheses and the next check.

This fast card replaces raw training materials in normal answers. Read `source-map.md` only to audit or refresh sources.
