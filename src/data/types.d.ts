import type { Database } from "better-sqlite3";
import type {
    APIEmbed,
    GuildMember, GuildTextBasedChannel, JSONEncodable, PartialGroupDMChannel, PermissionsBitField
} from "discord.js";
import type { TranslateOptions } from "../common/i18n.ts";
import type { IMemberConfig } from "./repos/discord-item.ts";

export interface ITextCommand {
    /** `I18n` translation `scope` of the command's description. */
    description?: string;
    /** The command's category */
    category: string;
    /** Permissions the bot requires to run this command. If `undefined`,
     * assume just the basics is required: `SEND_MESSAGES`. */
    botPermission?: PermissionsBitField;
    /** Permissions the  user requires to use this command. If `undefined`,
     * assume just the basics is required: `SEND_MESSAGES`. */
    userPermission?: PermissionsBitField;
    run(ctx: ITextCommandContext): Promise<unknown>;
}

// For now, all command invocations come from guilds.
export interface ITextCommandContext {
    /** The channel the command was invoked from. */
    channel: Exclude<GuildTextBasedChannel, PartialGroupDMChannel>;
    /** The user that invoked the command. */
    user: GuildMember;
    /** Preferred config of the {@link user}. */
    config: IMemberConfig;

    /** Prefix used for the command. */
    prefix: string;
    /** Keyword used to invoke command. */
    commandName: string;
    /** The array containing the arguments of the invoked command. */
    args?: string[];

    /** Returns the `I18n` translated scope using the preferred {@link locale} */
    translate(scope: string, options?: TranslateOptions): string;

    /** Send a `I18n` translated message using the preferred {@link locale}. */
    sendI18nMessage(scope: string, options?: TranslateOptions): Promise<void>;
    /** Send a `I18n` translated error message using the preferred {@link locale}. */
    sendI18nError(scope: string, options?: TranslateOptions): Promise<void>;
    /** Send a normal text message or custom embed. */
    sendMessage(content: string | JSONEncodable<APIEmbed> | APIEmbed): Promise<void>;
}

export interface IMigrationModule {
    up(database: Database): void;
    down(database: Database): void;
}
