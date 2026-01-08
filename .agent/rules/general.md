---
trigger: always_on
---

- Always use pnpm as package manager.
- If you are unsure about a potential big change to functionality (whether the user actually wants to perform that change etc.), bring it up as a question to the user rather than making potentially breaking changes that the user didn't intend in their request and risking that they miss it and then are confused why the behavior changed or why some functionality broke.
- After finishing big tasks, feel free to sparingly run `pnpm build` to ensure the changes didn't cause any errors (if you deem it useful).
- Try to avoid sprinkling magic values and configurations across the codebase. Make sure to centralize stuff into configs if possible and sensible.
- Take care of the codebase. It should be clean, free of unused functions or code, huge complex functions of 100 lines or more should instead be broken down into more focused functions for clarity, code and functions should be in relevant files instead of many different functions all clustering in one huge file, code should ideally be reused and existing local code possibly moved TO be reused if a new functionality is added that uses the same code etc. to prevent bugs and scattering. Basically good software engineering practices for a sustainable codebase.