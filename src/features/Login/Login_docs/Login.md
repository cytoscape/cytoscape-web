# Login Feature

## Overview

The Login feature provides user authentication and session management for NDEx (Network Data Exchange) integration. It allows users to log in to their NDEx accounts to access private networks, save networks, and perform authenticated operations.

## Architecture

The Login feature consists of:
- **LoginButton**: Avatar button that shows login status and opens login panel
- **LoginPanel**: Panel that displays user information and logout option

## Component Structure

### LoginButton.tsx
- Displays user avatar or placeholder
- Shows first letter of username when logged in
- Opens login panel on click
- Integrates with credential store

### LoginPanel.tsx
- Displays user information (name, email)
- Provides logout button
- Provides close button
- Card-based UI with fixed positioning

## Behavior

### Authentication Flow
1. User clicks login button
2. System redirects to NDEx authentication
3. User authenticates with NDEx
4. System receives authentication token
5. Token is stored in credential store
6. User information is displayed in login panel

### Session Management
- Authentication state is managed by CredentialStore
- Token is used for authenticated API calls
- Session persists across page reloads
- Logout clears authentication state

### User Display
- Shows user's first name initial in avatar
- Displays full name and email in login panel
- Different styling for logged-in vs. anonymous users

## Integration Points

- **CredentialStore**: Manages authentication tokens and user info
- **NDEx API**: Handles authentication and user data
- **AppConfigContext**: Provides NDEx base URL

## Design Decisions

### Avatar-Based UI
- Compact avatar button saves toolbar space
- Visual indicator of login status
- Familiar pattern for users

### Panel-Based Login Info
- Non-intrusive panel design
- Easy to dismiss
- Shows essential information

### Token-Based Authentication
- Standard OAuth/token flow
- Secure token storage
- Supports session persistence

## Future Improvements

- Direct login form (without redirect)
- Multiple account support
- Account switching
- Profile management
- Authentication status indicators
- Session timeout handling

