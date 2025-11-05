STAGE 3 Task:

Implement the full-featured tiny-cms project, finish the monorepo structure and each simplified package.
The reports under @reports/ are your reference for the architecture and design of the original Payload CMS, it also tells you briefly how to simplify and implement them in tiny-cms. Further more, you MUST actually read the source code under @payload-main/ to understand the implementation details.
**Think harder** while you're understanding, planning and writing.

Rules:

- Reports and source code are only reference, you should write the prototype FROM SCRATCH as if it's a brand new project. DO NOT copy-paste any code and just remove some parts.
- Although the goal is to simplify, the project is still considered as a formal, functioning CMS, DO NOT go too far that makes it like a toy project.
- DO NOT simply read all reports into your memory as there're too many words, make a plan, understand them one by one just like how you read source code.

Step 1:

1. Start with writing core payload package and database package. You shall first read the overall report, then understand other corresponding reports and source code. I think the database package depends on the core package so make sure you follow the correct order.
2. Construct monorepo structure with pnpm workspace. Install eslint, prettier and typescript in the root package (all must be LATEST VERSION) and create base config files for them (eslint config must be mjs, not json).
3. Also create an example project under examples/ folder, demonstrating the usage of the implemented packages so far.
