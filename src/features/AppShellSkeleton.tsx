import { WorkspaceSkeleton } from './WorkspaceSkeleton'

// Dependency-free skeleton of the app shell (no MUI), shown while the
// AppShell chunk loads: a dark toolbar strip with shimmer placeholders over
// the workspace-region skeleton. Mimics the real geometry so the real shell
// replaces it in place instead of context-switching.
const SKELETON_CSS = `
.app-skeleton {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}
.app-skeleton-toolbar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 16px;
  background-color: #212121;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.app-skeleton-block {
  border-radius: 4px;
  background: linear-gradient(90deg, #37393b 25%, #46484a 50%, #37393b 75%);
  background-size: 200% 100%;
  animation: app-skeleton-shimmer 1.6s ease-in-out infinite;
}
@keyframes app-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.app-skeleton-toolbar-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.app-skeleton-toolbar-menu {
  width: 44px;
  height: 12px;
}
.app-skeleton-toolbar-spacer {
  flex-grow: 1;
}
.app-skeleton-toolbar-search {
  width: 320px;
  height: 30px;
  border-radius: 15px;
}
.app-skeleton-toolbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-left: 6px;
}
.app-skeleton-content {
  flex-grow: 1;
  min-height: 0;
}
@media (max-width: 900px) {
  .app-skeleton-toolbar-search {
    width: 160px;
  }
}
`

export const AppShellSkeleton = (): JSX.Element => (
  <div className="app-skeleton" data-testid="app-shell-skeleton">
    <style>{SKELETON_CSS}</style>
    <div className="app-skeleton-toolbar">
      <div className="app-skeleton-block app-skeleton-toolbar-logo" />
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="app-skeleton-block app-skeleton-toolbar-menu" />
      ))}
      <div className="app-skeleton-toolbar-spacer" />
      <div className="app-skeleton-block app-skeleton-toolbar-search" />
      <div className="app-skeleton-block app-skeleton-toolbar-avatar" />
    </div>
    <div className="app-skeleton-content">
      <WorkspaceSkeleton message="Preparing your workspace..." />
    </div>
  </div>
)
