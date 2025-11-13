**Plan mode**: When you're asked to make a plan, write a plan in markdown file under @.claude/ folder. It should be detailed but concise, not verbose.

# Project Overview

## payload-cms

At @payload-main/ this is Payload CMS monorepo, an industry-level, production-ready headless CMS built with Next.js. It's powerful, flexible, fully customizable, and supports many plugins.
Imagine you're a senior dev who's going to mentor me on how to design and write a CMS from scratch. Payload CMS is way too complex for single devs to understand. Because it's designed for plugins and customizations, there are many bloated design decisions that is not necessary for a simple CMS.
Your main job is to read and understand the entire monorepo codebase, then write a much simplified version of it at the root directory, following similar design patterns and architecture, but strip of those bloated designs for customizations. The new CMS design should be somewhere between Payload CMS and a toy project that you would typically see in a video tutorial.

Requirements:

- New CMS is named "tiny-cms", do not leave the name "payload"
- This CMS is for nextjs ONLY, you don't need to think of any other frameworks.
- Manage monorepo with pnpm workpace, no turborepo.
- No multiple database implementations, only use postgreSQL. Use `kysely` as the ORM instead of `drizzle`.
- No multiple storage implementations, only use s3-compatible `@supabase/storage-js`. Keep the adapter interface for both database and storage, but make them much simpler, we don't need many advanced features.
- No payload-cloud service.
- Only keep "plugin-search", no other plugins like ecommerce, etc.
- No rich text editor and its complex live preview. Try pick a simple and easy to use react markdown editor and renderer instead.
- Use `next-intl` for translations, but for now only write english.
- **Important**: Rewrite auth system using `better-auth`. Be extra careful since it'll be interacted with many other modules.
- No email packages (better-auth already has it)
- No multiple tempaltes, only write a blog template, styles and layouts are minimal.
- Minimal UI using Tailwind CSS and `shadcn/ui` components.
- There are lots of config files for various tools at root directory and package directories. Keep most of them, but anything about path should be changed since we'll remove, rename or simplify them.

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

# General Rules

## What to do when Stuck

1. **Try different angle**:
   - Appropriate level of abstractions?
   - Different design?
   - Different library/framework feature?
2. **Question fundamentals**:
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?
3. **CRITICAL**: Maximum **3** attempts per issue, then STOP. Write and save a report including:
   - What you tried
   - Specific error messages
   - Why you think it failed

## Philosophy

**KISS (Keep It Simple, Stupid)**

- Encourages Claude to write straightforward, uncomplicated solutions
- Avoids over-engineering and unnecessary complexity
- Results in more readable and maintainable code

**YAGNI (You Aren't Gonna Need It)**

- Prevents Claude from adding speculative features
- Focuses on implementing only what's currently needed
- Reduces code bloat and maintenance overhead
