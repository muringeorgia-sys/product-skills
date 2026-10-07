# Incremental material ingestion

Use this procedure only when the user asks to update the Product Interview Copilot library.

## Input and scope

- Inspect `C:\Users\ueabq\Documents\Product Manager\00_inbox\product-interview-copilot` first. The user puts disposable copies there.
- If it has no supported user files, say that there is nothing to update and stop. Do not inspect the historical hiring library as a fallback.
- Accept `.txt`, `.md`, `.docx`, and `.pdf` when their text can be read and checked. Leave an unreadable file in place and state why.
- Read only inbox files, this skill's compact references, and the ingestion ledger. Do not load the full historical transcript corpus.

## Compacting procedure

1. Identify the source, visible date, and whether it is a method, feedback, example, or alleged personal fact.
2. Extract only reusable, non-duplicated content: a concise rule, case-question chain, definition, or confirmed personal claim. Keep 5-15 durable bullets per source as a guideline; do not copy a transcript.
3. Put method into the relevant fast card, interviewer feedback into `mentor-rules.md`, and personal claims into `evidence-ledger.md`. A transcript statement is not a confirmed personal claim unless the source makes its status clear; preserve uncertainty.
4. Add one source record to `inbox-ingestion-ledger.md`: filename, processing date, provenance, compact targets changed, and removal status. Do not store quotations or sensitive raw content there.
5. Run `quick_validate.py` if `SKILL.md` changes. Check changed Markdown links and keep fast cards compact.
6. Only after successful extraction and validation, move processed copies to the Recycle Bin. Report every removed filename. If extraction or validation fails, keep all affected files in the inbox.

## Quality constraints

- Prefer a small, searchable library over completeness. Do not add a point that does not improve an answer, review, or source provenance.
- Keep raw text out of normal answer paths. Normal interview requests still read one fast card; the ledger is never a default dependency.
- If new material contradicts a compact rule, record the conflict and ask the user whether to replace it rather than silently overwriting it.
