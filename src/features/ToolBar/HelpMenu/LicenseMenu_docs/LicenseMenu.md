# LicenseMenu Feature

## Overview

The `LicenseMenu` feature implements the **License** toolbar menu. It gives users easy access to the application's license text and provides utilities such as copying the license to the clipboard.

## Architecture

- **UI Component**
  - `LicenseMenu.tsx`: Renders the **License** button and manages the open/close state of the `LicenseDialog`.

- **Dialog Component**
  - `LicenseDialog.tsx`: A Material-UI dialog that displays license information and provides action buttons.
    - **Close** button: Dismisses the dialog.
    - **Copy** button: Copies the license text to the clipboard.

## Behavior

### Opening and Closing

- Clicking the **License** button sets local `open` state to `true` and opens the `LicenseDialog`.
- The dialog remains open until the user clicks **Close** or otherwise triggers `setOpen(false)`.

### License Display

- The dialog displays the full license text in a scrollable content area.
- It is intended to provide transparency around usage terms and third-party dependencies.

### Copy to Clipboard

- The **Copy** button allows users to copy the entire license text.
- This supports workflows such as reporting, documentation, or offline review.

## Design Decisions

- **Dedicated Dialog**
  - A modal dialog provides enough space for long license texts and keeps the main UI uncluttered.

- **Always-Available Menu Entry**
  - The License menu is always visible in the toolbar to make legal information easy to find.

## Future Improvements

- Include additional notices for third-party libraries or datasets.
- Add filtering or sections for different components (core app vs. extensions).
- Provide a link to online license and privacy policy for the latest version.
