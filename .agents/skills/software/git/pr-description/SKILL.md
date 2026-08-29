---
name: pr-description
description: Draft or update concise conventional commit and reviewer-focused pull-request titles and descriptions.
---

Use when creating a commit, opening a PR, editing its title or body, generating a PR with a CLI, or deciding what belongs in a PR description.

Use an imperative conventional title: `<type>(<optional scope>): <concise outcome>`. Keep the subject lowercase. Valid types include `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `build`, `ci`, and `revert`.

Use this body structure:

```markdown
## What

- <past-tense shipped outcome>

## Why

- <problem, decision, incident, or business reason>
```

Describe outcomes rather than files, functions, or implementation details. Add `## Breaking` immediately before `## Why` when compatibility or required actions change. Apply the active project's branch convention when validating the PR head.
