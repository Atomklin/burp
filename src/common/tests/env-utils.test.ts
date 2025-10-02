import { test } from "node:test";

import { getEnvBool, getEnvHexColor, getEnvList, getEnvNum, getEnvStr } from "../env-utils.ts";

for (const [funcName, func, input, expected] of [
    [getEnvStr.name, getEnvStr, undefined, undefined],
    [getEnvStr.name, getEnvStr, "",             "" ],
    [getEnvStr.name, getEnvStr, "a str-value ", "a str-value " ],
    [getEnvStr.name, getEnvStr, "1234",         "1234" ],
    [getEnvNum.name, getEnvNum, undefined,      undefined ],
    [getEnvNum.name, getEnvNum, "1234",         1234 ],
    [getEnvNum.name, getEnvNum, "not-a-number", undefined  ],
    [getEnvNum.name, getEnvNum, Number.POSITIVE_INFINITY.toString(), undefined  ],
    [getEnvNum.name, getEnvNum, Number.MAX_SAFE_INTEGER.toString(),  Number.MAX_SAFE_INTEGER ],
    [getEnvNum.name, getEnvNum, Number.MIN_SAFE_INTEGER.toString(),  Number.MIN_SAFE_INTEGER ],
    [getEnvNum.name, getEnvNum, Number.EPSILON.toString(),           Number.EPSILON  ],
    [getEnvBool.name, getEnvBool, undefined,  undefined ],
    [getEnvBool.name, getEnvBool, "tRue",     true ],
    [getEnvBool.name, getEnvBool, "t",        true ],
    [getEnvBool.name, getEnvBool, "Y",        true ],
    [getEnvBool.name, getEnvBool, "yeS",      true ],
    [getEnvBool.name, getEnvBool, "oN",       true ],
    [getEnvBool.name, getEnvBool, "not-true", false ],
    [getEnvBool.name, getEnvBool, "maybe",    false ],
    [getEnvHexColor.name, getEnvHexColor, undefined,   undefined ],
    [getEnvHexColor.name, getEnvHexColor, "#afebe3", "#afebe3" ],
    [getEnvHexColor.name, getEnvHexColor, "afebe3",    undefined ],
    [getEnvHexColor.name, getEnvHexColor, "#AFEBE3", "#AFEBE3" ],
    [getEnvHexColor.name, getEnvHexColor, "AFEBE3",     undefined ],
    [getEnvList.name, getEnvList, undefined, undefined ],
    [getEnvList.name, getEnvList, "1,3,2,4", ["1","3","2","4"] ],
    [getEnvList.name, getEnvList, "4,     ", ["4","     "] ],
    [getEnvList.name, getEnvList, ",string", ["","string"] ],
] satisfies [string, (envKey: string) => unknown, string|undefined, unknown][])
{
    test(`when \`process.env[envKey] = ${input};\` \`${funcName}(envKey)\` should return ${expected}`, (ctx) => {
        // Arrange
        const envKey = "ENV_TEST_VAR";
        delete process.env[envKey];
        if (input !== undefined)
            process.env[envKey] = input;

        // Act & Assert
        ctx.assert.deepEqual(func(envKey), expected);
    });
}

for (const [funcName, func, input, expectedMsg] of [
    [getEnvStr.name,      getEnvStr,      undefined, "Missing"],
    [getEnvNum.name,      getEnvNum,      undefined, "Missing"],
    [getEnvList.name,     getEnvList,     undefined, "Missing"],
    [getEnvHexColor.name, getEnvHexColor, undefined, "Missing"],
    [getEnvNum.name,      getEnvNum,      "not-a-number", "not a valid number"],
    [getEnvNum.name,      getEnvNum,      Number.POSITIVE_INFINITY.toString(), "not a valid number"],
    [getEnvHexColor.name, getEnvHexColor, "not-valid", "not a valid hex color"],
    [getEnvHexColor.name, getEnvHexColor, "afebe3",    "not a valid hex color"],
    [getEnvHexColor.name, getEnvHexColor, "AFEBE3",    "not a valid hex color"],
] satisfies [string, (envKey: string, required: boolean) => unknown, string|undefined, string][])
{
    test(`\`${funcName}(envKey, true)\` should throw if \`process.env[envKey]\` is undefined / invalid`, (ctx) => {
        // Arrange
        const envKey = "ENV_TEST_INVALID_VALUE";
        delete process.env[envKey];
        if (input !== undefined)
            process.env[envKey] = input;

        // Act & Assert
        ctx.assert.throws(() => func(envKey, true),
            { message: new RegExp(expectedMsg) });
    });
}
