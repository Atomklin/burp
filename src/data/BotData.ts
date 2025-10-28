import { GuildRepo, UserRepo } from "./repos/discord-item.ts";

import type { Database } from "better-sqlite3";
import type { HexColorString, Snowflake } from "discord.js";

export class BotData {
    readonly users;
    readonly guilds;

    constructor(
        public readonly config: IBotConfig,
        public readonly database: Database
    ) {
        this.config = Object.freeze(this.config);
        this.users = new UserRepo(database);
        this.guilds = new GuildRepo(database, {
            embedColor: config.defaultEmbedColor,
            locale: config.defaultLocale,
        });
    }
}

export interface IBotConfig {
    /** Discord authorization token */
    token: string;
    /** The IDs of "Bot Operators" (i.e users who are allowed to use "dev" commands") */
    adminIds: ReadonlySet<Snowflake>;

    /** Default text-command prefix */
    defaultPrefix: string;
    /** Default locale for `i18n-js` */
    defaultLocale: string;
    /** Default color of a successful response embed */
    defaultEmbedColor: HexColorString;

    /** Max character width of a line in an embedded Discord "code block" before wrapping. */
    embedCodeBlockWidth: number;
}
