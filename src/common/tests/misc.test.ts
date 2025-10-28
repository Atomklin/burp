import { randomUUID } from "node:crypto";
import test, { describe } from "node:test";

import {
    formatElapsedTime, getPropValue, safeEval, sanitizeForRegExp, withSuffix
} from "../misc.ts";

describe("`getPropValue()` works", () => {
    // Arrange
    for (const [obj, prop, caseStr] of [
        [null,                    "",      "`obj` is `null`"],
        [undefined,               "",      "`obj` is `undefined`"],
        [{},                      "prop",  "`prop` doesn't exist on the `obj`"],
        [{ a: { } },              "a.b.c", "deep `prop` doesn't exist on the `obj`"],
        [{ a: { b: null } },      "a.b",   "the prop value is `null`"],
        [{ a: { b: undefined } }, "a.b",   "the prop value is `undefined`"],
    ] as const)
    {
        test(`should return \`defaultValue\` when ${caseStr}`, (ctx) => {
            const defaultValue = randomUUID();
            // Act
            const result = getPropValue(obj, prop, defaultValue);
            // Assert
            ctx.assert.equal(result, defaultValue);
        });
    }

    // Arrange
    const TestObject = Object.freeze({
        a: 1234n,
        b: { c: { } },
        d: { e: { f: "Hello" } },
        g: { h: { i: { j: { k: { l: { m: { n: { o: { p: { q: { r: { s: 1234 }}}}}}}}}}}}
    });
    test("should return the expected value for a valid prop", (ctx) => {
        for (const [prop, expected] of [
            ["a",                         1234n],
            ["b",                         { c: {} }],
            ["b.c",                       {}],
            ["d.e.f",                     "Hello"],
            ["g.h.i.j.k.l.m.n.o.p.q.r.s", 1234],
        ] as const)
        {
            // Act
            const result = getPropValue(TestObject, prop, undefined);
            // Assert
            ctx.assert.deepEqual(result, expected);
        }
    });
});

test("`withSuffix()` works", (ctx) => {
    // Act & Assert #1
    ctx.assert.equal(withSuffix("without", "suffix"), "withoutsuffix");
    // Act & Assert #2
    ctx.assert.equal(withSuffix("withsuffix", "suffix"), "withsuffix");
});

describe("`sanitizeForRegExp()` works", () => {
    // Arrange
    for (const [input, expected] of [
        ["",   ""],     ["abcdef01234", "abcdef01234" ],
        [".",  "\\." ], ["*",  "\\*" ],
        ["+",  "\\+" ], ["?",  "\\?" ],
        ["^",  "\\^" ], ["$",  "\\$" ],
        ["{",  "\\{" ], ["}",  "\\}" ],
        ["(",  "\\(" ], [")",  "\\)" ],
        ["[",  "\\[" ], ["]",  "\\]" ],
        ["|",  "\\|" ], ["\\", "\\\\" ],
        [".*", "\\.\\*" ],
    ] satisfies [string, string][]) {
        test(`\`sanitizeForRegExp("${input}")\` should return "${expected}"`, (ctx) => {
            // Act & Assert
            ctx.assert.deepEqual(sanitizeForRegExp(input), expected);
        });
    }
});

describe("`formatElapsedTime()` works", () => {
    // Arrange
    for (const [input, expected] of [
        [0,                       "00:00:00"],
        [1e3,                     "00:00:01"],
        [60 * 1e3,                "00:01:00"],
        [60 * 60 * 1e3,           "01:00:00"],
        [24 * 60 * 60 * 1e3,      "001:00:00:00"],
        [3.1535999e+10,           "364:23:59:59"],
        [-3.1535999e+10,          "-364:23:59:59"],
        [Number.MAX_SAFE_INTEGER, "104249991:08:59:00"],
        [Number.MIN_SAFE_INTEGER, "-104249991:08:59:00"],
    ] satisfies [number, string][]
    ) {
        test(`\`formatElapsedTime(${input})\` should return ${expected}`, (ctx) => {
            // Act & Assert
            ctx.assert.deepEqual(formatElapsedTime(input), expected);
        });
    }

    // Arrange
    test("`formatElapsedTime(input)` should throw, when `input` is a non-finite number", (ctx) => {
        for (const input of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            // Act & Assert
            ctx.assert.throws(() => formatElapsedTime(input), /not a finite value/);
        }
    });
});

// From : https://github.com/hacksparrow/safe-eval/blob/master/test/test.js
describe("`safeEval()` works", () => {
    test("should not have access to Node.js objects", (ctx) => {
        const code = "process";
        ctx.assert.throws(() => safeEval(code));
    });

    test("should not have access to Node.js objects (CWE-265)", (ctx) => {
        const code = "this.constructor.constructor('return process')()";
        ctx.assert.throws(() => safeEval(code));
    });
});
