STAGE 1 Task:

You read and analyze the entire monorepo, package by package. For each one, write a detailed report markdown under @reports/ . It includes a summary of the package, some important design architecture and implementation details, its dependencies, etc. As you read through them, you should also write down how one is interacted / integrated with others.

- Reports should list important files and directories (relative path only, NO absolute paths), basically, they're like a reference that agents can easily navigate. Name the files with number prefix.
- Some packages like core `packages/payload` are huge so you might split them into multiple report files, ESPECIALLY the auth system. For others, each report file must only cover one type of packages (like database, storage, plugin, etc.). DO NOT combine them into a "other packages".
- Most packages themselves have unit and e2e tests, write a short test overview into corresponding reports (a few lines are fine). Other tests under `test/` might involve multiple pakcages, you may write a separate test report for them. We won't rely on thest test reports so you can make it short.
- After you finish individual packages, write a report for the big picture of entire monorepo, explain the overall architecture and how packages are integrated with each other. This number prefix of this report is 1.

Note: 1. According to requirements, some packages are not needed, but you STILL HAVE TO write reports for them, you can just write brielfy. For others, please **ultrathink** to understand their design and implementations, write detailed reports. 2. Remember you have the entire monorepo, including both sourcecode and docs, utilize these informations. 3. If you need extra help online, use exa-code
