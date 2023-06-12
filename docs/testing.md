# Testing

## Playwright

Automated testing for user-visibile behaviour using playwright

1. Generate automated test cases using the playwright test generator:
   - https://playwright.dev/docs/codegen-intro
   - `npx playwright codegen localhost:5500
2. Test `<filename>.spec.ts` for the new test you generated
3. Run the playwright test command
   - `npx playwright test --trace on
4. Test failures can be explored with the playwright UI tool
   - `npx show-report

## Unit testing
