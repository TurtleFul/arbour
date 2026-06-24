import { describe, expect, test } from "bun:test";
import { getIconHtml } from "../icon";

describe("getIconHtml", () => {
    test("returns the FA inline svg for a known icon", () => {
        const html = getIconHtml("arrow-up");
        expect(html).toContain("<svg");
        expect(html).toContain("svg-inline--fa");
        expect(html).toContain("fa-arrow-up");
    });

    test("returns empty string for an unknown icon", () => {
        expect(getIconHtml("definitely-not-an-icon")).toBe("");
    });

    test("merges extra class into the existing class attribute (single class attr)", () => {
        const html = getIconHtml("arrow-up", "notification-icon");
        // Regression: extra class must not be added as a second class attribute,
        // otherwise the browser keeps only the first and drops svg-inline--fa
        // (the FA sizing class), making the icon balloon to its viewBox size.
        const classAttrs = html.match(/class="/g) ?? [];
        expect(classAttrs.length).toBe(1);
        expect(html).toContain("svg-inline--fa");
        expect(html).toContain("notification-icon");
    });

    test("includes fa-spin in the merged class when spinning", () => {
        const html = getIconHtml("spinner", "fa-spin");
        expect((html.match(/class="/g) ?? []).length).toBe(1);
        expect(html).toContain("svg-inline--fa");
        expect(html).toContain("fa-spin");
    });
});
