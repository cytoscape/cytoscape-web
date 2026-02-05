# Task Completion Checklist

When completing a coding task, run the following:

## 1. Lint Check
```bash
npm run lint
```
Fix any errors before committing.

## 2. Format Code
```bash
npm run format
```

## 3. Run Unit Tests
```bash
npm run test:unit
```
Ensure all tests pass.

## 4. Type Check (implicit in build)
```bash
npm run build
```
This will catch any TypeScript errors.

## 5. E2E Tests (if UI changes)
```bash
npm run test:e2e
```
Requires dev server running or will start automatically.

## Notes
- Always run lint before committing
- Commit messages should be descriptive
- Feature branches should target `development` branch
