import pino from "pino";

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
        }
    });
}
