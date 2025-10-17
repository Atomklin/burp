import assert from "node:assert";

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
