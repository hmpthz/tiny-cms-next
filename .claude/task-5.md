# STAGE 5 Task:

## Rules:

- DO NOT simply read all reports into your memory as there're too many words, understand them one by one just like how you read source code.
- Remember to update README and AGENTS.md accordingly.

## Step 1

Auth module needs a big overhaul, fix problems and complete the missing parts. There are 3 projects involved in auth: core package, next package and example blog project. All 3 of them must be carefully inspected and fixed.

- Create hono route handlers for common auth operations like sign up, sign in, sign out, etc. Write in `auth.controller.ts` file under `packages/core/src/routes/`.
- Write proper `auth.middleware.ts` for all routes that require it. The idea is to first have a **generic** middleware that accepts cookies and other necessary request information, and it's **backend framework agnostic**. Then use it in hono route handlers. In next package, admin ui and server actions also need to use this middleware. Remember they can't have custom headers, so it's cookies only, nothing to do with headers!
- Auth-related code in these 3 projects have many unused legacy code, try your best to find and remove them. And rewrite other things to meet the requirements above.
- Dependency path: core -> next -> example blog. You MUST put as many logics as possible into core package. The hono route handlers and next integration are only responsible for passing request information to the generic middleware. That's it, no more other code!
- Use exa-code to help you with `better-auth`.

## Step2

Thoroughly examine the current state of next package, admin-ui package and example blog project, rewrite all the admin ui related code. The admin ui has several pages with basic CRUD operations for collections and docs, also include simple account settings and sign in page.
Key points of this task is to understand the role of each package and how they work together:

**admin-ui package:** Once there was a `@tiny-cms/ui` package, but it's been completely removed. The new one is `@tiny-cms/admin-ui`. You must remove any legacy code that uses the old one.

- Contains serveral admin pages that are minimal but fully functional, if users don't need a highly customized admin ui, they must be able to use these out of the box.
- Made of "base ui" and tailwindcss v4 (already installed). They're relatively new libs, use exa-code to get the correct instructions.

It works this way:

- Each page has a root context provider that accepts: 1. initial data from server (RSC if using nextjs) 2. server actions that mutates data 3. other page params.
- Only the initial data is from server, after that, all re-fetch and re-render after mutations run on client side. To do this, also use `swr` for fetching data in the context provider. Initial data is passed to useSwr `fallbackData` option.
- Remember we have `sdk` in core package, client side fetching uses this. However, we create sdk instance in app project, not in library. Here we write a sdk context provider. Use context to get sdk instance. Page component is supposed to be wrapped with this provider in app project.

For richtext field editing, we edit it with a simple textarea, and preview with `react-markdown`, switched by `Switch` base ui component.
No form validation in this step for simplicity.

**next package:** For server side things, remove the old components as they are written in admin-ui package now.
It has a `RootAdminPage` that:

- Accepts a cms instance prop
- Accepts a `RootProvider` functional component as prop that wraps the page component. This is supposed to be the "sdk context provider" created in app project.
- Parse catch-all route, get the page, params and query to show
- Fetch initial data, create server actions (`withServerAuth`) for mutations, pass props to page.

**example blog project:** The app project using all packages.

- Create cms instance for server side, create sdk instance for client side. Wrap sdk instance in "sdk context provider" from admin-ui package. Pass this provider to `RootAdminPage`
- Apart from admin ui, also completely rewrite non admin pages using base ui and tailwindcss v4. (minimal styling)

Before you finish, fix type check and lint for all packages.
