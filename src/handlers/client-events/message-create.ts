import { Events, inlineCode, PermissionFlagsBits } from "discord.js";

import { formatList } from "../../common/i18n.ts";
import { sanitizeForRegExp } from "../../common/misc.ts";
import bot from "../../data/Bot.ts";
import { TextCommandContext } from "../text-commands/common.ts";

import type { PermissionsBitField } from "discord.js";
import type { IClientEventListenerModule } from "./types.ts";

let parser: RegExp;

export default {
    name: Events.MessageCreate,
    async run(message) {
        // Don't handle "robo-messages"
        if (message.author.bot || message.system ||
            message.webhookId != null || message.applicationId != null)
            return;

        // Note: `message.member` is only null, if the message comes from a guild where
        // the author is no longer a member. Perhaps unnecessary?
        if (!message.inGuild() || !message.guild.available ||
            message.guild.members.me == null || message.member == null)
            return; // TODO: handle direct messages

        // Don't handle if we can't reply to it
        const botPermissions = message.channel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.SendMessages))
            return;

        if (parser == null) {
            const prefix = sanitizeForRegExp(bot.data.config.defaultPrefix);
            // First capture group = prefix used to invoke the command (i.e @bot / `defaultPrefix`)
            // Second capture group = the name of the command
            // Third capture group = the possible arguments to the command
            parser = new RegExp(`^(<@!?${bot.user.id}>|${prefix})\\s*([a-zA-Z0-9]+)`);
        }

        const [match, cmdPrefix, cmdName] = parser.exec(message.content) ?? [];
        if (match == null || cmdPrefix == null || cmdName == null)
            return;

        const command = bot.textCommands.get(cmdName);
        const context = new TextCommandContext(
            bot.data.guilds.getMemberConfig(message.author.id, message.guildId),
            cmdPrefix, cmdName, match.length, message
        );

        try {
            await message.channel.sendTyping();

            // Check if a non-dev is trying to run a "dev" command, return a
            // "command is missing" for security.
            const adminIds = bot.data.config.adminIds;
            if (command == null || (command.category === "dev" && !adminIds.has(message.author.id)))
                return context.sendI18nError("client-event.command-missing", { cmdName });

            // Check if the user has all the required permissions, then also for the bot
            const userPermissions = message.channel.permissionsFor(context.user);
            if (await maybeSendMissingPermsError("user", userPermissions, command.userPermission) ||
                await maybeSendMissingPermsError("bot", botPermissions, command.botPermission))
                return;

            await command.run(context);

        } catch (error: unknown) {
            if (!(error instanceof Error))
                throw error; // ??

            bot.logger.error(error, 'Failed to run text-command: "%s"', cmdName);
            if (!context.handled)
                return context.sendI18nError("client-event.command-failed");
        }

        async function maybeSendMissingPermsError(
            target: "bot"|"user",
            current: PermissionsBitField,
            required?: PermissionsBitField
        ) {
            if (required == null)
                return false;

            const missing = current.missing(required);
            const missingAny = missing.length !== 0;

            if (missingAny) {
                const locale = context.config.locale;
                const list = formatList(missing.map(e => inlineCode(e)), locale, "conjunction");
                await context.sendI18nError(`client-event.${target}-permissions-missing`, { list });
            }

            return missingAny;
        }
    },
} satisfies IClientEventListenerModule<Events.MessageCreate>;
