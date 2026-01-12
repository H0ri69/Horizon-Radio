---
description: Safely commit and push the current work to Git.
---

If the user typed: /git-push <message>
- Treat <message> as the commit message.
Otherwise:
- Propose a commit message and ask for approval.

Safety rules:
- Never force-push.
- Never push directly to main/master unless the user explicitly confirms.
- Do not commit secrets; if anything looks like a secret, stop and ask.
- Prefer pushing to a feature branch and opening a PR.

Steps:
1) Identify repo and branch
- Run: git rev-parse --show-toplevel
- Run: git status -sb
- Run: git branch --show-current
- Run: git remote -v

2) Summarize changes before touching anything
- Run: git diff --stat
- If there are many changes, also run: git diff (limited to key files) and summarize.

3) Decide what to include in the commit
- If there are untracked/modified files:
  - Propose a staging plan (which files to add, which to ignore).
  - Ask for approval if any file looks risky (env files, credentials, build artifacts).
- Then stage:
  - Run: git add -A
  - Run: git status -sb

4) Optional: sync with remote (safe default)
- If upstream exists, run: git pull --rebase
- If conflicts occur:
  - Stop, explain conflicts, suggest resolution steps, and wait for approval before continuing.

5) Run quick checks (if available)
- Detect likely commands and propose one:
  - Node: npm test / pnpm test
  - Python: pytest
  - .NET: dotnet test
- Ask permission to run tests; allow user to skip.

6) Commit
- If commit message not provided:
  - Suggest a Conventional Commit style message (e.g., "fix: ...", "feat: ...") and ask approval.
- Run: git commit -m "<approved message>"
- If commit fails (nothing to commit), stop and explain.

7) Push
- If on main/master, ask: "Push to main/master, or create a branch?"
- If creating a branch:
  - Propose a branch name, then run: git checkout -b <branch>
- Push:
  - Run: git push -u origin <current-branch>

8) Finish
- Show: git status -sb
- Provide the next step: open a PR / link to remote (if known).
Stop and ask what to do next.
