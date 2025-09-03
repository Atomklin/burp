import { Client, Events } from "discord.js";
import { join } from "node:path";

import { importDirectory } from "../common/fs-utils.ts";

import type { BaseLogger } from "pino";
import type { IClientEventListenerModule } from "./client-events/types.ts";

export function importAndAddEventListeners(client: Client, logger: BaseLogger) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Module = IClientEventListenerModule<any>;
    const validEvents = new Set(Object.values(Events));

    return importHandlersDir<Module>("client-events", isValid,
        (module) => client[module.once ? "once" : "on"](module.name, module.run), logger);

    function isValid(module: Module) {
        return validEvents.has(module.name) &&
            (typeof module.once == "boolean" || module.once == null) &&
            typeof module.run === "function";
    }
}

async function importHandlersDir<T>(
    dir: "client-events",
    isValid: (module: T) => boolean,
    loadModule: (module: T, path: string) => void,
    logger: BaseLogger
) {
    const dirPath = join(import.meta.dirname, dir);
    const maxDepth = dir === "client-events" ? 0 : undefined;
    const modules = importDirectory<{ default?: T }>(dirPath, maxDepth);

    let totalImported = 0;

    for await (const { module, filePath } of modules) {
        if (module.default == null || !isValid(module.default)) {
            logger.warn('Skipping "%s" due to invalid exports', filePath);
            continue;
        }

        loadModule(module.default, filePath);
        logger.debug('Loaded "%s" successfully', filePath);
        totalImported++;
    }

    logger.info('Loaded %d modules from "%s"', totalImported, dir);
}
