import { ArbourServer } from "./arbour-server";
import { log } from "./log";

log.info("server", "Welcome to Arbour!");
const server = new ArbourServer();
await server.serve();
