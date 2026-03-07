Fix review comments on a GitHub pull request.

**If the user provides a PR number as $ARGUMENTS:** Use that PR.
**If no argument:** Find open PRs authored by the current user on the `cytoscape/cytoscape-web` repo and let the user pick one.

Workflow:

1. Fetch the PR details and all review comments using the GitHub MCP server or `gh` CLI.
2. Display a summary of actionable review comments (ignore resolved ones).
3. For each actionable comment:
   - Show the comment and the relevant code
   - Implement the fix
4. Run `npm run lint` to verify code quality after all fixes.
5. Show a summary of all changes made.
6. Ask the user if they want to push the fixes. If yes, commit with a message like `fix: address PR review comments` and push to the branch.
