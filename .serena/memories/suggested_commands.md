# Suggested Commands

## Development
| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (localhost:5500) |
| `npm run build` | Build for production |
| `npm run build:netlify` | Build for Netlify deployment |
| `npm run build:analyze` | Build with Webpack bundle analyzer |
| `npm run clean` | Remove dist folder |
| `npm run sync:agents` | Sync CLAUDE.md → AGENTS.md (auto-generate) |

## Testing
| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

> **Note:** There is no unified `npm test` command. Use `test:unit` or `test:e2e` separately.

## Code Quality
| Command | Description |
|---------|-------------|
| `npm run lint` | Lint TS/JS files in src/ |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format code with Prettier |

## System Utilities (Linux)
| Command | Description |
|---------|-------------|
| `git` | Version control |
| `ls` | List directory contents |
| `grep` / `rg` | Search file contents |
| `find` | Find files |
