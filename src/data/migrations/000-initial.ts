import { ISOTextSQL } from "../misc.ts";

import type { Database } from "better-sqlite3";
import type { IMigrationModule } from "../types.ts";

export default {
    up(database: Database) {
        database.exec(`\
            CREATE TABLE "guilds" (
                "id"         INTEGER PRIMARY KEY,
                "name"       TEXT NOT NULL,
                "config"     TEXT NOT NULL CHECK (json_valid("config")) DEFAULT ('{}'),
                "created_at" TEXT NOT NULL DEFAULT (${ISOTextSQL}),
                "updated_at" TEXT
            ) STRICT;
        `);
        database.exec(`\
            CREATE TABLE "users" (
                "id"         INTEGER PRIMARY KEY,
                "name"       TEXT NOT NULL,
                "config"     TEXT NOT NULL CHECK (json_valid("config")) DEFAULT ('{}'),
                "created_at" TEXT NOT NULL DEFAULT (${ISOTextSQL}),
                "updated_at" TEXT
            ) STRICT;
        `);
    },
    down(database: Database) {
        database.exec('DROP TABLE "users";');
        database.exec('DROP TABLE "guilds";');
    }
} satisfies IMigrationModule;
