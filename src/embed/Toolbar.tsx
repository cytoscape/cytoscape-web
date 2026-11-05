import { ReactNode } from 'react'

import { IdType } from '@/models/IdType'

import { FullAppSelection, fullAppUrl } from './fullAppUrl'

interface ToolbarProps {
  networkId: IdType
  name: string
  /** Selection the full app opens with. */
  selection?: FullAppSelection
  /** Controls between the name and the link-out, such as search. */
  children?: ReactNode
}

/** Network name, optional controls, and the link to the full app. */
export const Toolbar = ({
  networkId,
  name,
  selection,
  children,
}: ToolbarProps) => (
  <div className="embed-toolbar">
    <div
      className="embed-paper embed-title"
      data-testid="embed-title"
      title={name}
    >
      {name}
    </div>
    {children}
    <div className="embed-spacer" />
    <a
      className="embed-button embed-button-contained"
      data-testid="embed-open-full-app"
      href={fullAppUrl(networkId, selection)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open in Cytoscape Web ↗
    </a>
  </div>
)
