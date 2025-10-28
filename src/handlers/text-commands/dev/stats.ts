import { formatElapsedTime } from "../../../common/misc.ts";
import bot from "../../../data/Bot.ts";

import type { ITextCommandModule } from "../types.ts";

export default {
    name: ["stats", "status", "ping"],
    description: "text-command.stats.description",
    run(ctx) {
        const latency = bot.ws.ping;

        if (ctx.commandName === "ping")
            return ctx.sendI18nMessage("text-command.stats.pong", { latency });

        const msFormatter = new Intl.NumberFormat(ctx.config.locale, { style: "unit", unit: "millisecond" });
        const mbFormatter = new Intl.NumberFormat(ctx.config.locale, { style: "unit", unit: "megabyte" });
        const formatBytes = (bytes: number) => mbFormatter.format(bytes / 1e6);

        const memoryUsage = process.memoryUsage();
        const buffer = [
            "```",
            "Developer Statistics\n",
            "━".repeat(bot.data.config.embedCodeBlockWidth),
            "\n",
            formatEntry("Latency",       latency,                  msFormatter.format.bind(msFormatter)),
            formatEntry("Uptime",        process.uptime() * 1e3,   formatElapsedTime),
            formatEntry("RSS",           memoryUsage.rss,          formatBytes),
            formatEntry("Heap Total",    memoryUsage.heapTotal,    formatBytes),
            formatEntry("Heap Used",     memoryUsage.heapUsed,     formatBytes),
            formatEntry("External",      memoryUsage.external,     formatBytes),
            formatEntry("Array Buffers", memoryUsage.arrayBuffers, formatBytes),
            "```"
        ];

        return ctx.sendMessage(buffer.flat().join(""));
    },
} satisfies ITextCommandModule;

function formatEntry<T>(key: string, value: T, toString: (value: T) => string) {
    const maxWidth = bot.data.config.embedCodeBlockWidth;
    return [key, toString(value).padStart(maxWidth - key.length), "\n"];
}
