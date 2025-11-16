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
- Displays at top-center of screen
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
- **Positioning**: Top-center for visibility

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

### Top-Center Positioning
- Visible but not obstructive
- Doesn't interfere with main content
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

