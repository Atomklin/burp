import { EmbedBuilder, Message } from "discord.js";

import { assertNotNull } from "../../common/misc.ts";
import bot from "../../data/Bot.ts";

import type {
    APIEmbed, ColorResolvable, JSONEncodable, OmitPartialGroupDMChannel
} from "discord.js";
import type { TranslateOptions } from "../../common/i18n.ts";
import type { ITextCommandContext } from "../../data/types.ts";
import type { IMemberConfig } from "../../data/repos/discord-item.ts";

export class TextCommandContext implements ITextCommandContext {
    readonly #argsOffset;
    readonly #message;
    #handled;

    constructor(
        public readonly config: IMemberConfig,
        public readonly prefix: string,
        public readonly commandName: string,
        argsOffset: number,
        message: OmitPartialGroupDMChannel<Message<true>>,
    ) {
        this.#handled = false;
        this.#message = message;
        this.#argsOffset = argsOffset;
    }

    /** Indicates whether a response has already been sent to the command invoker. */
    get handled() {
        return this.#handled;
    }

    get channel() {
        return this.#message.channel;
    }
    get user() {
        return assertNotNull(this.#message.member);
    }
    get args() {
        const content = this.#message.content.slice(this.#argsOffset).trim();
        return content.length ? content.split(/\s+/) : undefined;
    }

    translate(scope: string, options?: TranslateOptions): string {
        return bot.i18n.translate(this.config.locale, scope, options);
    }

    sendI18nMessage(scope: string, options?: TranslateOptions) {
        return this.#sendCore(this.translate(scope, options));
    }
    sendI18nError(scope: string, options?: TranslateOptions) {
        return this.#sendCore(this.translate(scope, options), "Red", this.#message);
    }
    sendMessage(content: string | JSONEncodable<APIEmbed> | APIEmbed) {
        return this.#sendCore(content);
    }

    async #sendCore(
        content: string | JSONEncodable<APIEmbed> | APIEmbed,
        embedColor?: ColorResolvable,
        replyTo?: Message
    ) {
        const embed = typeof content === "string"
            ? new EmbedBuilder()
                .setColor(embedColor ?? this.config.embedColor)
                .setDescription(content)
            : content;

        await this.channel.send({
            embeds: [embed],
            reply: replyTo && {
                messageReference: replyTo,
                failIfNotExists: bot.options.failIfNotExists,
            },
        });
        this.#handled = true;
    }
}
