import { EmbedBuilder, Message } from "discord.js";

import { assertNotNull } from "../../common/misc.ts";
import bot from "../../data/Bot.ts";

import type { BaseMessageOptions, ColorResolvable, OmitPartialGroupDMChannel } from "discord.js";
import type { TranslateOptions } from "../../common/i18n.ts";
import type { ITextCommandContext } from "../../data/types.ts";
import type { IMemberConfig } from "../../data/repos/discord-item.ts";

export class TextCommandContext implements ITextCommandContext {
    readonly #message;
    readonly #argsStr;

    constructor(
        public readonly config: IMemberConfig,
        public readonly prefix: string,
        public readonly commandName: string,
        args: string | undefined,
        message: OmitPartialGroupDMChannel<Message<true>>,
    ) {
        this.#message = message;
        this.#argsStr = args;
    }

    get channel() {
        return this.#message.channel;
    }
    get user() {
        return assertNotNull(this.#message.member);
    }

    get args() {
        return this.#argsStr?.trim().split(/\s+/);
    }
    get argv() {
        const argv = [this.prefix, this.commandName];
        return this.#argsStr ? argv.concat(assertNotNull(this.args)) : argv;
    }

    async sendMessage(content: string | string[]) {
        // TODO!!
        if (Array.isArray(content))
            throw new Error("Support for paginated embeds has not been implemented yet!");

        const embed = new EmbedBuilder()
            .setColor(this.config.embedColor)
            .setDescription(content);

        await this.#message.channel.send({ embeds: [embed] });
    }
    async sendI18nMessage(scope: string, options?: TranslateOptions) {
        await this.#message.channel.send(this.#makeI18nMessageOptions(scope, options));
    }
    async sendI18nError(scope: string, options?: TranslateOptions) {
        await this.#message.reply(this.#makeI18nMessageOptions(scope, options, "Red"));
    }

    #makeI18nMessageOptions(scope: string, options?: TranslateOptions, embedColor?: ColorResolvable) {
        const content = bot.i18n.translate(this.config.locale, scope, options);
        const embed = new EmbedBuilder()
            .setColor(embedColor ?? this.config.embedColor)
            .setDescription(content);

        return { embeds: [embed] } satisfies BaseMessageOptions;
    }
}
