import Sqlite3 from "better-sqlite3";
import assert from "node:assert";
import { join, parse } from "node:path";

import { importDirectory } from "../common/fs-utils.ts";
import { ISOTextSQL } from "./misc.ts";

import type { BaseLogger } from "pino";
import type { IMigrationModule } from "./types.ts";

export async function initializeDatabase(dbPath: string, logger: BaseLogger) {
    const sqlite3 = new Sqlite3(dbPath, {
        verbose: (message) => logger.debug(message)
    });

    sqlite3.pragma("journal_mode = WAL");
    sqlite3.pragma("foreign_keys = ON");
    sqlite3.defaultSafeIntegers();

    const migrator = new Migrator(sqlite3, logger);
    await migrator.migrateToLatest();
    return sqlite3;
}

interface IDbMigration {
    name: string;
    timestamp: string;
}

export class Migrator {
    protected readonly migrations;
    readonly #logger;
    readonly #db;

    constructor(db: Sqlite3.Database, logger: BaseLogger) {
        this.#db = db;
        this.#db.exec(`\
            CREATE TABLE IF NOT EXISTS "migrations" (
                "name"      TEXT PRIMARY KEY NOT NULL,
                "timestamp" TEXT NOT NULL DEFAULT (${ISOTextSQL})
            );
        `);

        this.#logger = logger;
        this.migrations = new Array<IMigrationModule & { name: string }>();
    }

    async #loadMigrations() {
        if (this.migrations.length > 0)
            return;

        const dirPath = join(import.meta.dirname, "migrations");
        const modules = importDirectory<{ default?: IMigrationModule }>(dirPath, 1);

        for await (const { module, filePath } of modules) {
            if (module.default == null ||
                typeof module.default.up !== "function" ||
                typeof module.default.down !== "function"
            ) {
                this.#logger.warn('Skipping "%s" due to missing exports', filePath);
                continue;
            }

            this.migrations.push({
                up: module.default.up,
                down: module.default.down,
                name: parse(filePath).name
            });
        }

        this.migrations.sort((a, b) => b.name.localeCompare(a.name, "en"));
    }

    async migrateToLatest() {
        await this.#loadMigrations();
        return this.#migrateToCore(this.migrations.length - 1);
    }
    async migrateToNothing() {
        await this.#loadMigrations();
        return this.#migrateToCore(-1);
    }
    async migrateTo(target: string) {
        await this.#loadMigrations();

        const targetIndex = this.migrations.findIndex(({ name }) => name === target);
        if (targetIndex === -1)
            throw new Error("Invalid target migration");

        return this.#migrateToCore(targetIndex);
    }

    #migrateToCore(targetIndex: number) {
        assert(targetIndex >= -1 && targetIndex < this.migrations.length);
        assert(Math.floor(targetIndex) === targetIndex);

        this.#db.transaction(() => {
            const executedMigrations = this.#db
                .prepare<[], IDbMigration>('SELECT * FROM "migrations" ORDER BY "name";')
                .all();

            for (let i = 0; i < executedMigrations.length; i++) {
                const expected = executedMigrations[i]!.name;
                const actual = this.migrations[i]?.name;

                if (expected !== actual) {
                    throw new Error("Executed migrations does not match defined migrations",
                        { cause: { expected, actual } });
                }
            }

            let currentIndex = executedMigrations.length - 1;
            if (currentIndex === targetIndex)
                return;
            if (currentIndex > targetIndex) {
                currentIndex++; // Invoke `down()` on the current migration
                targetIndex++;  // Don't Invoke `down()` on the last one
            }

            const [delta, methodName, statement] = currentIndex < targetIndex
                ? [1,  "up",   this.#db.prepare('INSERT INTO "migrations" ("name") VALUES (?);')] as const
                : [-1, "down", this.#db.prepare('DELETE FROM "migrations" WHERE "name" = ?;')] as const;

            do {
                currentIndex += delta;
                const migration = this.migrations[currentIndex];
                assert(migration != null);

                migration[methodName](this.#db);
                statement.run(migration.name);
                this.#logger.info('"%s" was successful migrated %s', migration.name, methodName);

            } while (currentIndex !== targetIndex);
        })();
    }
}
