---
name: push-to-github
description: 'Use when you need to prepare a local workspace for GitHub, create a commit, and push changes to a GitHub remote. Triggers on push, commit, GitHub, origin, remote, branch, and repo publish workflows.'
argument-hint: 'What should be pushed, and to which GitHub repo or branch?'
---

# Push to GitHub

## When to Use
- You want to publish local changes to a GitHub repository.
- You need to verify the current branch, remote, and upstream before pushing.
- You want a safe, repeatable workflow for commit and push operations.

## Procedure
1. Check the repository state with `git status` and confirm which files changed.
2. Verify the current branch and remote with `git branch --show-current` and `git remote -v`.
3. Confirm the target GitHub repository and branch if they are not already obvious from the remote.
4. Review the diff and make sure only intended files are included.
5. Create a focused commit message that describes the actual change.
6. Push the current branch to the appropriate remote.
7. If the push is rejected, identify whether the cause is a missing upstream, a non-fast-forward update, or an authentication problem.
8. Fix only the push blocker, then retry.

## Safety Checks
- Do not force push unless the user explicitly asked for it.
- Do not rewrite history unless requested.
- Do not push unrelated local changes.
- If the repo has uncommitted work from someone else, pause and ask before continuing.
- If the remote differs from the intended GitHub repo, verify before pushing.

## Completion Criteria
- The intended changes are committed.
- The branch is pushed successfully to the GitHub remote.
- The user can identify the exact branch and repository that received the push.
