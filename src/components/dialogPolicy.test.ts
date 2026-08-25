// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Enforces the two halves of `docs/specifications/DIALOG_DISMISS_POLICY.md`
 * that the type system cannot reach.
 *
 * Nothing in the app dismisses on backdrop click or Escape any more, so a
 * dialog without a button of its own traps the user with no way out. That is
 * the failure this file exists to prevent — it caught the service-app run
 * dialog, which shipped with a Submit button and nothing else.
 *
 * The modal form popovers are the same policy expressed through different
 * props, since `Popover` has no `CyDialog` to route through.
 */

const SRC = path.resolve(__dirname, '..')

/** Modal (non-anchored) form popovers. Anchored menus are out of scope. */
const FORM_POPOVERS = [
  'features/Vizmapper/Forms/VisualPropertyValueForm.tsx',
  'features/Vizmapper/Forms/MappingForm/index.tsx',
  'features/Vizmapper/Forms/BypassForm.tsx',
  'features/SummaryPanel/NetworkPropertyEditor.tsx',
]

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.tsx') && !entry.name.includes('.spec.')
      ? [full]
      : []
  })

/** Every `<CyDialog …>…</CyDialog>` block in the app, with its location. */
const dialogBlocks = (): Array<{ where: string; body: string }> => {
  const blocks: Array<{ where: string; body: string }> = []
  for (const file of walk(SRC)) {
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes('<CyDialog')) continue
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (!/<CyDialog([\s>]|$)/.test(lines[i])) continue
      let end = lines.length - 1
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('</CyDialog>')) {
          end = j
          break
        }
      }
      blocks.push({
        where: `${path.relative(SRC, file)}:${i + 1}`,
        body: lines.slice(i, end + 1).join('\n'),
      })
    }
  }
  return blocks
}

describe('dialog dismissal policy', () => {
  it('finds every dialog in the app', () => {
    // A guard on the guard: a broken parser would vacuously pass the rest.
    expect(dialogBlocks().length).toBeGreaterThanOrEqual(40)
  })

  it('gives every dialog at least one button to leave by', () => {
    const trapped = dialogBlocks()
      .filter(({ body }) => !/<(Button|IconButton)[\s>]/.test(body))
      .map(({ where }) => where)
    expect(trapped).toEqual([])
  })

  it('keeps the modal form popovers on the same rule', () => {
    const unguarded = FORM_POPOVERS.filter((rel) => {
      const source = fs.readFileSync(path.join(SRC, rel), 'utf8')
      return (
        !source.includes('disableEscapeKeyDown={true}') ||
        !source.includes('hideBackdrop={true}')
      )
    })
    expect(unguarded).toEqual([])
  })
})
