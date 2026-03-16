---
name: pr
description: Branch off main, commit changes, push, and open a pull request
user-invocable: true
argument-hint: <branch-name>
allowed-tools: Bash, Read, Grep, Glob
---

# /pr — Create branch, commit, push, and open a PR

When the user runs `/pr <branch-name>`, execute the following workflow. Stop and report if any step fails.

## 1. Validate

- Run `git status` to check for uncommitted changes (staged, unstaged, or untracked files).
- If the working tree is clean, **abort** with a message: "No uncommitted changes found. Nothing to do."
- Save the list of changed/untracked files for later use.

## 2. Branch

- Stash all changes including untracked files: `git stash push -u -m "pr-skill: stash for <branch-name>"`
- Checkout `main` and pull latest: `git checkout main && git pull origin main`
- Create and switch to the new branch: `git checkout -b feature/<branch-name>`
- Pop the stash: `git stash pop`
- If there are merge conflicts, alert the user and stop — do NOT continue automatically.

## 3. Stage & commit

- Run `git status` and `git diff --stat` to review what changed.
- Stage all relevant files. **Do NOT stage** files matching: `.env*`, `node_modules/`, `.DS_Store`, `*.log`, or other secrets/artifacts.
- Craft a concise commit message following repo conventions:
  - Summarize the "why" in 1-2 sentences
  - End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Use a HEREDOC to pass the commit message to `git commit`.

## 4. Push

- Push the branch with upstream tracking: `git push -u origin feature/<branch-name>`

## 5. Open PR

- Use `gh pr create` targeting `main` with this format:

```
gh pr create --title "<short title>" --assignee @me --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing the changes>

## Test plan
<bulleted checklist of testing steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- Keep the PR title under 70 characters.

## 6. Return result

- Output the PR URL so the user can click through to it.
