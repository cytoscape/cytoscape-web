# Messages Feature

## Overview

The Messages feature provides a notification system for displaying user-facing messages (info, warnings, errors) throughout the application. It uses Material-UI's Snackbar component to show temporary messages and a message panel for persistent messages.

## Architecture

The Messages feature consists of:

- **SnackbarMessageList**: Displays temporary messages as snackbars
- **MessagePanel**: Displays persistent messages in a panel format
- **MessageStore**: Manages message state and queue

## Component Structure

### SnackbarMessageList.tsx

- Renders messages as Material-UI Snackbars
- Supports auto-hide with configurable duration
- Displays at bottom-center of screen
- Uses the filled `Alert` variant (solid severity color, contrast text) so it
  stands out at the bottom of the screen in both light and dark mode
- High z-index to appear above other content
- Handles message queue and display order

### MessagePanel.tsx

- Simple panel for displaying message text
- Used for persistent messages
- Minimal styling, focuses on content

## Behavior

### Message Types

- **Info**: Informational messages (blue)
- **Warning**: Warning messages (orange/yellow)
- **Error**: Error messages (red)
- **Success**: Success messages (green)

### Message Display

- **Temporary Messages**: Auto-hide after duration (default 3-6 seconds)
- **Persistent Messages**: Remain until dismissed or cleared
- **Queue Management**: Multiple messages displayed in sequence
- **Positioning**: Bottom-center, clear of primary controls

### Message Lifecycle

1. Message added to store
2. Message displayed in Snackbar
3. Auto-hide timer starts (if temporary)
4. Message removed from store after display
5. Next message in queue displayed

## Integration Points

- **MessageStore**: Manages message state
- **All Features**: Can add messages for user feedback
- **Error Handling**: Displays error messages
- **API Calls**: Shows loading/error messages

## Design Decisions

### Snackbar Pattern

- Non-intrusive notification system
- Doesn't block user interaction
- Familiar pattern for users
- Auto-dismiss reduces clutter

### Bottom-Center Positioning

- Material Design's default for web (MUI's component default is bottom-left,
  which lands on the floating layout tools when the table panel is collapsed)
- A top position covered the network view's tab strip (e.g. the Hierarchy
  Viewer's Cell View tab). MUI pauses auto-hide while the pointer is over a
  snackbar, so a user reaching for a tab found the message stayed up and
  swallowed the click until they closed it.
- At the bottom it covers table rows, or empty canvas when the table panel is
  collapsed; the floating toolbars sit in the bottom corners and onboarding
  tour tooltips open above the table, so neither collides with it.
- High z-index ensures visibility

### Store-Based Management

- Centralized message management
- Easy to add messages from anywhere
- Queue management prevents message overload

## Future Improvements

- Message history/log
- Custom message positions
- Action buttons in messages
- Message grouping
- Sound notifications (optional)
- Message persistence across sessions
