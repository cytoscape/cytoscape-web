# Testing

## Playwright

Automated testing for user-visibile behaviour using playwright found in the `test` directory

1. Generate automated test cases using the playwright test generator:
   - https://playwright.dev/docs/codegen-intro
   - `npx playwright codegen localhost:5500
2. Test `<filename>.spec.ts` for the new test you generated
3. Run the playwright test command
   - `npx playwright test --trace on
4. Test failures can be explored with the playwright UI tool
   - `npx show-report

## Unit testing

Unit tests for models and stores found in the `unittest` directory

- Model tests are standard jest tests
   - https://jestjs.io/docs/getting-started
- Store tests use the testing library package to test the store hooks
   - https://github.com/testing-library/react-hooks-testing-library#example