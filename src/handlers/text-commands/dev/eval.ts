import * as discord from "discord.js";
import { inspect } from "node:util";
import { isPromise } from "node:util/types";

import { safeEval } from "../../../common/misc.ts";
import bot from "../../../data/Bot.ts";

import type { ITextCommandModule } from "../types.ts";

export default {
    name: ["eval", "evaluate", "run"],
    description: "text-command.eval.description",
    async run(ctx) {
        const args = ctx.args;
        if (args == null || args.length === 0)
            return ctx.sendI18nError("text-command.eval.argument-missing");

        const isSilent = removeElem(args, "--silent");
        const isAsync = removeElem(args, "--async");

        let result;
        let embedColor = ctx.config.embedColor;
        let embedTitle = "text-command.eval.eval-successful";

        // Remove code block quotes (```)
        let code = args.join(" ").replace(/```(?:js)?/g, "");
        if (isAsync)
            code = `(async() => {\n${code}\n})();`;

        try {
            // To be expanded
            const context = {
                discord: discord,
                i18n: bot.i18n,
            };

            result = safeEval(code, context);
            if (isPromise(result))
                result = await result;
            if (result instanceof Error)
                throw result;
            if (isSilent)
                return;

        } catch (error: unknown) {
            if (isSilent)
                return;

            result = error;
            embedColor = "Red";
            embedTitle = "text-command.eval.eval-failed";
        }

        // Sanitize result
        let resultStr = inspect(result, false, 0, false)
            .replace(new RegExp(bot.token, "g"), "")
            .replace(/at\s+([^\s]+)\s+\(file[^)]+\)/gm, "at $1 (bot:internal)") // Sanitize stack trace
            .replace(/`/g, `\`${String.fromCharCode(8203)}`)
            .replace(/@/g, `@${String.fromCharCode(8203)}`);

        // (Max description - code block syntax ("```js\n" + "```"));
        const maxSize = (4096 - 9);
        let suffx = "";

        if (resultStr.length > maxSize) {
            suffx = ctx.translate("text-command.eval.eval-max-characters");
            resultStr = resultStr.slice(0, maxSize - suffx.length);
        }

        const buffer = ["```js\n", resultStr, suffx, "```"];
        const embed = new discord.EmbedBuilder()
            .setTitle(ctx.translate(embedTitle))
            .setDescription(buffer.join(""))
            .setColor(embedColor);

        return ctx.sendMessage(embed);
    },
} satisfies ITextCommandModule;

/** @returns whether the `elem` was successfully removed from the array */
function removeElem<T>(array: T[], elem: T) {
    const index = array.indexOf(elem);
    if (index !== -1) {
        array.splice(index, 1);
        return true;
    }

    return false;
}
