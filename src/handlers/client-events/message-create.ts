import { Events, PermissionFlagsBits } from "discord.js";

import type { IClientEventListenerModule } from "./types.ts";

export default {
    name: Events.MessageCreate,
    async run(message) {
        // Don't handle "robo-messages"
        if (message.author.bot || message.system ||
            message.webhookId != null || message.applicationId != null)
            return;

        if (!message.inGuild() || !message.guild.available ||
            message.guild.members.me == null || message.member == null)
            return; // TODO: handle direct messages

        // Don't handle if we can't reply to it
        const channelPerms = message.channel.permissionsFor(message.guild.members.me);
        if (!channelPerms.has(PermissionFlagsBits.SendMessages))
            return;


        // try {
        //     await message.channel.sendTyping();

        // } catch (error: unknown) {
        //     //
        // }
    },
} satisfies IClientEventListenerModule<Events.MessageCreate>;
