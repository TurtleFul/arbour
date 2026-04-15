import { getDb } from "../db/index";
import { agent as agentTable } from "../db/schema";
import { AgentData } from "../../common/types";

export type AgentRow = typeof agentTable.$inferSelect;

export class Agent {
    id: number;
    url: string;
    username: string;
    password: string;
    active: boolean;
    name: string;

    constructor(row: AgentRow) {
        this.id = row.id;
        this.url = row.url;
        this.username = row.username;
        this.password = row.password;
        this.active = row.active;
        this.name = row.name ?? "";
    }

    static fromRow(row: AgentRow): Agent {
        return new Agent(row);
    }

    static async getAgentList(): Promise<Record<string, Agent>> {
        const rows = getDb().select().from(agentTable).all();
        const result: Record<string, Agent> = {};
        for (const row of rows) {
            const a = new Agent(row);
            result[a.url] = a;
        }
        return result;
    }

    get endpoint(): string {
        if (this.url) {
            return new URL(this.url).host;
        }
        return "";
    }

    toJSON(): AgentData {
        return {
            url: this.url,
            username: this.username,
            password: "",
            endpoint: this.endpoint,
            name: this.name,
        };
    }
}

export default Agent;
