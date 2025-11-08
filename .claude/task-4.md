STAGE 4 Task:

We already have the prototype of packages and an example project. Now it's your job to improve it and fix several problems.
You should first inspect the current codebase under @packages/ and @examples/. In the meantime, use @reports/ and the source code under @payload-main/ as your reference to understand the architecture design and implementation details.

Rules:

- DO NOT simply read all reports into your memory as there're too many words, make a plan, understand them one by one just like how you read source code.
- Use exa-code to help you with 3rd party libraries.
- **Ultrathink** while you're understanding, planning and writing.

Step 1: Inspect example blog project, you'll see it has dependencies like better-auth, zod, kysely, pg. Remember they should be integrated inside packages, external projects should not depend on them.

1. Integrate better-auth into core package properly, make sure external projects don't have to call better-auth directly. And you may expose zod as schema validator.
2. Redesign and overhaul core package, db package. Put generic database adapter into core package, then create a "db-postgres" package that implements the adapter, using kysely and pg. Also search plugin package should depend on generic database adapter from core package, not explicitly using kysely and pg. So you MUST carefully design the interface to support it.
3. Also, I think storage and search plugin packages needs to implement `Config` or `Plugin` interface from core package. Try to research reports and source code to understand how they're designed and integrated.
