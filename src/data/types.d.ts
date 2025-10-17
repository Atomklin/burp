import type { Database } from "better-sqlite3";
import type {
    GuildMember, GuildTextBasedChannel, PartialGroupDMChannel, PermissionsBitField
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

    /** The array containing the arguments of the invoked command. */
    argv: string[];
    /** Prefix used for the command. Also known as `argv[0]`. */
    prefix: string;
    /** Keyword used to invoke command. Also known as `argv[1]`. */
    commandName: string;
    /** A copy of the `argv` array that excludes {@link prefix} and {@link commandName}  */
    args?: string[];

    /** Send a `I18n` translated message using the preferred {@link locale}. */
    sendI18nMessage(scope: string, options: TranslateOptions): Promise<void>;
    /** Send a `I18n` translated error message using the preferred {@link locale}. */
    sendI18nError(scope: string, options: TranslateOptions): Promise<void>;
    /** Send a normal text message. If `content` is an array, it is sent as a
     * paginated embed, where each page corresponds to an element in the array. */
    sendMessage(content: string | string[]): Promise<void>;
}


export interface IMigrationModule {
    up(database: Database): void;
    down(database: Database): void;
}
