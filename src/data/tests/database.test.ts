import Sqlite3 from "better-sqlite3";
import test from "node:test";

import bot from "../Bot.ts";
import { Migrator } from "../database.ts";

import type { Mock, TestContext } from "node:test";
import type { Database } from "better-sqlite3";

class TestMigrator extends Migrator {
    readonly #getExecutedMigrations;

    constructor(database: Database, ctx: TestContext) {
        super(database, bot.logger);
        this.#getExecutedMigrations = database
            .prepare<[], { name: string }>('SELECT name FROM "migrations";');

        for (let i = 0; i < 5; i++) {
            this.migrations.push({
                name:`${i}-migration`,
                down: ctx.mock.fn(),
                up:   ctx.mock.fn(),
            });
        }
    }

    getLoadedMigrations() {
        type MockedFn = Mock<(db: Database) => void>;
        return this.migrations as { name: string, down: MockedFn, up: MockedFn }[];
    }
    getExecutedMigrations() {
        return this.#getExecutedMigrations.all().map((result) => result.name);
    }
}

test("Migrator works", async (ctx) => {
    // Arrange
    const db = new Sqlite3(":memory:");

    // Act #1 should create the "migrations" table
    const migrator = new TestMigrator(db, ctx);
    // Assert #1
    const tableName = db.prepare(`\
        SELECT name FROM sqlite_master
            WHERE type='table' AND name='migrations'
    `).pluck().get();
    ctx.assert.deepEqual(tableName, "migrations");

    // Act & Assert #2 should throw for invalid migration target
    await ctx.assert.rejects(() => migrator.migrateTo("Doesn't exist"));
    ctx.assert.deepEqual(migrator.getExecutedMigrations(), []);

    // Act #3 Run the first migration
    await migrator.migrateTo("0-migration");
    // Assert #3
    const loadedMigrations = migrator.getLoadedMigrations();
    ctx.assert.deepEqual(migrator.getExecutedMigrations(), ["0-migration"]);
    ctx.assert.equal(loadedMigrations[0]!.up.mock.callCount(), 1);
    ctx.assert.equal(loadedMigrations[0]!.down.mock.callCount(), 0);

    // Act #4 Migrate to latest
    await migrator.migrateToLatest();
    // Assert #4
    ctx.assert.deepEqual(migrator.getExecutedMigrations(),
        ["0-migration", "1-migration", "2-migration", "3-migration", "4-migration"]);
    ctx.assert.equal(migrator.getLoadedMigrations().every((m) => m.up.mock.callCount() === 1), true);
    ctx.assert.equal(migrator.getLoadedMigrations().every((m) => m.down.mock.callCount() === 0), true);

    // Act #5 Migrate to the first
    await migrator.migrateTo("0-migration");
    // Assert #5
    ctx.assert.deepEqual(migrator.getExecutedMigrations(), ["0-migration"]);
    ctx.assert.equal(migrator.getLoadedMigrations().every((m) => m.up.mock.callCount() === 1), true);
    ctx.assert.deepEqual(migrator.getLoadedMigrations().map((m) => m.down.mock.callCount()), [0, 1, 1, 1, 1]);

    // Act #6 Migrate to nothing
    await migrator.migrateToNothing();
    // Assert #6
    ctx.assert.deepEqual(migrator.getExecutedMigrations(), []);
    ctx.assert.equal(migrator.getLoadedMigrations().every((m) => m.up.mock.callCount() === 1), true);
    ctx.assert.equal(migrator.getLoadedMigrations().every((m) => m.down.mock.callCount() === 1), true);

    // Cleanup
    db.close();
});
