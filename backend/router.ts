import type { ArbourServer } from "./arbour-server";
import type { Express, Router as ExpressRouter } from "express";

export abstract class Router {
    abstract create(app : Express, server : ArbourServer): ExpressRouter;
}
