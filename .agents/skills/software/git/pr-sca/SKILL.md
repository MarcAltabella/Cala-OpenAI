---
name: pr-sca
description: Keep pull requests small, concise, atomic, and independently safe to review and revert.
---

Use when planning, splitting, opening, or reviewing a PR, especially when the net diff is around 200 lines or larger.

- Small: target under 200 net changed lines; treat roughly 300 lines as a strong signal to split.
- Concise: one responsibility per PR; if the description needs “and” to explain the change, look for a natural seam.
- Atomic: the PR should remain safe and deployable when reverted alone, with no dangling migrations, missing callers, or half-wired flags.

Split along schema/usage, observability/behavior, refactor/feature, tests/feature, or contract/implementation seams. When work must be stacked, each PR should still be independently reviewable and the dependency should be stated in the PR description.
