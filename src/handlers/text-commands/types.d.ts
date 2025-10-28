import type { PermissionResolvable } from "discord.js";
import type { ITextCommand } from "../../data/types.ts";

export type ITextCommandModule = Pick<ITextCommand, "description" | "run"> & {
    /** The unique keyword / kewords after the `prefix`, that invokes the command. */
    name: string | string[];
    /** @see {@link ITextCommand.botPermission} */
    botPermission?: PermissionResolvable;
    /** @see {@link ITextCommand.userPermission} */
    userPermission?: PermissionResolvable;
};
