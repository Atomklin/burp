import { Client, Events, GatewayIntentBits, RESTEvents } from "discord.js";
import assert from "node:assert";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";

import { I18n } from "../common/i18n.ts";

import type { BaseLogger } from "pino";
import type { BotData } from "./BotData.ts";
import type { ITextCommand } from "./types.ts";

export class Bot extends Client<true> {
    readonly textCommands;

    readonly logger: BaseLogger;
    readonly resourceDir;
    readonly i18n;
    appDir;

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

        this.textCommands = new Map<string, ITextCommand>();

        this.resourceDir = join(import.meta.dirname, "../../res");
        this.appDir = join(import.meta.dirname, "../../.bot");

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

        // I18n
        this.i18n = new I18n({
            getLocaleDict: (locale) => {
                const jsonPath = join(this.resourceDir, `./locales/${locale}.json`);
                try {
                    const jsonData = readFileSync(jsonPath).toString("utf8");
                    this.logger.debug('Loaded "%s" successfully', jsonPath);
                    return JSON.parse(jsonData);

                } catch (error: unknown) {
                    if (!(error instanceof Error))
                        throw error; // ??

                    this.logger.error(error, 'Failed to load "%s"', jsonPath);
                    return {};
                }
            }
        });
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

        this.logger.info('"Bot" initialized');
    }
}

export default new Bot();
