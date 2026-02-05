# Code quality for testing

We are preparing the code base for playwright ai testing.
We are systematically going through code areas (features, modules, utilities, etc.) and:

1. Make components easier to test with playwright by giving them data-ids
2. Adding documentation. Create `<area>_docs/` folder or docs file depending on scope. Specifically document behaviour and design decisions. Do not document low level code details. See src/features/FloatingToolbar_docs/FloatingToolbar.md for a example.
3. Lint the code with ESLint
4. Clean up low risk tech debt -- rename ambiguous variable names, suggest improvements and find low risk issues that improve the quality of the code without introducing major changes or bugs.
