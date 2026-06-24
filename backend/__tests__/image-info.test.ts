import { describe, expect, test } from "bun:test";
import { ImageInfo, isRecreateNecessary, shouldCheckImageUpdates, isServiceImageUpdateAvailable } from "../image-repository";

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

describe("isRecreateNecessary", () => {
    test("false when running image matches compose image", () => {
        expect(isRecreateNecessary("nginx:latest", "nginx:latest")).toBe(false);
    });

    test("true when running image differs from compose image", () => {
        expect(isRecreateNecessary("nginx:1.25", "nginx:latest")).toBe(true);
    });

    test("true when compose image is undefined", () => {
        expect(isRecreateNecessary("nginx:latest", undefined)).toBe(true);
    });
});

describe("shouldCheckImageUpdates", () => {
    test("true when recreate not needed and check not disabled", () => {
        expect(shouldCheckImageUpdates(false, false)).toBe(true);
    });

    test("false when recreate is necessary (rocket takes precedence over arrow)", () => {
        expect(shouldCheckImageUpdates(true, false)).toBe(false);
    });

    test("false when the imageupdates.check label is disabled", () => {
        expect(shouldCheckImageUpdates(false, true)).toBe(false);
    });

    test("false when both recreate needed and check disabled", () => {
        expect(shouldCheckImageUpdates(true, true)).toBe(false);
    });
});

describe("isServiceImageUpdateAvailable", () => {
    test("true when an update is available and not ignored", () => {
        const info = new ImageInfo("sha256:remote", "sha256:local", "id1");
        expect(isServiceImageUpdateAvailable(info, undefined)).toBe(true);
    });

    test("true when the ignored digest does not match the remote digest", () => {
        const info = new ImageInfo("sha256:remote", "sha256:local", "id1");
        expect(isServiceImageUpdateAvailable(info, "sha256:someOtherOldDigest")).toBe(true);
    });

    test("false when the remote digest is explicitly ignored", () => {
        const info = new ImageInfo("sha256:remote", "sha256:local", "id1");
        expect(isServiceImageUpdateAvailable(info, "sha256:remote")).toBe(false);
    });

    test("false when no underlying update is available", () => {
        const info = new ImageInfo("sha256:same", "sha256:same", "id1");
        expect(isServiceImageUpdateAvailable(info, undefined)).toBe(false);
    });

    test("false when digests are incomplete even if ignore digest differs", () => {
        const info = new ImageInfo("", "sha256:local", "id1");
        expect(isServiceImageUpdateAvailable(info, "whatever")).toBe(false);
    });
});
