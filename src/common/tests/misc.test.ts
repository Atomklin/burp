import { randomUUID } from "node:crypto";
import test, { describe } from "node:test";

import { getPropValue, sanitizeForRegExp, withSuffix } from "../misc.ts";

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
] as [string, string][]) {
    test(`\`sanitizeForRegExp("${input}")\` should return "${expected}"`, (ctx) => {
        // Act & Assert
        ctx.assert.deepEqual(sanitizeForRegExp(input), expected);
    });
}
