import { describe, expect, test } from "bun:test";
import { ComposeDocument } from "../compose-document";

const SIMPLE_COMPOSE = `
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    restart: always
`.trim();

const COMPOSE_WITH_ARBOUR = `
services:
  web:
    image: nginx:latest
x-arbour:
  urls:
    - http://localhost:80
`.trim();

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

describe("ComposeDocument — parsing", () => {
    test("parses a valid compose file", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.composeData.data.services).toBeDefined();
    });

    test("empty constructor produces empty services", () => {
        const doc = new ComposeDocument();
        expect(doc.services.names).toHaveLength(0);
    });

    test("throws on invalid YAML", () => {
        expect(() => new ComposeDocument("{ invalid: yaml: [")).toThrow();
    });

    test("throws when services is not an object", () => {
        expect(() => new ComposeDocument("services:\n  - foo\n  - bar")).toThrow("Services must be an object");
    });
});

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

describe("ComposeDocument — services", () => {
    test("lists service names", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.services.names).toContain("web");
    });

    test("reads image from a service", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const web = doc.services.getService("web");
        expect(web.image).toBe("nginx:latest");
        expect(web.imageName).toBe("nginx");
        expect(web.imageTag).toBe("latest");
    });

    test("reads restart policy", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.services.getService("web").restart).toBe("always");
    });

    test("reads ports", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const ports = doc.services.getService("web").ports;
        expect(ports.values).toContain("80:80");
    });
});

// ---------------------------------------------------------------------------
// x-arbour extension block
// ---------------------------------------------------------------------------

describe("ComposeDocument — x-arbour block", () => {
    test("reads existing x-arbour urls", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_ARBOUR);
        const urls = doc.xArbour.urls;
        expect(urls.values).toContain("http://localhost:80");
    });

    test("x-arbour block absent when not in source", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.xArbour.exists).toBe(false);
        expect(doc.xArbour.urls.isEmpty()).toBe(true);
    });

    test("adds urls to x-arbour", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.xArbour.urls.add("http://localhost:8080");
        expect(doc.xArbour.urls.values).toContain("http://localhost:8080");
    });
});

// ---------------------------------------------------------------------------
// Round-trip: parse → modify → serialize → re-parse
// ---------------------------------------------------------------------------

describe("ComposeDocument — round-trip", () => {
    test("serialized YAML re-parses to same structure", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const yaml = doc.toYAML();
        const doc2 = new ComposeDocument(yaml);
        expect(doc2.services.names).toEqual(doc.services.names);
        expect(doc2.services.getService("web").image).toBe("nginx:latest");
    });

    test("modifications survive round-trip", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").image = "nginx:alpine";
        const doc2 = new ComposeDocument(doc.toYAML());
        expect(doc2.services.getService("web").image).toBe("nginx:alpine");
    });

    test("x-arbour block survives round-trip", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.xArbour.urls.add("http://myhost:9000");
        const doc2 = new ComposeDocument(doc.toYAML());
        expect(doc2.xArbour.urls.values).toContain("http://myhost:9000");
    });
});

// ---------------------------------------------------------------------------
// Networks
// ---------------------------------------------------------------------------

describe("ComposeDocument — networks", () => {
    const COMPOSE_WITH_NETWORKS = `
services:
  web:
    image: nginx
networks:
  frontend:
    external: true
  backend: {}
`.trim();

    test("lists network names", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORKS);
        expect(doc.networks.names).toContain("frontend");
        expect(doc.networks.names).toContain("backend");
    });

    test("reads external flag", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORKS);
        expect(doc.networks.getNetwork("frontend").external).toBe(true);
        expect(doc.networks.getNetwork("backend").external).toBe(false);
    });
});
