import { getDb } from "./db/index";
import { serviceEventLog, EventType, EventTrigger } from "./db/schema";
import { desc, eq, and, or } from "drizzle-orm";
import { log } from "./log";

export function logServiceEvent(
    stackName: string,
    serviceName: string,
    eventType: EventType,
    trigger: EventTrigger,
    success?: boolean
): void {
    try {
        const db = getDb();
        db.insert(serviceEventLog).values({
            stackName,
            serviceName,
            eventType,
            trigger,
            timestamp: Date.now(),
            success: success ?? null,
        }).run();
    } catch (e) {
        log.error("eventLog", `Failed to log event: ${e}`);
    }
}

export type ServiceEventEntry = {
    id: number;
    stackName: string;
    serviceName: string;
    eventType: EventType;
    trigger: EventTrigger;
    timestamp: number;
    success: boolean | null;
};

export function getServiceEvents(
    stackName: string,
    serviceName: string,
    limit = 50
): ServiceEventEntry[] {
    const db = getDb();
    return db.select()
        .from(serviceEventLog)
        .where(
            and(
                eq(serviceEventLog.stackName, stackName),
                or(
                    eq(serviceEventLog.serviceName, serviceName),
                    eq(serviceEventLog.serviceName, "")
                )
            )
        )
        .orderBy(desc(serviceEventLog.timestamp))
        .limit(limit)
        .all() as ServiceEventEntry[];
}
