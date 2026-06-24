import { log } from "./log";
import { exec } from "./spawn";

export class ImageRepository {

    static INSTANCE = new ImageRepository();

    private imageInfos: Map<string, Map<string, ImageInfo>> = new Map();

    resetStack(stack: string) {
        this.imageInfos.delete(stack);
    }

    async update(stack: string, service: string, image: string): Promise<ImageInfo> {
        let imageInfo = await this.updateLocal(stack, service, image);

        if (!!imageInfo.localDigest && !image.startsWith("sha256:")) {
            const resRemote = await exec("skopeo", [ "inspect", "--no-tags", "--format", "{{ .Digest }}", "docker://" + image ]);

            let remoteDigest = "";
            if (resRemote.stdout) {
                remoteDigest = resRemote.stdout.trim();
            }

            imageInfo = new ImageInfo(remoteDigest, imageInfo.localDigests, imageInfo.localId);
            this.updateInfo(stack, service, image, imageInfo);
        }

        return imageInfo;
    }

    async updateLocal(stack: string, service: string, image: string): Promise<ImageInfo> {
        let imageInfo = this.getImageInfo(stack, service, image);

        const resLocal = await exec("docker", [ "inspect", "--format", "json", image ]);

        let localId = "";
        const localDigests: string[] = [];
        if (resLocal.stdout) {
            const localInspect = JSON.parse(resLocal.stdout);
            if (Array.isArray(localInspect) && localInspect[0]) {
                localId = localInspect[0].Id;

                const repoDigests = localInspect[0].RepoDigests;
                if (Array.isArray(repoDigests)) {
                    // A tag can carry multiple repo digests (e.g. "repo@sha256:..").
                    // Keep them all — any match against the remote means up to date.
                    for (const repoDigest of repoDigests) {
                        const indexOfAt = String(repoDigest).indexOf("@");
                        if (indexOfAt > 0) {
                            localDigests.push(String(repoDigest).substring(indexOfAt + 1));
                        }
                    }
                }
            }
        }

        if (!(localDigests.length > 0 && !!localId)) {
            log.warn("updateLocal", "Image '" + image + "': Local id '" + localId + "' digests '" + localDigests.join(", ") + "'");
        }

        imageInfo = new ImageInfo(imageInfo.remoteDigest, localDigests, localId);
        this.updateInfo(stack, service, image, imageInfo);

        return imageInfo;
    }

    getImageInfo(stack: string, service: string, image: string) : ImageInfo {
        return this.imageInfos.get(stack)?.get(this.imageKey(service, image)) ?? new ImageInfo("", "", "");
    }

    private updateInfo(stack: string, service: string, image: string, imageInfo: ImageInfo) {
        if (!this.imageInfos.has(stack)) {
            this.imageInfos.set(stack, new Map());
        }

        this.imageInfos.get(stack)!.set(this.imageKey(service, image), imageInfo);
    }

    private imageKey(service: string, image: string): string {
        return `${service}::${image}`;
    }
}

export class ImageInfo {
    readonly localDigests: string[];

    constructor(
        public readonly remoteDigest: string,
        localDigests: string[] | string,
        public readonly localId: string
    ) {
        // Accept a single digest (back-compat / callers that only have one) or
        // the full list. A tag can resolve to several repo digests for the same
        // content (e.g. the registry re-pushes the manifest), and any of them is
        // a valid "up to date" match against the remote digest.
        this.localDigests = (Array.isArray(localDigests) ? localDigests : [ localDigests ]).filter(Boolean);
    }

    /** Primary local digest (first repo digest) — used for display/back-compat. */
    get localDigest(): string {
        return this.localDigests[0] ?? "";
    }

    isImageUpdateAvailable() {
        // An update is available only when the remote digest is not among ANY of
        // the image's local repo digests. Comparing against just the first digest
        // produces false positives that never clear (the up-to-date digest may sit
        // at a later index).
        return this.localDigests.length > 0
            && !!this.remoteDigest
            && !this.localDigests.includes(this.remoteDigest);
    }
}

/**
 * Whether a running service's image differs from the image declared in its
 * compose file. When true the stack needs re-creating (Arbour shows the
 * "rocket" indicator) and image-update checks are skipped for that service.
 */
export function isRecreateNecessary(runningImage: string, composeImage: string | undefined): boolean {
    return runningImage !== composeImage;
}

/**
 * Whether image-update checking should run for a service. Skipped when the
 * service already needs re-creation, or when the arbour.imageupdates.check
 * label is explicitly set to false.
 */
export function shouldCheckImageUpdates(recreateNecessary: boolean, imageUpdatesCheckDisabled: boolean): boolean {
    return !recreateNecessary && !imageUpdatesCheckDisabled;
}

/**
 * Whether a pending image update should be surfaced for a service (the
 * "arrow-up" indicator): local and remote digests differ and the remote digest
 * has not been explicitly ignored via the arbour.imageupdates.ignore label.
 */
export function isServiceImageUpdateAvailable(imageInfo: ImageInfo, ignoreDigest: string | undefined): boolean {
    return imageInfo.isImageUpdateAvailable() && imageInfo.remoteDigest !== ignoreDigest;
}
