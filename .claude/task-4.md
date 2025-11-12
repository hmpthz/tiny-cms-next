STAGE 4 Task:

We already have the prototype of packages and an example project. Now it's your job to improve it and fix several problems.
You should first inspect the current codebase under @packages/ and @examples/. In the meantime, use @reports/ and the source code under @payload-main/ as your reference to understand the architecture design and implementation details.

Rules:

- DO NOT simply read all reports into your memory as there're too many words, make a plan, understand them one by one just like how you read source code.
- Use exa-code to help you with 3rd party libraries.
- **Think harder** while you're understanding, planning and writing.

Step 1: Inspect example blog project, you'll see it has dependencies like better-auth, zod, kysely, pg. Remember they should be integrated inside packages, external projects should not depend on them.

1. Integrate better-auth into core package properly, make sure external projects don't have to call better-auth directly. And you may expose zod as schema validator.
2. Redesign and overhaul core package, db package. Put generic database adapter into core package, then create a "db-postgres" package that implements the adapter, using kysely and pg. Also search plugin package should depend on generic database adapter from core package, not explicitly using kysely and pg. So you MUST carefully design the interface to support it.
3. Also, I think storage and search plugin packages needs to implement `Config` or `Plugin` interface from core package. Try to research reports and source code to understand how they're designed and integrated.

Step 2: Inspect example blog project to understand how it works with packages of current codebase. Then run type check and you'll see some errors, which lead to several things to fix here.

1. I've put sdk package into core package, which is just a wrapper of api requests. Now please design APIs based on that, and add a `hono.js` app instance in TinyCMS class to handle those api requests (use exa-code for hono usage). The config and plugin system now has to support additional route handlers, they will be added into app instance while constructing.
2. `createCMS` should never be async, it should be a simple function that immediately returns the instance, you perform async init operations later. Utilize the powerful hono middleware system, init database connection if not connected yet everytime it handles a request (for serverless functions). Also try to add auth and other necessary logics into the middleware.
3. For nextjs integration package, create nextjs request handler by 'hono/vercel' so that nextjs itself only has a '/api/rest' route, its requests will all be handled by hono. Try to wrap as many logics as possible into core package hono or next package. You must achieve the goal that example blog project can write as little code as possible, the logics are all wrapped internally.
4. Read example blog project, you'll see it still uses `kysely` and `pg`, which should be avoided. The database adapter interface should be enough to perform all sorts of operations, including schema setup. If the current design is not able to support it, you must have an overhaul.
5. When you finish all changes, update their README accordingly. For core package specifically, you split README into multiple files in `docs/` folder, README becomes a table of contents, also api descriptions, sdk usage, and other new things.

Step 3: Better organize the codebase

1. When you create hono app instance, use `basePath()` method, remove all api prefixes from routes across core and plugin packages. There's should be no more things like `/api` since it's set in base path.
2. For core package and plugin storage package, extract the route handler logics into a separate file, each api endpoint must be a separate function.
3. Overhaul plugin storage in this way:
   - We do not need an upload api route, uploading should be done on client side. The backend api only create a signed url.
   - Because this plugin adds new api routes (including upload, although it's not sent to our backend), we need to extend client-side `TinyCmsSDK` to support these new api routes. You first extend interface by declaration merging, then assign new methods to prototype.
