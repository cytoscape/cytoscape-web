import { IdType } from '@/models/IdType'

import { fullAppUrl } from './fullAppUrl'

interface MessageViewProps {
  title: string
  detail?: string
  /** When set, offers to open the network in the full app. */
  networkId?: IdType
  testId?: string
}

/** A full-frame message: loading, or why the network cannot be shown. */
export const MessageView = ({
  title,
  detail,
  networkId,
  testId = 'embed-error',
}: MessageViewProps) => (
  <div className="embed-message" data-testid={testId}>
    <div className="embed-message-title">{title}</div>
    {detail !== undefined && (
      <div className="embed-message-detail">{detail}</div>
    )}
    {networkId !== undefined && (
      <a
        className="embed-button embed-button-contained"
        data-testid="embed-open-full-app"
        href={fullAppUrl(networkId)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Cytoscape Web ↗
      </a>
    )}
  </div>
)
