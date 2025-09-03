import type { Message, OmitPartialGroupDMChannel } from "discord.js";

export interface ITextCommandModule {
    readonly name: string|string[];
    run(): Promise<unknown>;
}

export interface ITextCommandContext {
    message: OmitPartialGroupDMChannel<Message<true>>;
}
