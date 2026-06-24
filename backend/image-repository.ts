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

            imageInfo = new ImageInfo(remoteDigest, imageInfo.localDigest, imageInfo.localId);
            this.updateInfo(stack, service, image, imageInfo);
        }

        return imageInfo;
    }

    async updateLocal(stack: string, service: string, image: string): Promise<ImageInfo> {
        let imageInfo = this.getImageInfo(stack, service, image);

        const resLocal = await exec("docker", [ "inspect", "--format", "json", image ]);

        let localId = "";
        let localDigest = "";
        if (resLocal.stdout) {
            const localInspect = JSON.parse(resLocal.stdout);
            if (Array.isArray(localInspect) && localInspect[0]) {
                localId = localInspect[0].Id;

                const localRepoDigest = localInspect[0].RepoDigests;
                if (Array.isArray(localRepoDigest)) {
                    localDigest = localRepoDigest[0];
                }
                if (!!localDigest) {
                    const indexOfAt = localDigest.indexOf("@");
                    if (indexOfAt > 0) {
                        localDigest = localDigest.substring(indexOfAt + 1);
                    }
                }
            }
        }

        if (!(!!localDigest && !!localId)) {
            log.warn("updateLocal", "Image '" + image + "': Local id '" + localId + "' digest '" + localDigest + "'");
        }

        imageInfo = new ImageInfo(imageInfo.remoteDigest, localDigest, localId);
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
    constructor(
        public readonly remoteDigest: string,
        public readonly localDigest: string,
        public readonly localId: string
    ) {}

    isImageUpdateAvailable() {
        return !!this.localDigest && !!this.remoteDigest && this.localDigest !== this.remoteDigest;
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
