---
name: documentation-update
description: Update and editorially review project documentation while preserving technical meaning, current-state accuracy, and document voice.
---

Use for behavior or operational changes and for editorial reviews of project documentation.

Classify the document before editing it:

- Current guides, references, README files, and policies describe the system as it exists now.
- ADRs, archived plans, changelogs, incidents, migrations, and compatibility notes may preserve history when it explains a decision or constraint.

For current-state documentation, describe the result directly. Treat contrasts such as `não X, mas Y`, `não usa X`, `sem depender de X`, `em vez de X`, and `não apenas X` as review signals. Keep a negative statement only when it documents a limitation, security requirement, invariant, scope boundary, counterintuitive behavior, or misuse prevention. Otherwise remove the historical alternative and state Y.

Review locally and with the document set in mind. Remove generic modifiers, empty intensifiers, redundant reformulations, automatic transitions, forced triads, arbitrary taxonomies, recapitulatory conclusions, and vague verbs when doing so preserves the information. Do not apply bulk substitutions: technical terms, commands, paths, APIs, contracts, deliberate repetition, and established voice take precedence.

Checklist:

- Confirm status, scope, links, commands, prerequisites, limitations, and examples against the code or configuration.
- Preserve the document's genre, structure, and precise terminology.
- Scan for historical contrasts and justify each retained negation.
- Remove only changes that improve clarity without changing technical meaning.
- Run the relevant formatting/link/check commands and report them.
- In the handoff, list modified files, representative before/after edits, and deliberately retained contrasts or negations with their reason.
