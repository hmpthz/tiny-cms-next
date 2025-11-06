STAGE 3 Task:

Implement the full-featured tiny-cms project, finish the monorepo structure and each simplified package.
The reports under @reports/ are your reference for the architecture and design of the original Payload CMS, it also tells you briefly how to simplify and implement them in tiny-cms. Further more, you MUST actually read the source code under @payload-main/ to understand the implementation details.
**Think harder** while you're understanding, planning and writing.

Rules:

- Reports and source code are only reference, you should write the prototype FROM SCRATCH as if it's a brand new project. DO NOT copy-paste any code and just remove some parts.
- Although the goal is to simplify, the project is still considered as a formal, functioning CMS, DO NOT go too far that makes it like a toy project.
- Each package should have its own eslint config and tsconfig, derived from root config files, and with scripts as defined in package.json. DO NOT duplicate dependencies that already exist in the root package.
- DO NOT simply read all reports into your memory as there're too many words, make a plan, understand them one by one just like how you read source code.

Step 1:

1. Start with writing core payload package and database package. You shall first read the overall report, then understand other corresponding reports and source code. I think the database package depends on the core package so make sure you follow the correct order.
2. Construct monorepo structure with pnpm workspace, I've already created a root package.json.
3. Use exa-code to help you write code correctly, especially for the usage of `better-auth`, `kysely` or other libraries, and for writing typescript related things.
4. For generic typings, if you MUST use `any` type, you can write `type ANY = any` and eslint comment to suppress the error.
5. Also create an example project under examples/ folder, demonstrating the usage of the implemented packages so far.

Step 2:

1. Implement ui package, primarily focus on the minimal admin ui (just black and white, no fancy colors), and markdown editor & renderer. You must use exa-code to find the best solution and library for markdown features.
2. Fix and finish next integration package, which should depend on ui package. Please refer to its report and source code.
3. Implement sdk package. It should be based on the current implementation of core and database.
4. Make example blog a complete nextjs project, using all the implemented packages so far.

Step 3:

1. Complete storage package, it should have a generic s3-compatible adapter. And an implementation using `@supabase/storage-js`.
2. Complete search plugin package.
3. Further extend the example blog project, add upload (signed url from api) and search features.
4. Fix all eslint and type errors. All packages should have a "lint:fix" script.
