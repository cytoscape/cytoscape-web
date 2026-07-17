// Dependency-free skeleton of the app shell layout (no MUI), shown while
// the AppShell chunk loads. It mimics the real geometry — dark toolbar,
// left panel, canvas, bottom tab strip — so the real shell replaces it
// in place instead of context-switching, and the shimmer signals progress
// where a static screen would read as stalled.
const SKELETON_CSS = `
.app-skeleton {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}
.app-skeleton-block {
  border-radius: 4px;
  background: linear-gradient(90deg, #37393b 25%, #46484a 50%, #37393b 75%);
  background-size: 200% 100%;
  animation: app-skeleton-shimmer 1.6s ease-in-out infinite;
}
.app-skeleton-block--light {
  background: linear-gradient(90deg, #e9eaeb 25%, #f4f5f6 50%, #e9eaeb 75%);
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
.app-skeleton-body {
  flex-grow: 1;
  display: flex;
  min-height: 0;
}
.app-skeleton-left {
  width: 450px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}
.app-skeleton-left-tabs {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 16px;
  background-color: #eeeeee;
  border-bottom: 1px solid #e0e0e0;
}
.app-skeleton-left-tab {
  width: 90px;
  height: 12px;
}
.app-skeleton-left-row {
  height: 14px;
  margin: 14px 16px 0 16px;
}
.app-skeleton-main {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-skeleton-main p {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #bdbdbd;
}
.app-skeleton-bottom {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 24px;
  background-color: #eeeeee;
  border-top: 1px solid #e0e0e0;
}
.app-skeleton-bottom-tab {
  width: 60px;
  height: 12px;
}
@media (max-width: 900px) {
  .app-skeleton-left {
    display: none;
  }
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
    <div className="app-skeleton-body">
      <div className="app-skeleton-left">
        <div className="app-skeleton-left-tabs">
          <div className="app-skeleton-block--light app-skeleton-left-tab" />
          <div className="app-skeleton-block--light app-skeleton-left-tab" />
        </div>
        <div className="app-skeleton-block--light app-skeleton-left-row" />
        <div className="app-skeleton-block--light app-skeleton-left-row" />
        <div className="app-skeleton-block--light app-skeleton-left-row" />
      </div>
      <div className="app-skeleton-main">
        <p>Preparing your workspace...</p>
      </div>
    </div>
    <div className="app-skeleton-bottom">
      <div className="app-skeleton-block--light app-skeleton-bottom-tab" />
      <div className="app-skeleton-block--light app-skeleton-bottom-tab" />
      <div className="app-skeleton-block--light app-skeleton-bottom-tab" />
    </div>
  </div>
)
