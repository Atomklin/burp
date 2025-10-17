import { Guild, User } from "discord.js";
import assert from "node:assert";

import { ISOTextSQL } from "../misc.ts";
import { BaseRepo, fromDbDate, toDbDate } from "./common.ts";

import type { Database } from "better-sqlite3";
import type { ColorResolvable, Snowflake } from "discord.js";
import type { IBaseDbItem } from "./common.ts";

interface IDbDiscordItem extends IBaseDbItem {
    id: bigint;
    name: string;
    config: string;
}

interface DiscordItemDBO {
    id: Snowflake;
    name: string;
    config: Partial<IMemberConfig>;
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
// We currently don't support the `[r, g, b]` format.
export type SerializableColor = Exclude<
    ColorResolvable, readonly [red: number, green: number, blue: number]
>;

export interface IMemberConfig {
    /** Preferred locale for `I18n`. */
    locale: string;
    /** Preferred embed color for command responses. */
    embedColor: SerializableColor;
}

interface GetMemberConfigParams {
    userId: bigint;
    guildId: bigint;
    defaultLocale: string;
    defaultEmbedColor: SerializableColor;
}

export type GuildDBO = DiscordItemDBO;
export class GuildRepo extends DiscordItemRepo {
    readonly #defaultConfig;
    readonly #getMemberConfigDb;

    constructor(db: Database, defaultConfig: IMemberConfig) {
        super(db, "guilds");
        this.#defaultConfig = defaultConfig;
        // Fallback on guild config when user config is null, and vice versa.
        this.#getMemberConfigDb = db.prepare<GetMemberConfigParams, IMemberConfig>(`\
            SELECT
                coalesce(
                    json_extract("u"."config", '$.locale'),
                    json_extract("g"."config", '$.locale'),
                    @defaultLocale) AS locale,
                coalesce(
                    json_extract("u"."config", '$.embedColor'),
                    json_extract("g"."config", '$.embedColor'),
                    @defaultEmbedColor) AS embedColor
            FROM
                (SELECT 1) AS base
                LEFT JOIN "users" AS "u" ON "u"."id" = @userId
                LEFT JOIN "guilds" AS "g" ON "g"."id" = @guildId;
        `);
    }

    override createOrUpdate(item: GuildDBO | Guild) {
        if (item instanceof Guild)
            item = { id: item.id, name: item.name, config: {}, createdAt: new Date() };
        return super.createOrUpdate(item);
    }

    getMemberConfig(userId: Snowflake|bigint, guildId: Snowflake|bigint) {
        const result = this.#getMemberConfigDb.get({
            defaultEmbedColor: this.#defaultConfig.embedColor,
            defaultLocale: this.#defaultConfig.locale,
            guildId: BigInt(guildId),
            userId: BigInt(userId),
        });
        assert(result != null);
        return result;
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
