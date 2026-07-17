// Dependency-free skeleton of the workspace content region (left panel,
// canvas, bottom tab strip). Fills its container, so it works both below
// the real toolbar (WorkspaceEditor Suspense fallback) and composed into
// AppShellSkeleton while the whole shell is still loading. The shimmer
// signals progress where a static message would read as stalled.
const SKELETON_CSS = `
.workspace-skeleton {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}
.workspace-skeleton-block {
  border-radius: 4px;
  background: linear-gradient(90deg, #e9eaeb 25%, #f4f5f6 50%, #e9eaeb 75%);
  background-size: 200% 100%;
  animation: workspace-skeleton-shimmer 1.6s ease-in-out infinite;
}
@keyframes workspace-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.workspace-skeleton-body {
  flex-grow: 1;
  display: flex;
  min-height: 0;
}
.workspace-skeleton-left {
  width: 450px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}
.workspace-skeleton-left-tabs {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 16px;
  background-color: #eeeeee;
  border-bottom: 1px solid #e0e0e0;
}
.workspace-skeleton-left-tab {
  width: 90px;
  height: 12px;
}
.workspace-skeleton-left-row {
  height: 14px;
  margin: 14px 16px 0 16px;
}
.workspace-skeleton-main {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.workspace-skeleton-main p {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #bdbdbd;
}
.workspace-skeleton-bottom {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 24px;
  background-color: #eeeeee;
  border-top: 1px solid #e0e0e0;
}
.workspace-skeleton-bottom-tab {
  width: 60px;
  height: 12px;
}
@media (max-width: 900px) {
  .workspace-skeleton-left {
    display: none;
  }
}
`

export const WorkspaceSkeleton = ({
  message,
}: {
  message: string
}): JSX.Element => (
  <div className="workspace-skeleton" data-testid="workspace-skeleton">
    <style>{SKELETON_CSS}</style>
    <div className="workspace-skeleton-body">
      <div className="workspace-skeleton-left">
        <div className="workspace-skeleton-left-tabs">
          <div className="workspace-skeleton-block workspace-skeleton-left-tab" />
          <div className="workspace-skeleton-block workspace-skeleton-left-tab" />
        </div>
        <div className="workspace-skeleton-block workspace-skeleton-left-row" />
        <div className="workspace-skeleton-block workspace-skeleton-left-row" />
        <div className="workspace-skeleton-block workspace-skeleton-left-row" />
      </div>
      <div className="workspace-skeleton-main">
        <p>{message}</p>
      </div>
    </div>
    <div className="workspace-skeleton-bottom">
      <div className="workspace-skeleton-block workspace-skeleton-bottom-tab" />
      <div className="workspace-skeleton-block workspace-skeleton-bottom-tab" />
      <div className="workspace-skeleton-block workspace-skeleton-bottom-tab" />
    </div>
  </div>
)
