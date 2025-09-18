import { Guild, User } from "discord.js";
import { assert } from "node:console";

import { ISOTextSQL } from "../misc.ts";
import { BaseRepo, fromDbDate, toDbDate } from "./common.ts";

import type { Database } from "better-sqlite3";
import type { Snowflake } from "discord.js";
import type { IBaseDbItem } from "./common.ts";

interface IDbDiscordItem extends IBaseDbItem {
    id: bigint;
    name: string;
    config: string;
}

interface DiscordItemDBO {
    id: Snowflake;
    name: string;
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt?: Date;
}

abstract class DiscordItemRepo extends BaseRepo<bigint, IDbDiscordItem, DiscordItemDBO> {
    protected constructor(db: Database, tableName: "guilds"|"users") {
        super(db,
            `SELECT * FROM "${tableName}";`,
            `SELECT * FROM "${tableName}" WHERE id = ?;`,
            `DELETE FROM "${tableName}" WHERE id = ?;`,
            `INSERT INTO "${tableName}" ("id", "name", "config") VALUES (@id, @name, @config)
                ON CONFLICT ("id") DO UPDATE SET "name" = @name, "config" = @config, "updated_at" = (${ISOTextSQL})
                RETURNING *;`);

        assert(tableName === "guilds" || tableName === "users");
    }

    protected override fromDBItem(dbItem: IDbDiscordItem) {
        return {
            id: dbItem.id.toString(),
            name: dbItem.name,
            config: JSON.parse(dbItem.config),
            createdAt: fromDbDate(dbItem.created_at),
            updatedAt: fromDbDate(dbItem.updated_at),
        };
    }
    protected override toDBItem(item: DiscordItemDBO) {
        return Object.freeze({
            id: BigInt(item.id),
            name: item.name,
            config: JSON.stringify(item.config),
            created_at: toDbDate(item.createdAt),
            updated_at: toDbDate(item.updatedAt)
        });
    }

    override getById(id: Snowflake | bigint) {
        return super.getById(BigInt(id));
    }
    override deleteById(id: Snowflake | bigint) {
        super.deleteById(BigInt(id));
    }
}

//#region Guilds
export type GuildDBO = DiscordItemDBO;
export class GuildRepo extends DiscordItemRepo {
    constructor(db: Database) {
        super(db, "guilds");
    }

    override createOrUpdate(item: GuildDBO | Guild) {
        if (item instanceof Guild)
            item = { id: item.id, name: item.name, config: {}, createdAt: new Date() };
        return super.createOrUpdate(item);
    }
}
//#endregion

//#region Users
export type UserDBO = DiscordItemDBO;
export class UserRepo extends DiscordItemRepo {
    constructor(db: Database) {
        super(db, "users");
    }

    override createOrUpdate(item: UserDBO | User) {
        if (item instanceof User)
            item = { id: item.id, name: item.displayName, config: {}, createdAt: new Date() };
        return super.createOrUpdate(item);
    }
}
//#endregion
