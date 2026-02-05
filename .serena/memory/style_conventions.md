# Code Style & Conventions

## Prettier Configuration
- No semicolons
- Single quotes
- Trailing commas (all)
- 2 space indentation
- 80 character line width

## ESLint Rules
- React Hooks rules enforced
- TypeScript recommended rules
- `@typescript-eslint/no-explicit-any`: off (any is allowed)
- `@typescript-eslint/no-unused-vars`: warn
- Import sorting via `simple-import-sort` (auto-sorted)

## TypeScript
- Strict null checks enabled
- No implicit any
- Target: ES2022
- Module: ESNext
- JSX: react-jsx (no React import needed)

## React Patterns
- Functional components only (no class components)
- React 18 with new JSX transform
- Feature-based folder structure

## Import Order (enforced by simple-import-sort)
1. External packages
2. Internal modules
3. Relative imports
