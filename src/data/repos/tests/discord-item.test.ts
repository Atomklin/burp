import { randomInt } from "node:crypto";
import test from "node:test";

import { getOrCreateTestDatabase } from "../../misc.ts";
import { GuildRepo, UserRepo } from "../discord-item.ts";

import type { Database } from "better-sqlite3";
import type { GuildDBO, IMemberConfig, UserDBO } from "../discord-item.ts";

for (const [repoName, newRepo] of [
    [UserRepo.name,  (db: Database) => new UserRepo(db)],
    [GuildRepo.name, (db: Database) => new GuildRepo(db, { embedColor: "Random", locale: "en" })],
] as const)
{
    test(`\`${repoName}\` works`, async (ctx) => {
        // Arrange
        const db = await getOrCreateTestDatabase();
        const repo = newRepo(db);

        const TestId = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(randomInt(1000));
        const TestItem: GuildDBO | UserDBO = {
            id: TestId.toString(),
            name: "Test Item",
            config: {
                "locale": "value",
                "embedColor": 1234
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
        TestItem.config = { "embedColor": "Blurple" };
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

test("`GuildRepo.getMemberConfig()` works", async (ctx) => {
    // Arrange
    const db = await getOrCreateTestDatabase();
    const DefaultConfig: IMemberConfig = {
        embedColor: "Random",
        locale: "en"
    };
    const TestUser: UserDBO = {
        id: "12345",
        name: "Test User with Config",
        createdAt: new Date(),
        config: {
            embedColor: "Aqua"
        }
    };
    const TestGuild: GuildDBO = {
        id: "54321",
        name: "Test Guild with Config",
        createdAt: new Date(),
        config: {
            locale: "de"
        }
    };

    const userRepo = new UserRepo(db);
    const guildRepo = new GuildRepo(db, DefaultConfig);

    // Act #1 User and guild doesn't exist, fallback to default
    let results = guildRepo.getMemberConfig(TestUser.id, TestGuild.id);
    // Assert #1
    ctx.assert.deepEqual(results, DefaultConfig);

    // Act #2 Only `TestUser` exists
    userRepo.createOrUpdate(TestUser);
    results = guildRepo.getMemberConfig(TestUser.id, TestGuild.id);
    // Assert #2
    ctx.assert.deepEqual(results, { ...DefaultConfig, ...TestUser.config });

    // Act #3 Only `TestGuild` exists
    userRepo.deleteById(TestUser.id);
    guildRepo.createOrUpdate(TestGuild);
    results = guildRepo.getMemberConfig(TestUser.id, TestGuild.id);
    // Assert #3
    ctx.assert.deepEqual(results, { ...DefaultConfig, ...TestGuild.config });

    // Act #4 When both exists
    userRepo.createOrUpdate(TestUser);
    results = guildRepo.getMemberConfig(TestUser.id, TestGuild.id);
    // Assert #4
    ctx.assert.deepEqual(results, { ...TestGuild.config, ...TestUser.config });
});
