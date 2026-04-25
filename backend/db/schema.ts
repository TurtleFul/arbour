import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export type AutoUpdateMode = "disabled" | "immediate" | "scheduled";
export type EventType = "deploy" | "start" | "stop" | "restart" | "update" | "recreate" | "down";
export type EventTrigger = "manual" | "scheduled" | "immediate";

export const setting = sqliteTable("setting", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key", { length: 200 }).notNull().unique(),
    value: text("value"),
    type: text("type", { length: 20 }),
});

export const user = sqliteTable("user", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username", { length: 255 }).notNull().unique(),
    password: text("password", { length: 255 }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    timezone: text("timezone", { length: 150 }),
    twofa_secret: text("twofa_secret", { length: 64 }),
    twofa_status: integer("twofa_status", { mode: "boolean" }).notNull().default(false),
    twofa_last_token: text("twofa_last_token", { length: 6 }),
});

export const agent = sqliteTable("agent", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url", { length: 255 }).notNull().unique(),
    username: text("username", { length: 255 }).notNull(),
    password: text("password", { length: 255 }).notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    name: text("name").default(""),
});

export const stackAutoUpdate = sqliteTable("stack_auto_update", {
    stackName: text("stack_name").primaryKey(),
    mode: text("mode").$type<AutoUpdateMode>().notNull().default("disabled"),
    schedule: text("schedule"),
});

export const serviceEventLog = sqliteTable("service_event_log", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stackName: text("stack_name").notNull(),
    serviceName: text("service_name").notNull(),
    eventType: text("event_type").$type<EventType>().notNull(),
    trigger: text("trigger").$type<EventTrigger>().notNull(),
    timestamp: integer("timestamp").notNull(),
    success: integer("success", { mode: "boolean" }),
});
