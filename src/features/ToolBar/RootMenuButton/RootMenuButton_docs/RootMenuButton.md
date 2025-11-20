# RootMenuButton Feature

## Overview

The `RootMenuButton` feature provides a small, reusable button component used as the root trigger for menus in the toolbar. It encapsulates common styling and ARIA attributes for accessibility, so higher-level menus can share a consistent look and behavior.

## Architecture

- **UI Component**
  - `RootMenuButton.tsx`: A simple wrapper around Material-UI `Button` that accepts:
    - `handleClick`: click handler used to open/close a menu
    - `open`: boolean indicating whether the associated menu is open
    - `label`: text label to display and use for ARIA attributes

## Behavior

- Renders a button with:
  - White text and no text transformation (matching other toolbar buttons)
  - `id` set to the `label` value
  - ARIA attributes:
    - `aria-controls`: set when `open` is true
    - `aria-haspopup="true"`
    - `aria-expanded`: reflects `open`
- Delegates click behavior entirely to the `handleClick` callback, allowing parent components to decide how to manage menu state.

## Design Decisions

- **Consistency**
  - Centralizes styling and accessibility attributes for top-level menu buttons, ensuring consistent behavior across different menus.

- **Separation of Concerns**
  - Keeps state and menu logic in parent components (e.g. specific menus), while `RootMenuButton` focuses solely on presentation and ARIA wiring.

## Future Improvements

- Extend to support icons or badges (e.g. notification count) while keeping a consistent API.
- Provide variants (compact vs full-size) for different layout densities.
