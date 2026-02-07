# Documentation

This directory contains all project documentation for Cytoscape Web. Documents are organized by purpose and intended audience.

## How to Navigate

| Starting Point | When to Use |
| --- | --- |
| `CLAUDE.md` (project root) | LLM context — architecture summary, commands, conventions. Loaded automatically by LLM agents |
| `docs/` (this directory) | Detailed reference — specifications, design docs, workflow templates |
| `src/features/*_docs/` | Feature-level behavior docs — co-located with source code |

## Directory Map

| Directory | Audience | Purpose | Status |
| --- | --- | --- | --- |
| [specifications/](specifications/) | LLM + Human | Behavioral specs, validation rules, creation patterns | 6 documents |
| [prompts/](prompts/) | LLM | Workflow templates for LLM-assisted tasks | 5 templates |
| [design/](design/) | LLM + Human | Feature and subsystem design documents | Template ready |
| [adr/](adr/) | LLM + Human | Architecture Decision Records | Template ready |
| [guides/](guides/) | Human | Developer how-to guides and tutorials | Template ready |
| [images/](images/) | Both | Screenshots and diagrams | 1 image |

## Specifications

Precise behavioral rules and creation patterns that both humans and LLMs reference during implementation.

### Behavioral Specifications

| Document | Scope |
| --- | --- |
| [ROUTING_SPECIFICATION.md](specifications/ROUTING_SPECIFICATION.md) | URL routing rules, navigation patterns, search parameter handling |
| [EXTERNAL_INPUT_VALIDATION_POLICY.md](specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md) | CX2 data validation requirements for all external inputs |
| [DEBUG_GUIDE.MD](specifications/DEBUG_GUIDE.MD) | Structured logging policy, debug namespaces, browser inspection |

### Creation Patterns

| Document | Scope |
| --- | --- |
| [STORE_CREATION_PATTERN.md](specifications/STORE_CREATION_PATTERN.md) | How to create new Zustand stores (middleware tiers, persistence, testing) |
| [MODEL_CREATION_PATTERN.md](specifications/MODEL_CREATION_PATTERN.md) | How to create new domain models (interfaces, impl, barrel exports) |
| [FEATURE_MODULE_CREATION_PATTERN.md](specifications/FEATURE_MODULE_CREATION_PATTERN.md) | How to create new feature modules (components, stores, docs, data-testid) |

## Prompts (LLM Workflow Templates)

Reusable prompt templates for LLM-driven development workflows.

| Template | Purpose |
| --- | --- |
| [playwright-test-planner.md](prompts/playwright-test-planner.md) | Plan E2E test scenarios from browser exploration |
| [playwright-test-generator.md](prompts/playwright-test-generator.md) | Generate Playwright test code from test plans |
| [playwright-test-healer.md](prompts/playwright-test-healer.md) | Debug and fix failing Playwright tests |
| [code-quality-for-testing-behaviour.md](prompts/code-quality-for-testing-behaviour.md) | Add data-testid, behavior docs, lint, and clean up tech debt |
| [code-quality-testing-refactoring.md](prompts/code-quality-testing-refactoring.md) | Extract hooks, add unit tests, lint for react-hooks rules |

## Other Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| [privacy-policy.md](privacy-policy.md) | Human | Cytoscape Web privacy policy (legal) |

## Feature Documentation Index

Behavior documentation co-located with source code in `src/features/`. Each `*_docs/` directory describes the feature's behavior, component structure, integration points, and design decisions.

### Core UI

| Feature | Documentation |
| --- | --- |
| AppManager | [AppManager.md](../src/features/AppManager/AppManager_docs/AppManager.md) |
| FloatingToolBar | [FloatingToolBar.md](../src/features/FloatingToolBar/FloatingToolBar_docs/FloatingToolBar.md) |
| Messages | [Messages.md](../src/features/Messages/Messages_docs/Messages.md) |
| PopupPanel | [PopupPanel.md](../src/features/PopupPanel/PopupPanel_docs/PopupPanel.md) |
| Login | [Login.md](../src/features/Login/Login_docs/Login.md) |
| FeatureAvailability | [FeatureAvailability.md](../src/features/FeatureAvailability/FeatureAvailability_docs/FeatureAvailability.md) |

### Network Visualization

