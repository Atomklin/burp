import assert from "node:assert";
import { randomBytes } from "node:crypto";
import { runInNewContext } from "node:vm";

import type { RunningCodeInNewContextOptions } from "node:vm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = any; // type alias to avoid spamming `eslint-disable-next-line`

/**
 * Use property paths like `'a.b.c'` to get a nested value from an object.
 * Note: Does not support keys with dots in them.
 */
export function getPropValue<T>(object: Obj, prop: string|string[], defaultValue: T): T;
export function getPropValue<T>(object: Obj, prop: string|string[], defaultValue?: T): T|void;
export function getPropValue<T>(object: Obj, prop: string|string[], defaultValue?: T): T|void {
    if (object == null || !prop.length)
        return defaultValue;

    if (typeof prop === "string") {
        if (!prop.includes("."))
            return object[prop] ?? defaultValue;
        prop = prop.split(".");
    }

    let index = -1;
    while (++index < prop.length && (object = object[prop[index]!]) != null);
    return object == null ? defaultValue : object;
}

export function withSuffix(input: string, suffix: string) {
    return input.endsWith(suffix) ? input : input.concat(suffix);
}

/** Escapes any characters that have special meanings in regular expressions.
 * For example: `.*` (matches anything) => `\\.\\*` (matches the character
 * '.' and '*' in this exact order) */
export function sanitizeForRegExp(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertNotNull<T>(value: T|null|undefined) {
    assert(value != null);
    return value;
}

export function formatElapsedTime(elapsedMs: number) {
    if (!isFinite(elapsedMs))
        throw new Error(`"${elapsedMs}" is not a finite value`);

    const isNegative = elapsedMs < 0;
    if (isNegative)
        elapsedMs = -elapsedMs;

    let seconds = Math.floor(elapsedMs / 1e3);
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    const days = Math.floor(hours / 24);
    hours = hours % 24;

    const buffer: string[] = [
        toStr(hours, 2),   ":",
        toStr(minutes, 2), ":",
        toStr(seconds, 2)
    ];

    if (days > 0)
        buffer.unshift(toStr(days, 3), ":");
    if (isNegative)
        buffer.unshift("-");

    return buffer.join("");

    function toStr(number: number, maxLength: number) {
        return number.toString().padStart(maxLength, "0");
    }
}

/** Execute Javascript code without having to use the much discouraged `eval()`
 * Based on: https://github.com/hacksparrow/safe-eval/blob/master/index.js */
export function safeEval(
    code: string,
    context?: Record<string, unknown>,
    options?: RunningCodeInNewContextOptions
) {
    const newContext: Record<string, unknown> = Object.assign({}, context);
    const resultKey = "RESULT_" + randomBytes(8).toString("hex");
    newContext[resultKey] = {};

    const clearContext = `\
        void function() {
            Function = undefined;
            const keys = Object.getOwnPropertyNames(this).concat(["constructor"]);
            keys.forEach((key) => {
                const item = this[key];
                if (!item || typeof item.constructor !== "function")
                    return;

                this[key].constructor = undefined;
            });
        }();
    `;

    code = [clearContext, resultKey, "=", code].join("");
    runInNewContext(code, newContext, options);
    return newContext[resultKey];
}
