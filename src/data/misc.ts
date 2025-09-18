/**
 * SQLite version of `Date.toISOString()`.
 * From: https://stackoverflow.com/questions/48478112/select-sqlite-date-values-in-iso-8601-format
 * */
export const ISOTextSQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
