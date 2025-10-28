import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { inspect } from "node:util";

import {
    getEnvBool, getEnvHexColor, getEnvList, getEnvNum, getEnvStr
} from "./common/env-utils.ts";
import bot from "./data/Bot.ts";
import { BotData } from "./data/BotData.ts";
import { initializeDatabase } from "./data/database.ts";
import { importAndAddEventListeners, importAndAddTextCommands } from "./handlers/importers.ts";

import type { IBotConfig } from "./data/BotData.ts";

async function main() {
    // Attach process logger
    const logger = bot.logger;

    process.on("worker", (worker) =>
        logger.debug({ threadId: worker.threadId }, "Worker Created"));
    process.on("warning", (warning) =>
        logger.warn(warning, "Process Wraning"));
    process.on("unhandledRejection", (reason, promise) =>
        logger.error("Unhandled Rejection: %s", inspect(promise)));
    process.setUncaughtExceptionCaptureCallback((error) => {
        logger.fatal(error, "Uncaught Exception, exiting application");
        process.exit(1);
    });

    // Preload locales
    if (!existsSync(bot.resourceDir))
        throw new Error("Failed to load resource directory");

    if (!getEnvBool("LAZY_LOAD_LOCALES")) {
        bot.i18n.getOrLoadLocaleDict("en");
    }

    // Initialize bot
    if (!existsSync(bot.appDir))
        await mkdir(bot.appDir);

    const config: IBotConfig = {
        token: getEnvStr("TOKEN") ?? getEnvStr("DISCORD_TOKEN", true),
        adminIds: new Set(getEnvList("ADMIN_IDS")),
        defaultPrefix: getEnvStr("DEFAULT_PREFIX", true),
        defaultLocale: getEnvStr("DEFAULT_LOCALE") ?? "en",
        defaultEmbedColor: getEnvHexColor("DEFAULT_EMBED_COLOR") ?? "#5865F2",
        embedCodeBlockWidth: getEnvNum("EMBED_CODE_BLOCK_WIDTH") ?? 56,
    };

    await importAndAddEventListeners(bot, bot.logger);
    await importAndAddTextCommands(bot.textCommands, bot.logger);
    const database = await initializeDatabase(join(bot.appDir, "database.db"), bot.logger);
    const data = new BotData(config, database);

    await bot.initialize(data);
}

if (import.meta.main)
    main();
