# Core Developer's Guide

> For developers working on **Cytoscape Web itself**. To build an **app** that
> runs inside Cytoscape Web, you do not need this repository: start at
> [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples)
> instead.

This page is the index of the contributor documentation. Each entry links to
the document that owns the topic. The topics are not repeated here, so this
page cannot drift from them.

## Start Here

1. **Set up and run.** Follow [Quick Start](../../README.md#quick-start) in the
   README: Node 24, then `npm install` and `npm run dev`. The app opens at
   `localhost:5500`.
2. **Learn how contributions work.** [CONTRIBUTING.md](../../CONTRIBUTING.md)
   covers branches, pull requests, code style and the checks to run before you
   open a pull request.
3. **Learn how the code is organized.** Read
   [Architecture](../../README.md#architecture) in the README for the diagram
   and the layering rules. Then read
   [docs/agents/architecture.md](../agents/architecture.md) for naming
   conventions, the directory map and the store and routing patterns.

## Topics

| Topic                                                                            | Document                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commands, conventions and the rules every change follows                         | [AGENTS.md](../../AGENTS.md). It is written as context for AI agents, but it is also the source of truth for human contributors.                           |
| Build system, runtime config files, `scripts/`                                   | [docs/agents/environment.md](../agents/environment.md)                                                                                                     |
| Adding a feature module                                                          | [FEATURE_MODULE_CREATION_PATTERN.md](../specifications/FEATURE_MODULE_CREATION_PATTERN.md)                                                                 |
| Adding a model domain                                                            | [MODEL_CREATION_PATTERN.md](../specifications/MODEL_CREATION_PATTERN.md)                                                                                   |
| Adding a Zustand store                                                           | [STORE_CREATION_PATTERN.md](../specifications/STORE_CREATION_PATTERN.md)                                                                                   |
| Unit tests (Vitest)                                                              | [AGENTS.md: Testing Details](../../AGENTS.md#testing-details)                                                                                              |
| End-to-end tests (Playwright)                                                    | [test/playwright/README.md](../../test/playwright/README.md)                                                                                               |
| Debugging and logging                                                            | [DEBUG_GUIDE.md](../specifications/DEBUG_GUIDE.md), and [Troubleshooting](../../README.md#troubleshooting) in the README                                   |
| The App API that apps consume                                                    | [src/app-api/AGENTS.md](../../src/app-api/AGENTS.md) for the architecture and the [App API Reference](../../src/app-api/api_docs/Api.md) for the functions |
| Behavioral specifications (startup, routing, input validation, dialogs and more) | [docs/README.md: Specifications](../README.md#specifications)                                                                                              |
| What a feature does and why                                                      | The `*_docs/` folder next to each feature, indexed in [docs/README.md: Feature Documentation Index](../README.md#feature-documentation-index)              |
| Production builds and deployment config                                          | [Build for production](../../README.md#build-for-production) in the README                                                                                 |
| Releases                                                                         | [Release Management](../../README.md#release-management) in the README                                                                                     |

## Adding a Guide to This Folder

This folder is for step-by-step how-to guides for human contributors. Use
`design/` for how a system works internally and `specifications/` for
behavioral rules. When you add a guide, also add a row for it to the
[Topics](#topics) table.

- Name the file `<topic>.md` in kebab-case (for example, `local-dev-setup.md`),
  with one guide per topic.
- Write for a developer who is new to the project.
- Use numbered steps for procedures and fenced code blocks for terminal
  commands.
- Link to the relevant source files and docs instead of copying their content.
- Keep paragraphs short and prefer bullet lists.
