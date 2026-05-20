type ToastType = "success" | "error" | "info";

export type Toast = {
    id: string;
    type: ToastType;
    message: string;
    persistent: boolean;
};

class ToastStore {
    items = $state<Toast[]>([]);

    success(msg: string) {
        this.#show("success", msg, false);
    }

    error(msg: string) {
        this.#show("error", msg, true);
    }

    info(msg: string) {
        this.#show("info", msg, false);
    }

    #show(type: ToastType, message: string, persistent: boolean) {
        const id = crypto.randomUUID();
        this.items.push({ id, type, message, persistent });
        if (!persistent) {
            setTimeout(() => this.dismiss(id), 4000);
        }
    }

    dismiss(id: string) {
        const idx = this.items.findIndex((t) => t.id === id);
        if (idx !== -1) this.items.splice(idx, 1);
    }
}

export const toastStore = new ToastStore();
