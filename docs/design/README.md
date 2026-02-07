# Design Documents

This directory holds design documents that describe how features, subsystems, or workflows are structured before or during implementation.

## Purpose

Design documents bridge the gap between high-level ADRs and actual code. They provide enough detail for developers and LLM agents to understand **what** a feature does, **how** it works, and **where** it fits in the codebase — without reading every source file.

Typical use cases:

- Explain a feature's internal structure and data flow
- Document component interactions or state transitions
- Describe algorithms, protocols, or integration points
- Provide visual diagrams for complex workflows

## File Naming

```
<topic>.md           # Prose document
<topic>.mmd          # Mermaid diagram source
```

- Use kebab-case for file names (e.g., `network-loading-flow.md`)
- Group related files by topic prefix (e.g., `vizmapper-overview.md`, `vizmapper-mapping-logic.md`)
- Keep one concern per document

## Recommended Format

### Diagrams

Use **Mermaid** (`.mmd`) for all diagrams. Mermaid is text-based, version-controllable, and readable by LLMs.

Supported diagram types:

- Flowcharts — control flow, decision trees
- Sequence diagrams — component interactions over time
- Class diagrams — model relationships
- State diagrams — UI or data state transitions

### Prose

Use Markdown. Keep sections short and scannable. A typical design document includes:

```markdown
# Title

## Overview

One-paragraph summary of what this document covers.

## Context

Why this design exists. Link to related ADRs if applicable.

## Design

### Components / Modules

Describe key parts and their responsibilities.

### Data Flow

How data moves through the system. Include a Mermaid diagram if helpful.

### Key Decisions

Important choices made within this design (smaller scope than ADRs).

## Open Questions (optional)

Unresolved items for future discussion.
```

## Relationship to Other Docs

| Directory              | Scope                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `docs/adr/`            | **Why** — Records of major architectural decisions          |
| `docs/design/`         | **How** — Detailed design of features and subsystems        |
| `docs/specifications/` | **What** — Behavioral specs, validation rules, routing      |
| `docs/prompts/`        | **Workflow** — Templates for LLM-assisted development tasks |

## Tips for LLM-Friendly Documents

- Use descriptive headings — LLMs rely on section titles for navigation
- Include file paths when referencing source code (e.g., `src/models/NetworkModel/`)
- Embed Mermaid diagrams inline rather than linking to external images
- Keep terminology consistent with `AGENTS.md` and the codebase
