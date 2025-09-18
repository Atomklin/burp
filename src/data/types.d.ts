import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import type { Database } from "better-sqlite3";

export interface ITextCommandModule {
    readonly name: string|string[];
    run(): Promise<unknown>;
}

export interface ITextCommandContext {
    message: OmitPartialGroupDMChannel<Message<true>>;
}


export interface IMigrationModule {
    up(database: Database): void;
    down(database: Database): void;
}
