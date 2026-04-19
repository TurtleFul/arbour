import { Cron } from "croner";
import { log } from "./log";
import { getDb } from "./db/index";
import { stackAutoUpdate as stackAutoUpdateTable, AutoUpdateMode } from "./db/schema";
import { eq } from "drizzle-orm";
import { Stack } from "./stack";
import { ArbourServer } from "./arbour-server";
import { StackAutoUpdateSettings } from "../common/types";

export class StackAutoUpdateManager {

    private cronJobs: Map<string, Cron> = new Map();
    private server: ArbourServer;

    constructor(server: ArbourServer) {
        this.server = server;
    }

    async init() {
        const db = getDb();
        const rows = db.select().from(stackAutoUpdateTable).all();
        for (const row of rows) {
            if (row.mode === "scheduled" && row.schedule) {
                this.scheduleCron(row.stackName, row.schedule);
            }
        }
        log.info("autoUpdate", `Initialized ${rows.length} auto-update settings`);
    }

    async getSettings(stackName: string): Promise<StackAutoUpdateSettings> {
        const db = getDb();
        const row = db.select().from(stackAutoUpdateTable).where(eq(stackAutoUpdateTable.stackName, stackName)).get();
        return {
            mode: (row?.mode ?? "disabled") as AutoUpdateMode,
            schedule: row?.schedule ?? null,
        };
    }

    async setSettings(stackName: string, settings: StackAutoUpdateSettings): Promise<void> {
        const db = getDb();
        db.insert(stackAutoUpdateTable)
            .values({ stackName, mode: settings.mode, schedule: settings.schedule ?? null })
            .onConflictDoUpdate({
                target: stackAutoUpdateTable.stackName,
                set: { mode: settings.mode, schedule: settings.schedule ?? null },
            })
            .run();

        this.unscheduleCron(stackName);

        if (settings.mode === "scheduled" && settings.schedule) {
            this.scheduleCron(stackName, settings.schedule);
        }
    }

    async deleteSettings(stackName: string): Promise<void> {
        const db = getDb();
        this.unscheduleCron(stackName);
        db.delete(stackAutoUpdateTable).where(eq(stackAutoUpdateTable.stackName, stackName)).run();
    }

    /** Called after updateImageInfos() for immediate-mode stacks. */
    async onImageUpdateDetected(stack: Stack): Promise<void> {
        const settings = await this.getSettings(stack.name);
        if (settings.mode !== "immediate") {
            return;
        }
        await this.applyUpdates(stack);
    }

    private scheduleCron(stackName: string, schedule: string) {
        try {
            const job = new Cron(schedule, async () => {
                await this.runScheduledUpdate(stackName);
            });
            this.cronJobs.set(stackName, job);
            log.info("autoUpdate", `Scheduled cron for stack '${stackName}': ${schedule}`);
        } catch (e) {
            log.error("autoUpdate", `Invalid cron schedule for stack '${stackName}': ${schedule} — ${e}`);
        }
    }

    private unscheduleCron(stackName: string) {
        const existing = this.cronJobs.get(stackName);
        if (existing) {
            existing.stop();
            this.cronJobs.delete(stackName);
        }
    }

    private async runScheduledUpdate(stackName: string) {
        log.info("autoUpdate", `Running scheduled update for stack '${stackName}'`);
        try {
            const stack = await Stack.getStack(this.server, stackName);
            await stack.updateImageInfos();
            await this.applyUpdates(stack);
        } catch (e) {
            log.error("autoUpdate", `Scheduled update failed for stack '${stackName}': ${e}`);
        }
    }

    private async applyUpdates(stack: Stack): Promise<void> {
        const services = stack.getServicesWithAvailableImageUpdates();
        if (services.length === 0) {
            return;
        }

        log.info("autoUpdate", `Stack '${stack.name}': ${services.length} service(s) have image updates`);

        let anyUpdated = false;
        for (const serviceData of services) {
            const updated = await stack.autoUpdateService(serviceData.name);
            if (updated) {
                anyUpdated = true;
            }
        }

        if (anyUpdated) {
            await stack.updateImageInfos();
            this.server.sendStackList();
        }
    }
}
