import { socketStore } from "./socket.svelte";

type Settings = {
    disableAuth?: boolean;
    checkUpdate?: boolean;
    checkBeta?: boolean;
    primaryHostname?: string;
    serverTimezone?: string;
    keepDataPeriodDays?: number;
    [key: string]: unknown;
};

class SettingsStore {
    settings = $state<Settings>({});
    loaded = $state(false);

    load() {
        socketStore.getSocket().emit("getSettings", (res: { data: Settings }) => {
            this.settings = res.data;
            if (this.settings.checkUpdate === undefined) {
                this.settings.checkUpdate = true;
            }
            this.loaded = true;
        });
    }

    save(callback?: () => void, currentPassword?: string) {
        if (!this.#validate()) return;
        socketStore.getSocket().emit("setSettings", this.settings, currentPassword, (res: { ok: boolean; msg?: string }) => {
            socketStore.toastRes(res as any);
            this.load();
            callback?.();
        });
    }

    #validate(): boolean {
        if ((this.settings.keepDataPeriodDays ?? 0) < 0) {
            socketStore.toastError("dataRetentionTimeError");
            return false;
        }
        return true;
    }
}

export const settingsStore = new SettingsStore();
