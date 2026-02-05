# Suggested Commands

## Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5500)
```

## Build
```bash
npm run build        # Production build
npm run build:analyze # Build with bundle analysis
npm run clean        # Remove dist/
```

## Testing
```bash
npm run test:unit    # Run Jest unit tests
npm run test:e2e     # Run Playwright E2E tests (requires dev server)
```

## Code Quality
```bash
npm run lint         # Check for ESLint errors
npm run lint:fix     # Auto-fix ESLint errors
npm run format       # Format code with Prettier
```

## Git Workflow
- Main branch: `master` (production)
- Development branch: `development`
- Feature branches merge to `development`
