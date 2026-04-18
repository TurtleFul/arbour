import { log } from "./log";
import { compareVersions } from "../common/util-common";
import packageJSON from "../package.json";
import { Settings } from "./settings";

const UPDATE_CHECKER_INTERVAL_MS = 1000 * 60 * 60 * 48;
const RELEASES_URL = "https://api.github.com/repos/turtleful/arbour/releases/latest";

interface GitHubRelease {
    tag_name?: string;
    prerelease?: boolean;
    draft?: boolean;
}

class CheckVersion {
    version = packageJSON.version;
    latestVersion? : string;
    interval? : NodeJS.Timeout;

    async startInterval() {
        const check = async () => {
            if (await Settings.get("checkUpdate") === false) {
                return;
            }

            log.debug("update-checker", "Retrieving latest release from GitHub");

            try {
                const res = await fetch(RELEASES_URL, {
                    headers: { "Accept": "application/vnd.github+json" },
                });

                if (!res.ok) {
                    log.info("update-checker", `GitHub releases API returned ${res.status}`);
                    return;
                }

                const data = await res.json() as GitHubRelease;

                if (process.env.TEST_CHECK_VERSION === "1") {
                    this.latestVersion = "1000.0.0";
                    return;
                }

                if (data.draft || !data.tag_name) {
                    return;
                }

                const checkBeta = await Settings.get("checkBeta");
                if (data.prerelease && !checkBeta) {
                    return;
                }

                const latest = data.tag_name.replace(/^v/, "");
                if (compareVersions(latest, this.version) > 0) {
                    this.latestVersion = latest;
                }
            } catch (_) {
                log.info("update-checker", "Failed to check for new versions");
            }
        };

        await check();
        this.interval = setInterval(check, UPDATE_CHECKER_INTERVAL_MS);
    }
}

const checkVersion = new CheckVersion();
export default checkVersion;
