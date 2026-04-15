import { ArbourServer } from "./arbour-server";
import { AgentSocket } from "../common/agent-socket";
import { ArbourSocket } from "./util-server";

export abstract class AgentSocketHandler {
    abstract create(socket : ArbourSocket, server : ArbourServer, agentSocket : AgentSocket): void;
}
