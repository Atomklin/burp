import assert from "node:assert";

import type { Database } from "better-sqlite3";

export interface IBaseDbItem {
    created_at: string;
    updated_at?: string;
}

export abstract class BaseRepo<TKey, TDBItem, TItem = TDBItem> {
    protected readonly dbGetAll;
    protected readonly dbGetById;
    protected readonly dbDeleteById;
    protected readonly dbCreateOrUpdate;

    protected constructor(
        protected readonly db: Database,
        getAllSql: string, getByIdSql: string,
        deleteByIdSql: string,
        createOrUpdateSql: string
    ) {
        this.dbGetAll = db.prepare<[], TDBItem>(getAllSql);
        this.dbGetById = db.prepare<[TKey], TDBItem>(getByIdSql);
        this.dbDeleteById = db.prepare<[TKey], void>(deleteByIdSql);
        this.dbCreateOrUpdate = db.prepare<[TDBItem], TDBItem>(createOrUpdateSql);
    }

    protected abstract fromDBItem(dbItem: TDBItem): TItem;
    protected abstract toDBItem(item: TItem): TDBItem;

    createOrUpdate(item: TItem) {
        const result = this.dbCreateOrUpdate.get(this.toDBItem(item));
        assert(result != null);
        return this.fromDBItem(result);
    }

    *[Symbol.iterator]() {
        for (const item of this.dbGetAll.iterate())
            yield this.fromDBItem(item);
    }
    getAll() {
        return Array.from(this);
    }
    getById(key: TKey) {
        const result = this.dbGetById.get(key);
        if (result != null)
            return this.fromDBItem(result);
    }

    deleteById(key: TKey) {
        this.dbDeleteById.run(key);
    }
}

export function toDbDate(date: Date): string;
export function toDbDate(date: Date|undefined): string|undefined;
export function toDbDate(date: Date|undefined) { return date?.toISOString(); }

export function fromDbDate(date: string): Date;
export function fromDbDate(date: string|undefined): Date|undefined;
export function fromDbDate(date: string|undefined) {
    const parsed = date && new Date(date);
    return parsed && isFinite(parsed.getTime()) ? parsed : undefined;
}
