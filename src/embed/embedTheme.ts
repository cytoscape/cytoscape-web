import { fontFamily, lightPalette } from '@/themePalette'

/**
 * Expose the app's palette as CSS variables for embed.css, so the embed
 * matches the app's MUI look without loading MUI.
 */
export const applyEmbedTheme = (root: HTMLElement): void => {
  const vars: Record<string, string> = {
    '--embed-primary': lightPalette.primary.main,
    '--embed-primary-dark': lightPalette.primary.dark,
    '--embed-paper': lightPalette.background.paper,
    '--embed-subtle': lightPalette.background.subtle,
    '--embed-hover': lightPalette.action.hover,
    '--embed-text': lightPalette.text.primary,
    '--embed-text-secondary': lightPalette.text.secondary,
    '--embed-font': fontFamily,
  }
  Object.entries(vars).forEach(([name, value]) =>
    root.style.setProperty(name, value),
  )
}
