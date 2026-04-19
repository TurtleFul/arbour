import { describe, expect, test } from "bun:test";
import { ImageInfo } from "../image-repository";

describe("ImageInfo.isImageUpdateAvailable", () => {
    test("false when both digests are empty", () => {
        expect(new ImageInfo("", "", "").isImageUpdateAvailable()).toBe(false);
    });

    test("false when localDigest is empty", () => {
        expect(new ImageInfo("sha256:remote", "", "id1").isImageUpdateAvailable()).toBe(false);
    });

    test("false when remoteDigest is empty", () => {
        expect(new ImageInfo("", "sha256:local", "id1").isImageUpdateAvailable()).toBe(false);
    });

    test("false when digests match", () => {
        const digest = "sha256:abc123";
        expect(new ImageInfo(digest, digest, "id1").isImageUpdateAvailable()).toBe(false);
    });

    test("true when localDigest and remoteDigest differ", () => {
        expect(new ImageInfo("sha256:remote", "sha256:local", "id1").isImageUpdateAvailable()).toBe(true);
    });
});
