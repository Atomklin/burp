import { Client, Events, GatewayIntentBits, RESTEvents } from "discord.js";
import assert from "node:assert";
import { once } from "node:events";
import pino from "pino";

import type { BaseLogger } from "pino";
import type { BotData } from "./BotData.ts";

export class Bot extends Client<true> {
    readonly logger: BaseLogger;

    #data?: BotData;

    constructor(logger?: BaseLogger) {
        super({
            intents: [
                // Privileged Intents (May not apply to larger bots)
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                // Required for VC
                GatewayIntentBits.GuildVoiceStates
            ],
        });

        this.logger = logger ?? pino({
            serializers: {
                error: pino.stdSerializers.errWithCause,
                err: pino.stdSerializers.errWithCause,
            },
        });

        const onDebug = this.logger.debug.bind(this.logger);

        // Main Events
        this.on(Events.Debug, onDebug);
        this.on(Events.Error, (error) =>
            this.logger.error(error, "Error from client"));
        this.on(Events.ShardError, (error, shardId) =>
            this.logger.error(error, "Error from shard #%d", shardId));
        this.on(Events.Warn, (warning) =>
            this.logger.warn({ warning }, "Warning from client"));

        // REST events
        this.rest.on(RESTEvents.Debug, onDebug);
        this.rest.on(RESTEvents.InvalidRequestWarning, (invalidReq) =>
            this.logger.error(invalidReq, "Invalid REST request"));
        this.rest.on(RESTEvents.RateLimited, (info) =>
            this.logger.error(info, "REST rate-limited"));
    }

    get data() {
        assert(this.#data != null);
        return this.#data;
    }

    async initialize(data: BotData) {
        assert(this.#data == null, '"Bot" already initialized');
        this.#data = data;

        await Promise.all([
            once(this, Events.ClientReady),
            this.login(data.config.token)
        ]);
    }
}

export default new Bot();
