import type { ClientEvents } from "discord.js";

export interface IClientEventListenerModule<Event extends keyof ClientEvents> {
    name: Event;
    once?: boolean;
    run(...args: ClientEvents[Event]): Promise<unknown>;
}
