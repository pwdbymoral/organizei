---
name: verification-before-completion
description: Require command evidence before declaring completion.
---

Use before handoff. Completion requires command evidence, not an inspection of the diff alone.

Checklist:

- Run the checks required by the change classification.
- For UI, form, navigation or interaction changes, run `pnpm verify:e2e` and require success before push.
- If the local environment prevents the CI-equivalent check, stop short of declaring ready; report the exact command, failure, limitation and remaining risk, and request explicit authorization before pushing.
- Record results and disclose limitations precisely; do not describe a check as passed when it was skipped, interrupted or only partially reproduced.
- Do not monitor remote checks after push when the user asks not to; the pre-push evidence requirement still applies.
