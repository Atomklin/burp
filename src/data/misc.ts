import pino from "pino";

import { initializeDatabase } from "./database.ts";

import type { Database }from "better-sqlite3";
import type { BaseLogger } from "pino";
/**
 * SQLite version of `Date.toISOString()`.
 * From: https://stackoverflow.com/questions/48478112/select-sqlite-date-values-in-iso-8601-format
 * */
export const ISOTextSQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

let logger;
/** Logger for unit-tests */
export function getUnitTestLogger(): BaseLogger {
    return logger ??= pino({
        level: "warn",
        serializers: {
            error: pino.stdSerializers.errWithCause,
            err:  pino.stdSerializers.errWithCause,
        },
        transport: {
            target: "pino-pretty",
            options: {
                ignore: "hostname,pid",
            }
        }
    });
}

let database;
/** Global test database for unit-tests */
export async function getOrCreateTestDatabase(): Promise<Database> {
    return database ??= await initializeDatabase(":memory:", getUnitTestLogger());
}
