# Project Overview

# Development Guidelines

## Technical Instructions

### Coding Standards and Best Practices

- **TypeScript Strictness**: All code must be strongly typed. **However**, typings for generics can sometimes be too complicated to write and is not human readable, in **rare cases** you are allowed to use `any` to bypass type check.
- Only use default exports for nextjs specific files like page, layout etc. All other should use named exports.
- Correctly write `useMemo`, `useCallback` and `React.memo` to memoize things, try hard to avoid unnecessary re-renders.

### Error Handling

- Include context for debugging
- Handle errors at appropriate level, avoid over-catching exceptions

### Documentation

- Comments and documentations should be clear, concise and informative, but not too verbose.
- Only write necessary comments. For example, no need to comment on a function parameter if the function description or signature is clear enough.

### What to do when Stuck

1. **Try different angle**:
   - Remove abstraction instead of adding?
   - Different architectural pattern?
   - Different library/framework feature?
2. **Question fundamentals**:
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?
3. **CRITICAL**: Maximum **3** attempts per issue, then STOP. Write and save a report including:
   - What you tried
   - Specific error messages
   - Why you think it failed

## Philosophy

### KISS (Keep It Simple, Stupid)

- Encourages Claude to write straightforward, uncomplicated solutions
- Avoids over-engineering and unnecessary complexity
- Results in more readable and maintainable code

### YAGNI (You Aren't Gonna Need It)

- Prevents Claude from adding speculative features
- Focuses on implementing only what's currently needed
- Reduces code bloat and maintenance overhead
