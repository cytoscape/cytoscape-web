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
4. The message closes (timeout, its Close button, Escape, or a click on a
   persistent message) and animates out with its text and severity intact
5. Once the exit transition ends, the next message in the queue is displayed

Messages stay in the store; the list keeps an index of the one on screen and
moves it only in the exit transition's `onExited`. Only the message on screen
can be dismissed, and a `timeout` close is ignored for a persistent message:
MUI keeps the Snackbar mounted while it animates out, a pointer leaving it (or
a blur) during that exit restarts its auto-hide timer, and nothing clears the
timer, so it reports a stray `timeout` close seconds later. Treating that close
as a dismissal skipped the next message (closing an import error with its X
hid the next import error).

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
- Known overlap: until the user accepts or declines cookies, the full-width
  consent banner (`CookieConsent.tsx`, fixed at the bottom) sits under the
  snackbar, which can cover its text and links while a message is up. Every
  bottom position overlaps it; this is accepted because the banner shows only
  until the first choice and messages auto-hide.
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
