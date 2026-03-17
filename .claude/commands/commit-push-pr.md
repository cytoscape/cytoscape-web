Review all staged and unstaged changes. Then:

1. Run `npm run lint` to check for lint errors. If there are errors, fix them.
2. Review the diff for correctness, potential bugs, and code quality. Flag any concerns before proceeding.
3. Stage all relevant changed files (do NOT stage .env or credential files).
4. Create a conventional commit with a clear message summarizing the changes.
5. Push the branch to origin.
6. Create a pull request targeting the `development` branch on `cytoscape/cytoscape-web` using the GitHub MCP `create_pull_request` tool. Include:
   - A concise title (under 70 characters)
   - A body with: summary of changes, test plan checklist, and a "Closes CW-XXX" line if the branch name contains a ticket ID

If any step fails, stop and report the issue rather than continuing.
