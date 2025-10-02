import { randomInt } from "node:crypto";
import test from "node:test";

import { initializeDatabase } from "../../database.ts";
import { getUnitTestLogger } from "../../misc.ts";
import { GuildRepo, UserRepo } from "../discord-item.ts";

import type { GuildDBO, UserDBO } from "../discord-item.ts";

for (const [Repo, repoName] of [
    [GuildRepo, GuildRepo.name],
    [UserRepo,  UserRepo.name],
] as const)
{
    test(`${repoName} works`, async (ctx) => {
        // Arrange
        const db = await initializeDatabase(":memory:", getUnitTestLogger());
        const repo = new Repo(db);

        const TestId = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(randomInt(1000));
        const TestItem: GuildDBO | UserDBO = {
            id: TestId.toString(),
            name: "Test Item",
            config: {
                "Config1": "value",
                "Config 2": 1234
            },
            createdAt: new Date(),
            updatedAt: undefined,
        };

        // Act #1 Get a row that doesn't exists
        let result = repo.getById(TestId);
        // Assert #1
        ctx.assert.deepEqual(result, undefined);

        // Act #2 Create an entry
        result = repo.createOrUpdate(TestItem);
        // Assert #2
        expectValidItem(result);
        TestItem.createdAt = result.createdAt; // DB sets the correct `createdAt`
        ctx.assert.deepEqual(result, TestItem);

        // Act #3 Get the created entry
        result = repo.getById(TestItem.id);
        // Assert #3
        expectValidItem(result);
        ctx.assert.deepEqual(result, TestItem);

        // Act #4: Update the created item
        TestItem.name = "TestItem 2";
        TestItem.config = { "Config 2": "value" };
        result = repo.createOrUpdate(TestItem);
        // Assert #4
        expectValidItem(result);
        TestItem.updatedAt = result.updatedAt; // DB sets the `updatedAt`
        ctx.assert.deepEqual(result, TestItem);
        ctx.assert.deepEqual(repo.getById(TestId), TestItem);

        // Act #5 Test deletion
        repo.deleteById(TestItem.id);
        // Assert #5
        ctx.assert.equal(repo.getById(TestId), undefined);

        db.close();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function expectValidItem(item: any) {
            ctx.assert.notEqual(item, undefined);
            ctx.assert.notEqual(item, null);
            ctx.assert.deepEqual(typeof item.id, "string");
            ctx.assert.deepEqual(typeof item.name, "string");
            ctx.assert.deepEqual(typeof item.config, "object");
            ctx.assert.deepEqual(item.createdAt instanceof Date, true);
            ctx.assert.deepEqual(item.updatedAt === undefined || item.updatedAt instanceof Date, true);
        }
    });
}
