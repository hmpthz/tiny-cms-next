STAGE 5 Task:

Rules:

- DO NOT simply read all reports into your memory as there're too many words, understand them one by one just like how you read source code.

Step 1: Auth module needs a big overhaul, fix problems and complete the missing parts. There are 3 projects involved in auth: core package, next package and example blog project. All 3 of them must be carefully inspected and fixed.

- Create hono route handlers for common auth operations like sign up, sign in, sign out, etc. Write in `auth.controller.ts` file under `packages/core/src/routes/`.
- Write proper `auth.middleware.ts` for all routes that require it. The idea is to first have a **generic** middleware that accepts cookies and other necessary request information, and it's **backend framework agnostic**. Then use it in hono route handlers. In next package, admin ui and server actions also need to use this middleware. Remember they can't have custom headers, so it's cookies only, nothing to do with headers!
- Auth-related code in these 3 projects have many unused legacy code, try your best to find and remove them. And rewrite other things to meet the requirements above.
- Dependency path: core -> next -> example blog. You MUST put as many logics as possible into core package. The hono route handlers and next integration are only responsible for passing request information to the generic middleware. That's it, no more other code!
- Use exa-code to help you with `better-auth`.
