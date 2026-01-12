---
trigger: always_on
---

- Always use pnpm as package manager.
- If you are unsure about a potential big change to functionality (whether the user actually wants to perform that change etc.), bring it up as a question to the user rather than making potentially breaking changes that the user didn't intend in their request and risking that they miss it and then are confused why the behavior changed or why some functionality broke.
- After finishing big tasks (sparingly), feel free to run `pnpm build` to ensure the changes didn't cause any errors (if you deem it useful).
- Try to avoid sprinkling magic values and configurations across the codebase. Make sure to centralize stuff into config and constant files, utils etc.
- Take care of the codebase. It should be clean, free of unused functions or code, huge complex functions of 100 lines or more should instead be broken down into more focused functions for clarity, code and functions should be in relevant files instead of many different functions all clustering in one huge file, code should ideally be reused and existing local code possibly moved TO be reused if a new functionality is added that uses the same code etc. to prevent bugs and scattering. Basically good software engineering practices for a sustainable codebase.
- For merging classNames, use the "cn" utility.
- Make sure code is suitable for both firefox and chrome.
- Prefer to use logger (`import { logger } from '@/utils/Logger';`) with proper levels (log/warn/...). For advanced usage, you can use contexts, explained below:

"""
Logger Context Usage (Recommended for Modules/Services)
 ```typescript
 import { logger } from '@/utils/Logger';
 const log = logger.withContext('Scheduler');
 
 // Later in the file
 log.info('Decision made');    // [Horizon][Scheduler] Decision made
 log.error('Failed', err);     // [Horizon][Scheduler] Failed <error>
 ```
 
 ## When to Use Context
 - ✅ Services (e.g., 'Gemini', 'Scheduler', 'Sweeper')
 - ✅ Background scripts (e.g., 'Background')
 - ✅ Content scripts (e.g., 'Content')
 - ✅ Complex components with significant logging
 - ❌ Simple utility functions (just use `logger` directly)
 - ❌ One-off debug statements (context adds unnecessary noise)

# Code Style & Formatting

## TypeScript
- Use strict TypeScript typing; avoid `any` unless absolutely necessary.
- Prefer `interface` over `type` for object shapes.
- Use descriptive variable names (`songInfo` not `si`).

## React Components
- Use functional components with hooks exclusively.
- Destructure props in the function signature.
- Use Framer Motion for animations.

## Imports & Paths
- Use `@/` alias for all internal imports.
- Group imports: React → External libs → Internal → Types → CSS.

## File Organization
- Keep files < 400 lines; split large files.
- Services → `src/services/`
- Config → `src/config/`
- Utils → `src/utils/`

# Testing Requirements
- Critical services should have unit tests.
- Add regression tests when fixing bugs.
- Manual testing required for browser-specific features.

# Safety Constraints
- Never commit `.env` or API keys.
- Warn before changing content/background messaging.
- Test both Chrome and Firefox before pushing.
- Extra scrutiny for manifest changes.
"""