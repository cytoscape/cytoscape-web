// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../VisualPropertyName'
import { VisibilityType } from '../VisualPropertyValue/VisibilityType'
import { VisualStyle } from '../VisualStyle'
import { hasHiddenElements } from './visibilityBypass'
import { createVisualStyle } from './visualStyleFnImpl'
import { setBypass } from './visualStyleImpl'

const withBypass = (
  style: VisualStyle,
  vpName:
    | typeof NodeVisualPropertyName.NodeVisibility
    | typeof EdgeVisualPropertyName.EdgeVisibility,
  ids: string[],
  value: VisibilityType,
): VisualStyle => setBypass(style, vpName, ids, value)

describe('hasHiddenElements', () => {
  it('is false for a style without visibility bypasses', () => {
    expect(hasHiddenElements(createVisualStyle())).toBe(false)
  })

  it('is true when a node or an edge bypass hides an element', () => {
    expect(
      hasHiddenElements(
        withBypass(
          createVisualStyle(),
          NodeVisualPropertyName.NodeVisibility,
          ['n1'],
          VisibilityType.None,
        ),
      ),
    ).toBe(true)
    expect(
      hasHiddenElements(
        withBypass(
          createVisualStyle(),
          EdgeVisualPropertyName.EdgeVisibility,
          ['e1'],
          VisibilityType.None,
        ),
      ),
    ).toBe(true)
  })

  it('ignores bypasses that keep an element visible', () => {
    // The Hierarchy Viewer filter writes "element" for the rows it keeps
    expect(
      hasHiddenElements(
        withBypass(
          createVisualStyle(),
          NodeVisualPropertyName.NodeVisibility,
          ['n1', 'n2'],
          VisibilityType.Element,
        ),
      ),
    ).toBe(false)
  })

  it('ignores a hidden default, which removing bypasses cannot show', () => {
    const style = createVisualStyle()
    const hiddenByDefault: VisualStyle = {
      ...style,
      [NodeVisualPropertyName.NodeVisibility]: {
        ...style[NodeVisualPropertyName.NodeVisibility],
        defaultValue: VisibilityType.None,
      },
    }
    expect(hasHiddenElements(hiddenByDefault)).toBe(false)
  })
})