| Feature | Documentation |
| --- | --- |
| NetworkPanel | [NetworkPanel.md](../src/features/NetworkPanel/NetworkPanel_docs/NetworkPanel.md), [NetworkTab.md](../src/features/NetworkPanel/NetworkPanel_docs/NetworkTab.md), [NetworkTabs.md](../src/features/NetworkPanel/NetworkPanel_docs/NetworkTabs.md) |
| CyjsRenderer | [CyjsRenderer.md](../src/features/NetworkPanel/CyjsRenderer/CyjsRenderer_docs/CyjsRenderer.md) |
| HierarchyViewer | [HierarchyViewer.md](../src/features/HierarchyViewer/HierarchyViewer_docs/HierarchyViewer.md) |
| LayoutTools | [LayoutTools.md](../src/features/LayoutTools/LayoutTools_docs/LayoutTools.md) |
| SummaryPanel | [SummaryPanel.md](../src/features/SummaryPanel/SummaryPanel_docs/SummaryPanel.md) |

### Data & Style

| Feature | Documentation |
| --- | --- |
| TableBrowser | [TableBrowser.md](../src/features/TableBrowser/TableBrowser_docs/TableBrowser.md) |
| TableDataLoader | [TableDataLoader.md](../src/features/TableDataLoader/TableDataLoader_docs/TableDataLoader.md) |
| Vizmapper | [Vizmapper.md](../src/features/Vizmapper/Vizmapper_docs/Vizmapper.md), [Forms.md](../src/features/Vizmapper/Forms/Forms_docs/Forms.md), [VisualPropertyRender.md](../src/features/Vizmapper/VisualPropertyRender/VisualPropertyRender_docs/VisualPropertyRender.md) |

### Workspace & Integration

| Feature | Documentation |
| --- | --- |
| Workspace | [Workspace.md](../src/features/Workspace/Workspace_docs/Workspace.md), [WorkspaceEditor.md](../src/features/Workspace/Workspace_docs/WorkspaceEditor.md), [SidePanel.md](../src/features/Workspace/SidePanel/SidePanel_docs/SidePanel.md) |
| MergeNetworks | [MergeNetworks.md](../src/features/MergeNetworks/MergeNetworks_docs/MergeNetworks.md) |
| ServiceApps | [ServiceApps.md](../src/features/ServiceApps/ServiceApps_docs/ServiceApps.md) |
| LLMQuery | [LLMQuery.md](../src/features/LLMQuery/LLMQuery_docs/LLMQuery.md) |

### ToolBar Menus

| Feature | Documentation |
| --- | --- |
| ToolBar | [ToolBar.md](../src/features/ToolBar/ToolBar_docs/ToolBar.md) |
| AppMenu | [AppMenu.md](../src/features/ToolBar/AppMenu/AppMenu_docs/AppMenu.md) |
| DataMenu | [DataMenu.md](../src/features/ToolBar/DataMenu/DataMenu_docs/DataMenu.md), [WorkspaceMenuItems.md](../src/features/ToolBar/DataMenu/DataMenu_docs/WorkspaceMenuItems.md) |
| EditMenu | [EditMenu.md](../src/features/ToolBar/EditMenu/EditMenu_docs/EditMenu.md) |
| LayoutMenu | [LayoutMenu.md](../src/features/ToolBar/LayoutMenu/LayoutMenu_docs/LayoutMenu.md) |
| AnalysisMenu | [AnalysisMenu.md](../src/features/ToolBar/AnalysisMenu/AnalysisMenu_docs/AnalysisMenu.md) |
| HelpMenu | [HelpMenu.md](../src/features/ToolBar/HelpMenu/HelpMenu_docs/HelpMenu.md) |
| LicenseMenu | [LicenseMenu.md](../src/features/ToolBar/LicenseMenu/LicenseMenu_docs/LicenseMenu.md) |
| Search | [Search.md](../src/features/ToolBar/Search/Search_docs/Search.md) |
| NestedMenu | [NestedMenu.md](../src/features/ToolBar/NestedMenu/NestedMenu_docs/NestedMenu.md) |
| RootMenuButton | [RootMenuButton.md](../src/features/ToolBar/RootMenuButton/RootMenuButton_docs/RootMenuButton.md) |