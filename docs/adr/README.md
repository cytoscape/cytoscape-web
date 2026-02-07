# Architecture Decision Records (ADR)

This directory stores ADRs for LLM-driven development of Cytoscape Web.

## Purpose

ADRs capture significant design decisions and their rationale. In this project, they serve LLM-assisted workflows by:

- **Consistency** — LLMs reference past decisions to generate aligned proposals
- **Persistent context** — Design intent survives across sessions
- **Efficient review** — Both humans and LLMs can quickly understand "why"
- **Searchable knowledge** — Project-specific patterns and constraints are discoverable

## File Naming

```
NNNN-<short-title>.md
```

- `NNNN` — Zero-padded 4-digit sequence (e.g., `0001`, `0002`)
- Title in kebab-case
- Example: `0001-use-zustand-for-state-management.md`

## Template

```markdown
# NNNN: Title

## Status

Proposed | Accepted | Deprecated | Superseded by NNNN

## Context

Background and problem that prompted this decision.

## Decision

The chosen approach.

## Rationale

Why this approach was selected. List alternatives considered.

## Consequences

Trade-offs and impacts. Specify affected areas of the codebase.
```

## Status Definitions

| Status         | Meaning                                        |
| -------------- | ---------------------------------------------- |
| **Proposed**   | Under review; open for discussion              |
| **Accepted**   | Agreed upon; ready for implementation          |
| **Deprecated** | No longer active; kept as historical record    |
| **Superseded** | Replaced by a newer ADR (reference its number) |

## Usage with LLM Agents

### Referencing ADRs

Agent instruction files (`AGENTS.md` / `CLAUDE.md`) can point to relevant ADRs. This gives LLMs the right context when working in specific areas.

### Searching ADRs

LLM agents can search `docs/adr/` via semantic or file search. Include sufficient keywords in titles and body text.

### When to Create an ADR

- Adopting or replacing a library / framework
- Introducing or changing an architectural pattern
- Significant data model or API design changes
- Performance or security policy decisions
- Changing an established convention

### Updating ADRs

ADRs are **append-only**. To revise a decision, mark the existing ADR as "Superseded" and create a new one.

## Relation to This Project

Cytoscape Web uses a three-layer architecture (Models / Stores / Features). ADRs record cross-layer design decisions to maintain codebase consistency. See [AGENTS.md](../../AGENTS.md) for the full architecture overview.

## References

- [Michael Nygard — Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr/madr — Markdown ADR template](https://adr.github.io/madr/)
