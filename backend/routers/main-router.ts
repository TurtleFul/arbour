import type { ArbourServer } from "../arbour-server";
import { Router } from "../router";
import type { Express, Router as ExpressRouter } from "express";
import express from "express";

export class MainRouter extends Router {
    create(app: Express, server: ArbourServer): ExpressRouter {
        const router = express.Router();

        router.get("/", (req, res) => {
            res.send(server.indexHTML);
        });

        // Robots.txt
        router.get("/robots.txt", async (_request, response) => {
            let txt = "User-agent: *\nDisallow: /";
            response.setHeader("Content-Type", "text/plain");
            response.send(txt);
        });

        return router;
    }

}
