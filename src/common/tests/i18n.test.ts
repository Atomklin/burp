import test, { describe } from "node:test";

import { I18n } from "../i18n.ts";

import type { TranslateOptions } from "../i18n.ts";

describe("`I18n` works", () => {
    // Arrange
    for (const [action, caseStr] of [
        [(i18n) => i18n.translate("en", "does.not.exist"),  "missing message and `messageFallback`"],
        [(i18n) => i18n.translate("en", "foo.bar"),         "message is not a string"],
        [(i18n) => i18n.interpolate("This is {{missing}}"),
            "missing interpolate prop and `interpolatePropFallback`"],
    ] satisfies [(i18n: I18n) => void, string][])
    {
        test(`should throw when ${caseStr}`, (ctx) => {
            const i18n = new I18n({ getLocaleDict: () => ({ foo: { bar: {} }}) });
            i18n.config.interpolatePropFallback = undefined;
            i18n.config.messageFallback = undefined;
            // Act & Assert
            ctx.assert.throws(() => action(i18n));
        });
    }

    test("`I18n.translate()` works", (ctx) => {
        // Arrange
        const TestDict = {
            a: { b: { c: { d: { e: { f: "Deep String" }}}}},
            plural: {
                zero:  "Nothing",
                one:   "One",
                other: "Other",
            },
            interpol: {
                str: "Hello there, I'm {{name}}",
                int: "I am {{age}} years old",
            }
        };
        const i18n = new I18n({
            getLocaleDict: () => TestDict,
            messageFallback: "(FALLBACK)"
        });

        for (const [scope, options, expected] of [
            ["",               {},               "(FALLBACK)"],
            ["does.not.exist", {},               "(FALLBACK)"],
            ["a.b.c.d.e.f",    {},               "Deep String"],
            ["plural",         { count: 0 },     "Nothing"],
            ["plural.zero",    {},               "Nothing"],
            ["plural",         { count: 1 },     "One"],
            ["plural.one",     {},               "One"],
            ["plural",         { count: 2 },     "Other"],
            ["plural.other",   {},               "Other"],
            ["plural",         { count: 1000 },  "Other"],
            ["interpol.str",   { name: "John" }, "Hello there, I'm John"],
            ["interpol.int",   { age: 25 },      "I am 25 years old"],
            ["interpol",       {},               "(FALLBACK)"],
            ["interpol",       { count: 0 },     "(FALLBACK)"],
        ] satisfies [string, TranslateOptions, string][])
        {
            // Act #1
            const result = i18n.translate("en", scope, options);
            // Assert #2
            ctx.assert.deepEqual(result, expected);
        }

        // Act #2 Even fallback string gets interpolated
        i18n.config.messageFallback = "This is an interpolated {{typeStr}}. With {{total}} characters";
        const result = i18n.translate("en", "does.not.exist", { typeStr: "string", total: 50 });
        // Assert #2
        const expected = "This is an interpolated string. With 50 characters";
        ctx.assert.deepEqual(result, expected);
    });

    test("`I18n.interpolate()` works", (ctx) => {
        // Arrange
        const i18n = new I18n({
            interpolatePropFallback: "(FALLBACK)",
            getLocaleDict: () => ({}),
        });

        // Act
        const message = "abcdefghigklmnopqrstuvwxyz 0123456789 {{number}} {{string}}{{string}}. {{unknown}}";
        const result = i18n.interpolate(message, {
            string: "word\n\n",
            number: 1_000.1
        });

        // Assert
        const expected = "abcdefghigklmnopqrstuvwxyz 0123456789 1000.1 word\n\nword\n\n. (FALLBACK)";
        ctx.assert.deepEqual(result, expected);
    });
});
