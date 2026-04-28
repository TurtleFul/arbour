import { log } from "./log";
import { getDb } from "./db/index";
import { setting } from "./db/schema";
import { eq, inArray } from "drizzle-orm";
import { LooseObject } from "../common/util-common";

export class Settings {

    static cacheList: LooseObject = {};
    static cacheCleaner?: ReturnType<typeof setInterval>;

    static async get(key: string) {
        if (!Settings.cacheCleaner) {
            Settings.cacheCleaner = setInterval(() => {
                log.debug("settings", "Cache Cleaner running");
                for (const k in Settings.cacheList) {
                    if (Date.now() - Settings.cacheList[k].timestamp > 60 * 1000) {
                        log.debug("settings", "Cache Cleaner deleted: " + k);
                        delete Settings.cacheList[k];
                    }
                }
            }, 60 * 1000);
        }

        if (key in Settings.cacheList) {
            const v = Settings.cacheList[key].value;
            log.debug("settings", `Get Setting (cache): ${key}: ${v}`);
            return v;
        }

        const row = getDb().select({ value: setting.value })
            .from(setting)
            .where(eq(setting.key, key))
            .get();

        const rawValue = row?.value ?? null;

        try {
            const v = JSON.parse(rawValue as string);
            log.debug("settings", `Get Setting: ${key}: ${v}`);
            Settings.cacheList[key] = { value: v,
                timestamp: Date.now() };
            return v;
        } catch (_) {
            return rawValue;
        }
    }

    static async set(key: string, value: object | string | number | boolean, type: string | null = null) {
        const db = getDb();
        const existing = db.select({ id: setting.id })
            .from(setting)
            .where(eq(setting.key, key))
            .get();

        const serialised = JSON.stringify(value);

        if (existing) {
            db.update(setting)
                .set({ value: serialised,
                    type })
                .where(eq(setting.key, key))
                .run();
        } else {
            db.insert(setting)
                .values({ key,
                    value: serialised,
                    type })
                .run();
        }

        Settings.deleteCache([ key ]);
    }

    static async getSettings(type: string): Promise<LooseObject> {
        const rows = getDb().select({ key: setting.key,
            value: setting.value })
            .from(setting)
            .where(eq(setting.type, type))
            .all();

        const result: LooseObject = {};
        for (const row of rows) {
            try {
                result[row.key] = JSON.parse(row.value as string);
            } catch (_) {
                result[row.key] = row.value;
            }
        }
        return result;
    }

    static async setSettings(type: string, data: LooseObject) {
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return;
        }

        const db = getDb();

        // One SELECT for all keys instead of one per key
        const existingRows = db.select({ key: setting.key,
            type: setting.type })
            .from(setting)
            .where(inArray(setting.key, keys))
            .all();

        const existing = new Map(existingRows.map(r => [ r.key, r.type ]));

        db.transaction((tx) => {
            for (const key of keys) {
                const serialised = JSON.stringify(data[key]);
                const existingType = existing.get(key);

                if (existingType !== undefined) {
                    if (existingType === type) {
                        tx.update(setting)
                            .set({ value: serialised })
                            .where(eq(setting.key, key))
                            .run();
                    }
                } else {
                    tx.insert(setting)
                        .values({ key,
                            value: serialised,
                            type })
                        .run();
                }
            }
        });

        Settings.deleteCache(keys);
    }

    static deleteCache(keyList: string[]) {
        for (const key of keyList) {
            delete Settings.cacheList[key];
        }
    }

    static stopCacheCleaner() {
        if (Settings.cacheCleaner) {
            clearInterval(Settings.cacheCleaner);
            Settings.cacheCleaner = undefined;
        }
    }
}
