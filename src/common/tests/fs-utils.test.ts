import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { walkDirectory } from "../fs-utils.ts";

describe("`walkDirectory()` works", async () => {
    await it('should throw when "dirPath" or "maxDepth" is invalid', async (ctx) => {
        // Arrange
        const InvalidParameters: [string, number][] = [
            ["",                         1],
            ["../tests",                 1],
            [join(import.meta.filename), 0],
            [join(import.meta.dirname),  -1],
            [join(import.meta.dirname),  1.5],
        ];

        for (const [dirPath, maxDepth] of InvalidParameters) {
            // Act & Assert
            await ctx.assert.rejects(() => walkDirectory(dirPath, maxDepth).next());
        }
    });

    await it('should respect the provided "maxDepth"', async (ctx) => {
        // Arrange
        const treeDir = await createTestDir({
            File1: null,
            File2: null,
            Dir1: {
                SubFile1: null,
                SubFile2: null,
                Deep: { DeeperSubFile: null, }
            },
            Dir2: {
                SubFile1: null,
                SubFile3: null,
            }
        });

        try {
            const Depth1 = ["File1", "File2"];
            const Depth2 = Depth1.concat(["Dir2/SubFile1", "Dir2/SubFile3", "Dir1/SubFile1", "Dir1/SubFile2"]);
            const Depth3 = Depth2.concat(["Dir1/Deep/DeeperSubFile"]);

            for (const [i, expected] of [Depth1, Depth2, Depth3, Depth3].entries()) {
                // Act
                const results = await Array.fromAsync(walkDirectory(treeDir, i + 1));
                // Assert
                ctx.assert.deepEqual(results, expected.map(path => join(treeDir, path)));
            }

        } finally {
            // Cleanup
            await rm(treeDir, { recursive: true });
        }
    });
});

interface TreeDir {
    [elem: string]: TreeDir | null;
}

async function createTestDir(tree: TreeDir) {
    const rootDir = join(tmpdir(), randomUUID());
    const queue: [tree: TreeDir, path: string][] = [[tree, rootDir]];

    await mkdir(rootDir);

    do {
        const [tree, parentPath] = queue.pop()!;
        for (const key in tree) {
            const fullPath = join(parentPath, key);
            const value = tree[key]!;

            if (value !== null) {
                await mkdir(fullPath);
                queue.push([value, fullPath]);

            } else {
                await writeFile(fullPath, "");
            }
        }

    } while (queue.length > 0);

    return rootDir;
}
