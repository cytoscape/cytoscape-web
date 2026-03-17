Work on a Jira ticket from the CW project. This command supports three modes:

**Mode 1 - Specific ticket:** If the user provides a ticket ID (e.g., `CW-1234`) as $ARGUMENTS, fetch that ticket.

**Mode 2 - Next from queue:** If no argument is provided, search for the next highest priority ticket. First, look up the current user's Jira account ID using `atlassianUserInfo` and the Jira Cloud ID via `getAccessibleAtlassianResources`. Then query with JQL: `project = CW AND status = "To Do" AND (assignee = "{currentUserAccountId}" OR assignee is EMPTY) AND priority is not EMPTY ORDER BY priority DESC, created DESC` (priority DESC = Highest first, created DESC = most recent first). Tickets with no priority set are excluded. Skip any tickets the user has already skipped in this session.

**Mode 3 - Skip:** If the user says "skip" as the argument, remember the current ticket as skipped for this session and fetch the next one using the same query.

Once a ticket is selected:

1. Display the ticket summary, description, priority, and status.
2. Transition the ticket to "In Progress" (transition ID: 21) using the Atlassian MCP.
3. If the ticket is unassigned, assign it to the current user using their account ID.
4. Discuss the approach with the user — ask clarifying questions about the implementation before writing code.
5. Once the user approves the approach, create a new branch off `development` named `CW-{ticketNumber}/{short-kebab-description}`.
6. Implement the fix, running `npm run lint` to verify code quality.
7. When the user is satisfied, inform them they can use `/commit-push-pr` to finalize.
