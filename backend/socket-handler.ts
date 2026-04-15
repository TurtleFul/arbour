import { ArbourServer } from "./arbour-server";
import { ArbourSocket } from "./util-server";

export abstract class SocketHandler {
    abstract create(socket : ArbourSocket, server : ArbourServer): void;
}
