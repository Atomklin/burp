import "dotenv/config";

import { inspect } from "node:util";

import { getEnvStr } from "./common/env-utils.ts";
import bot from "./data/Bot.ts";
import { BotData } from "./data/BotData.ts";
import { importAndAddEventListeners } from "./handlers/importers.ts";

import type { IBotConfig } from "./data/BotData.ts";

async function main() {
    // Attach process logger
    const logger = bot.logger;

    process.on("worker", (worker) =>
        logger.debug({ threadId: worker.threadId }, "Worker Created"));
    process.on("warning", (warning) =>
        logger.warn(warning, "Process Wraning"));
    process.on("unhandledRejection", (reason, promise) =>
        logger.error({ reason, promise: inspect(promise) }, "Unhandled Rejection"));
    process.setUncaughtExceptionCaptureCallback((error) => {
        logger.fatal(error, "Uncaught Exception, exiting application");
        process.exit(1);
    });

    // Initialize bot
    const config: IBotConfig = {
        token: getEnvStr("TOKEN") ?? getEnvStr("DISCORD_TOKEN", true),
    };

    await importAndAddEventListeners(bot, bot.logger);
    const data = new BotData(config);

    await bot.initialize(data);
}

if (import.meta.main)
    main();
