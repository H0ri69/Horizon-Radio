---
description: Initialize this repo for AI-assisted development.
---

Initialize this repo for AI-assisted development.

1) Scan the repo structure and identify:
- Language(s) and framework(s)
- Build/test commands (or what’s missing)
- Formatting/linting toolchain (or propose one)

2) Create or update workspace Rules under .agent/rules/ so future edits stay consistent:
- Code style + formatting expectations
- Testing requirements (minimum test expectations)
- Safety constraints (no secret commits, avoid breaking APIs without warning)

3) Produce an actionable TODO list (max 10 items):
- Each item includes acceptance criteria
- Mark which items are “safe to do automatically” vs “needs approval”

4) Stop and ask: “Which TODO should be executed first?”