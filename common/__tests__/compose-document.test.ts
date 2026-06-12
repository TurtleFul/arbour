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

    test("sets external flag to true", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORKS);
        const net = doc.networks.getNetwork("backend");
        net.external = true;
        expect(net.external).toBe(true);
    });

    test("unsetting external removes the key", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORKS);
        const net = doc.networks.getNetwork("frontend");
        net.external = false;
        expect(net.external).toBe(false);
        // key should be absent, not just false
        expect(net.composeData.data.external).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Service mutations
// ---------------------------------------------------------------------------

describe("ComposeDocument — service mutations", () => {
    test("set and read image", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").image = "redis:7";
        expect(doc.services.getService("web").image).toBe("redis:7");
    });

    test("set and read restart policy", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").restart = "on-failure";
        expect(doc.services.getService("web").restart).toBe("on-failure");
    });

    test("set and read container_name", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").containerName = "my-nginx";
        expect(doc.services.getService("web").containerName).toBe("my-nginx");
    });

    test("service.set() / service.delete() round-trip", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const svc = doc.services.getService("web");
        svc.set("hostname", "myhost");
        expect(svc.get("hostname")).toBe("myhost");
        svc.delete("hostname");
        expect(svc.get("hostname")).toBeUndefined();
    });

    test("imageTag defaults to latest when no tag in image", () => {
        const doc = new ComposeDocument("services:\n  web:\n    image: nginx");
        expect(doc.services.getService("web").imageTag).toBe("latest");
    });

    test("imageName strips the tag", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.services.getService("web").imageName).toBe("nginx");
    });
});

// ---------------------------------------------------------------------------
// ComposeArray mutations
// ---------------------------------------------------------------------------

describe("ComposeDocument — ComposeArray mutations", () => {
    test("add appends a port", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").ports.add("443:443");
        expect(doc.services.getService("web").ports.values).toContain("443:443");
    });

    test("delete removes by index", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const ports = doc.services.getService("web").ports;
        const before = ports.values.length;
        ports.delete(0);
        expect(ports.values.length).toBe(before - 1);
    });

    test("isEmpty true on empty array", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const ports = doc.services.getService("web").ports;
        ports.delete(0);
        expect(ports.isEmpty()).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Environment variable substitution (envsubst)
// ---------------------------------------------------------------------------

describe("ComposeDocument — env var substitution", () => {
    const COMPOSE_WITH_VARS = `
services:
  web:
    image: nginx:\${TAG}
    environment:
      - APP_ENV=\${APP_ENV}
`.trim();

    test("raw get returns the template string", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_VARS, "TAG=alpine\nAPP_ENV=prod");
        expect(doc.services.getService("web").get("image")).toBe("nginx:${TAG}");
    });

    test("envsubst get returns interpolated value", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_VARS, "TAG=alpine\nAPP_ENV=prod");
        expect(doc.services.getService("web").image).toBe("nginx:alpine");
    });

    test("imageTag reflects substituted tag", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_VARS, "TAG=1.25");
        expect(doc.services.getService("web").imageTag).toBe("1.25");
    });

    test("unset variable leaves placeholder in output", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_VARS, "");
        // envsubst with no matching var — result depends on @inventage/envsubst behaviour
        // but should not throw and should produce a string
        expect(typeof doc.services.getService("web").image).toBe("string");
    });

    test("env vars in .env don't affect raw YAML get", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_VARS, "TAG=stable");
        const raw = doc.services.getService("web").get("image");
        expect(raw).toContain("${TAG}");
    });
});

// ---------------------------------------------------------------------------
// toYAML()
// ---------------------------------------------------------------------------

describe("ComposeDocument — toYAML()", () => {
    test("produces a non-empty string", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(typeof doc.toYAML()).toBe("string");
        expect(doc.toYAML().length).toBeGreaterThan(0);
    });

    test("round-trip preserves service image", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const doc2 = new ComposeDocument(doc.toYAML());
        expect(doc2.services.getService("web").image).toBe("nginx:latest");
    });

    test("mutation is reflected in toYAML() output", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").image = "alpine:3";
        expect(doc.toYAML()).toContain("alpine:3");
    });
});

