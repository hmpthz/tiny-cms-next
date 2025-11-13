STAGE 5 Task:

Rules:

- Inspect the current codebase under @packages/ and @examples/. When you write new features, use @reports/ and the source code under @payload-main/ as your reference to understand the architecture design and implementation details.
- DO NOT simply read all reports into your memory as there're too many words, make a plan, understand them one by one just like how you read source code.
- DO NOT change dependencies of each package, they're carefully selected, each package just does it own job. Also follow the exports in package.json.

Step 1: Auth module needs a big overhaul, fix problems and complete the missing parts. There are 3 projects involved in auth: core package, next package and example blog project. All 3 of them must be carefully inspected and fixed.

- Create hono route handlers for common auth operations like sign up, sign in, sign out, etc. Write in `auth.controller.ts` file under `packages/core/src/routes/`.
- Write proper `auth.middleware.ts` for all routes that require it. The idea is to first have a **generic** middleware that accepts cookies and other necessary request information, and it's **backend framework agnostic**. Then use it in hono route handlers. In next package, admin ui and server actions also need to use this middleware. Remember they can't have custom headers, so it's cookies only, nothing to do with headers!
- Auth-related code in these 3 projects have many unused legacy code, try your best to find and remove them. And rewrite other things to meet the requirements above.
- Dependency path: core -> next -> example blog. You MUST put as many logics as possible into core package. The hono route handlers and next integration are only responsible for passing request information to the generic middleware. That's it, no more other code!
- Use exa-code to help you with `better-auth`.

The codebase has went through a lot of changes, many things in READMEs are outdated or simply not exist. After you finish things above, please thoroughly examine ALL projects, understand what they're doing, remove non-existing things and rewrite ALL OF THEM accordingly.

- Only root README is for humans to read, READMEs in other packages must be rather technical, explain the design and implementation details.
- For core package specifically, you split README into multiple files in `docs/` folder, README becomes a table of contents.

Also update `AGENTS.md`, it's for agents to understand the project structure, standards, rules, etc. Ideally the file should be no more than 1500 words.

- Remove "requirements" section and write project structure design instead, short explanation for each package and example, their tech stack, design choices, their relationships (how they depend on each other) etc. And tell agents to read README for more details.
- Include important monorepo info, like each package has shared, required npm scripts. And highlight "peer dependencies" as this project is designed for devs to use multiple packages composition.

IMPORTANT: Consider the task asks to write README and AGENTS, you should first finish them while in plan mode, and in plan file tell agents to read them to better understand the codebase.
