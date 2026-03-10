Skip the current ticket and fetch the next highest priority ticket from the CW project queue.

Remember the current ticket as skipped for this session so it won't be suggested again. Then behave exactly like `/start-ticket` with no arguments — look up the current user's Jira account ID using `atlassianUserInfo` and the Jira Cloud ID via `getAccessibleAtlassianResources`, then fetch the next highest priority "To Do" ticket assigned to the current user or unassigned, excluding any previously skipped tickets.