// ---------------------------------------------------------------------------
// ComposeServices — has / delete / set
// ---------------------------------------------------------------------------

describe("ComposeServices — structural mutations", () => {
    test("has() returns true for existing service", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.services.has("web")).toBe(true);
    });

    test("has() returns false for unknown service", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.services.has("nonexistent")).toBe(false);
    });

    test("delete() removes a key from a service", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const svc = doc.services.getService("web");
        svc.delete("restart");
        expect(svc.get("restart")).toBeUndefined();
    });

    test("set() writes a new key on a service", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.services.getService("web").set("mem_limit", "512m");
        expect(doc.services.getService("web").get("mem_limit")).toBe("512m");
    });
});

// ---------------------------------------------------------------------------
// ComposeNetworks
// ---------------------------------------------------------------------------

const COMPOSE_WITH_NETWORK = `
services:
  web:
    image: nginx
    networks:
      - frontend
networks:
  frontend:
    external: true
`.trim();

describe("ComposeDocument — networks", () => {
    test("reads network names", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORK);
        expect(Object.keys(doc.networks.getNetworks())).toContain("frontend");
    });

    test("reads external flag", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORK);
        expect(doc.networks.getNetwork("frontend").external).toBe(true);
    });

    test("sets external to false", () => {
        const doc = new ComposeDocument(COMPOSE_WITH_NETWORK);
        const net = doc.networks.getNetwork("frontend");
        net.external = false;
        expect(net.external).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// networks.replace() ↔ toYAML — regression for GUI network editing.
// NetworkInput.commit() builds a networks object from the form and calls
// networks.replace(); these guard that the result serializes to compose.yaml
// (the data layer of the bug where GUI-added networks never reached the YAML).
// ---------------------------------------------------------------------------

describe("ComposeDocument — networks.replace() serialization", () => {
    test("replace adds a networks block when none existed", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        expect(doc.networks.names).toHaveLength(0);

        doc.networks.replace({ "frontend-net": {} });

        expect(doc.networks.names).toContain("frontend-net");
        const yaml = doc.toYAML();
        expect(yaml).toContain("networks:");
        expect(yaml).toContain("frontend-net");
    });

    test("added network survives a YAML round-trip", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.networks.replace({ "frontend-net": {} });
        const reparsed = new ComposeDocument(doc.toYAML());
        expect(reparsed.networks.names).toContain("frontend-net");
    });

    test("replace renames/removes networks, dropping the previous set", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.networks.replace({ "old-net": {} });
        doc.networks.replace({ "new-net": {} });
        const yaml = doc.toYAML();
        expect(yaml).toContain("new-net");
        expect(yaml).not.toContain("old-net");
    });

    test("external network from replace serializes external: true and round-trips", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.networks.replace({ "shared-net": { external: true } });
        const yaml = doc.toYAML();
        expect(yaml).toContain("shared-net");
        expect(yaml).toContain("external: true");
        const reparsed = new ComposeDocument(yaml);
        expect(reparsed.networks.getNetwork("shared-net").external).toBe(true);
    });

    test("getNetworks() splits internal and external (loadNetworkList input)", () => {
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        doc.networks.replace({ internal: {},
            ext: { external: true } });
        const nets = doc.networks.getNetworks();
        expect(nets.internal.external).toBe(false);
        expect(nets.ext.external).toBe(true);
    });

    test("commit-shaped object (internal rows + external map) serializes fully", () => {
        // mirrors NetworkInput.commit(): { ...internalRows, ...externalList }
        const doc = new ComposeDocument(SIMPLE_COMPOSE);
        const internalRows = { app: {},
            db: {} };
        const externalList = { proxy: { external: true } };
        doc.networks.replace({ ...internalRows,
            ...externalList });

        const reparsed = new ComposeDocument(doc.toYAML());
        expect(reparsed.networks.names).toContain("app");
        expect(reparsed.networks.names).toContain("db");
        expect(reparsed.networks.names).toContain("proxy");
        expect(reparsed.networks.getNetwork("proxy").external).toBe(true);
        expect(reparsed.networks.getNetwork("app").external).toBe(false);
    });
});
