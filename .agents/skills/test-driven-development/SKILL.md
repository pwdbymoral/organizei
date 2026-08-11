---
name: test-driven-development
description: Add focused executable evidence before or alongside behavior.
---

Use for behavior changes; not formatting-only. TDD is a completion gate.

Workflow:

1. Identify every affected consumer and the user-visible contract.
2. Run the focused test before changing behavior and record the expected failure.
3. Update or add executable evidence for the new contract.
4. Implement the smallest change.
5. Re-run the focused test, then the affected suite.
6. For UI, forms, navigation or interaction changes, run `pnpm verify:e2e` before push. Do not declare ready or push when the CI-equivalent E2E could not run, unless the user explicitly authorizes the exception.

UI contract rules:

- Prefer accessible roles, labels and names over CSS or implementation details.
- When replacing native controls with shadcn/Radix, replace native APIs such as `selectOption` with the component's accessible interaction.
- Scope repeated data to the selected entity's semantic ancestor; never rely on a non-unique description alone.
- Account for portal-rendered Popover, Drawer, Dialog and Sheet content outside the triggering card.
- Treat heading hierarchy, accessible names, keyboard behavior and responsive states as tested behavior.
