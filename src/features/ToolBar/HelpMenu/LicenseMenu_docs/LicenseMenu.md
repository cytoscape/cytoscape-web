# License (Help menu)

## Overview

**Help > License** shows the application's MIT license text and lets the user
copy it to the clipboard. It is a row in the Help menu, not a toolbar menu of
its own; see [HelpMenu.md](../HelpMenu_docs/HelpMenu.md) for the menu as a
whole.

## Architecture

- **Menu row**
  - `LicenseMenuItem.tsx`: Renders the **License** row and calls the `onClick`
    `HelpMenu` gives it. It renders no dialog itself (`menuRowDialogs.test.ts`).

- **Dialog Component**
  - `LicenseDialog.tsx`: Rendered by `HelpMenu` beside the menu, so it outlives
    the menu that opened it.
    - Close "X" (`DialogCloseButton`, test id `license-dialog-close-button`):
      the dialog's only exit.
    - **Copy License** button (`license-dialog-copy-button`): copies the
      license text to the clipboard.

## Behavior

### Opening and Closing

- Clicking **License** closes the Help menu and sets `HelpMenu`'s
  `openDialog` to the license dialog.
- The dialog stays open until the user clicks the Close "X". Backdrop click and
  Esc are inert (`docs/specifications/DIALOG_DISMISS_POLICY.md`).

### Copy to Clipboard

- **Copy License** copies the full license text. A clipboard failure is logged
  through `logUi`; nothing is shown to the user.

## Design Decisions

- **Dedicated Dialog**
  - A modal dialog gives the license text room without cluttering the main UI.

## Future Improvements

- Include notices for third-party libraries or datasets.
- Link to the online license and privacy policy for the latest version.
