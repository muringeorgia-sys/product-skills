# Source registry and refresh rules

Read this file only to refresh or audit the library. It is not a normal response dependency.

## Curated inputs

The locators below are ASCII logical identifiers, not filesystem paths. Resolve them only when a full library refresh is explicitly requested.

| Id | Role in library | Source locator | Provenance |
| --- | --- | --- | --- |
| `method-case` | Case and delivery fast card | `hiring/general-prep/case-solving-cheatsheet` | Method |
| `method-case-writeup` | Personal case framing | `hiring/general-prep/case-writeup-guide` | Method |
| `method-experiment` | A/B and metric fast card | `hiring/metrics-analytics/ab-tests-terms-cases-cheatsheet` | Method |
| `method-analytics` | Metric and BI fast card | `hiring/metrics-analytics/product-analytics-notes` | Method |
| `example-lavka` | Optional case example | `hiring/general-prep/yandex-lavka-reference-case` | Example |
| `personal-amocrm` | Evidence ledger | `hiring/general-prep/amocrm-activation-case`; `hiring/general-prep/amocrm-churn-case` | Mixed: confirmed and training additions |
| `mentor-feedback` | Mentor rules | `hiring/mock-interview/mentor-transcript`; relevant audit logs | Feedback; transcription may be noisy |
| `mentor-case-algorithm-2026-07-25` | Two-stage case algorithm and seven case types | `user-provided/downloads/case-algorithm` | Method from mentor document |
| `mentor-feedback-4-2026-07-25` | Goal, target behavior, and pre-test segmentation rules | `user-provided/downloads/mentor-feedback-4` | Feedback; transcription may be noisy |

## Do not use by default

- Original Yandex Practicum `.mht` lessons: the compact analytics note is the first source.
- amoCRM Excel cheat sheets: retain as manual reference until their version and role are curated.
- Full interview transcripts: use only when refreshing mentor rules or resolving a disputed interpretation.

## Incremental inbox

- Inbox path: `C:\Users\ueabq\Documents\Product Manager\00_inbox\product-interview-copilot`.
- This is the only source to inspect for an incremental update. Do not scan the historical hiring library again unless the user expressly requests a full refresh.
- Follow [inbox-protocol.md](inbox-protocol.md). The processing record is [inbox-ingestion-ledger.md](inbox-ingestion-ledger.md).

## Refresh procedure

1. Compare source modification time with this library refresh date: 2026-07-25.
2. Re-read only changed sources and update the matching fast card, ledger record, or mentor rule.
3. Preserve provenance labels. Do not convert a training addition into a confirmed claim.
4. Run `quick_validate.py` after changing `SKILL.md`.
