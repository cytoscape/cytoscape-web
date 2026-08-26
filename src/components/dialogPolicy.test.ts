// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Enforces the two halves of `docs/specifications/DIALOG_DISMISS_POLICY.md`
 * that the type system cannot reach.
 *
 * Nothing in the app dismisses on backdrop click or Escape any more, so a
 * dialog without a control that *closes* it traps the user. A Submit button is
 * not an exit — this is the failure the file exists to prevent, and it caught
 * the service-app run dialog, which shipped with Submit and nothing else.
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
  'features/NetworkSearch/NetworkSearchOptionsPopover.tsx',
]

/**
 * Words that name a control which leaves the dialog without committing it.
 * Matched against a control's visible text, `aria-label` or `data-testid`.
 * Extend this only for a genuine dismissal verb — never to quiet a dialog that
 * really has no exit.
 */
const DISMISS_WORDS = /cancel|close|skip|dismiss|back|log[\s-]?out|explore/i

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.tsx') && !entry.name.includes('.spec.')
      ? [full]
      : []
  })

/** Every `<CyDialog …>…</CyDialog>` block, nesting handled by depth counting. */
const dialogBlocks = (): Array<{ where: string; body: string }> => {
  const blocks: Array<{ where: string; body: string }> = []
  for (const file of walk(SRC)) {
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes('<CyDialog')) continue
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (!/<CyDialog([\s>]|$)/.test(lines[i])) continue
      let depth = 0
      let end = lines.length - 1
      for (let j = i; j < lines.length; j++) {
        if (/<CyDialog([\s>]|$)/.test(lines[j])) depth++
        if (lines[j].includes('</CyDialog>')) {
          depth--
          if (depth === 0) {
            end = j
            break
          }
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

/**
 * True when the block holds a button that reads as a way out. Deliberately
 * text-based: the alternative is resolving handlers across files, and the thing
 * a trapped user looks for is a label, not a callback.
 */
const hasDismissControl = (body: string): boolean => {
  const controls = [
    // <Button …>Cancel</Button>, including the multi-line form.
    ...[...body.matchAll(/<(?:Button|IconButton)\b[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    ),
    ...[...body.matchAll(/aria-label=["'{`]([^"'`}]*)/g)].map((m) => m[1]),
    ...[...body.matchAll(/data-testid=[{]?[`'"]([^`'"}]*)/g)].map((m) => m[1]),
  ]
  return controls.some((label) => DISMISS_WORDS.test(label))
}

describe('dialog dismissal policy', () => {
  it('finds every dialog in the app', () => {
    // A guard on the guard: a broken parser would vacuously pass the rest.
    expect(dialogBlocks().length).toBeGreaterThanOrEqual(40)
  })

  it('gives every dialog a control that closes it', () => {
    const trapped = dialogBlocks()
      .filter(({ body }) => !hasDismissControl(body))
      .map(({ where }) => where)
    expect(trapped).toEqual([])
  })

  it('rejects a dialog whose only control commits', () => {
    // Pins the check itself: this is the shape that shipped in MenuFactory.
    expect(
      hasDismissControl('<CyDialog open><Button>Submit</Button></CyDialog>'),
    ).toBe(false)
    expect(
      hasDismissControl('<CyDialog open><Button>Cancel</Button></CyDialog>'),
    ).toBe(true)
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
