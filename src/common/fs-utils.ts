import { existsSync, lstatSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Asynchronously walks through a directory tree and yields file paths.
 *
 * This is an async generator that traverses a given directory (depth-first),
 * discovering files and yielding their absolute paths one by one.
 * - Directories are explored up to the specified `maxDepth`. Which must be a positive integer
 *   (1 means no traversal, only the root directory).
 * - Only file paths are yielded; directories are not.
 * - Traversal is depth-first but order of files within a directory is not guaranteed.
 *
 * @example
 * for await (const filePath of walkDirectory("/home/user/projects", 2)) {
 *   console.log(filePath); // Logs each file path up to depth 2
 * }
 */
export async function* walkDirectory(
    dirPath: string,
    maxDepth = Number.MAX_SAFE_INTEGER
) {
    if (maxDepth <= 0 || Math.floor(maxDepth) !== maxDepth)
        throw new Error('"maxDepth" must be positive integer');
    if (!isAbsolute(dirPath) || !existsSync(dirPath) || !lstatSync(dirPath).isDirectory())
        throw new Error('"dirPath" must be a valid absolute directory path');

    const dirStack: [path: string, depth: number][] = [[dirPath, 1]];

    do {
        const [parentPath, depth] = dirStack.pop()!;
        const dirents = await readdir(parentPath, { withFileTypes: true });

        for (const dirent of dirents) {
            const fullPath = join(parentPath, dirent.name);

            if (depth < maxDepth && dirent.isDirectory())
                dirStack.push([fullPath, depth + 1]);
            if (dirent.isFile())
                yield fullPath;
        }
    } while (dirStack.length > 0);
}

/**
 * Asynchronously imports all JavaScript/TypeScript modules within a directory tree.
 *
 * This async generator traverses a directory (using `walkDirectory`) and dynamically
 * imports all `.js` and `.ts` files it finds, excluding test files (`*.test.ts` / `*.test.js`)
 * and common files (`common.js` / `common.ts`).
 *
 * - Directories are explored up to the specified `maxDepth`.
 * - Each yielded result includes both the imported module and its absolute file path.
 */
export async function* importDirectory<T>(dirPath: string, maxDepth?: number) {
    const validFileExt = /(?<!\.test|^common)\.[tj]s$/;

    for await (const filePath of walkDirectory(dirPath, maxDepth)) {
        if (!validFileExt.test(filePath))
            continue;

        const fileURL = pathToFileURL(filePath).href;
        const module: T = await import(fileURL);
        yield { module, filePath };
    }
}
