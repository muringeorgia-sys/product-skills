## Handoff to producer skills — and the pipeline they form

Moved out of SKILL.md on 2026-10-21, text unchanged.

The four producer skills are a **chain**, not four interchangeable buttons. Each downstream skill *consumes* the output of the one before — so the advisor's job is to (a) figure out **where on the chain the user already is**, (b) route to the right next step, and (c) when the input the user wants isn't ready yet, send them **upstream first** instead of into a skill that will stall or run at low confidence.

```
                  (raw idea / unknown market)
                            │
                   ┌────────▼─────────┐
                   │  nmt-market-research  │  segments + Jobs + competitors + GO/NARROW/PIVOT + pivot markets
                   └────────┬─────────┘
                            │ (a chosen segment + Core Jobs)
              ┌─────────────▼─────────────┐
              │  nmt-craft-value-proposition   │  the value: mechanic × Core Job × alternative + Aha + RAT + a PRD-ready spec
              └──────┬───────────────┬─────┘
          (the value)│               │(the value)
          ┌──────────▼─────┐   ┌─────▼───────────────┐
          │ product-       │   │ nmt-craft-go-to-market   │  landing copy · ad/creative copy · channels · GTM / launch plan
          │ requirements   │   └──────────────────────┘
          └────────────────┘  build-ready PRD (functionality + edge cases)
```

**When → which (and the prerequisite to check first):**

| The user wants… | Route to | Prerequisite — if missing, go upstream first |
|---|---|---|
| Size a market; find / score segments + Jobs; map competitors; a GO/NARROW/PIVOT verdict; "which market should I pivot to"; *"is this idea / segment worth pursuing?"* | `nmt-market-research` | None — this is the entry point. |
| The **value** — how we win a chosen segment: mechanic over the Job Graph, the strongest/fastest/cheapest way to create value, the Aha-Moment hypothesis, differentiation vs alternatives, RAT cards | `nmt-craft-value-proposition` | A chosen segment + Core Jobs. Have it → go. Don't → run `nmt-market-research` first (or describe the segment manually for a lower-confidence run). |
| A **build-ready PRD** — full functionality + edge cases for a validated segment+value; "write the PRD / requirements"; "turn this feature into requirements" | `nmt-product-requirements` | A committed **value** (from `nmt-craft-value-proposition`) over a known **segment** (from `nmt-market-research`). Missing → it routes back upstream itself; say so. (It also runs a *challenge-the-build* gate that may propose a cheaper way to hit the business goal than building the thing as specified.) |
| **Go-to-market communication** — landing-page copy, ad / creative copy, acquisition-channel hypotheses, a launch / growth-communication plan; "write the landing / the copy / the GTM" | `nmt-craft-go-to-market` | A **value proposition** is the best input (from `nmt-craft-value-proposition`); a PRD or nmt-market-research result also work; manual segment+Jobs works at lower confidence. **No validated value yet → flag it** (per `communication.md`: communication transmits *proven* value — scaling comms over a weak offer only accelerates disappointment). |
| Deep, multi-source, fact-checked research on any topic / market / competitor landscape | `deep-research` | None — orthogonal to the chain. |

**Disambiguation when the ask straddles two skills:**
- *"the market / which segment / is it worth it"* → `nmt-market-research`. *"how do we win this segment / what's our value"* → `nmt-craft-value-proposition`. *"what do we build"* → `nmt-product-requirements`. *"how do we sell it / the copy / the launch"* → `nmt-craft-go-to-market`.
- *"should we build X?"* is usually **not** a PRD request yet — it's a strategy question. Pressure-test it inline first (or note that `nmt-product-requirements`' challenge-the-build gate will interrogate it). Route to `nmt-product-requirements` only once *"build it"* is the decision and the value is committed.
- *"write the landing page / ads"* while the value prop is unproven → name the risk first, suggest `nmt-craft-value-proposition`, then `nmt-craft-go-to-market`.

**Sequencing — when the user has a raw idea and wants to go far,** lay out the chain and offer to start at the top, one step at a time: *"This is a full idea→launch run: `nmt-market-research` → `nmt-craft-value-proposition` → then `nmt-product-requirements` (build) and/or `nmt-craft-go-to-market` (launch). Want to start with `nmt-market-research`?"* Don't silently run the whole pipeline — take one step, return with the result, get the go-ahead for the next.

**Offer, don't auto-launch on an ambiguous ask:** *"This is really a market-sizing job — want me to run `nmt-market-research`? Or keep thinking it through here first?"* Stay in conversation for everything that is genuinely advice, explanation, diagnosis, or pressure-testing.

---
