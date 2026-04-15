import { log } from "./log";
import { getDb } from "./db/index";
import { setting } from "./db/schema";
import { eq } from "drizzle-orm";
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
            Settings.cacheList[key] = { value: v, timestamp: Date.now() };
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
                .set({ value: serialised, type })
                .where(eq(setting.key, key))
                .run();
        } else {
            db.insert(setting)
                .values({ key, value: serialised, type })
                .run();
        }

        Settings.deleteCache([key]);
    }

    static async getSettings(type: string): Promise<LooseObject> {
        const rows = getDb().select({ key: setting.key, value: setting.value })
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
        const db = getDb();
        for (const key of Object.keys(data)) {
            const existing = db.select({ id: setting.id, type: setting.type })
                .from(setting)
                .where(eq(setting.key, key))
                .get();

            const serialised = JSON.stringify(data[key]);

            if (existing) {
                if (existing.type === type) {
                    db.update(setting)
                        .set({ value: serialised })
                        .where(eq(setting.key, key))
                        .run();
                }
            } else {
                db.insert(setting)
                    .values({ key, value: serialised, type })
                    .run();
            }
        }

        Settings.deleteCache(Object.keys(data));
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
