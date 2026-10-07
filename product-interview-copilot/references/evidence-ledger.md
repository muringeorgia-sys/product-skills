# Evidence ledger

Read only when the user asks to use a personal case, requests an exact personal claim, or asks for a provenance-aware example.

## Rules

- `confirmed`: use as the user's documented experience.
- `training-addition`: use to illustrate reasoning, never as the user's fact.
- `example`: a learning scenario, never evidence about the user's experience.

## Confirmed personal case claims

| Id | Claim | Safe use | Source id |
| --- | --- | --- | --- |
| `amocrm-activation-outcome` | In the documented amoCRM activation case, activation increased from 41% to 58%. | State the outcome only; do not invent segment splits, survey results, or a first failed test. | `personal-amocrm-activation-case` |
| `amocrm-churn-outcome` | In the documented amoCRM retention case, accounts with at least one integration increased from 26% to 41%; monthly churn decreased from 4.8% to 3.6%. | Preserve the stated scope of paying teams. | `personal-amocrm-churn-case` |
| `amocrm-integration-correlation` | The documented case states that accounts with two or more integrations retained about 1.8 times better. | Treat as correlation, not proof that integrations alone caused retention. | `personal-amocrm-churn-case` |

## Explicitly not confirmed

- Segment percentages, research sample sizes, exact survey splits, RICE scores, detailed alternative solutions, and first-test mechanics in the amoCRM cases are training additions.
- The Yandex.Lavka case is a mock-interview reasoning example, not the user's experience.
