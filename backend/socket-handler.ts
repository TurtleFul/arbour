import type { ArbourServer } from "./arbour-server";
import type { ArbourSocket } from "./util-server";

export abstract class SocketHandler {
    abstract create(socket : ArbourSocket, server : ArbourServer): void;
}
