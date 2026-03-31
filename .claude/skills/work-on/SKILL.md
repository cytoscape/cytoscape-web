---
name: work-on
description: Streamlines starting work on a new Jira issue or task by creating a worktree, gathering context, implementing the fix, and creating a PR for review.
---

# Work-On Skill

This skill automates the workflow for picking up a new task or Jira issue, implementing a fix, and submitting it for review.

## Workflow

When invoked, execute the following steps strictly in order:

1. **Gather Initial Details (Prompt User):**
   - Ask the user which branch they want to branch off of (e.g., `development` or `master`).
   - Ask for the Jira issue key or task name (if any).
   - *Wait for the user's response before proceeding.*

2. **Setup Worktree:**
   - Once the base branch and issue name are provided, create a new git worktree and branch using: 
     `git worktree add -b <issue-name> ../<issue-name> <base-branch>`
   - Change the working directory to the new worktree path.

3. **Gather Task Context (Prompt User):**
   - Ask the user for detailed ticket information, requirements, and any other relevant context needed to solve the issue.
   - *Wait for the user's response before proceeding.*

4. **Implement Fix:**
   - Based on the provided context, author the necessary code changes and tests to resolve the issue.
   - Always verify the changes (e.g., by running unit tests, linting, or building).

5. **Commit and Push:**
   - Stage the changes and create a descriptive atomic commit.
   - Push the branch to GitHub using `git push -u origin <issue-name>`.

6. **Create PR and Request Review:**
   - Create a Pull Request using the GitHub CLI: `gh pr create --title "<title>" --body "<body>"`.
   - Trigger a PR review by adding copilot as a reviewer using the GitHub CLI: `gh pr edit <PR_number> --add-reviewer "@copilot"`.
