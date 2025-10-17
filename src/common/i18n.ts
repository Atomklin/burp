import assert from "node:assert";

import { getPropValue, withSuffix } from "./misc.ts";

interface LocaleDict {
    [key: string]: string | LocaleDict;
}
interface I18nConfig {
    /** Fallback string to use when no message is found for the given
     * `locale` and `scope`. If set to `undefined`, an `AssertionError`
     *  will be thrown instead. */
    messageFallback?: string;
    /** Fallback string to use when a placeholder `{{key}}` in a message
     * cannot be resolved from the provided `options`. If set to `undefined`,
     * an `AssertionError` will be thrown instead. */
    interpolatePropFallback?: string;
    getLocaleDict: (locale: Locale) => LocaleDict;
}

export type Locale = (typeof SupportedLocales)[number];
export interface TranslateOptions {
    count?: number;
    [option: string]: string | number | undefined;
}

// to be expanded
const SupportedLocales = ["en"] as const;
const SpecialCountSuffix = [".zero", ".one", ".other"];

/** Simple translation module with lazyloading capabilities */
export class I18n {
    readonly #globalDict;
    readonly #memoizedProps;
    readonly config;

    constructor(config: I18nConfig) {
        this.#globalDict = new Map<Locale, LocaleDict>();
        this.#memoizedProps = new Map<string, string[]>();
        this.config = config;
    }

    getOrLoadLocaleDict(locale: Locale) {
        let dict = this.#globalDict.get(locale);
        if (dict == null) {
            dict = this.config.getLocaleDict(locale);
            this.#globalDict.set(locale, dict);
        }
        return dict;
    }

    clearCache(full?: boolean) {
        this.#memoizedProps.clear();
        if (full)
            this.#globalDict.clear();
    }

    /**
     * Translates a message string for the given `locale` and `scope`.
     *
     * - Looks up the message in the locale dictionary, loading it if needed.
     * - If a `count` option is provided, the `scope` is suffixed with a pluralization key
     *   (e.g. `.zero`, `.one`, `.other`) before lookup.
     * - Falls back to `config.messageFallback` if no message is found; otherwise throws.
     * - Interpolates placeholders of the form `{{key}}` using values from `options`.
     *
     * @param scope The dot-separated path identifying the message in the locale dictionary.
     * @param options Optional values for pluralization (`count`) and interpolation keys.
     */
    translate(locale: Locale | string, scope: string, options?: TranslateOptions) {
        if (!isSupportedLocale(locale))
            throw new Error(`"${locale}" is not a supported locale`);

        const count = options?.count ?? -1;
        if (count >= 0 && Math.floor(count) === count)
            scope = withSuffix(scope, SpecialCountSuffix[count] ?? ".other");

        const dict = this.getOrLoadLocaleDict(locale);
        const message = this.#getPropValue(dict, scope, this.config.messageFallback);
        assert(message != null, 'locale "message" missing');

        return this.interpolate(message, options);
    }

    /**
     * Replaces placeholder expressions in a message string with values from `options`.
     *
     * - Placeholders use the format `{{key}}`.
     * - If a key exists in `options`, its value is substituted. Otherwise,
     *   `config.interpolatePropFallback` is used instead.
     * - If neither a value nor fallback is available, an `AssertionError` is thrown.
     *
     * @param message The message string containing interpolation placeholders.
     * @param options Key/value pairs used to replace placeholders in the message.
     */
    interpolate(message: string, options: TranslateOptions = {}) {
        const fallback = this.config.interpolatePropFallback;
        return message.replace(/\{\{\s?([a-zA-Z0-9]+)\s?\}\}/g, replacer);

        function replacer(_: string, key: string) {
            const value = options[key]?.toString() ?? fallback;
            assert(value != null, "interpolator prop missing");
            return value;
        }
    }

    /** Same as `getPropValue()` but with memoized `prop` to `propArray` conversion  */
    #getPropValue(object: unknown, prop: string, defaultValue?: string) {
        let propArray = this.#memoizedProps.get(prop);
        if (propArray == null) {
            propArray = prop.split(".");
            this.#memoizedProps.set(prop, propArray);
        }
        const result = getPropValue(object, propArray, defaultValue);
        return typeof result === "string" ? result : defaultValue;
    }
}

export function isSupportedLocale(locale: string): locale is Locale {
    return (SupportedLocales as unknown as string[]).includes(locale);
}

export function joinArray(array: string[], locale: string, type: Intl.ListFormatType) {
    const formatter = new Intl.ListFormat(locale, { type });
    return formatter.format(array);
}
