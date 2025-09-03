import type { HexColorString } from "discord.js";

// A bunch of helper functions for getting some data from `process.env`

export function getEnvStr(envKey: string, required: true): string;
export function getEnvStr(envKey: string, required?: boolean): string | undefined;
export function getEnvStr(envKey: string, required?: boolean) {
    const value = process.env[envKey];
    if (required && value == null)
        throw new Error(`Missing "${envKey}" from process.env`);

    return value;
}

function getEnvWithParser<T>(
    envKey: string,
    parser: (value: string) => T | void,
    typeName: string,
    required?: boolean
) {
    const value = getEnvStr(envKey, required);
    if (value == null)
        return;

    const parsed = parser(value);
    if (required && parsed == null)
        throw new Error(`"${envKey}" from process.env, is not a valid ${typeName}`);

    return parsed;
}

export function getEnvNum(envKey: string, required: true): number;
export function getEnvNum(envKey: string, required?: boolean): number | undefined;
export function getEnvNum(envKey: string, required?: boolean) {
    return getEnvWithParser(envKey, tryParseInt, "number", required);

    function tryParseInt(input: string) {
        const value = parseFloat(input);
        return isFinite(value) ? value : undefined;
    }
}

export function getEnvHexColor(envKey: string, required: true): HexColorString;
export function getEnvHexColor(envKey: string, required?: boolean): HexColorString | undefined;
export function getEnvHexColor(envKey: string, required?: boolean) {
    return getEnvWithParser(envKey, tryParseHexColor, "hex color", required);

    function tryParseHexColor(input: string) {
        // From : https://github.com/regexhq/hex-color-regex/blob/master/index.js#L14
        return /^#([a-f0-9]{3,4}|[a-f0-9]{4}(?:[a-f0-9]{2}){1,2})\b$/i.test(input)
            ? input as HexColorString : undefined;
    }
}

/**
 * Converts the environment variable `process.env[envKey]` to a boolean.
 * If the variable is defined, it is checked against the regex `/t(?:rue)?|y(?:es)?|on/i`.
 * If it matches, `true` is returned; otherwise, `false` is returned.
 * If the variable is not set, the `defaultValue` is returned.
 *
 * @returns The boolean representation of `process.env[envKey]` or `defaultValue` if not set.
 */
export function getEnvBool(envKey: string, defaultValue: boolean): boolean;
export function getEnvBool(envKey: string, defaultValue?: boolean): boolean | undefined;
export function getEnvBool(envKey: string, defaultValue?: boolean) {
    const value = process.env[envKey];
    return value != null
        ? /^(?:t(?:rue)?|y(?:es)?|on)$/i.test(value)
        : defaultValue;
}

export function getEnvList(envKey: string, required: boolean, delimeter?: string): string[];
export function getEnvList(envKey: string, required?: boolean, delimeter?: string): string[] | undefined;
export function getEnvList(envKey: string, required?: boolean, delimeter = ",") {
    const value = getEnvStr(envKey, required);
    return value?.split(delimeter);
}
