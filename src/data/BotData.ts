import { GuildRepo, UserRepo } from "./repos/discord-item.ts";

import type { Database } from "better-sqlite3";

export class BotData {
    readonly users;
    readonly guilds;

    constructor(
        public readonly config: IBotConfig,
        public readonly database: Database
    ) {
        this.config = Object.freeze(this.config);
        this.users = new UserRepo(database);
        this.guilds = new GuildRepo(database);
    }
}

export interface IBotConfig {
    token: string;
}
