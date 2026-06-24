import type { ArbourServer } from "./arbour-server";
import type { AgentSocket } from "../common/agent-socket";
import type { ArbourSocket } from "./util-server";

export abstract class AgentSocketHandler {
    abstract create(socket : ArbourSocket, server : ArbourServer, agentSocket : AgentSocket): void;
}
