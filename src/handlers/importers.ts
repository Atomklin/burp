import { Client, Events, PermissionsBitField } from "discord.js";
import { basename, dirname, join } from "node:path";

import { importDirectory } from "../common/fs-utils.ts";

import type { BaseLogger } from "pino";
import type { IClientEventListenerModule } from "./client-events/types.ts";
import type { ITextCommand } from "../data/types.ts";
import type { ITextCommandModule } from "./text-commands/types.ts";

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

export function importAndAddTextCommands(collection: Map<string, ITextCommand>, logger: BaseLogger) {
    return importHandlersDir<ITextCommandModule>("text-commands", isValid, loadModule, logger);

    function isValid(module: ITextCommandModule) {
        return (typeof module.name === "string" || Array.isArray(module.name)) &&
            typeof module.run === "function";
    }
    function loadModule(module: ITextCommandModule, filePath: string) {
        // Extract the parent directory name as its category
        // (e.g "/path/to/command/file.js" => "command")
        const category = basename(dirname(filePath));
        const command: ITextCommand = {
            description: module.description,
            run: module.run.bind(module),
            category,
        };

        if (module.botPermission != null)
            command.botPermission = new PermissionsBitField(module.botPermission);
        if (module.userPermission != null)
            command.userPermission = new PermissionsBitField(module.userPermission);

        const names = Array.isArray(module.name) ? module.name : [module.name];

        for (const name of names) {
            if (collection.has(name)) {
                logger.warn('Skipping "%s" due to duplicate name : %s', filePath, name);
                continue;
            }
            collection.set(name, command);
        }
    }
}

async function importHandlersDir<T>(
    dir: "client-events" | "text-commands",
    isValid: (module: T) => boolean,
    loadModule: (module: T, path: string) => void,
    logger: BaseLogger
) {
    const dirPath = join(import.meta.dirname, dir);
    const maxDepth = dir === "client-events" ? 1 : undefined;
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
